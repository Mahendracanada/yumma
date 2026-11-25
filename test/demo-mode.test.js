'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getScenarios, getScenario } = require('../src/demo-mode');
const { runSalmaJourney } = require('../src/agent');
test('provides five bounded synthetic judge scenarios', () => {
  const scenarios = getScenarios();
  assert.equal(scenarios.length, 5);
  assert.ok(scenarios.every(s => !('message' in s)));
});
test('all demo scenarios produce their declared protection posture', () => {
  for (const id of ['bank-transfer-pressure','otp-request','remote-access','family-new-number','benign-information']) {
    const scenario = getScenario(id);
    const result = runSalmaJourney(scenario.message);
    assert.equal(result.protectionPlan.posture, scenario.expectedPosture, id);
    assert.equal(result.protectionPlan.authorizationGranted, false, id);
    assert.equal(result.protectionPlan.externalActionTaken, false, id);
    assert.equal(result.familyCheck.authorization, false, id);
  }
  const family = runSalmaJourney(getScenario('family-new-number').message, { familyQuestions: [{ id: 'q1', question: 'What was the name of our first pet?' }] });
  assert.equal(family.familyCheck.applies, true);
});
test('unknown scenario is not resolved to a fallback', () => assert.equal(getScenario('made-up'), null));
