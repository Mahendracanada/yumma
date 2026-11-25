'use strict';
/**
 * Why an AI agent: every message the rules got wrong the FIRST time they saw it (four unseen
 * rounds), sent to the live AI risk signal. Shows how many the AI would have caught on its own.
 * The AI can only raise caution, so it can fix misses but never cause one; false alarms are
 * listed for completeness (the AI cannot lower them by design).
 *
 *   ANTHROPIC_API_KEY=... node evaluation/run-ai-gap.js      (or OPENAI_API_KEY)
 */
const fs = require('node:fs');
const path = require('node:path');
const { createModelRiskAdvisor } = require('../src/model-adapter');

const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const byId = set => Object.fromEntries(load(set).cases.map(c => [c.id, c]));
const holdout = byId('challenge-holdout.json'), fresh = byId('challenge-fresh.json');
const fresh2 = load('challenge-fresh2.json').cases, fresh3 = load('challenge-fresh3.json').cases;

const gaps = [];
for (const r of load('results-round1-v2.7.json').holdout.rows) if (r.result !== 'PASS') gaps.push({ round: 'holdout', id: r.id, category: r.category, firstSight: r.result, message: holdout[r.id].message });
for (const r of load('results-round3-fresh-v2.7.json').fresh.rows) if (r.result !== 'PASS') gaps.push({ round: 'fresh', id: r.id, category: r.category, firstSight: r.result, message: fresh[r.id].message });
for (const [file, set] of [['results-round5-fresh2-first-sight.json', fresh2], ['results-round6-fresh3-first-sight.json', fresh3]]) {
  load(file).results.forEach((r, i) => { if (r.result !== 'PASS') gaps.push({ round: file.includes('fresh2') ? 'fresh2' : 'fresh3', id: set[i].id, category: r.category, firstSight: r.result, message: r.message }); });
}

(async () => {
  const advisor = createModelRiskAdvisor();
  if (advisor.provider === 'none') { console.error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY first. Nothing was run.'); process.exit(2); }
  const rows = [];
  for (const g of gaps) {
    const res = await advisor.classify(g.message);
    const level = res.status === 'signal' ? res.signal.level : null;
    const caught = g.category === 'SCAM' ? level === 'HIGH' : g.category === 'AMBIGUOUS' ? (level === 'MEDIUM' || level === 'HIGH') : null;
    rows.push({ ...g, aiStatus: res.status, aiLevel: level, latencyMs: res.latencyMs, aiWouldHaveCaught: caught });
    console.log(`${g.round.padEnd(8)} ${g.id.padEnd(4)} ${g.category.padEnd(9)} first sight ${g.firstSight.padEnd(11)} AI ${String(level || res.status).padEnd(16)} ${caught === true ? 'CAUGHT' : caught === false ? 'not caught' : '(false alarm: AI cannot lower)'}`);
  }
  const fixable = rows.filter(r => r.category !== 'BENIGN');
  const caught = fixable.filter(r => r.aiWouldHaveCaught).length;
  const lat = rows.filter(r => r.latencyMs).map(r => r.latencyMs).sort((a, b) => a - b);
  const summary = { runAt: new Date().toISOString(), provider: advisor.provider, firstSightGaps: rows.length,
    missesAndPartials: fixable.length, aiWouldHaveCaught: caught, falseAlarmsListed: rows.length - fixable.length,
    medianLatencyMs: lat.length ? lat[Math.floor(lat.length / 2)] : null };
  console.log(`\nOf ${fixable.length} scams and grey-zone messages the rules got wrong the first time, the AI signal on its own would have caught ${caught}. Median AI latency ${summary.medianLatencyMs} ms.`);
  fs.writeFileSync(path.join(__dirname, 'results-ai-gap.json'), JSON.stringify({ summary, rows }, null, 2) + '\n');
})().catch(e => { console.error(e.message); process.exit(1); });
