'use strict';
// Runs the challenge sets through the real agent and scores them.
// Usage: node evaluation/run-challenge.js [--json out.json] [--label name]
const fs = require('node:fs');
const path = require('node:path');
const { runSalmaJourney } = require('../src/agent');
const { createModelRiskAdvisor } = require('../src/model-adapter');

const PROTECT = 'PAUSE_AND_PROTECT', VERIFY = 'VERIFY';
function judge(category, posture) {
  if (category === 'SCAM') return posture === PROTECT ? 'PASS' : posture === VERIFY ? 'PARTIAL' : 'MISS';
  if (category === 'AMBIGUOUS') return (posture === VERIFY || posture === PROTECT) ? 'PASS' : 'MISS';
  return (posture === VERIFY || posture === PROTECT) ? 'FALSE_ALARM' : 'PASS';
}
async function runSet(file, advisor) {
  const set = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  const rows = [];
  for (const c of set.cases) {
    let ai = null, signal = null;
    if (advisor) {
      const r = await advisor.classify(c.message);
      signal = r.status === 'signal' ? r.signal : null;
      ai = { status: r.status, level: signal ? signal.level : null, latencyMs: r.latencyMs ?? null };
    }
    const a = runSalmaJourney(c.message, { modelRiskSignal: signal });
    const posture = a.protectionPlan.posture;
    if (ai) ai.raised = Boolean(a.risk.modelSignal && a.risk.modelSignal.applied);
    rows.push({ id: c.id, category: c.category, type: c.type, posture, score: a.risk.score, result: judge(c.category, posture), ai,
      externalActionTaken: a.protectionPlan.externalActionTaken, authorizationGranted: a.protectionPlan.authorizationGranted });
  }
  const by = cat => rows.filter(r => r.category === cat);
  const scams = by('SCAM'), amb = by('AMBIGUOUS'), ben = by('BENIGN');
  const count = (arr, res) => arr.filter(r => r.result === res).length;
  const summary = {
    total: rows.length,
    scam: { n: scams.length, protect: count(scams, 'PASS'), verifyOnly: count(scams, 'PARTIAL'), missed: count(scams, 'MISS') },
    ambiguous: { n: amb.length, pass: count(amb, 'PASS'), missed: count(amb, 'MISS') },
    benign: { n: ben.length, pass: count(ben, 'PASS'), falseAlarms: count(ben, 'FALSE_ALARM') },
    noExternalActionEver: rows.every(r => r.externalActionTaken === false && r.authorizationGranted === false)
  };
  summary.overallCorrect = count(scams, 'PASS') + count(amb, 'PASS') + count(ben, 'PASS');
  summary.overallCorrectPct = Math.round(1000 * summary.overallCorrect / rows.length) / 10;
  summary.scamsWarnedAtLeastVerify = summary.scam.protect + summary.scam.verifyOnly;
  if (advisor) {
    const withAi = rows.filter(r => r.ai);
    summary.ai = { provider: advisor.provider, calls: withAi.length,
      signals: withAi.filter(r => r.ai.status === 'signal').length,
      errorsIgnored: withAi.filter(r => r.ai.status !== 'signal').length,
      raisedTheLevel: withAi.filter(r => r.ai.raised).length,
      // agreement: the AI's own level matches the expected category (SCAM→HIGH, AMBIGUOUS→MEDIUM/HIGH, BENIGN→LOW)
      aiAgreesWithLabel: withAi.filter(r => r.ai.level && ((r.category === 'SCAM' && r.ai.level === 'HIGH') || (r.category === 'AMBIGUOUS' && r.ai.level !== 'LOW') || (r.category === 'BENIGN' && r.ai.level === 'LOW'))).length,
      meanLatencyMs: Math.round(withAi.reduce((s, r) => s + (r.ai.latencyMs || 0), 0) / Math.max(1, withAi.length)) };
  }
  return { name: set.name, rows, summary };
}
const args = process.argv.slice(2);
(async () => {
  let advisor = null;
  if (args.includes('--ai')) {
    advisor = createModelRiskAdvisor();
    if (advisor.provider === 'none') {
      console.error('AI mode needs ANTHROPIC_API_KEY (or OPENAI_API_KEY) set in this Terminal session. Nothing was run.');
      process.exit(2);
    }
    console.log(`AI risk signal ON — provider ${advisor.provider}. Deterministic rules still decide; the AI can only add caution.`);
  }
  const out = { label: args.includes('--label') ? args[args.indexOf('--label') + 1] : (advisor ? 'ai-run' : 'run'), runAt: new Date().toISOString(),
    aiProvider: advisor ? advisor.provider : 'none',
    tuning: await runSet('challenge-tuning.json', advisor), tuning2: await runSet('challenge-tuning2.json', advisor), holdout: await runSet('challenge-holdout.json', advisor),
    fresh: await runSet('challenge-fresh.json', advisor), fresh2: await runSet('challenge-fresh2.json', advisor), fresh3: await runSet('challenge-fresh3.json', advisor) };
  for (const k of ['tuning', 'tuning2', 'holdout', 'fresh', 'fresh2', 'fresh3']) {
    const s = out[k].summary;
    console.log(`\n== ${out[k].name}`);
    for (const r of out[k].rows) console.log(`${r.id.padEnd(4)} ${r.category.padEnd(9)} ${r.posture.padEnd(18)} ${String(r.score).padStart(3)}  ${r.result.padEnd(11)} ${r.ai ? ('AI ' + (r.ai.level || r.ai.status) + (r.ai.raised ? ' (raised)' : '')).padEnd(22) : ''}${r.type}`);
    console.log(`Scams: ${s.scam.protect}/${s.scam.n} pause-and-protect, ${s.scam.verifyOnly} verify-only, ${s.scam.missed} missed | Ambiguous: ${s.ambiguous.pass}/${s.ambiguous.n} | Benign: ${s.benign.pass}/${s.benign.n} (${s.benign.falseAlarms} false alarms) | Overall ${s.overallCorrect}/${s.total} = ${s.overallCorrectPct}% | no external action: ${s.noExternalActionEver}`);
    if (s.ai) console.log(`AI: ${s.ai.signals}/${s.ai.calls} answered, ${s.ai.errorsIgnored} ignored on error, raised the level ${s.ai.raisedTheLevel} times, agreed with the label ${s.ai.aiAgreesWithLabel}/${s.ai.signals}, mean latency ${s.ai.meanLatencyMs} ms`);
  }
  if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(out, null, 2));
})().catch(e => { console.error(e.message); process.exit(1); });
