const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pickReviewer } = require('../services/qaAssignment');

const candidate = (overrides = {}) => ({
  id: overrides.id ?? 'id',
  activeLoad: overrides.activeLoad ?? 0,
  lastAssignedAt: overrides.lastAssignedAt ?? null
});

test('excludes the requester from being picked', () => {
  const requester = candidate({ id: 'requester' });
  const other = candidate({ id: 'other' });

  const result = pickReviewer([requester, other], ['requester']);

  assert.equal(result.id, 'other');
});

test('picks the candidate with the lowest active load', () => {
  const busy = candidate({ id: 'busy', activeLoad: 3 });
  const free = candidate({ id: 'free', activeLoad: 0 });

  const result = pickReviewer([busy, free], []);

  assert.equal(result.id, 'free');
});

test('on a load tie, picks whoever has gone longest without an assignment', () => {
  const recent = candidate({
    id: 'recent',
    activeLoad: 1,
    lastAssignedAt: new Date('2026-09-17T10:00:00Z')
  });
  const stale = candidate({
    id: 'stale',
    activeLoad: 1,
    lastAssignedAt: new Date('2026-09-10T10:00:00Z')
  });

  const result = pickReviewer([recent, stale], []);

  assert.equal(result.id, 'stale');
});

test('a candidate never assigned (lastAssignedAt null) wins a tie', () => {
  const everAssigned = candidate({ id: 'ever', activeLoad: 0, lastAssignedAt: new Date() });
  const neverAssigned = candidate({ id: 'never', activeLoad: 0, lastAssignedAt: null });

  const result = pickReviewer([everAssigned, neverAssigned], []);

  assert.equal(result.id, 'never');
});

test('a reassignment excludes both the requester and the current reviewer', () => {
  const requester = candidate({ id: 'requester' });
  const currentReviewer = candidate({ id: 'current-reviewer' });
  const other = candidate({ id: 'other' });

  const result = pickReviewer([requester, currentReviewer, other], ['requester', 'current-reviewer']);

  assert.equal(result.id, 'other');
});

test('returns null when there are no eligible candidates', () => {
  const onlyRequester = candidate({ id: 'requester' });

  const result = pickReviewer([onlyRequester], ['requester']);

  assert.equal(result, null);
});

test('accumulated exclusion: every id passed in excludeMemberIds is excluded, not just the last one', () => {
  const requester = candidate({ id: 'requester' });
  const firstRejecter = candidate({ id: 'first-rejecter' });
  const secondRejecter = candidate({ id: 'second-rejecter' });
  const stillEligible = candidate({ id: 'still-eligible' });

  // Simulates two sequential rejections: the exclude list accumulates both
  // rejecters plus the original requester, in one call — mirroring how
  // qaRequestsService.computeExcludedReviewerIds folds qaRequest.rejections.
  const result = pickReviewer(
    [requester, firstRejecter, secondRejecter, stillEligible],
    ['requester', 'first-rejecter', 'second-rejecter']
  );

  assert.equal(result.id, 'still-eligible');
});
