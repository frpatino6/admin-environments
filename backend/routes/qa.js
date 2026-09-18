const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const qaRequestsService = require('../services/qaRequestsService');
const { HttpError } = qaRequestsService;

const handleError = (res, error, fallbackMessage) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  res.status(500).json({ message: fallbackMessage, error: error.message });
};

// ── QA members ──────────────────────────────────────────────────────────

// Returns members ordered to match the real assignment queue: active members
// first, sorted exactly as pickReviewer would rank them (lowest active QA
// load, ties broken by oldest lastAssignedAt — never-assigned first), then
// inactive members after (by name — queue position is meaningless for
// someone not eligible for assignment). See
// qaRequestsService.getMembersForDisplay for the shared ranking logic.
//
// QaMember rosters are per-team, so ?team= is required — there is no
// "everyone across every team" listing.
router.get('/members', async (req, res) => {
  try {
    const { team } = req.query;
    if (!team) {
      return res.status(400).json({ message: 'Se requiere team' });
    }
    const activeFilter = req.query.active !== undefined ? req.query.active === 'true' : undefined;
    const members = await qaRequestsService.getMembersForDisplay(activeFilter, team);
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener integrantes de QA', error: error.message });
  }
});

router.post('/members', async (req, res) => {
  try {
    const { name, slackUserId, team } = req.body;
    if (!name || !slackUserId || !team) {
      return res.status(400).json({ message: 'Se requiere name, slackUserId y team' });
    }
    const member = await QaMember.create({ name, slackUserId, team });
    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear integrante de QA', error: error.message });
  }
});

router.patch('/members/:id/active', async (req, res) => {
  try {
    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'Se requiere active (boolean)' });
    }
    const member = await QaMember.findByIdAndUpdate(req.params.id, { active }, { new: true });
    if (!member) {
      return res.status(404).json({ message: 'Integrante de QA no encontrado' });
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar integrante de QA', error: error.message });
  }
});

// ── QA requests ──────────────────────────────────────────────────────────

router.get('/requests', async (req, res) => {
  try {
    const filter = {};
    if (req.query.environmentName) filter.environmentName = req.query.environmentName;
    if (req.query.team) filter.team = req.query.team;
    if (req.query.status) filter.status = req.query.status;

    const requests = await QaRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('requesterId', 'name slackUserId')
      .populate('reviewerId', 'name slackUserId')
      .populate('rejections.reviewerId', 'name slackUserId');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener solicitudes de QA', error: error.message });
  }
});

router.get('/requests/:id', async (req, res) => {
  try {
    const request = await QaRequest.findById(req.params.id)
      .populate('requesterId', 'name slackUserId')
      .populate('reviewerId', 'name slackUserId')
      .populate('rejections.reviewerId', 'name slackUserId');
    if (!request) {
      return res.status(404).json({ message: 'Solicitud de QA no encontrada' });
    }
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la solicitud de QA', error: error.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const { jiraKey, jiraSummary, jiraUrl, requesterId, environmentName, team } = req.body;
    const qaRequest = await qaRequestsService.createQaRequest({
      jiraKey,
      jiraSummary,
      jiraUrl,
      requesterId,
      environmentName,
      team
    });
    res.status(201).json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al crear la solicitud de QA');
  }
});

router.post('/requests/:id/start', async (req, res) => {
  try {
    const qaRequest = await qaRequestsService.startQa(req.params.id);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al iniciar la QA');
  }
});

router.post('/requests/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const qaRequest = await qaRequestsService.rejectQaRequest(req.params.id, reason);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al rechazar la solicitud de QA');
  }
});

router.post('/requests/:id/complete', async (req, res) => {
  try {
    const { result } = req.body;
    const qaRequest = await qaRequestsService.completeQaRequest(req.params.id, result);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al completar la solicitud de QA');
  }
});

// ── Slack interactivity ─────────────────────────────────────────────────

// Verifies the request truly comes from Slack: v0=hex-HMAC-SHA256(signingSecret,
// `v0:{timestamp}:{rawBody}`) must match X-Slack-Signature, and the timestamp
// must be within 5 minutes to prevent replay attacks.
const verifySlackSignature = (req) => {
  const signingSecret = process.env.QA_SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  if (!timestamp || !signature) return false;

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (Number(timestamp) < fiveMinutesAgo) return false;

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');
  const computedSignature = `v0=${hmac}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
  } catch {
    return false;
  }
};

router.post('/slack/interactions', async (req, res) => {
  if (!verifySlackSignature(req)) {
    return res.status(401).send('Firma inválida');
  }

  let payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch (error) {
    return res.status(400).send('Payload inválido');
  }

  const action = payload?.actions?.[0];

  if (action?.action_id === 'qa_start') {
    try {
      await qaRequestsService.startQa(action.value);
    } catch (error) {
      console.error('Error procesando acción qa_start de Slack:', error.message);
    }
  }
  // Other action_ids (e.g. the "Rechazar" url button) need no server-side handling.

  res.status(200).send('');
});

module.exports = router;
