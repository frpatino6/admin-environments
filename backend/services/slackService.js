const axios = require('axios');
require('dotenv').config();

const normalizeWebhookUrls = (webhookUrls) => {
  const urls = Array.isArray(webhookUrls) ? webhookUrls : [webhookUrls];

  return [...new Set(
    urls
      .filter(Boolean)
      .map((url) => url.trim())
      .filter(Boolean)
  )];
};

const sendSlackNotification = async (message, webhookUrl) => {
  try {
    if (!webhookUrl) {
      console.log('Slack webhook no configurado. Mensaje:', message);
      return;
    }

    await axios.post(webhookUrl, { text: message });

    console.log('Notificacion enviada a Slack');
  } catch (error) {
    console.error('Error enviando notificacion a Slack:', error.message);
  }
};

const sendSlackNotifications = async (message, webhookUrls) => {
  const urls = normalizeWebhookUrls(webhookUrls);

  if (!urls.length) {
    console.log('Slack webhook no configurado. Mensaje:', message);
    return;
  }

  await Promise.all(urls.map((url) => sendSlackNotification(message, url)));
};

const notifyEnvironmentOccupied = async (envName, branch, user, webhookUrls) => {
  const message = `Ambiente *${envName}* ocupado con la rama *${branch}* por *${user}*.`;
  await sendSlackNotifications(message, webhookUrls);
};

const notifyEnvironmentReleased = async (envName, releasedBy, webhookUrls) => {
  const message = `Ambiente *${envName}* ha sido liberado por *${releasedBy}* y esta disponible para despliegue.`;
  await sendSlackNotifications(message, webhookUrls);
};

module.exports = {
  notifyEnvironmentOccupied,
  notifyEnvironmentReleased
};
