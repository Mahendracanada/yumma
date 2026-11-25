'use strict';
// Runs the official-warnings set (scam types UAE authorities warned about in 2025–2026) through the real agent.
// Usage: node evaluation/run-official-warnings.js [--out results-file.json] [--label text]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { runSalmaJourney } = require('../src/agent');

const FILE = path.join(__dirname, 'challenge-official-warnings.json');
const PROTECT = 'PAUSE_AND_PROTECT', VERIFY = 'VERIFY';
const judge = (category, posture) => category === 'SCAM'
  ? (posture === PROTECT ? 'PASS' : posture === VERIFY ? 'PARTIAL' : 'MISS')
  : ((posture === PROTECT || posture === VERIFY) ? 'FALSE_ALARM' : 'PASS');

const raw = fs.readFileSync(FILE);
const set = JSON.parse(raw);
const sha = crypto.createHash('sha256').update(raw).digest('hex');
const rows = set.cases.map(c => {
  const a = runSalmaJourney(c.message);
  const posture = a.protectionPlan.posture;
  return { id: c.id, category: c.category, type: c.type, source: c.source, posture, level: a.risk.level, score: a.risk.score,
    pattern: (a.risk.matchedPatterns || [])[0]?.id || null, result: judge(c.category, posture),
    externalActionTaken: a.protectionPlan.externalActionTaken, authorizationGranted: a.protectionPlan.authorizationGranted };
});
const scams = rows.filter(r => r.category === 'SCAM'), controls = rows.filter(r => r.category === 'BENIGN');
const n = (arr, res) => arr.filter(r => r.result === res).length;
const summary = {
  scams: scams.length, paused: n(scams, 'PASS'), verifyOnly: n(scams, 'PARTIAL'), missed: n(scams, 'MISS'),
  warned: n(scams, 'PASS') + n(scams, 'PARTIAL'), controls: controls.length, falseAlarms: n(controls, 'FALSE_ALARM'),
  noExternalActionEver: rows.every(r => r.externalActionTaken === false && r.authorizationGranted === false)
};
const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'run';
const out = { set: set.name, setSha256: sha, label, ranAt: new Date().toISOString(), summary, rows };
console.log(`Official-warnings round (${label}): ${summary.warned}/${summary.scams} scams warned (${summary.paused} paused, ${summary.verifyOnly} verify), ${summary.missed} missed; ${summary.falseAlarms}/${summary.controls} false alarms; no external action: ${summary.noExternalActionEver}. Set SHA-256 ${sha.slice(0, 16)}…`);
for (const r of rows.filter(r => r.result !== 'PASS')) console.log(`  ${r.result.padEnd(11)} ${r.id} ${r.type} → ${r.posture} (${r.level} ${r.score})`);
if (args.includes('--out')) fs.writeFileSync(path.join(__dirname, args[args.indexOf('--out') + 1]), JSON.stringify(out, null, 2) + '\n');
