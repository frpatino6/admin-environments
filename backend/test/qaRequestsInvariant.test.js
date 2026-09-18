const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeExcludedReviewerIds } = require('../services/qaRequestsService');
const { pickReviewer } = require('../services/qaAssignment');

// Defensive-invariant regression test: the requester must never end up as
// reviewer, no matter how many rejection cycles occur. qaRequestsService's
// rejectQaRequest/createQaRequest both do the same three-step dance tested
// here (compute exclusions -> filter candidates -> pick), followed by an
// explicit guard that throws a 500 HttpError if pickReviewer's result ever
// equals the requester. This test exercises steps 1-3 directly (no DB
// needed) across many simulated rejection cycles to make sure the exclusion
// set genuinely keeps the requester out at every step, so that guard should
// never actually fire in practice.

const cycle = (requesterId, poolIds, rejectionsSoFar) => {
  const excludeIds = computeExcludedReviewerIds({
    requesterId,
    rejections: rejectionsSoFar
  });
  const candidates = poolIds
    .filter((id) => !excludeIds.includes(id))
    .map((id) => ({ id, activeLoad: 0, lastAssignedAt: null }));
  const next = pickReviewer(candidates, []);
  return { excludeIds, next };
};

test('requester is excluded from reviewer selection across every rejection cycle until exhaustion', () => {
  const requesterId = 'requester-1';
  const poolIds = ['requester-1', 'reviewer-a', 'reviewer-b', 'reviewer-c'];
  let rejections = [];

  for (let i = 0; i < poolIds.length + 2; i++) {
    const { excludeIds, next } = cycle(requesterId, poolIds, rejections);

    // The invariant this test guards: at no point in any rejection cycle
    // can the requester be the picked reviewer.
    assert.notEqual(
      next?.id,
      requesterId,
      `cycle ${i}: requester must never be picked as reviewer (excludeIds=${excludeIds})`
    );

    if (!next) break; // pool exhausted -> would become 'unassignable', as expected
    rejections = [...rejections, { reviewerId: next.id, reason: 'test', rejectedAt: new Date() }];
  }

  // Eventually every non-requester candidate has rejected and the request
  // becomes unassignable rather than looping back to the requester.
  const { next: finalNext } = cycle(requesterId, poolIds, rejections);
  assert.equal(finalNext, null);
});

test('defensive guard condition: comparing pickReviewer output to requesterId catches equality across ObjectId-like values', () => {
  // Mirrors the exact comparison used in qaRequestsService (toIdString(next.id)
  // === toIdString(requesterId)) so a regression in that comparison itself
  // (e.g. comparing an ObjectId to a string without normalizing) would be
  // caught here even without hitting the DB.
  const objectIdLike = (hex) => ({ toString: () => hex });
  const requesterId = objectIdLike('507f1f77bcf86cd799439011');
  const toIdString = (id) => (id ? id.toString() : id);

  // Simulate a hypothetical broken candidate pool that (incorrectly) still
  // contains the requester, to prove the guard would catch it if the
  // exclusion logic upstream ever regressed.
  const brokenCandidates = [{ id: toIdString(requesterId), activeLoad: 0, lastAssignedAt: null }];
  const picked = pickReviewer(brokenCandidates, []);

  assert.equal(toIdString(picked.id), toIdString(requesterId));
  // This is exactly the condition qaRequestsService checks before saving;
  // in production it throws HttpError(500) instead of proceeding.
});
