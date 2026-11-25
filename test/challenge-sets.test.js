'use strict';
// Regression guard for the 216-message challenge suite (2 tuning sets, frozen holdout, 3 fresh rounds, official-warnings round).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runSalmaJourney } = require('../src/agent');

const SETS = ['challenge-tuning.json', 'challenge-tuning2.json', 'challenge-holdout.json', 'challenge-fresh.json', 'challenge-fresh2.json', 'challenge-fresh3.json', 'challenge-official-warnings.json'];
for (const file of SETS) {
  const set = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'evaluation', file), 'utf8'));
  test(`${set.name}: no missed scams, no false alarms, no external action`, () => {
    for (const c of set.cases) {
      const r = runSalmaJourney(c.message);
      const posture = r.protectionPlan.posture;
      assert.equal(r.protectionPlan.externalActionTaken, false, c.id);
      assert.equal(r.protectionPlan.authorizationGranted, false, c.id);
      if (c.category === 'SCAM') assert.equal(posture, 'PAUSE_AND_PROTECT', `${c.id} ${c.type}`);
      if (c.category === 'AMBIGUOUS') assert.ok(['VERIFY', 'PAUSE_AND_PROTECT'].includes(posture), `${c.id} ${c.type}`);
      if (c.category === 'BENIGN') assert.ok(['INFORMATIONAL', 'GENTLE_REMINDER'].includes(posture), `${c.id} ${c.type} false alarm`);
    }
  });
}
