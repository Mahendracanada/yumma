'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { getScenarios, getScenario } = require('../src/demo-mode');
const { runSalmaJourney } = require('../src/agent');

const ids = getScenarios().map(({ id }) => id);
const results = ids.map((id) => {
  const scenario = getScenario(id);
  assert.ok(scenario, `Scenario ${id} must exist in the internal registry`);
  const assessment = runSalmaJourney(scenario.message);
  const checks = {
    postureMatchesExpected: assessment.protectionPlan.posture === scenario.expectedPosture,
    authorizationRemainsFalse: assessment.protectionPlan.authorizationGranted === false,
    externalActionRemainsFalse: assessment.protectionPlan.externalActionTaken === false,
    riskAndPolicyPresent: Boolean(assessment.risk && assessment.policy),
  };
  return {
    id,
    title: scenario.title,
    category: scenario.category,
    expectedPosture: scenario.expectedPosture,
    actualPosture: assessment.protectionPlan.posture,
    riskLevel: assessment.risk.level,
    riskScore: assessment.risk.score,
    policyDecision: assessment.policy.decision,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  evaluationType: 'deterministic synthetic scenario regression',
  scenarios: results.length,
  passed: results.filter((r) => r.passed).length,
  failed: results.filter((r) => !r.passed).length,
  results,
  limitations: [
    'Synthetic authored scenarios only; not a real-world fraud detection accuracy estimate.',
    'The evaluation exercises the deterministic local agent engine, not live bank or messaging integrations.',
    'A passing result does not establish production security, independent validation, or Android readiness.'
  ]
};

const reportDir = path.join(__dirname, '..', 'reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'scenario-evaluation-latest.json'), `${JSON.stringify(summary, null, 2)}\n`);
const lines = [
  '# Yumma synthetic scenario evaluation',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  `**Result: ${summary.passed}/${summary.scenarios} passed; ${summary.failed} failed.**`,
  '',
  '| Scenario | Expected | Actual | Risk | Score | Result |',
  '|---|---|---|---:|---:|---|',
  ...results.map((r) => `| ${r.title} | ${r.expectedPosture} | ${r.actualPosture} | ${r.riskLevel} | ${r.riskScore} | ${r.passed ? 'PASS' : 'FAIL'} |`),
  '',
  '## Safety invariants',
  '',
  'Every scenario checks that authorization remains false and no external action is taken.',
  '',
  '## Limitations',
  '',
  ...summary.limitations.map((item) => `- ${item}`),
  ''
];
fs.writeFileSync(path.join(reportDir, 'scenario-evaluation-latest.md'), lines.join('\n'));
console.log(`Yumma scenario evaluation: ${summary.passed}/${summary.scenarios} passed; ${summary.failed} failed.`);
for (const r of results) console.log(`${r.passed ? 'PASS' : 'FAIL'} ${r.id}: ${r.actualPosture} (expected ${r.expectedPosture})`);
if (summary.failed) process.exitCode = 1;
