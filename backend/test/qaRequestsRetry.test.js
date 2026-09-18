const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// retryQaRequest reopens a 'changes_requested' request for a second pass
// WITHOUT re-running assignment — the same reviewer who requested changes
// gets it back. Exercised against the real MongoDB the app uses (same
// rationale/pattern as qaRequestsTeamScoping.test.js: no in-memory Mongo in
// this project's devDependencies). Fixtures are clearly marked and cleaned
// up in `after` regardless of outcome.

require('dotenv').config();
const mongoose = require('mongoose');
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const qaRequestsService = require('../services/qaRequestsService');
const { HttpError, retryQaRequest } = qaRequestsService;

const TEAM = 'test-retry-team';
const JIRA_PREFIX = 'TEST-RETRY-';

let reviewer;
let requester;

const cleanupFixtures = async () => {
  await QaMember.deleteMany({ team: TEAM });
  await QaRequest.deleteMany({ jiraKey: { $regex: `^${JIRA_PREFIX}` } });
};

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set — see backend/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupFixtures();

  reviewer = await QaMember.create({
    name: 'Test Retry Reviewer',
    slackUserId: 'TEST-SLACK-RETRY-REVIEWER',
    team: TEAM,
    active: true
  });
  requester = await QaMember.create({
    name: 'Test Retry Requester',
    slackUserId: 'TEST-SLACK-RETRY-REQUESTER',
    team: TEAM,
    active: true
  });
});

after(async () => {
  await cleanupFixtures();
  await mongoose.disconnect();
});

test('retryQaRequest rejects a request that is not in changes_requested', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}NOT-CHANGES-REQUESTED`,
    jiraSummary: 'still pending, should not be retryable',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    await assert.rejects(
      () => retryQaRequest(pending._id.toString()),
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.status, 400);
        return true;
      }
    );

    const unchanged = await QaRequest.findById(pending._id);
    assert.equal(unchanged.status, 'pending');
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('retryQaRequest 404s for a request that does not exist', async () => {
  await assert.rejects(
    () => retryQaRequest(new mongoose.Types.ObjectId().toString()),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test('retryQaRequest goes back to pending, keeps the SAME reviewer, and resets completedAt/lastReminderAt', async () => {
  const changesRequested = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}HAPPY-PATH`,
    jiraSummary: 'changes were requested, developer fixed it',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'changes_requested',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date(Date.now() - 60 * 60 * 1000),
    lastReminderAt: new Date(Date.now() - 30 * 60 * 1000),
    completedAt: new Date()
  });

  try {
    const retried = await retryQaRequest(changesRequested._id.toString());

    assert.equal(retried.status, 'pending');
    assert.equal(retried.reviewerId.toString(), reviewer._id.toString());
    assert.equal(retried.lastReminderAt, null);
    assert.equal(retried.completedAt, null);
    assert.ok(retried.assignedAt.getTime() > changesRequested.assignedAt.getTime());
  } finally {
    await QaRequest.deleteOne({ _id: changesRequested._id });
  }
});
