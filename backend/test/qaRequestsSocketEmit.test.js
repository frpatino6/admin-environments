const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Every mutating qaRequestsService function accepts an optional `io` (last
// arg) and, when given one, broadcasts a minimal 'qa-updated' payload so a
// team's QA dashboard can refetch live instead of requiring a manual
// refresh (same idea as environments.js's 'environment-updated' emit).
// Exercised against the real MongoDB the app uses (same rationale/pattern as
// qaRequestsTeamScoping.test.js: no in-memory Mongo in this project's
// devDependencies). A stub `io` stands in for the real socket server — no
// live socket connection is needed to verify the emit call itself.

require('dotenv').config();
const mongoose = require('mongoose');
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const qaRequestsService = require('../services/qaRequestsService');
const { createQaRequest, startQa, rejectQaRequest, retryQaRequest, completeQaRequest } = qaRequestsService;

const TEAM = 'test-socket-team';
const JIRA_PREFIX = 'TEST-SOCKET-';

let reviewer;
let requester;

const cleanupFixtures = async () => {
  await QaMember.deleteMany({ team: TEAM });
  await QaRequest.deleteMany({ jiraKey: { $regex: `^${JIRA_PREFIX}` } });
};

const makeStubIo = () => {
  const emitted = [];
  return { io: { emit: (event, payload) => emitted.push({ event, payload }) }, emitted };
};

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set — see backend/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupFixtures();

  reviewer = await QaMember.create({
    name: 'Test Socket Reviewer',
    slackUserId: 'TEST-SLACK-SOCKET-REVIEWER',
    team: TEAM,
    active: true
  });
  requester = await QaMember.create({
    name: 'Test Socket Requester',
    slackUserId: 'TEST-SLACK-SOCKET-REQUESTER',
    team: TEAM,
    active: true
  });
});

after(async () => {
  await cleanupFixtures();
  await mongoose.disconnect();
});

test('createQaRequest emits qa-updated with the new request', async () => {
  const { io, emitted } = makeStubIo();

  const qaRequest = await createQaRequest({
    jiraKey: `${JIRA_PREFIX}CREATE`,
    jiraSummary: 'exercises the create emit',
    requesterId: requester._id.toString(),
    environmentName: 'test-env',
    team: TEAM
  }, io);

  try {
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].event, 'qa-updated');
    assert.deepEqual(emitted[0].payload, {
      _id: qaRequest._id,
      team: TEAM,
      environmentName: 'test-env',
      status: 'pending'
    });
  } finally {
    await QaRequest.deleteOne({ _id: qaRequest._id });
  }
});

test('createQaRequest does not throw when io is omitted', async () => {
  const qaRequest = await createQaRequest({
    jiraKey: `${JIRA_PREFIX}NO-IO`,
    jiraSummary: 'exercises the no-io path',
    requesterId: requester._id.toString(),
    environmentName: 'test-env',
    team: TEAM
  });

  await QaRequest.deleteOne({ _id: qaRequest._id });
});

test('startQa emits qa-updated with status in_progress', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}START`,
    jiraSummary: 'exercises the start emit',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    const { io, emitted } = makeStubIo();
    const started = await startQa(pending._id.toString(), io);

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].event, 'qa-updated');
    assert.deepEqual(emitted[0].payload, {
      _id: started._id,
      team: TEAM,
      environmentName: 'test-env',
      status: 'in_progress'
    });
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('rejectQaRequest emits qa-updated after reassignment', async () => {
  const pending = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}REJECT`,
    jiraSummary: 'exercises the reject emit',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date()
  });

  try {
    const { io, emitted } = makeStubIo();
    const rejected = await rejectQaRequest(pending._id.toString(), 'not ready yet', io);

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].event, 'qa-updated');
    assert.deepEqual(emitted[0].payload, {
      _id: rejected._id,
      team: TEAM,
      environmentName: 'test-env',
      status: rejected.status
    });
  } finally {
    await QaRequest.deleteOne({ _id: pending._id });
  }
});

test('retryQaRequest emits qa-updated with status pending', async () => {
  const changesRequested = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}RETRY`,
    jiraSummary: 'exercises the retry emit',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'changes_requested',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date(Date.now() - 60 * 60 * 1000)
  });

  try {
    const { io, emitted } = makeStubIo();
    const retried = await retryQaRequest(changesRequested._id.toString(), io);

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].event, 'qa-updated');
    assert.deepEqual(emitted[0].payload, {
      _id: retried._id,
      team: TEAM,
      environmentName: 'test-env',
      status: 'pending'
    });
  } finally {
    await QaRequest.deleteOne({ _id: changesRequested._id });
  }
});

test('completeQaRequest emits qa-updated with the final status', async () => {
  const inProgress = await QaRequest.create({
    jiraKey: `${JIRA_PREFIX}COMPLETE`,
    jiraSummary: 'exercises the complete emit',
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'in_progress',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date(),
    acceptedAt: new Date()
  });

  try {
    const { io, emitted } = makeStubIo();
    const completed = await completeQaRequest(inProgress._id.toString(), 'approved', io);

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].event, 'qa-updated');
    assert.deepEqual(emitted[0].payload, {
      _id: completed._id,
      team: TEAM,
      environmentName: 'test-env',
      status: 'approved'
    });
  } finally {
    await QaRequest.deleteOne({ _id: inProgress._id });
  }
});
