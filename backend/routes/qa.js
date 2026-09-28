const express = require('express');
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
    const io = req.app.get('io');
    const qaRequest = await qaRequestsService.createQaRequest({
      jiraKey,
      jiraSummary,
      jiraUrl,
      requesterId,
      environmentName,
      team
    }, io);
    res.status(201).json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al crear la solicitud de QA');
  }
});

router.post('/requests/:id/start', async (req, res) => {
  try {
    const io = req.app.get('io');
    const qaRequest = await qaRequestsService.startQa(req.params.id, io);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al iniciar la QA');
  }
});

router.post('/requests/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const io = req.app.get('io');
    const qaRequest = await qaRequestsService.rejectQaRequest(req.params.id, reason, io);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al rechazar la solicitud de QA');
  }
});

router.post('/requests/:id/reassign', async (req, res) => {
  try {
    const { reviewerId } = req.body;
    const io = req.app.get('io');
    const qaRequest = await qaRequestsService.reassignQaRequest(req.params.id, reviewerId, io);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al reasignar la solicitud de QA');
  }
});

router.post('/requests/:id/retry', async (req, res) => {
  try {
    const io = req.app.get('io');
    const qaRequest = await qaRequestsService.retryQaRequest(req.params.id, io);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al reintentar la solicitud de QA');
  }
});

router.post('/requests/:id/complete', async (req, res) => {
  try {
    const { result } = req.body;
    const io = req.app.get('io');
    const qaRequest = await qaRequestsService.completeQaRequest(req.params.id, result, io);
    res.json(qaRequest);
  } catch (error) {
    handleError(res, error, 'Error al completar la solicitud de QA');
  }
});

module.exports = router;
