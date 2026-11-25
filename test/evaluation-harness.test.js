'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getScenarios, getScenario } = require('../src/demo-mode');
const { runSalmaJourney } = require('../src/agent');

test('judge scenario registry is fully evaluable and preserves safety invariants', () => {
  const scenarios = getScenarios();
  assert.equal(scenarios.length, 5);
  for (const { id, expectedPosture } of scenarios) {
    const scenario = getScenario(id);
    assert.ok(scenario?.message, `${id} must expose its internal test message`);
    const result = runSalmaJourney(scenario.message);
    assert.equal(result.protectionPlan.posture, expectedPosture, id);
    assert.equal(result.protectionPlan.authorizationGranted, false, id);
    assert.equal(result.protectionPlan.externalActionTaken, false, id);
  }
});
