const axios = require('axios');
require('dotenv').config();

const sendSlackNotification = async (message, webhookUrl) => {
  try {
    const url = webhookUrl || null;

    if (!url) {
      console.log('⚠️ Slack webhook no configurado. Mensaje:', message);
      return;
    }

    await axios.post(url, { text: message });

    console.log('✅ Notificación enviada a Slack');
  } catch (error) {
    console.error('❌ Error enviando notificación a Slack:', error.message);
  }
};

const notifyEnvironmentOccupied = async (envName, branch, user, webhookUrl) => {
  const message = `🚀 Ambiente *${envName}* ocupado con la rama *${branch}* por *${user}*.`;
  await sendSlackNotification(message, webhookUrl);
};

const notifyEnvironmentReleased = async (envName, releasedBy, webhookUrl) => {
  const message = `✅ Ambiente *${envName}* ha sido liberado por *${releasedBy}* y está disponible para despliegue.`;
  await sendSlackNotification(message, webhookUrl);
};

module.exports = {
  notifyEnvironmentOccupied,
  notifyEnvironmentReleased
};
