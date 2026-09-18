const { sendOverdueReminders } = require('../services/qaRequestsService');

// Plain setInterval-based escalation job — the repo has no node-cron dependency
// and this doesn't need cron-level precision, just a periodic sweep.
const startQaEscalationJob = () => {
  const intervalMinutes = Number(process.env.QA_ESCALATION_CHECK_INTERVAL_MIN) || 15;
  const reminderHours = Number(process.env.QA_REMINDER_INTERVAL_HOURS) || 4;
  const intervalMs = intervalMinutes * 60 * 1000;

  const timer = setInterval(async () => {
    try {
      const count = await sendOverdueReminders(reminderHours);
      if (count > 0) {
        console.log(`⏰ QA: ${count} recordatorio(s) de QA enviados`);
      }
    } catch (error) {
      console.error('❌ Error ejecutando el job de escalación de QA:', error.message);
    }
  }, intervalMs);

  // Don't keep the process alive just for this timer (useful in tests/scripts).
  if (typeof timer.unref === 'function') timer.unref();

  console.log(`⏰ QA: job de escalación iniciado (cada ${intervalMinutes} min, umbral de recordatorio ${reminderHours}h)`);

  return timer;
};

module.exports = { startQaEscalationJob };
