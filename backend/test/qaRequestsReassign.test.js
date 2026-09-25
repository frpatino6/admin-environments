const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// reassignQaRequest is a manual override: pick a specific reviewer directly,
// bypassing pickReviewer. Exercised against the real MongoDB the app uses
// (same rationale/pattern as qaRequestsRetry.test.js: no in-memory Mongo in
// this project's devDependencies). Fixtures are clearly marked and cleaned
// up in `after` regardless of outcome.

require('dotenv').config();
const mongoose = require('mongoose');
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const qaRequestsService = require('../services/qaRequestsService');
const { HttpError, reassignQaRequest } = qaRequestsService;

const TEAM = 'test-reassign-team';
const OTHER_TEAM = 'test-reassign-other-team';
const JIRA_PREFIX = 'TEST-REASSIGN-';

let requester;
let originalReviewer;
let newReviewer;
let inactiveReviewer;
let otherTeamReviewer;

const cleanupFixtures = async () => {
  await QaMember.deleteMany({ team: { $in: [TEAM, OTHER_TEAM] } });
  await QaRequest.deleteMany({ jiraKey: { $regex: `^${JIRA_PREFIX}` } });
};

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set — see backend/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupFixtures();

  requester = await QaMember.create({
    name: 'Test Reassign Requester',
    slackUserId: 'TEST-SLACK-REASSIGN-REQUESTER',
    team: TEAM,
    active: true
  });
  originalReviewer = await QaMember.create({
    name: 'Test Reassign Original Reviewer',
    slackUserId: 'TEST-SLACK-REASSIGN-ORIGINAL',
    team: TEAM,
    active: true
  });
  newReviewer = await QaMember.create({
    name: 'Test Reassign New Reviewer',
    slackUserId: 'TEST-SLACK-REASSIGN-NEW',
    team: TEAM,
    active: true
  });
  inactiveReviewer = await QaMember.create({
    name: 'Test Reassign Inactive Reviewer',
    slackUserId: 'TEST-SLACK-REASSIGN-INACTIVE',
    team: TEAM,
    active: false
  });
  otherTeamReviewer = await QaMember.create({
    name: 'Test Reassign Other Team Reviewer',
    slackUserId: 'TEST-SLACK-REASSIGN-OTHER-TEAM',
    team: OTHER_TEAM,
    active: true
  });
});

after(async () => {
  await cleanupFixtures();
  await mongoose.disconnect();
});

test('reassignQaRequest 404s for a request that does not exist', async () => {
  await assert.rejects(
    () => reassignQaRequest(new mongoose.Types.ObjectId().toString(), newReviewer._id.toString()),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 404);
      return true;
    }
  );
});

// Reassignment is only allowed while a request is 'pending' — assigned to
// someone who hasn't clicked "Iniciar QA" yet. Every other status is
// rejected, including 'unassignable' (no reviewer was ever set, so it
// doesn't qualify as "assigned but not started" either — it stays a dead
// end, same as before this feature existed).
const NON_PENDING_STATUSES = [
  { status: 'in_progress', extra: { acceptedAt: new Date() } },
  { status: 'changes_requested', extra: {} },
  { status: 'approved', extra: { completedAt: new Date() } },
  { status: 'unassignable', extra: { reviewerId: null } }
];

for (const { status, extra } of NON_PENDING_STATUSES) {
  test(`reassignQaRequest rejects reassigning a '${status}' request`, async () => {
    const request = await QaRequest.create({
      jiraKey: `${JIRA_PREFIX}STATUS-${status.toUpperCase()}`,
      jiraSummary: `status is '${status}', should not be reassignable`,
      requesterId: requester._id,
      reviewerId: originalReviewer._id,
      status,
      environmentName: 'test-env',
      team: TEAM,
      assignedAt: new Date(),
      ...extra
    });

    try {
      await assert.rejects(
        () => reassignQaRequest(request._id.toString(), newReviewer._id.toString()),
        (err) => {
          assert.ok(err instanceof HttpError);
          assert.equal(err.status, 400);
          return true;
        }
      );
    } finally {
      await QaRequest.deleteOne({ _id: request._id });
    }
  });
}

test('reassignQaRequest rejects a nonexistent reviewer', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}NO-SUCH-REVIEWER`,
    jiraSummary: 'target reviewer does not exist',
    requesterId: requester._id,
    reviewerId: originalReviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    await assert.rejects(
      () => reassignQaRequest(pending._id.toString(), new mongoose.Types.ObjectId().toString()),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.status, 400);
        return true;
      }
    );
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('reassignQaRequest rejects an inactive reviewer', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}INACTIVE`,
    jiraSummary: 'target reviewer is inactive',
    requesterId: requester._id,
    reviewerId: originalReviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    await assert.rejects(
      () => reassignQaRequest(pending._id.toString(), inactiveReviewer._id.toString()),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.status, 400);
        return true;
      }
    );
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('reassignQaRequest rejects a reviewer from a different team', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}CROSS-TEAM`,
    jiraSummary: 'target reviewer belongs to another team',
    requesterId: requester._id,
    reviewerId: originalReviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    await assert.rejects(
      () => reassignQaRequest(pending._id.toString(), otherTeamReviewer._id.toString()),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.status, 400);
        return true;
      }
    );
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('reassignQaRequest rejects reassigning to the requester', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}SAME-AS-REQUESTER`,
    jiraSummary: 'target reviewer is the requester',
    requesterId: requester._id,
    reviewerId: originalReviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    await assert.rejects(
      () => reassignQaRequest(pending._id.toString(), requester._id.toString()),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.status, 400);
        return true;
      }
    );
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('reassignQaRequest moves reviewerId, keeps pending, and refreshes assignedAt', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}HAPPY-PATH`,
    jiraSummary: 'pending, gets manually reassigned before the reviewer starts',
    requesterId: requester._id,
    reviewerId: originalReviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date(Date.now() - 60 * 60 * 1000),
    lastReminderAt: new Date(Date.now() - 30 * 60 * 1000)
  });

  try {
    const reassigned = await reassignQaRequest(pending._id.toString(), newReviewer._id.toString());

    assert.equal(reassigned.reviewerId.toString(), newReviewer._id.toString());
    assert.equal(reassigned.status, 'pending');
    assert.equal(reassigned.lastReminderAt, null);
    assert.ok(reassigned.assignedAt.getTime() > pending.assignedAt.getTime());
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});
