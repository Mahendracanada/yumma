'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProtectionPlan } = require('../src/protection-orchestrator');

function fixture(overrides = {}) {
  return {
    request: { needsClarification: false },
    context: { recalledContracts: [] },
    risk: { level: 'LOW', score: 0, reasons: [] },
    ripple: { domains: [] },
    policy: { decision: 'ALLOW_INFORMATIONAL_GUIDANCE_ONLY', actionBlocked: false },
    ...overrides
  };
}

test('benign request stays informational', () => {
  const p = buildProtectionPlan(fixture());
  assert.equal(p.posture, 'INFORMATIONAL');
  assert.equal(p.humanConfirmationRequired, false);
});

test('high risk request pauses and requires human confirmation', () => {
  const p = buildProtectionPlan(fixture({risk:{level:'HIGH',score:90,reasons:[{reason:'Credential request'}]},policy:{decision:'DENY_SYNTHETIC_ACTION',actionBlocked:true},ripple:{domains:['account_security','privacy']}}));
  assert.equal(p.posture, 'PAUSE_AND_PROTECT');
  assert.equal(p.humanConfirmationRequired, true);
  assert.deepEqual(p.consequenceDomains, ['account_security','privacy']);
});

test('medium risk recommends verification without overclaiming a block', () => {
  const p = buildProtectionPlan(fixture({risk:{level:'MEDIUM',score:35,reasons:[]},policy:{decision:'REQUIRE_INDEPENDENT_VERIFICATION',actionBlocked:false}}));
  assert.equal(p.posture, 'VERIFY');
  assert.equal(p.stages[4].actionBlocked, false);
});

test('calm-state reminder never grants authority', () => {
  const p = buildProtectionPlan(fixture({context:{recalledContracts:[{id:'c1',commitment:'Pause and call my bank',source:'self_attested'}]}}));
  assert.equal(p.posture, 'GENTLE_REMINDER');
  assert.equal(p.authorizationGranted, false);
  assert.equal(p.matchedContracts[0].authorization, false);
});

test('high risk takes precedence over a recalled commitment', () => {
  const p = buildProtectionPlan(fixture({context:{recalledContracts:[{id:'c1',commitment:'Pause',source:'self_attested'}]},risk:{level:'HIGH',score:80,reasons:[]},policy:{decision:'DENY_SYNTHETIC_ACTION',actionBlocked:true}}));
  assert.equal(p.posture, 'PAUSE_AND_PROTECT');
});

test('every plan explicitly records no external action', () => {
  const p = buildProtectionPlan(fixture());
  assert.equal(p.externalActionTaken, false);
  assert.equal(p.authorizationGranted, false);
  assert.ok(p.limitations.length >= 3);
});
