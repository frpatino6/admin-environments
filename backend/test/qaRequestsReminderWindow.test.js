const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// The business-hours gate added to sendOverdueReminders (see
// services/qaReminderSchedule.js) decides whether the sweep runs at all, and it
// runs before any query or Slack call, so the behavior worth pinning down is
// "nothing is queried, nothing is sent and nothing is written" while the window
// is closed. Exercised against the real MongoDB the app uses (same
// rationale/pattern as qaRequestsTeamScoping.test.js: no in-memory Mongo in
// this project's devDependencies). Fixtures are clearly marked and cleaned up
// in `after` regardless of outcome.

require('dotenv').config();
const mongoose = require('mongoose');
const QaMember = require('../models/QaMember');
const QaRequest = require('../models/QaRequest');
const Team = require('../models/Team');
const qaSlackService = require('../services/qaSlackService');
const qaRequestsService = require('../services/qaRequestsService');
const { sendOverdueReminders } = qaRequestsService;

const TEAM = 'test-reminder-window-team';
const JIRA_PREFIX = 'TEST-REMINDERWINDOW-';
const REMINDER_INTERVAL_HOURS = 4;

// 2026-09-28 is a Monday, 2026-10-03 a Saturday — the two injected "now" values
// below open and close the default-shaped window without the assertions
// depending on when the suite actually runs.
const MONDAY_MIDDAY = new Date('2026-09-28T12:00:00Z');
const SATURDAY_MIDDAY = new Date('2026-10-03T12:00:00Z');
const BUSINESS_HOURS_UTC = { timezone: 'UTC', startHour: 9, endHour: 18, weekdays: [1, 2, 3, 4, 5] };

let team;
let requester;
let reviewer;

// sendOverdueReminders is deliberately NOT team-scoped (a stale pending
// request is a stale pending request), so on this shared dev cluster a test
// sweep can also pick up any *other* stale pending request that happens to be
// sitting there. Snapshot their bookkeeping before the sweep so `after` can put
// it back — a test run must never bump a real request's reminder state.
let otherPendingSnapshot = [];
let otherStaleCount = 0;

const isStale = (assignedAt, lastReminderAt, cutoff) =>
  (lastReminderAt === null && assignedAt.getTime() <= cutoff.getTime()) ||
  (lastReminderAt !== null && lastReminderAt.getTime() <= cutoff.getTime());

const snapshotOtherPending = async () => {
  const cutoff = new Date(Date.now() - REMINDER_INTERVAL_HOURS * 60 * 60 * 1000);
  const docs = await QaRequest.find({ status: 'pending' })
    .select('_id assignedAt lastReminderAt escalatedCount');

  otherStaleCount = docs.filter((doc) => isStale(doc.assignedAt, doc.lastReminderAt, cutoff)).length;
  otherPendingSnapshot = docs.map((doc) => ({
    _id: doc._id,
    lastReminderAt: doc.lastReminderAt,
    escalatedCount: doc.escalatedCount || 0
  }));
};

const restoreOtherPending = async () => {
  for (const { _id, lastReminderAt, escalatedCount } of otherPendingSnapshot) {
    const current = await QaRequest.findById(_id);
    if (!current) continue;
    if (
      (current.lastReminderAt === null ? null : current.lastReminderAt.getTime()) ===
        (lastReminderAt === null ? null : lastReminderAt.getTime()) &&
      (current.escalatedCount || 0) === escalatedCount
    ) {
      continue;
    }
    await QaRequest.updateOne({ _id }, { $set: { lastReminderAt, escalatedCount } });
  }
};

const cleanupFixtures = async () => {
  await QaMember.deleteMany({ team: TEAM });
  await QaRequest.deleteMany({ jiraKey: { $regex: `^${JIRA_PREFIX}` } });
  await Team.deleteMany({ slug: TEAM });
};

// Replaces notifyQaAssigned for the duration of `fn` and returns the calls it
// received. Two reasons, both about this being a shared dev cluster: the fixture
// team's Team doc has no slackWebhookUrl, so the real notifier would take its
// "webhook no configurado" early return and make no HTTP call at all — and any
// *other* stale request the sweep happens to touch must not reach a real
// team's live webhook from a test run.
const captureSlackNotifications = async (fn) => {
  const original = qaSlackService.notifyQaAssigned;
  const calls = [];
  qaSlackService.notifyQaAssigned = async (qaRequest, options = {}) => {
    calls.push({ id: qaRequest._id.toString(), options });
  };

  try {
    await fn();
  } finally {
    qaSlackService.notifyQaAssigned = original;
  }

  return calls;
};

const createStalePendingRequest = async (suffix) =>
  QaRequest.create({
    jiraKey: `${JIRA_PREFIX}${suffix}`,
    jiraSummary: `stale pending request (${suffix})`,
    requesterId: requester._id,
    reviewerId: reviewer._id,
    status: 'pending',
    environmentName: 'test-env',
    team: TEAM,
    assignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    lastReminderAt: null
  });

before(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set — see backend/.env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupFixtures();

  team = await Team.create({
    slug: TEAM,
    displayName: 'Test Reminder Window Team',
    environments: [],
    slackWebhookUrl: null
  });

  requester = await QaMember.create({
    name: 'Test Reminder Window Requester',
    slackUserId: 'TEST-SLACK-REMINDER-WINDOW-REQUESTER',
    team: TEAM,
    active: true
  });
  reviewer = await QaMember.create({
    name: 'Test Reminder Window Reviewer',
    slackUserId: 'TEST-SLACK-REMINDER-WINDOW-REVIEWER',
    team: TEAM,
    active: true
  });

  await snapshotOtherPending();
});

after(async () => {
  await restoreOtherPending();
  await cleanupFixtures();
  await mongoose.disconnect();
});

test('sendOverdueReminders sends nothing at all while the reminder window is closed', async () => {
  const request = await createStalePendingRequest('CLOSED-WINDOW');

  try {
    let count;
    const slackCalls = await captureSlackNotifications(async () => {
      // Saturday midday: outside lun-vie 09:00-18:00.
      count = await sendOverdueReminders(REMINDER_INTERVAL_HOURS, {
        now: SATURDAY_MIDDAY,
        schedule: BUSINESS_HOURS_UTC
      });
    });

    assert.equal(count, 0);
    assert.deepEqual(slackCalls, []);

    // Untouched: the gate returns before the query, so the request is not even
    // considered "reminded" — no lastReminderAt, no escalatedCount bump.
    const untouched = await QaRequest.findById(request._id);
    assert.equal(untouched.lastReminderAt, null);
    assert.equal(untouched.escalatedCount, 0);
  } finally {
    await QaRequest.deleteOne({ _id: request._id });
  }
});

test('sendOverdueReminders re-sends the assignment notification while the window is open', async () => {
  const request = await createStalePendingRequest('OPEN-WINDOW');

  try {
    let count;
    const slackCalls = await captureSlackNotifications(async () => {
      // Monday midday: inside lun-vie 09:00-18:00.
      count = await sendOverdueReminders(REMINDER_INTERVAL_HOURS, {
        now: MONDAY_MIDDAY,
        schedule: BUSINESS_HOURS_UTC
      });
    });

    // One reminder for this fixture, plus any other stale pending request this
    // shared cluster happens to hold (restored in `after`) — on a clean cluster
    // otherStaleCount is 0 and this is exactly 1.
    assert.equal(count, 1 + otherStaleCount);

    // Guards the "no external HTTP call" assumption: the fixture team must
    // stay webhook-less.
    assert.equal(team.slackWebhookUrl, null);

    const reminded = slackCalls.filter((call) => call.id === request._id.toString());
    assert.equal(reminded.length, 1);
    assert.deepEqual(reminded[0].options, { isReminder: true });

    const updated = await QaRequest.findById(request._id);
    assert.ok(updated.lastReminderAt instanceof Date);
    assert.equal(updated.escalatedCount, 1);
    assert.equal(updated.status, 'pending');
  } finally {
    await QaRequest.deleteOne({ _id: request._id });
  }
});

test('the same request, minutes apart, is swept only by the sweep inside the window', async () => {
  const request = await createStalePendingRequest('THEN-OPEN');

  try {
    // Closed first: nothing happens...
    let closedCount;
    await captureSlackNotifications(async () => {
      closedCount = await sendOverdueReminders(REMINDER_INTERVAL_HOURS, {
        now: SATURDAY_MIDDAY,
        schedule: BUSINESS_HOURS_UTC
      });
    });
    assert.equal(closedCount, 0);

    // ...and the next sweep inside the window picks the very same request up
    // (no catch-up burst is needed: nothing was queued, nothing was deferred).
    let openCount;
    const slackCalls = await captureSlackNotifications(async () => {
      openCount = await sendOverdueReminders(REMINDER_INTERVAL_HOURS, {
        now: MONDAY_MIDDAY,
        schedule: BUSINESS_HOURS_UTC
      });
    });
    assert.equal(openCount, 1 + otherStaleCount);
    assert.equal(slackCalls.filter((call) => call.id === request._id.toString()).length, 1);

    const updated = await QaRequest.findById(request._id);
    assert.equal(updated.escalatedCount, 1);
  } finally {
    await QaRequest.deleteOne({ _id: request._id });
  }
});
