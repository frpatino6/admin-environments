// Business-hours window for QA escalation reminders.
//
// The escalation job used to sweep 24/7, so a request that went stale on a
// Friday night kept re-pinging the team's Slack channel for the whole weekend.
// This module is the single source of truth for "may a reminder be sent right
// now": pure (no DB, no HTTP, no dependencies), so the job and the service can
// both gate on it and it can be unit-tested without MongoDB.

const MIN_HOUR = 0;
const MAX_HOUR = 23;
const MIN_ISO_WEEKDAY = 1; // Monday
const MAX_ISO_WEEKDAY = 7; // Sunday

// Short labels for the startup log, keyed by ISO weekday number
// (1 = Monday … 7 = Sunday). Only used for display — never for deciding
// whether a date is inside the window.
const ISO_WEEKDAY_LABELS = {
  1: 'lun',
  2: 'mar',
  3: 'mié',
  4: 'jue',
  5: 'vie',
  6: 'sáb',
  7: 'dom'
};

const ENV_KEYS = {
  timezone: 'QA_REMINDER_TIMEZONE',
  startHour: 'QA_REMINDER_START_HOUR',
  endHour: 'QA_REMINDER_END_HOUR',
  weekdays: 'QA_REMINDER_WEEKDAYS'
};

// The server's own zone is the right default: on any host where nobody
// configured QA_REMINDER_TIMEZONE, "business hours" most plausibly means the
// hours of the box that runs the job.
const DEFAULT_REMINDER_SCHEDULE = Object.freeze({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  startHour: 9,
  endHour: 18,
  weekdays: Object.freeze([1, 2, 3, 4, 5])
});

const warn = (message) => {
  console.warn(`[qaReminderSchedule] ${message}`);
};

// A misconfigured timezone is the most dangerous of the four settings: it
// silently shifts the whole window, so a typo would mean "never send" or
// "always send at 3am". Intl is the only validator available without a new
// dependency, and it throws a RangeError for anything that isn't a known IANA
// zone.
const isValidTimeZone = (timeZone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch (error) {
    return false;
  }
};

// Hours are whole clock hours: 0-23. Anything else (a word, a float, 25) is
// rejected rather than coerced, so a typo can't quietly produce a window
// nobody asked for.
const parseHour = (raw, fallback, envKey) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;

  const value = Number(String(raw).trim());
  if (!Number.isInteger(value) || value < MIN_HOUR || value > MAX_HOUR) {
    warn(`${envKey}="${raw}" no es una hora válida (se espera un entero ${MIN_HOUR}-${MAX_HOUR}); se usa ${fallback}.`);
    return fallback;
  }

  return value;
};

// Comma-separated ISO weekday numbers ("1,2,3,4,5"), de-duplicated and
// sorted. An unset variable means "use the default" and is silent; an empty or
// fully invalid one warns, because it is always a configuration mistake.
// Partially valid input keeps the valid days and warns about the rest — a
// window with no days at all would silence reminders forever, which is never
// what a typo should mean.
const parseWeekdays = (raw, fallback) => {
  if (raw === undefined || raw === null) return fallback;

  if (String(raw).trim() === '') {
    warn(`${ENV_KEYS.weekdays} está vacío; se usan los días por defecto (${fallback.join(',')}).`);
    return fallback;
  }

  const weekdays = [];
  const rejected = [];

  for (const part of String(raw).split(',')) {
    const token = part.trim();
    if (token === '') continue;

    const value = Number(token);
    if (!Number.isInteger(value) || value < MIN_ISO_WEEKDAY || value > MAX_ISO_WEEKDAY) {
      rejected.push(token);
      continue;
    }
    if (!weekdays.includes(value)) weekdays.push(value);
  }

  if (rejected.length > 0) {
    warn(`${ENV_KEYS.weekdays} contiene valores no válidos (${rejected.join(',')}); se ignoran (se esperan días ISO ${MIN_ISO_WEEKDAY}=lunes … ${MAX_ISO_WEEKDAY}=domingo).`);
  }
  if (weekdays.length === 0) {
    warn(`${ENV_KEYS.weekdays}="${raw}" no contiene ningún día válido; se usan los días por defecto (${fallback.join(',')}).`);
    return fallback;
  }

  return weekdays.sort((a, b) => a - b);
};

// Reads and normalizes the four env knobs. Every invalid part warns and falls
// back to its default instead of throwing: a bad value in a .env must not be
// able to take the whole server down at boot.
const getReminderSchedule = () => {
  const rawTimezone = String(process.env[ENV_KEYS.timezone] ?? '').trim();
  let timezone = DEFAULT_REMINDER_SCHEDULE.timezone;
  if (rawTimezone !== '') {
    if (isValidTimeZone(rawTimezone)) {
      timezone = rawTimezone;
    } else {
      warn(`${ENV_KEYS.timezone}="${rawTimezone}" no es una zona horaria IANA válida; se usa ${timezone}.`);
    }
  }

  const startHour = parseHour(process.env[ENV_KEYS.startHour], DEFAULT_REMINDER_SCHEDULE.startHour, ENV_KEYS.startHour);
  const endHour = parseHour(process.env[ENV_KEYS.endHour], DEFAULT_REMINDER_SCHEDULE.endHour, ENV_KEYS.endHour);

  // endHour must be strictly greater than startHour: the end hour is exclusive
  // (09:00-18:00 means the last reminder goes out at 17:59), so equal hours
  // would describe an empty window. Both ends are reverted together — fixing
  // only one of them can still leave an empty (or backwards) window.
  if (endHour <= startHour) {
    warn(
      `${ENV_KEYS.startHour}=${startHour} y ${ENV_KEYS.endHour}=${endHour} no forman una ventana válida (la hora final es exclusiva y debe ser mayor); se usa ${DEFAULT_REMINDER_SCHEDULE.startHour}:00-${DEFAULT_REMINDER_SCHEDULE.endHour}:00.`
    );
    return {
      timezone,
      startHour: DEFAULT_REMINDER_SCHEDULE.startHour,
      endHour: DEFAULT_REMINDER_SCHEDULE.endHour,
      weekdays: DEFAULT_REMINDER_SCHEDULE.weekdays
    };
  }

  const weekdays = parseWeekdays(process.env[ENV_KEYS.weekdays], DEFAULT_REMINDER_SCHEDULE.weekdays);

  return { timezone, startHour, endHour, weekdays };
};

// Wall-clock parts of `date` as seen in `timeZone`, via formatToParts (a
// formatted string would have to be re-parsed and would be ambiguous). The
// formatter is memoized per zone: the job calls this ~96 times a day and
// building an Intl.DateTimeFormat is the expensive part.
const formatterCache = new Map();

const getFormatter = (timeZone) => {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  // `hour12: false` alone resolves to hourCycle h24 for en-US on some ICU
  // builds, which renders midnight as "24" and would push a 00:30 instant past
  // the end of the window; hourCycle pins it to h23. Note that the weekday part
  // is deliberately NOT requested — see toIsoWeekday.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
};

const getZonedParts = (date, timeZone) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type).value);
  return { year: read('year'), month: read('month'), day: read('day'), hour: read('hour') };
};

// ISO weekday (1 = Monday … 7 = Sunday) of a calendar date, derived from the
// y/m/d that formatToParts already returned. Asking Intl for the weekday part
// instead would hand back a *localized* name ("Monday", "lunes", …) that has to
// be matched by string — which breaks the moment the formatter's locale, the
// host's ICU data, or the label wording changes. Re-using the date parts is
// locale-independent and needs no parsing at all.
const toIsoWeekday = (year, month, day) => {
  const sundayBased = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
};

// True when `date` falls inside the schedule's window. Pure by design: it
// takes both the instant and the schedule explicitly and never reads
// process.env, so tests can pin a fixed instant and a fixed window.
const isWithinReminderWindow = (date, schedule) => {
  const { year, month, day, hour } = getZonedParts(date, schedule.timezone);
  if (!schedule.weekdays.includes(toIsoWeekday(year, month, day))) return false;

  // startHour inclusive, endHour exclusive.
  return hour >= schedule.startHour && hour < schedule.endHour;
};

// Collapses consecutive ISO weekdays into "lun-vie"-style ranges, the way a
// person would say it out loud ("lun,mié,vie" for a split schedule).
const formatWeekdays = (weekdays) => {
  const runs = [];
  for (const day of [...new Set(weekdays)].sort((a, b) => a - b)) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && day === lastRun[lastRun.length - 1] + 1) {
      lastRun.push(day);
    } else {
      runs.push([day]);
    }
  }

  return runs
    .map((run) => {
      const labels = run.map((day) => ISO_WEEKDAY_LABELS[day] || String(day));
      return run.length === 1 ? labels[0] : `${labels[0]}-${labels[labels.length - 1]}`;
    })
    .join(',');
};

const padHour = (hour) => String(hour).padStart(2, '0');

// One-line, human-readable summary for the job's startup log — the window is
// invisible otherwise, and "why did/no reminder go out?" is the first question
// asked when configuring this.
const describeReminderSchedule = (schedule) =>
  `${formatWeekdays(schedule.weekdays)} ${padHour(schedule.startHour)}:00-${padHour(schedule.endHour)}:00 (${schedule.timezone})`;

module.exports = {
  DEFAULT_REMINDER_SCHEDULE,
  getReminderSchedule,
  isWithinReminderWindow,
  describeReminderSchedule
};
