const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// startQa now also calls qaSlackService.notifyQaStarted to ping the
// requester in Slack. That call is best-effort (wrapped in try/catch,
// log-and-swallow on error — see qaSlackService.js) so it must never break
// startQa itself, in particular when the team has no Slack webhook
// configured (getTeamWebhookUrl resolves to null, which is the case for
// this fixture team). Exercised against the real MongoDB the app uses (same
// rationale/pattern as qaRequestsRetry.test.js: no in-memory Mongo in this
// project's devDependencies). Fixtures are clearly marked and cleaned up in
// `after` regardless of outcome.

require('dotenv').config();
const mongoose = require('mongoose');
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const qaRequestsService = require('../services/qaRequestsService');
const { startQa } = qaRequestsService;

const TEAM = 'test-start-notify-team';
const JIRA_PREFIX = 'TEST-START-NOTIFY-';

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
    name: 'Test Start Notify Reviewer',
    slackUserId: 'TEST-SLACK-START-NOTIFY-REVIEWER',
    team: TEAM,
    active: true
  });
  requester = await QaMember.create({
    name: 'Test Start Notify Requester',
    slackUserId: 'TEST-SLACK-START-NOTIFY-REQUESTER',
    team: TEAM,
    active: true
  });
});

after(async () => {
  await cleanupFixtures();
  await mongoose.disconnect();
});

test('startQa moves a pending request to in_progress and does not throw when no Slack webhook is configured', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}HAPPY-PATH`,
    jiraSummary: 'ready to be picked up by the reviewer',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    const started = await startQa(pending._id.toString());

    assert.equal(started.status, 'in_progress');
    assert.ok(started.acceptedAt instanceof Date);
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});
