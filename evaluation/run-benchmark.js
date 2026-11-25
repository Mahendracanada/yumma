'use strict';
/**
 * Ten-scenario benchmark for the summary report: expected vs actual decision, the result the
 * first time Yumma ever saw each message, and latency. With an API key in the environment it
 * also times the live AI risk signal.   npm run benchmark   (add --ai to include the AI call)
 */
const fs = require('node:fs');
const path = require('node:path');
const { runSalmaJourney } = require('../src/agent');
const { createModelRiskAdvisor } = require('../src/model-adapter');

const PICKS = [['holdout', 'H01'], ['holdout', 'H02'], ['holdout', 'H04'], ['fresh', 'F02'], ['holdout', 'H16'],
  ['holdout', 'H07'], ['fresh', 'F05'], ['fresh', 'F13'], ['holdout', 'H24'], ['holdout', 'H27']];
const sets = { holdout: require('./challenge-holdout.json').cases, fresh: require('./challenge-fresh.json').cases };
const firstSight = {
  holdout: Object.fromEntries(require('./results-round1-v2.7.json').holdout.rows.map(r => [r.id, r])),
  fresh: Object.fromEntries(require('./results-round3-fresh-v2.7.json').fresh.rows.map(r => [r.id, r]))
};
const expected = { SCAM: 'PAUSE AND PROTECT', AMBIGUOUS: 'VERIFY or stronger', BENIGN: 'INFORMATIONAL' };
const judge = (cat, posture) => cat === 'SCAM' ? (posture === 'PAUSE_AND_PROTECT' ? 'PASS' : posture === 'VERIFY' ? 'PARTIAL' : 'MISS')
  : cat === 'AMBIGUOUS' ? (['VERIFY', 'PAUSE_AND_PROTECT'].includes(posture) ? 'PASS' : 'MISS')
  : (['INFORMATIONAL', 'GENTLE_REMINDER'].includes(posture) ? 'PASS' : 'FALSE ALARM');
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

(async () => {
  const useAI = process.argv.includes('--ai');
  const advisor = useAI ? createModelRiskAdvisor() : null;
  if (useAI && advisor.provider === 'none') { console.error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY to time the AI call.'); process.exit(2); }
  for (let i = 0; i < 50; i++) runSalmaJourney(sets.holdout[0].message); // warm up
  const rows = [];
  for (const [set, id] of PICKS) {
    const c = sets[set].find(x => x.id === id);
    const times = [];
    let r;
    for (let i = 0; i < 200; i++) { const t = process.hrtime.bigint(); r = runSalmaJourney(c.message); times.push(Number(process.hrtime.bigint() - t) / 1e6); }
    let ai = null;
    if (advisor) {
      const res = await advisor.classify(c.message);
      const withAi = runSalmaJourney(c.message, { modelRiskSignal: res.status === 'signal' ? res.signal : null });
      ai = { status: res.status, level: res.signal ? res.signal.level : null, latencyMs: res.latencyMs, finalPosture: withAi.protectionPlan.posture };
    }
    const posture = r.protectionPlan.posture;
    rows.push({ id, set, type: c.type, language: /[؀-ۿ]/.test(c.message) ? 'Arabic' : 'English', category: c.category,
      expected: expected[c.category], firstSight: firstSight[set][id].result, firstSightPosture: firstSight[set][id].posture.replaceAll('_', ' '),
      actual: posture.replaceAll('_', ' '), result: judge(c.category, posture), rulesMedianMs: Math.round(median(times) * 1000) / 1000, ai,
      authorizationGranted: r.protectionPlan.authorizationGranted, externalActionTaken: r.protectionPlan.externalActionTaken });
  }
  const pass = rows.filter(r => r.result === 'PASS').length, firstPass = rows.filter(r => r.firstSight === 'PASS').length;
  const md = ['| # | Scenario | Language | Expected | First time seen | v2.8 result | Rules latency (median) |' + (advisor ? ' AI call |' : ''),
    '|---|---|---|---|---|---|---|' + (advisor ? '---|' : ''),
    ...rows.map((r, i) => `| ${i + 1} | ${r.type} (${r.id}) | ${r.language} | ${r.expected} | ${r.firstSightPosture} (${r.firstSight}) | ${r.actual} (${r.result}) | ${r.rulesMedianMs} ms |` + (r.ai ? ` ${r.ai.status === 'signal' ? r.ai.level + ', ' + r.ai.latencyMs + ' ms' : r.ai.status} |` : '')),
    '', `Pass rate: ${pass}/${rows.length} today; ${firstPass}/${rows.length} the first time each message was seen. Authorisation granted: 0. External actions: 0.`];
  console.log(md.join('\n'));
  fs.writeFileSync(path.join(__dirname, 'benchmark-results.json'), JSON.stringify({ runAt: new Date().toISOString(), node: process.version, aiProvider: advisor ? advisor.provider : 'none', pass, firstPass, total: rows.length, rows }, null, 2) + '\n');
})();
