const axios = require('axios');
require('dotenv').config();
const Team = require('../models/Team');
const QaMember = require('../models/QaMember');

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:4200';
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || null;

const getTeamWebhookUrl = async (teamSlug) => {
  const team = await Team.findOne({ slug: teamSlug }).select('slackWebhookUrl');
  return team?.slackWebhookUrl ?? null;
};

const postToSlack = async (payload, webhookUrl) => {
  try {
    if (!webhookUrl) {
      console.log('Slack webhook no configurado (QA). Mensaje:', payload.text);
      return;
    }

    await axios.post(webhookUrl, payload);
    console.log('Notificacion QA enviada a Slack');
  } catch (error) {
    console.error('Error enviando notificacion QA a Slack:', error.message);
  }
};

const jiraLink = (qaRequest) => {
  if (qaRequest.jiraUrl) return qaRequest.jiraUrl;
  if (JIRA_BASE_URL) return `${JIRA_BASE_URL}/browse/${qaRequest.jiraKey}`;
  return null;
};

// The "Iniciar QA" / "Rechazar" action buttons attached to any Slack message
// that asks a reviewer to act on a request — the initial assignment, a
// reminder, and re-opening after changes were addressed all use these same
// two url-type buttons pointed at this same request's id.
const qaActionButtons = (qaRequest) => [
  {
    type: 'button',
    text: { type: 'plain_text', text: 'Iniciar QA', emoji: true },
    style: 'primary',
    action_id: 'qa_start_link',
    url: `${FRONTEND_BASE_URL}/qa/requests/${qaRequest._id}/start`
  },
  {
    type: 'button',
    text: { type: 'plain_text', text: 'Rechazar', emoji: true },
    style: 'danger',
    action_id: 'qa_reject_link',
    url: `${FRONTEND_BASE_URL}/qa/requests/${qaRequest._id}/reject`
  }
];

// Sends (or re-sends, when options.isReminder) the assignment notification for a
// QA request to the reviewer currently set on it, via the environment's team webhook.
const notifyQaAssigned = async (qaRequest, options = {}) => {
  try {
    if (!qaRequest.reviewerId) {
      console.log('QA: solicitud sin revisor, no se envia notificacion Slack');
      return;
    }

    const reviewer = await QaMember.findById(qaRequest.reviewerId).select('slackUserId name');
    if (!reviewer) {
      console.log('QA: revisor no encontrado, no se envia notificacion Slack');
      return;
    }

    const webhookUrl = await getTeamWebhookUrl(qaRequest.team);
    const link = jiraLink(qaRequest);
    const prefix = options.isReminder ? ':alarm_clock: *Recordatorio* — ' : ':mag: ';
    const ticketLine = link
      ? `<${link}|${qaRequest.jiraKey}>: ${qaRequest.jiraSummary}`
      : `*${qaRequest.jiraKey}*: ${qaRequest.jiraSummary}`;

    const text = `${options.isReminder ? 'Recordatorio: solicitud' : 'Nueva solicitud'} de QA para *${qaRequest.jiraKey}* en *${qaRequest.environmentName}*`;

    const payload = {
      text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${prefix}*Solicitud de QA*\n${ticketLine}\nAmbiente: *${qaRequest.environmentName}*\nRevisor: <@${reviewer.slackUserId}>`
          }
        },
        {
          type: 'actions',
          elements: qaActionButtons(qaRequest)
        }
      ]
    };

    await postToSlack(payload, webhookUrl);
  } catch (error) {
    console.error('Error preparando notificacion QA a Slack:', error.message);
  }
};

// Re-opens the conversation with the SAME reviewer after the developer
// addressed the requested changes (see qaRequestsService.retryQaRequest) —
// same action buttons as a fresh assignment, so the reviewer can start,
// or reject again, this second pass.
const notifyQaChangesAddressed = async (qaRequest) => {
  try {
    if (!qaRequest.reviewerId) {
      console.log('QA: solicitud sin revisor, no se envia notificacion Slack');
      return;
    }

    const reviewer = await QaMember.findById(qaRequest.reviewerId).select('slackUserId name');
    if (!reviewer) {
      console.log('QA: revisor no encontrado, no se envia notificacion Slack');
      return;
    }

    const webhookUrl = await getTeamWebhookUrl(qaRequest.team);
    const link = jiraLink(qaRequest);
    const ticketLine = link
      ? `<${link}|${qaRequest.jiraKey}>: ${qaRequest.jiraSummary}`
      : `*${qaRequest.jiraKey}*: ${qaRequest.jiraSummary}`;

    const text = `Cambios realizados para *${qaRequest.jiraKey}* — por favor revisar de nuevo`;

    const payload = {
      text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:repeat: *Cambios solicitados atendidos*\n${ticketLine}\nAmbiente: *${qaRequest.environmentName}*\nSe realizaron los cambios solicitados, por favor revisar de nuevo. Revisor: <@${reviewer.slackUserId}>`
          }
        },
        {
          type: 'actions',
          elements: qaActionButtons(qaRequest)
        }
      ]
    };

    await postToSlack(payload, webhookUrl);
  } catch (error) {
    console.error('Error preparando notificacion QA (cambios atendidos):', error.message);
  }
};

// No candidate left after exclusions/rejections: plain text, no mentions, no buttons.
const notifyQaUnassignable = async (qaRequest) => {
  try {
    const webhookUrl = await getTeamWebhookUrl(qaRequest.team);
    const text = `No hay revisores de QA disponibles para *${qaRequest.jiraKey}* (${qaRequest.environmentName}). Todos los candidatos fueron excluidos o rechazaron la solicitud.`;
    await postToSlack({ text }, webhookUrl);
  } catch (error) {
    console.error('Error preparando notificacion QA (sin revisores):', error.message);
  }
};

// Terminal notification once a QA request has been completed (approved or
// changes requested): pings the original requester so they know the outcome
// without having to check the /qa dashboard. Plain text, no buttons — there's
// no follow-up action to take from Slack for a completed request.
const notifyQaCompleted = async (qaRequest, result) => {
  try {
    if (!qaRequest.requesterId) {
      console.log('QA: solicitud sin solicitante, no se envia notificacion Slack de completado');
      return;
    }

    const requester = await QaMember.findById(qaRequest.requesterId).select('slackUserId name');
    if (!requester) {
      console.log('QA: solicitante no encontrado, no se envia notificacion Slack de completado');
      return;
    }

    let reviewerName = 'un revisor';
    if (qaRequest.reviewerId) {
      const reviewer = await QaMember.findById(qaRequest.reviewerId).select('name');
      if (reviewer) reviewerName = reviewer.name;
    }

    const webhookUrl = await getTeamWebhookUrl(qaRequest.team);
    const text = result === 'approved'
      ? `:white_check_mark: QA aprobado para *${qaRequest.jiraKey}* — ${qaRequest.jiraSummary}. Revisado por ${reviewerName}. <@${requester.slackUserId}>`
      : `:repeat: Se solicitaron cambios en *${qaRequest.jiraKey}* — ${qaRequest.jiraSummary}. Revisado por ${reviewerName}. <@${requester.slackUserId}>`;

    await postToSlack({ text }, webhookUrl);
  } catch (error) {
    console.error('Error preparando notificacion QA (completado):', error.message);
  }
};

// Lets the requester know their QA request moved from pending to in_progress
// — pings them so they know someone picked it up without checking the
// dashboard. Plain text, no buttons — there's no action for the requester
// to take from Slack at this point.
const notifyQaStarted = async (qaRequest) => {
  try {
    if (!qaRequest.requesterId) {
      console.log('QA: solicitud sin solicitante, no se envia notificacion Slack de inicio');
      return;
    }

    const requester = await QaMember.findById(qaRequest.requesterId).select('slackUserId name');
    if (!requester) {
      console.log('QA: solicitante no encontrado, no se envia notificacion Slack de inicio');
      return;
    }

    let reviewerName = 'un revisor';
    if (qaRequest.reviewerId) {
      const reviewer = await QaMember.findById(qaRequest.reviewerId).select('name');
      if (reviewer) reviewerName = reviewer.name;
    }

    const webhookUrl = await getTeamWebhookUrl(qaRequest.team);
    const text = `:eyes: QA iniciado para *${qaRequest.jiraKey}* — ${qaRequest.jiraSummary}. Revisando: ${reviewerName}. <@${requester.slackUserId}>`;

    await postToSlack({ text }, webhookUrl);
  } catch (error) {
    console.error('Error preparando notificacion QA (inicio):', error.message);
  }
};

module.exports = {
  notifyQaAssigned,
  notifyQaUnassignable,
  notifyQaCompleted,
  notifyQaChangesAddressed,
  notifyQaStarted
};
