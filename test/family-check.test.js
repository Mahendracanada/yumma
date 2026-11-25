'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { FamilyCheckStore, familyCheckApplies, normaliseAnswer, MAX_ATTEMPTS } = require('../src/family-check');
const { runSalmaJourney, extractRequest } = require('../src/agent');

const consent = { granted: true, purpose: 'Family verification test' };
function tmpStore(opts) { return new FamilyCheckStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fvq-')), 'f.json'), opts); }
function seed(store) { return store.create('p1', { question: 'What did we call Grandma’s old green car?', answer: 'The Turtle' }, consent); }

test('family question requires consent and never stores or returns the plain answer', () => {
  const store = tmpStore();
  assert.throws(() => store.create('p1', { question: 'What did we call the car?', answer: 'turtle' }, null), /consent/);
  const q = seed(store);
  assert.equal(q.answerStored, 'salted_hash_only');
  assert.equal(q.answer, undefined); assert.equal(q.answerHash, undefined);
  const raw = fs.readFileSync(store.file, 'utf8');
  assert.doesNotMatch(raw, /turtle/i);
  assert.deepEqual(Object.keys(store.list('p1')[0]).sort(), ['answerStored', 'createdAt', 'id', 'label', 'question', 'status']);
});

test('answers match regardless of case, spacing and punctuation; wrong answers do not', () => {
  const store = tmpStore(); const q = seed(store);
  assert.equal(store.verify('p1', q.id, '  the TURTLE!! ').result, 'MATCH');
  const wrong = store.verify('p1', q.id, 'the tortoise');
  assert.equal(wrong.result, 'NO_MATCH'); assert.equal(wrong.match, false);
  assert.match(wrong.guidance, /Do not send money/);
  assert.equal(normaliseAnswer('  Al-Noor  '), 'al noor');
  assert.equal(store.verify('p1', q.id, 'Turtle').result, 'MATCH');
});

test('a match is a signal, never an authorisation', () => {
  const store = tmpStore(); const q = seed(store);
  const r = store.verify('p1', q.id, 'the turtle');
  assert.equal(r.authorization, false);
  assert.match(r.guidance, /does not approve any payment/);
});

test('repeated wrong answers lock the question, even against the right answer', () => {
  let now = Date.parse('2026-11-24T10:00:00Z');
  const store = tmpStore({ now: () => now }); const q = seed(store);
  for (let i = 0; i < MAX_ATTEMPTS; i++) store.verify('p1', q.id, 'guess ' + i);
  const locked = store.verify('p1', q.id, 'the turtle');
  assert.equal(locked.result, 'LOCKED'); assert.ok(locked.retryAfterSeconds > 0);
  now += 11 * 60 * 1000;
  assert.equal(store.verify('p1', q.id, 'the turtle').result, 'MATCH');
});

test('weak questions are rejected and revocation requires consent', () => {
  const store = tmpStore();
  assert.throws(() => store.create('p1', { question: 'Is the answer turtle?', answer: 'turtle' }, consent), /must not appear/);
  assert.throws(() => store.create('p1', { question: 'Short', answer: 'xx' }, consent), /only your family/);
  const q = seed(store);
  assert.throws(() => store.revoke('p1', q.id, null), /consent/);
  store.revoke('p1', q.id, consent);
  assert.equal(store.list('p1').length, 0);
  assert.throws(() => store.verify('p1', q.id, 'the turtle'), /not found/);
});

test('agent suggests the family question for family-emergency and new-contact money requests only', () => {
  const qs = [{ id: 'fvq-00000000-0000-0000-0000-000000000000', question: 'What did we call Grandma’s old green car?' }];
  const fam = runSalmaJourney("Mum it's me, I lost my phone and I'm using a friend's number. Please send AED 3,000 urgently", { familyQuestions: qs });
  assert.equal(fam.familyCheck.applies, true);
  assert.equal(fam.familyCheck.authorization, false);
  assert.match(fam.response, /Grandma’s old green car/);
  assert.equal(fam.protectionPlan.posture, 'PAUSE_AND_PROTECT');
  assert.equal(fam.audit.familyCheckSuggested, true);
  const noQ = runSalmaJourney("Dad, I'm in hospital abroad, please send money now");
  assert.equal(noQ.familyCheck.applies, true);
  assert.match(noQ.response, /call them back on a number you already know/);
  assert.equal(runSalmaJourney('A caller from my bank needs the OTP I just received', { familyQuestions: qs }).familyCheck.applies, false);
  assert.equal(runSalmaJourney('Remind me to call my mother on Friday', { familyQuestions: qs }).familyCheck.applies, false);
  assert.equal(familyCheckApplies(extractRequest('What is an OTP?')), false);
});

async function freePort() { return await new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(e => e ? rej(e) : res(p)); }); }); }

test('HTTP: family question lifecycle, verification and in-conversation suggestion', async t => {
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  const dataBackup = path.join(__dirname, '..', 'data', 'family-checks.json');
  const before = fs.existsSync(dataBackup) ? fs.readFileSync(dataBackup) : null;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server.js')], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '' }, stdio: 'ignore' });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); if (before) fs.writeFileSync(dataBackup, before); else { try { fs.unlinkSync(dataBackup); } catch {} } });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const post = (u, b, m = 'POST') => fetch(base + u, { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  assert.equal((await post('/api/family-check/salma-demo', { question: { question: 'What did we call Grandma’s old green car?', answer: 'turtle' } })).status, 403);
  const created = await (await post('/api/family-check/salma-demo', { question: { question: 'What did we call Grandma’s old green car?', answer: 'The Turtle' }, consent })).json();
  assert.match(created.question.id, /^fvq-/);
  const listed = await (await fetch(`${base}/api/family-check/salma-demo`)).json();
  assert.ok(listed.questions.every(q => q.answerHash === undefined && q.answer === undefined));
  assert.equal((await (await post(`/api/family-check/salma-demo/${created.question.id}/verify`, { answer: 'turtle' })).json()).result, 'MATCH');
  assert.equal((await post('/api/family-check/salma-demo/not-an-id/verify', { answer: 'x' })).status, 400);
  const conv = await (await post('/api/conversation', { message: "Mum it's me, new number, please send AED 2,000 today" })).json();
  assert.equal(conv.assessment.familyCheck.applies, true);
  assert.ok(conv.assessment.familyCheck.questions.some(q => q.id === created.question.id));
  assert.equal(conv.assessment.protectionPlan.externalActionTaken, false);
  const health = await fetch(`${base}/api/health`);
  assert.match(health.headers.get('content-security-policy'), /media-src 'self' blob:/);
});
