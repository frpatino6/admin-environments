const { sendOverdueReminders } = require('../services/qaRequestsService');
const { getReminderSchedule, isWithinReminderWindow, describeReminderSchedule } = require('../services/qaReminderSchedule');

// Plain setInterval-based escalation job — the repo has no node-cron dependency
// and this doesn't need cron-level precision, just a periodic sweep.
const startQaEscalationJob = () => {
  const intervalMinutes = Number(process.env.QA_ESCALATION_CHECK_INTERVAL_MIN) || 15;
  const reminderHours = Number(process.env.QA_REMINDER_INTERVAL_HOURS) || 4;
  const intervalMs = intervalMinutes * 60 * 1000;
  // Resolved once, here: the window is fixed for the life of the process, so
  // the startup log, the skip check below and the gate inside
  // sendOverdueReminders always agree with each other.
  const schedule = getReminderSchedule();
  const scheduleLabel = describeReminderSchedule(schedule);
  // This job wakes up ~96 times a day, ~60 of them outside the reminder window.
  // Logging the paused state on every tick would bury the rest of the output,
  // so it is only announced on the transitions into and out of it.
  let outsideWindow = false;

  const timer = setInterval(async () => {
    if (!isWithinReminderWindow(new Date(), schedule)) {
      if (!outsideWindow) {
        outsideWindow = true;
        console.log(`⏸️ QA: recordatorios de QA pausados (fuera de ${scheduleLabel})`);
      }
      // Skip the call entirely — no point querying MongoDB for requests we're
      // not allowed to remind anyone about.
      return;
    }

    if (outsideWindow) {
      outsideWindow = false;
      console.log(`▶️ QA: recordatorios de QA reactivados (${scheduleLabel})`);
    }

    try {
      const count = await sendOverdueReminders(reminderHours, { schedule });
      if (count > 0) {
        console.log(`⏰ QA: ${count} recordatorio(s) de QA enviados`);
      }
    } catch (error) {
      console.error('❌ Error ejecutando el job de escalación de QA:', error.message);
    }
  }, intervalMs);

  // Don't keep the process alive just for this timer (useful in tests/scripts).
  if (typeof timer.unref === 'function') timer.unref();

  console.log(`⏰ QA: job de escalación iniciado (cada ${intervalMinutes} min, umbral de recordatorio ${reminderHours}h, horario de recordatorios: ${scheduleLabel})`);

  return timer;
};

module.exports = { startQaEscalationJob };
