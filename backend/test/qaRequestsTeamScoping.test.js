const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Unlike the rest of this test suite, the behaviors covered here
// (team-scoped candidate pools, the requester-team-mismatch guard, and the
// shared-placeholder-team guard) live inside functions that talk to
// MongoDB directly (QaMember.find, QaRequest.aggregate, QaMember.findById,
// QaRequest.create) — there is no in-memory Mongo/mocking library in this
// project's devDependencies, so the only way to exercise them for real is
// against an actual database. This file connects to the same MongoDB the
// app uses (via backend/.env, exactly like backend/server.js), creates
// clearly-marked disposable fixtures, and deletes them again in `after`
// regardless of outcome. jiraKey/team/slackUserId values here all use a
// "test-team-scoping" marker so they're unmistakable if cleanup ever fails
// to run (e.g. the process being killed mid-test).

require('dotenv').config();
const mongoose = require('mongoose');
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const qaRequestsService = require('../services/qaRequestsService');
const { HttpError, buildCandidates, createQaRequest } = qaRequestsService;

const TEAM_A = 'test-team-scoping-a';
const TEAM_B = 'test-team-scoping-b';
const JIRA_PREFIX = 'TEST-TEAMSCOPE-';

let memberA; // active QaMember on TEAM_A
let memberA2; // a second active QaMember on TEAM_A (so TEAM_A has someone to assign to besides its requester)
let memberB; // active QaMember on TEAM_B

const cleanupFixtures = async () => {
  await QaMember.deleteMany({ team: { $in: [TEAM_A, TEAM_B] } });
  await QaRequest.deleteMany({ jiraKey: { $regex: `^${JIRA_PREFIX}` } });
};

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set — see backend/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupFixtures(); // in case a previous run was killed before its own cleanup ran

  memberA = await QaMember.create({
    name: 'Test Team-Scoping Member A',
    slackUserId: 'TEST-SLACK-A',
    team: TEAM_A,
    active: true
  });
  memberA2 = await QaMember.create({
    name: 'Test Team-Scoping Member A2',
    slackUserId: 'TEST-SLACK-A2',
    team: TEAM_A,
    active: true
  });
  memberB = await QaMember.create({
    name: 'Test Team-Scoping Member B',
    slackUserId: 'TEST-SLACK-B',
    team: TEAM_B,
    active: true
  });
});

after(async () => {
  await cleanupFixtures();
  await mongoose.disconnect();
});

test('buildCandidates only returns members of the given team, never another team\'s roster', async () => {
  const candidatesForA = await buildCandidates([], TEAM_A);
  const candidatesForB = await buildCandidates([], TEAM_B);

  assert.ok(candidatesForA.some((c) => c.id === memberA._id.toString()));
  assert.ok(!candidatesForA.some((c) => c.id === memberB._id.toString()));

  assert.ok(candidatesForB.some((c) => c.id === memberB._id.toString()));
  assert.ok(!candidatesForB.some((c) => c.id === memberA._id.toString()));
});

test('createQaRequest rejects when the requester does not belong to the request\'s team', async () => {
  await assert.rejects(
    () =>
      createQaRequest({
        jiraKey: `${JIRA_PREFIX}CROSS-TEAM`,
        jiraSummary: 'cross-team requester (should be rejected)',
        requesterId: memberA._id.toString(), // belongs to TEAM_A
        environmentName: 'test-env',
        team: TEAM_B // but the request claims TEAM_B
      }),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    }
  );

  // No request should have been created despite the rejection.
  const leftover = await QaRequest.findOne({ jiraKey: `${JIRA_PREFIX}CROSS-TEAM` });
  assert.equal(leftover, null);
});

test('createQaRequest rejects the literal "shared" placeholder team outright', async () => {
  await assert.rejects(
    () =>
      createQaRequest({
        jiraKey: `${JIRA_PREFIX}SHARED-UNRESOLVED`,
        jiraSummary: 'shared env with no resolved occupying team (should be rejected)',
        requesterId: memberA._id.toString(),
        environmentName: 'test-shared-env',
        team: 'shared'
      }),
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, 400);
      return true;
    }
  );

  const leftover = await QaRequest.findOne({ jiraKey: `${JIRA_PREFIX}SHARED-UNRESOLVED` });
  assert.equal(leftover, null);
});

test('createQaRequest succeeds for a requester whose team matches, picking a reviewer from that same team only', async () => {
  const created = await createQaRequest({
    jiraKey: `${JIRA_PREFIX}HAPPY-PATH`,
    jiraSummary: 'same-team requester (should succeed)',
    requesterId: memberA._id.toString(),
    environmentName: 'test-env',
    team: TEAM_A
  });

  try {
    assert.equal(created.team, TEAM_A);
    // memberA (the requester) is excluded; the only other eligible
    // candidate is memberA2, also on TEAM_A. If team-scoping were broken
    // and leaked into TEAM_B's roster, memberB could show up here instead —
    // it must not.
    assert.equal(created.reviewerId.toString(), memberA2._id.toString());
    assert.equal(created.status, 'pending');
  } finally {
    await QaRequest.deleteOne({ _id: created._id });
  }
});
