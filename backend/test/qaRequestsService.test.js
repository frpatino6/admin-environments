const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeExcludedReviewerIds } = require('../services/qaRequestsService');

// computeExcludedReviewerIds is pure (reads plain fields off a QaRequest-shaped
// object) so it's testable without a real MongoDB connection.

test('excludes only the requester when there are no rejections yet', () => {
  const qaRequest = { requesterId: 'requester-1', rejections: [] };

  const result = computeExcludedReviewerIds(qaRequest);

  assert.deepEqual(result.sort(), ['requester-1']);
});

test('accumulates every rejecter across multiple sequential rejections, not just the last one', () => {
  const qaRequest = {
    requesterId: 'requester-1',
    rejections: [
      { reviewerId: 'reviewer-a', reason: 'busy', rejectedAt: new Date('2026-09-01') },
      { reviewerId: 'reviewer-b', reason: 'out of office', rejectedAt: new Date('2026-09-02') },
      { reviewerId: 'reviewer-c', reason: 'not familiar with this area', rejectedAt: new Date('2026-09-03') }
    ]
  };

  const result = computeExcludedReviewerIds(qaRequest);

  assert.deepEqual(
    result.sort(),
    ['requester-1', 'reviewer-a', 'reviewer-b', 'reviewer-c'].sort()
  );
});

test('deduplicates ids that appear more than once (e.g. requester also rejected)', () => {
  const qaRequest = {
    requesterId: 'requester-1',
    rejections: [
      { reviewerId: 'reviewer-a', reason: 'busy', rejectedAt: new Date('2026-09-01') },
      { reviewerId: 'reviewer-a', reason: 'still busy', rejectedAt: new Date('2026-09-05') }
    ]
  };

  const result = computeExcludedReviewerIds(qaRequest);

  assert.deepEqual(result.sort(), ['requester-1', 'reviewer-a'].sort());
});

test('handles ObjectId-like values via toString()', () => {
  const objectIdLike = (hex) => ({ toString: () => hex });
  const qaRequest = {
    requesterId: objectIdLike('507f1f77bcf86cd799439011'),
    rejections: [
      { reviewerId: objectIdLike('507f1f77bcf86cd799439012'), reason: 'x', rejectedAt: new Date() }
    ]
  };

  const result = computeExcludedReviewerIds(qaRequest);

  assert.deepEqual(
    result.sort(),
    ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'].sort()
  );
});
