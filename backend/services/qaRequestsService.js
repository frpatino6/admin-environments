const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const { pickReviewer, compareByQueuePriority } = require('./qaAssignment');
const qaSlackService = require('./qaSlackService');

const ACTIVE_QA_STATUSES = ['pending', 'in_progress'];

const toIdString = (id) => (id ? id.toString() : id);

// Broadcasts the minimal shape a QA dashboard needs to know "this team's
// queue changed, go refetch" — reviewerId/requesterId aren't populated at
// this layer, so we don't emit the full document. `io` is optional so
// callers (including existing tests) that don't pass a socket server keep
// working unchanged.
const emitQaUpdated = (io, qaRequest) => {
  io?.emit('qa-updated', {
    _id: qaRequest._id,
    team: qaRequest.team,
    environmentName: qaRequest.environmentName,
    status: qaRequest.status
  });
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Every member id that must never be (re)picked as reviewer for this request:
// the original requester plus everyone who has ever rejected it — not just the
// most recent rejecter. Pure — takes a plain object/doc, no DB access.
const computeExcludedReviewerIds = (qaRequest) => {
  const ids = new Set();
  if (qaRequest.requesterId) ids.add(toIdString(qaRequest.requesterId));
  for (const rejection of qaRequest.rejections || []) {
    if (rejection.reviewerId) ids.add(toIdString(rejection.reviewerId));
  }
  return [...ids];
};

// Computes, for every currently-active QaMember OF THE GIVEN TEAM, exactly
// the data pickReviewer ranks on: their current active QA load
// (pending/in_progress count) and their lastAssignedAt. This is the single
// source of truth both buildCandidates (assignment, below) and
// getMembersForDisplay (the /members list's "who's next" ordering) build
// on — so the queue shown to users and the queue actually used to assign can
// never diverge. Each entry keeps a reference to the full lean member doc so
// display code doesn't need a second query.
//
// QaMember rosters are per-team (each team registers its own reviewers), so
// `team` is required here — there is no meaningful "everyone, any team"
// query for assignment or display purposes.
const computeActiveMemberLoads = async (team) => {
  const members = await QaMember.find({ active: true, team }).lean();
  if (members.length === 0) return [];

  // Active QA load is still counted globally per member (a member only
  // belongs to one team's roster anyway, so this is naturally team-scoped
  // too — no need to also filter the aggregate by team).
  const loadByMember = await QaRequest.aggregate([
    { $match: { status: { $in: ACTIVE_QA_STATUSES }, reviewerId: { $ne: null } } },
    { $group: { _id: '$reviewerId', count: { $sum: 1 } } }
  ]);
  const loadMap = new Map(loadByMember.map((l) => [toIdString(l._id), l.count]));

  return members.map((m) => ({
    id: toIdString(m._id),
    activeLoad: loadMap.get(toIdString(m._id)) || 0,
    lastAssignedAt: m.lastAssignedAt || null,
    member: m
  }));
};

// Builds the candidate list for pickReviewer: every active QaMember of the
// given team not already excluded, enriched with their current active QA
// load (pending/in_progress count).
const buildCandidates = async (excludeIds = [], team) => {
  const excludedSet = new Set(excludeIds.map(toIdString));

  const allActive = await computeActiveMemberLoads(team);
  return allActive
    .filter((c) => !excludedSet.has(c.id))
    .map(({ id, activeLoad, lastAssignedAt }) => ({ id, activeLoad, lastAssignedAt }));
};

// Orders active-member candidates the same way pickReviewer would rank them
// (see compareByQueuePriority): lowest activeLoad first, ties broken by
// oldest lastAssignedAt (never-assigned sorts first). Adds a final tiebreak
// by name so the order is fully deterministic even when every candidate ties
// on both — e.g. right after seeding, when everyone's activeLoad is 0 and
// lastAssignedAt is null.
const rankMembersByQueue = (candidates) =>
  candidates.slice().sort((a, b) => {
    const priority = compareByQueuePriority(a, b);
    if (priority !== 0) return priority;
    return (a.member?.name || '').localeCompare(b.member?.name || '');
  });

// Returns QaMembers of the given team in "who's genuinely next" order for
// display: active members first, ranked via rankMembersByQueue (the exact
// order pickReviewer would use), each annotated with its current
// activeLoad; then inactive members after (in any stable order — queue
// position is meaningless for someone not accepting QA work), sorted by
// name.
//
// activeFilter mirrors the historic ?active= query semantics: undefined
// returns everyone (active queue-ordered, then inactive by name), true
// returns only the active/queue-ordered list, false returns only inactive
// members (by name — there is no queue to rank them in). `team` is required
// — rosters are per-team.
const getMembersForDisplay = async (activeFilter, team) => {
  const inactiveOrdered = async () => {
    const inactive = await QaMember.find({ active: false, team }).sort({ name: 1 }).lean();
    return inactive.map((m) => ({ ...m, activeLoad: null }));
  };

  if (activeFilter === false) return inactiveOrdered();

  const activeCandidates = await computeActiveMemberLoads(team);
  const orderedActive = rankMembersByQueue(activeCandidates).map((c) => ({
    ...c.member,
    activeLoad: c.activeLoad
  }));

  if (activeFilter === true) return orderedActive;

  return [...orderedActive, ...(await inactiveOrdered())];
};

const createQaRequest = async ({ jiraKey, jiraSummary, jiraUrl, requesterId, environmentName, team }, io) => {
  if (!jiraKey || !jiraSummary || !requesterId || !environmentName || !team) {
    throw new HttpError(400, 'Se requiere jiraKey, jiraSummary, requesterId, environmentName y team');
  }

  // "shared" is the literal placeholder value Environment/QaRequest.team
  // takes for a shared environment that isn't currently resolved to a real
  // occupying team (see dashboard.component.ts's resolveTeam()). There is
  // no QaMember roster registered under "shared" — and never should be, per
  // design — so a request that reached here with this value would be
  // permanently unassignable. Block it outright instead of silently
  // creating a broken/unassignable request; the frontend already guards
  // against opening the request dialog in this state, but never trust only
  // client-side validation for a route another client could call directly.
  if (team === 'shared') {
    throw new HttpError(
      400,
      'No se puede solicitar QA en un ambiente compartido que no está ocupado por un equipo'
    );
  }

  const requester = await QaMember.findById(requesterId);
  if (!requester) {
    throw new HttpError(400, 'El solicitante indicado no existe');
  }
  if (toIdString(requester.team) !== team) {
    throw new HttpError(400, 'El solicitante no pertenece al equipo de esta solicitud');
  }

  const candidates = await buildCandidates([requesterId], team);
  const reviewer = pickReviewer(candidates, []);

  // Defensive invariant: the requester must never be picked as their own
  // reviewer. buildCandidates([requesterId]) already excludes them, so this
  // should be unreachable — but if it ever fires, fail loudly instead of
  // silently creating a broken request.
  if (reviewer && toIdString(reviewer.id) === toIdString(requesterId)) {
    console.error('[qaRequestsService] INVARIANT VIOLATION: reviewer === requester on create', {
      requesterId: toIdString(requesterId),
      reviewerId: reviewer.id
    });
    throw new HttpError(500, 'Error interno: el revisor asignado no puede ser el mismo solicitante');
  }

  const qaRequest = await QaRequest.create({
    jiraKey,
    jiraSummary,
    jiraUrl: jiraUrl || null,
    requesterId,
    reviewerId: reviewer ? reviewer.id : null,
    status: reviewer ? 'pending' : 'unassignable',
    environmentName,
    team,
    assignedAt: new Date()
  });

  if (reviewer) {
    await QaMember.findByIdAndUpdate(reviewer.id, { lastAssignedAt: new Date() });
    await qaSlackService.notifyQaAssigned(qaRequest);
  } else {
    await qaSlackService.notifyQaUnassignable(qaRequest);
  }

  emitQaUpdated(io, qaRequest);
  return qaRequest;
};

const startQa = async (id, io) => {
  const qaRequest = await QaRequest.findById(id);
  if (!qaRequest) throw new HttpError(404, 'Solicitud de QA no encontrada');

  if (qaRequest.status !== 'pending') {
    throw new HttpError(400, `No se puede iniciar QA: la solicitud está en estado '${qaRequest.status}'`);
  }

  qaRequest.status = 'in_progress';
  qaRequest.acceptedAt = new Date();
  await qaRequest.save();
  await qaSlackService.notifyQaStarted(qaRequest);
  emitQaUpdated(io, qaRequest);
  return qaRequest;
};

const rejectQaRequest = async (id, reason, io) => {
  if (!reason || !reason.trim()) {
    throw new HttpError(400, 'Se requiere una razón de rechazo');
  }

  const current = await QaRequest.findById(id);
  if (!current) throw new HttpError(404, 'Solicitud de QA no encontrada');

  if (!current.reviewerId) {
    throw new HttpError(400, 'La solicitud no tiene un revisor asignado para rechazar');
  }

  // The reviewer we are actually rejecting — captured now and used both as
  // the rejection record and as the optimistic-concurrency guard below.
  const previousReviewerId = current.reviewerId;
  const rejectionEntry = {
    reviewerId: previousReviewerId,
    reason: reason.trim(),
    rejectedAt: new Date()
  };

  const excludeIds = computeExcludedReviewerIds({
    requesterId: current.requesterId,
    rejections: [...(current.rejections || []), rejectionEntry]
  });
  const candidates = await buildCandidates(excludeIds, current.team);
  const nextReviewer = pickReviewer(candidates, []);

  const requesterIdStr = toIdString(current.requesterId);

  // Defensive invariant: the requester must never be (re)picked as reviewer,
  // no matter how many rejection cycles occur. computeExcludedReviewerIds
  // unconditionally excludes the requester, so this should be unreachable —
  // but if it ever fires, fail loudly (and log everything needed to diagnose
  // it) instead of silently saving a broken assignment.
  if (nextReviewer && toIdString(nextReviewer.id) === requesterIdStr) {
    console.error('[qaRequestsService] INVARIANT VIOLATION: reviewer === requester on reject', {
      qaRequestId: id,
      requesterId: requesterIdStr,
      previousReviewerId: toIdString(previousReviewerId),
      excludeIds,
      nextReviewerId: nextReviewer.id
    });
    throw new HttpError(500, 'Error interno: el revisor asignado no puede ser el mismo solicitante');
  }

  const update = nextReviewer
    ? {
        $push: { rejections: rejectionEntry },
        $set: {
          reviewerId: nextReviewer.id,
          status: 'pending',
          assignedAt: new Date(),
          lastReminderAt: null
        }
      }
    : {
        $push: { rejections: rejectionEntry },
        $set: { reviewerId: null, status: 'unassignable' }
      };

  // Atomic read-modify-write: the whole "record this rejection + reassign"
  // step happens in a single findOneAndUpdate, gated on reviewerId still
  // being the exact reviewer we just rejected. Two near-simultaneous reject
  // calls (e.g. a double-click, or a stacked confirmation dialog) both read
  // the same starting document, but only the first one's update can match
  // this filter — by the time the second tries, reviewerId has already
  // changed, so it gets null back and a clean conflict instead of silently
  // computing a reassignment off stale data.
  const qaRequest = await QaRequest.findOneAndUpdate(
    { _id: id, reviewerId: previousReviewerId },
    update,
    { new: true }
  );

  if (!qaRequest) {
    throw new HttpError(
      409,
      'La solicitud ya fue modificada por otra acción concurrente; refresca e inténtalo de nuevo'
    );
  }

  if (nextReviewer) {
    await QaMember.findByIdAndUpdate(nextReviewer.id, { lastAssignedAt: new Date() });
    await qaSlackService.notifyQaAssigned(qaRequest);
  } else {
    await qaSlackService.notifyQaUnassignable(qaRequest);
  }

  emitQaUpdated(io, qaRequest);
  return qaRequest;
};

// Manually moves a still-untouched request to a different reviewer, bypassing
// pickReviewer — for operational overrides (someone's suddenly out, a bad
// auto-assignment). Only allowed from 'pending': the assigned reviewer has a
// request sitting with them but hasn't clicked "Iniciar QA" yet. Once they've
// started (or the request has moved on to changes_requested/approved), or if
// it never had a reviewer at all (unassignable), reassignment is refused —
// unlike rejectQaRequest, this does NOT consult/append to rejections[] —
// that array is specifically the automatic-reassignment exclusion history,
// and a manual override is a distinct, human decision that may deliberately
// pick someone who already rejected it.
const reassignQaRequest = async (id, newReviewerId, io) => {
  const qaRequest = await QaRequest.findById(id);
  if (!qaRequest) throw new HttpError(404, 'Solicitud de QA no encontrada');

  if (qaRequest.status !== 'pending') {
    throw new HttpError(400, `No se puede reasignar: la solicitud está en estado '${qaRequest.status}'`);
  }

  const newReviewer = await QaMember.findById(newReviewerId);
  if (!newReviewer) {
    throw new HttpError(400, 'El revisor indicado no existe');
  }
  if (!newReviewer.active) {
    throw new HttpError(400, 'El revisor indicado no está activo');
  }
  if (toIdString(newReviewer.team) !== toIdString(qaRequest.team)) {
    throw new HttpError(400, 'El revisor no pertenece al equipo de esta solicitud');
  }
  if (toIdString(newReviewerId) === toIdString(qaRequest.requesterId)) {
    throw new HttpError(400, 'No se puede reasignar al mismo solicitante');
  }

  qaRequest.reviewerId = newReviewerId;
  qaRequest.status = 'pending';
  qaRequest.assignedAt = new Date();
  qaRequest.lastReminderAt = null;
  await qaRequest.save();

  await QaMember.findByIdAndUpdate(newReviewerId, { lastAssignedAt: new Date() });
  await qaSlackService.notifyQaAssigned(qaRequest);

  emitQaUpdated(io, qaRequest);
  return qaRequest;
};

// Reopens a 'changes_requested' request for a second pass with the SAME
// reviewer (no buildCandidates/pickReviewer run) — they already have context
// on this ticket, so there's no reason to re-run assignment.
const retryQaRequest = async (id, io) => {
  const qaRequest = await QaRequest.findById(id);
  if (!qaRequest) throw new HttpError(404, 'Solicitud de QA no encontrada');

  if (qaRequest.status !== 'changes_requested') {
    throw new HttpError(400, `No se puede reintentar QA: la solicitud está en estado '${qaRequest.status}'`);
  }

  qaRequest.status = 'pending';
  qaRequest.assignedAt = new Date();
  qaRequest.lastReminderAt = null;
  qaRequest.completedAt = null;
  await qaRequest.save();

  await qaSlackService.notifyQaChangesAddressed(qaRequest);

  emitQaUpdated(io, qaRequest);
  return qaRequest;
};

const completeQaRequest = async (id, result = 'approved', io) => {
  if (!['approved', 'changes_requested'].includes(result)) {
    throw new HttpError(400, "El resultado debe ser 'approved' o 'changes_requested'");
  }

  const qaRequest = await QaRequest.findById(id);
  if (!qaRequest) throw new HttpError(404, 'Solicitud de QA no encontrada');

  qaRequest.status = result;
  qaRequest.completedAt = new Date();
  await qaRequest.save();

  await qaSlackService.notifyQaCompleted(qaRequest, result);

  emitQaUpdated(io, qaRequest);
  return qaRequest;
};

// Background job entry point: re-sends the assignment notification (does NOT
// reassign) for every still-pending request whose last touch (assignedAt, or
// lastReminderAt once one has been sent) is older than intervalHours.
const sendOverdueReminders = async (intervalHours) => {
  const cutoff = new Date(Date.now() - intervalHours * 60 * 60 * 1000);
  const overdue = await QaRequest.find({
    status: 'pending',
    $or: [
      { lastReminderAt: null, assignedAt: { $lte: cutoff } },
      { lastReminderAt: { $lte: cutoff } }
    ]
  });

  for (const qaRequest of overdue) {
    qaRequest.lastReminderAt = new Date();
    qaRequest.escalatedCount = (qaRequest.escalatedCount || 0) + 1;
    await qaRequest.save();
    await qaSlackService.notifyQaAssigned(qaRequest, { isReminder: true });
  }

  return overdue.length;
};

module.exports = {
  HttpError,
  computeExcludedReviewerIds,
  buildCandidates,
  rankMembersByQueue,
  getMembersForDisplay,
  createQaRequest,
  startQa,
  rejectQaRequest,
  reassignQaRequest,
  retryQaRequest,
  completeQaRequest,
  sendOverdueReminders
};
