'use strict';
/**
 * Blind test: messages written by other people, run once, reported as they come out.
 *
 *   npm run blind -- path/to/messages.csv            # first-sight run (refuses to run the same file twice)
 *   npm run blind -- path/to/messages.csv --retest   # a labelled retest after fixes, kept separately
 *   add --ai to include the live AI risk signal (needs ANTHROPIC_API_KEY or OPENAI_API_KEY)
 *
 * The CSV can be the template in evaluation/blind/blind-template.csv or a Google Forms / Microsoft
 * Forms export: columns are found by their headings (message, type/category, contributor, language).
 * The file's SHA-256 is recorded before anything runs, so the first-sight result cannot be redone.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { runSalmaJourney } = require('../src/agent');
const { createModelRiskAdvisor } = require('../src/model-adapter');

function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function category(value) {
  const v = String(value || '').trim().toLowerCase();
  if (/^(scam|fraud|scam message)/.test(v)) return 'SCAM';
  if (/^(unsure|ambiguous|grey|gray|could be|not sure)/.test(v)) return 'AMBIGUOUS';
  if (/^(normal|benign|ordinary|genuine|safe|legit)/.test(v)) return 'BENIGN';
  return null;
}
const judge = (cat, posture) => cat === 'SCAM' ? (posture === 'PAUSE_AND_PROTECT' ? 'PASS' : posture === 'VERIFY' ? 'PARTIAL' : 'MISS')
  : cat === 'AMBIGUOUS' ? (['VERIFY', 'PAUSE_AND_PROTECT'].includes(posture) ? 'PASS' : 'MISS')
  : (['INFORMATIONAL', 'GENTLE_REMINDER'].includes(posture) ? 'PASS' : 'FALSE ALARM');

(async () => {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  if (!file) { console.error('Usage: npm run blind -- messages.csv [--retest] [--ai]'); process.exit(2); }
  const raw = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  const runsDir = path.join(__dirname, 'blind', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  const retest = args.includes('--retest');
  const out = path.join(runsDir, `${sha.slice(0, 16)}-${retest ? 'retest-' + new Date().toISOString().slice(0, 10) : 'first-sight'}.json`);
  if (!retest && fs.existsSync(out)) {
    console.error(`This file already had its first-sight run (${path.basename(out)}). Use --retest for a labelled retest.`); process.exit(3);
  }
  const rows = parseCsv(raw.toString('utf8'));
  const head = rows.shift().map(h => h.trim().toLowerCase());
  const col = re => head.findIndex(h => re.test(h));
  const cCat = col(/type|category|kind|label/), cWho = col(/contributor|initials|name|author|who/), cLang = col(/language|lang/);
  const cMsg = head.findIndex((h, i) => i !== cCat && /message|text|scenario/.test(h));
  if (cMsg < 0 || cCat < 0) { console.error('Could not find the message and type columns. Headings found: ' + head.join(', ')); process.exit(2); }
  const advisor = args.includes('--ai') ? createModelRiskAdvisor() : null;
  if (advisor && advisor.provider === 'none') { console.error('--ai needs ANTHROPIC_API_KEY or OPENAI_API_KEY.'); process.exit(2); }

  const results = [], skipped = [];
  for (const [i, r] of rows.entries()) {
    const message = (r[cMsg] || '').trim(), cat = category(r[cCat]);
    if (!message || !cat) { skipped.push({ row: i + 2, reason: !message ? 'empty message' : `unknown type "${r[cCat]}"` }); continue; }
    let signal = null, ai = null;
    if (advisor) { const res = await advisor.classify(message); signal = res.status === 'signal' ? res.signal : null; ai = { status: res.status, level: signal && signal.level, latencyMs: res.latencyMs }; }
    const a = runSalmaJourney(message, { modelRiskSignal: signal });
    results.push({ id: `B${String(results.length + 1).padStart(3, '0')}`, contributor: cWho >= 0 ? (r[cWho] || '').trim() || 'anonymous' : 'anonymous',
      language: cLang >= 0 ? (r[cLang] || '').trim() : (/[؀-ۿ]/.test(message) ? 'Arabic' : 'English'),
      category: cat, posture: a.protectionPlan.posture, score: a.risk.score, patterns: (a.risk.matchedPatterns || []).map(p => p.id),
      result: judge(cat, a.protectionPlan.posture), ai, messageSha256: crypto.createHash('sha256').update(message).digest('hex').slice(0, 16), message,
      authorizationGranted: a.protectionPlan.authorizationGranted, externalActionTaken: a.protectionPlan.externalActionTaken });
  }
  const by = c => results.filter(x => x.category === c);
  const scams = by('SCAM'), amb = by('AMBIGUOUS'), ben = by('BENIGN');
  const summary = {
    total: results.length, contributors: [...new Set(results.map(r => r.contributor))].length,
    scams: { n: scams.length, protected: scams.filter(x => x.result === 'PASS').length, verifyOnly: scams.filter(x => x.result === 'PARTIAL').length, missed: scams.filter(x => x.result === 'MISS').length },
    ambiguous: { n: amb.length, pass: amb.filter(x => x.result === 'PASS').length },
    benign: { n: ben.length, pass: ben.filter(x => x.result === 'PASS').length, falseAlarms: ben.filter(x => x.result === 'FALSE ALARM').length },
    overallCorrect: results.filter(x => x.result === 'PASS').length,
    actedOnItsOwn: results.filter(x => x.authorizationGranted !== false || x.externalActionTaken !== false).length
  };
  summary.overallPct = results.length ? Math.round(1000 * summary.overallCorrect / results.length) / 10 : 0;
  summary.scamsWarnedPct = scams.length ? Math.round(1000 * (summary.scams.protected + summary.scams.verifyOnly) / scams.length) / 10 : 0;
  const record = { kind: retest ? 'retest' : 'first-sight', runAt: new Date().toISOString(), version: require('../package.json').version, fileSha256: sha, aiProvider: advisor ? advisor.provider : 'none', summary, skipped, results };
  fs.writeFileSync(out, JSON.stringify(record, null, 2) + '\n');

  const md = [`# Yumma blind test: ${retest ? 'retest' : 'first sight'} (${record.runAt.slice(0, 10)})`, '',
    `Messages written by ${summary.contributors} people who had not seen Yumma's rules or test sets. File SHA-256 \`${sha}\`, recorded before the run. Yumma v${record.version}; AI signal: ${record.aiProvider}.`, '',
    '| Measure | Result |', '|---|---|',
    `| Scams fully protected (PAUSE AND PROTECT) | ${summary.scams.protected} of ${summary.scams.n} |`,
    `| Scams warned at least (VERIFY or stronger) | ${summary.scams.protected + summary.scams.verifyOnly} of ${summary.scams.n} (${summary.scamsWarnedPct}%) |`,
    `| Scams missed | ${summary.scams.missed} |`,
    `| Grey-zone messages sent to verification | ${summary.ambiguous.pass} of ${summary.ambiguous.n} |`,
    `| Ordinary messages with no false alarm | ${summary.benign.pass} of ${summary.benign.n} |`,
    `| Overall correct | ${summary.overallCorrect} of ${summary.total} (${summary.overallPct}%) |`,
    `| Times Yumma acted or authorised on its own | ${summary.actedOnItsOwn} |`, '',
    '## Every message that was not fully correct', '',
    '| ID | Type | Result | Yumma decided | Message |', '|---|---|---|---|---|',
    ...results.filter(x => x.result !== 'PASS').map(x => `| ${x.id} | ${x.category} | ${x.result} | ${x.posture} (${x.score}) | ${x.message.replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, 160)} |`),
    '', skipped.length ? `Skipped rows: ${skipped.map(s => `row ${s.row} (${s.reason})`).join('; ')}.` : 'No rows skipped.'];
  const mdFile = out.replace(/\.json$/, '.md');
  fs.writeFileSync(mdFile, md.join('\n') + '\n');
  console.log(md.join('\n'));
  console.log(`\nSaved ${path.relative(process.cwd(), out)} and ${path.basename(mdFile)}.`);
})().catch(e => { console.error(e.message); process.exit(1); });
