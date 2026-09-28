const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_REMINDER_SCHEDULE,
  getReminderSchedule,
  isWithinReminderWindow,
  describeReminderSchedule
} = require('../services/qaReminderSchedule');

// Pure module (no DB, no HTTP) — exercised with plain objects and fixed
// instants, so the assertions are the same whether the suite runs at 03:00 on
// a Saturday or at noon on a Wednesday. All window math is pinned to
// `timezone: 'UTC'` here so a fixed ISO instant maps to a known local
// wall-clock; the timezone itself is asserted separately at the bottom.

const UTC_SCHEDULE = {
  timezone: 'UTC',
  startHour: 9,
  endHour: 18,
  weekdays: [1, 2, 3, 4, 5]
};

// 2026-09-28 is a Monday, 2026-10-03 a Saturday and 2026-10-04 a Sunday, so a
// single week of instants is enough to cover every branch.
const MONDAY_09_00 = new Date('2026-09-28T09:00:00Z');
const MONDAY_12_00 = new Date('2026-09-28T12:00:00Z');
const SATURDAY_12_00 = new Date('2026-10-03T12:00:00Z');
const SUNDAY_12_00 = new Date('2026-10-04T12:00:00Z');
const NEXT_MONDAY_12_00 = new Date('2026-10-05T12:00:00Z');

const SCHEDULE_ENV_KEYS = [
  'QA_REMINDER_TIMEZONE',
  'QA_REMINDER_START_HOUR',
  'QA_REMINDER_END_HOUR',
  'QA_REMINDER_WEEKDAYS'
];

// Applies exactly the env given (any key not listed is *deleted*, so a value
// left over from a previous test can never influence this one), runs fn, and
// restores the previous process.env no matter how fn ends. node:test runs the
// tests of a file sequentially, so this is enough to keep them independent.
const withScheduleEnv = (env, fn) => {
  const previous = {};
  for (const key of SCHEDULE_ENV_KEYS) {
    previous[key] = process.env[key];
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  }

  try {
    return fn();
  } finally {
    for (const key of SCHEDULE_ENV_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
};

test('the default schedule is Monday-Friday, 09:00-18:00, in the server zone', () => {
  assert.equal(DEFAULT_REMINDER_SCHEDULE.startHour, 9);
  assert.equal(DEFAULT_REMINDER_SCHEDULE.endHour, 18);
  assert.deepEqual([...DEFAULT_REMINDER_SCHEDULE.weekdays], [1, 2, 3, 4, 5]);
  assert.equal(
    DEFAULT_REMINDER_SCHEDULE.timezone,
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  assert.ok(Object.isFrozen(DEFAULT_REMINDER_SCHEDULE));
});

test('the start hour is inside the window and the end hour is outside it (exclusive)', () => {
  assert.equal(isWithinReminderWindow(MONDAY_09_00, UTC_SCHEDULE), true);
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T18:00:00Z'), UTC_SCHEDULE), false);
  // ...and the last minute inside the window really is 17:59.
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T17:59:00Z'), UTC_SCHEDULE), true);
});

test('an instant before the start hour or after the end hour is outside the window', () => {
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T08:59:00Z'), UTC_SCHEDULE), false);
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T23:59:00Z'), UTC_SCHEDULE), false);
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T00:00:00Z'), UTC_SCHEDULE), false);
});

test('Saturday and Sunday are outside the window, the following Monday is inside', () => {
  assert.equal(isWithinReminderWindow(SATURDAY_12_00, UTC_SCHEDULE), false);
  assert.equal(isWithinReminderWindow(SUNDAY_12_00, UTC_SCHEDULE), false);
  assert.equal(isWithinReminderWindow(NEXT_MONDAY_12_00, UTC_SCHEDULE), true);
});

test('a custom schedule with different hours is honored', () => {
  const earlyShift = { timezone: 'UTC', startHour: 7, endHour: 11, weekdays: [1, 2, 3, 4, 5] };

  assert.equal(isWithinReminderWindow(new Date('2026-09-28T07:00:00Z'), earlyShift), true);
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T10:59:00Z'), earlyShift), true);
  assert.equal(isWithinReminderWindow(new Date('2026-09-28T11:00:00Z'), earlyShift), false);
  // The default window is open at 09:00, this one is not: the hours really do
  // come from the schedule argument.
  assert.equal(isWithinReminderWindow(MONDAY_09_00, earlyShift), true);
  assert.equal(isWithinReminderWindow(MONDAY_12_00, earlyShift), false);
  assert.equal(isWithinReminderWindow(MONDAY_12_00, UTC_SCHEDULE), true);
});

test('a single-weekday schedule only ever opens on that weekday', () => {
  const mondaysOnly = { timezone: 'UTC', startHour: 9, endHour: 18, weekdays: [1] };

  assert.equal(isWithinReminderWindow(MONDAY_12_00, mondaysOnly), true);
  assert.equal(isWithinReminderWindow(new Date('2026-09-29T12:00:00Z'), mondaysOnly), false); // Tuesday
  assert.equal(isWithinReminderWindow(NEXT_MONDAY_12_00, mondaysOnly), true);
  assert.equal(isWithinReminderWindow(SATURDAY_12_00, mondaysOnly), false);
});

test('a weekend-only schedule ignores the default Monday-Friday days', () => {
  const weekendOnly = { timezone: 'UTC', startHour: 9, endHour: 18, weekdays: [6, 7] };

  assert.equal(isWithinReminderWindow(SATURDAY_12_00, weekendOnly), true);
  assert.equal(isWithinReminderWindow(SUNDAY_12_00, weekendOnly), true);
  assert.equal(isWithinReminderWindow(MONDAY_12_00, weekendOnly), false);
});

test('isWithinReminderWindow never reads process.env — the schedule argument alone decides', () => {
  withScheduleEnv(
    { QA_REMINDER_START_HOUR: '0', QA_REMINDER_END_HOUR: '23', QA_REMINDER_WEEKDAYS: '1,2,3,4,5,6,7' },
    () => {
      // The env above would allow this instant, but the explicit schedule does
      // not — proving the decision comes from the argument.
      assert.equal(isWithinReminderWindow(MONDAY_12_00, UTC_SCHEDULE), true);
      assert.equal(isWithinReminderWindow(SUNDAY_12_00, UTC_SCHEDULE), false);
    }
  );
});

test('getReminderSchedule falls back to the defaults when no env is set', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({}, () => {
    const schedule = getReminderSchedule();

    assert.equal(schedule.timezone, DEFAULT_REMINDER_SCHEDULE.timezone);
    assert.equal(schedule.startHour, 9);
    assert.equal(schedule.endHour, 18);
    assert.deepEqual([...schedule.weekdays], [1, 2, 3, 4, 5]);
  });

  assert.equal(warn.mock.callCount(), 0);
});

test('getReminderSchedule honors valid env values', () => {
  withScheduleEnv(
    {
      QA_REMINDER_TIMEZONE: 'America/Mexico_City',
      QA_REMINDER_START_HOUR: '8',
      QA_REMINDER_END_HOUR: '16',
      QA_REMINDER_WEEKDAYS: '1,3,5'
    },
    () => {
      const schedule = getReminderSchedule();

      assert.equal(schedule.timezone, 'America/Mexico_City');
      assert.equal(schedule.startHour, 8);
      assert.equal(schedule.endHour, 16);
      assert.deepEqual([...schedule.weekdays], [1, 3, 5]);
    }
  );
});

test('getReminderSchedule tolerates surrounding whitespace and duplicate days', () => {
  withScheduleEnv(
    { QA_REMINDER_START_HOUR: ' 10 ', QA_REMINDER_END_HOUR: '14', QA_REMINDER_WEEKDAYS: ' 2 , 2 , 4 ' },
    () => {
      const schedule = getReminderSchedule();

      assert.equal(schedule.startHour, 10);
      assert.equal(schedule.endHour, 14);
      assert.deepEqual([...schedule.weekdays], [2, 4]);
    }
  );
});

test('getReminderSchedule warns and falls back to the default hours for garbage input', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({ QA_REMINDER_START_HOUR: 'abc' }, () => {
    const schedule = getReminderSchedule();

    assert.equal(schedule.startHour, 9);
    assert.equal(schedule.endHour, 18);
  });

  assert.ok(warn.mock.callCount() >= 1);
});

test('getReminderSchedule rejects out-of-range hours', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({ QA_REMINDER_START_HOUR: '25' }, () => {
    assert.equal(getReminderSchedule().startHour, 9);
  });
  withScheduleEnv({ QA_REMINDER_END_HOUR: '-3' }, () => {
    assert.equal(getReminderSchedule().endHour, 18);
  });
  withScheduleEnv({ QA_REMINDER_START_HOUR: '9.5' }, () => {
    assert.equal(getReminderSchedule().startHour, 9);
  });

  assert.ok(warn.mock.callCount() >= 3);
});

test('getReminderSchedule rejects an end hour that is not after the start hour', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({ QA_REMINDER_START_HOUR: '20', QA_REMINDER_END_HOUR: '10' }, () => {
    const schedule = getReminderSchedule();

    // Both ends revert together: repairing only one would still leave a
    // backwards (empty) window.
    assert.equal(schedule.startHour, 9);
    assert.equal(schedule.endHour, 18);
  });

  withScheduleEnv({ QA_REMINDER_START_HOUR: '10', QA_REMINDER_END_HOUR: '10' }, () => {
    const schedule = getReminderSchedule();

    assert.equal(schedule.startHour, 9);
    assert.equal(schedule.endHour, 18);
  });

  assert.ok(warn.mock.callCount() >= 2);
});

test('getReminderSchedule rejects an unknown IANA timezone and keeps the server zone', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({ QA_REMINDER_TIMEZONE: 'Not/AZone' }, () => {
    assert.equal(getReminderSchedule().timezone, DEFAULT_REMINDER_SCHEDULE.timezone);
  });

  assert.ok(warn.mock.callCount() >= 1);
});

test('getReminderSchedule rejects an empty or fully invalid weekday list', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({ QA_REMINDER_WEEKDAYS: '' }, () => {
    assert.deepEqual([...getReminderSchedule().weekdays], [1, 2, 3, 4, 5]);
  });
  withScheduleEnv({ QA_REMINDER_WEEKDAYS: '   ' }, () => {
    assert.deepEqual([...getReminderSchedule().weekdays], [1, 2, 3, 4, 5]);
  });
  withScheduleEnv({ QA_REMINDER_WEEKDAYS: 'lun,martes' }, () => {
    assert.deepEqual([...getReminderSchedule().weekdays], [1, 2, 3, 4, 5]);
  });
  withScheduleEnv({ QA_REMINDER_WEEKDAYS: '0,8' }, () => {
    assert.deepEqual([...getReminderSchedule().weekdays], [1, 2, 3, 4, 5]);
  });

  assert.ok(warn.mock.callCount() >= 4);
});

test('getReminderSchedule keeps the valid days when only some of them are garbage', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  withScheduleEnv({ QA_REMINDER_WEEKDAYS: '1,foo,5,9' }, () => {
    assert.deepEqual([...getReminderSchedule().weekdays], [1, 5]);
  });

  assert.ok(warn.mock.callCount() >= 1);
});

test('the timezone decides, not the server clock: the same instant flips with the zone', () => {
  // 15:00 UTC on Monday: inside 09:00-18:00 as-is, but 20:30 on Monday in
  // Asia/Kolkata (UTC+5:30, no DST ever) — pushed past the end of the window.
  const instant = new Date('2026-09-28T15:00:00Z');

  assert.equal(
    isWithinReminderWindow(instant, { ...UTC_SCHEDULE, timezone: 'Asia/Kolkata' }),
    false
  );
  assert.equal(isWithinReminderWindow(instant, UTC_SCHEDULE), true);
});

test('the timezone can also push an instant onto an excluded weekday', () => {
  // 16:00 UTC on Monday is 06:00 on Saturday in Pacific/Honolulu (UTC-10, no
  // DST), which the Monday-Friday window excludes.
  const instant = new Date('2026-09-28T16:00:00Z');

  assert.equal(
    isWithinReminderWindow(instant, { ...UTC_SCHEDULE, timezone: 'Pacific/Honolulu' }),
    false
  );
  assert.equal(isWithinReminderWindow(instant, UTC_SCHEDULE), true);
});

test('the timezone can also open the window for an instant that is closed in UTC', () => {
  // 08:00 UTC on Monday is one hour short of the window, but 10:00 on Monday
  // in Europe/Madrid (UTC+2 in September) — comfortably inside it.
  const instant = new Date('2026-09-28T08:00:00Z');
  const madrid = { ...UTC_SCHEDULE, timezone: 'Europe/Madrid' };

  assert.equal(isWithinReminderWindow(instant, UTC_SCHEDULE), false); // 08:00 < 09:00
  assert.equal(isWithinReminderWindow(instant, madrid), true); // 10:00 Madrid
});

test('describeReminderSchedule renders the window for the startup log', () => {
  assert.equal(describeReminderSchedule(UTC_SCHEDULE), 'lun-vie 09:00-18:00 (UTC)');
  assert.equal(
    describeReminderSchedule({ ...UTC_SCHEDULE, weekdays: [1], timezone: 'America/Mexico_City' }),
    'lun 09:00-18:00 (America/Mexico_City)'
  );
  assert.equal(
    describeReminderSchedule({ ...UTC_SCHEDULE, weekdays: [1, 3, 5], startHour: 8, endHour: 9 }),
    'lun,mié,vie 08:00-09:00 (UTC)'
  );
  assert.equal(
    describeReminderSchedule({ ...UTC_SCHEDULE, weekdays: [6, 7] }),
    'sáb-dom 09:00-18:00 (UTC)'
  );
});
