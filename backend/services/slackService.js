const axios = require('axios');
require('dotenv').config();

const sendSlackNotification = async (message) => {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl || webhookUrl.includes('YOUR/WEBHOOK/URL')) {
      console.log('⚠️ Slack webhook no configurado. Mensaje:', message);
      return;
    }

    await axios.post(webhookUrl, {
      text: message
    });
    
    console.log('✅ Notificación enviada a Slack');
  } catch (error) {
    console.error('❌ Error enviando notificación a Slack:', error.message);
  }
};

const notifyEnvironmentOccupied = async (envName, branch, user) => {
  const message = `🚀 Ambiente *${envName}* ocupado con la rama *${branch}* por *${user}*.`;
  await sendSlackNotification(message);
};

const notifyEnvironmentReleased = async (envName) => {
  const message = `✅ Ambiente *${envName}* ha sido liberado y está disponible para despliegue.`;
  await sendSlackNotification(message);
};

module.exports = {
  notifyEnvironmentOccupied,
  notifyEnvironmentReleased
};
