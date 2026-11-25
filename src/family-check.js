'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * Family Verification Question — the mother's question that a cloned voice cannot answer.
 *
 * The family agrees a question and answer while calm. When a call or message claims to be
 * a relative in trouble, Yumma suggests asking the caller that question. The person types
 * what the caller said; Yumma says only "matches" or "does not match".
 *
 * Safeguards: the answer is stored only as a salted scrypt hash and is never returned;
 * comparisons are constant-time; repeated wrong attempts are locked out; consent and a
 * purpose are required to create or revoke; a match is a signal, never an authorisation.
 */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;

function normaliseAnswer(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(?:the|a|an) (?=\S)/, ''); // "The Turtle" and "turtle" should both match
}

function hashAnswer(answer, salt) {
  return crypto.scryptSync(normaliseAnswer(answer), Buffer.from(salt, 'hex'), 32).toString('hex');
}

function fail(message, statusCode) { const e = new Error(message); e.statusCode = statusCode; throw e; }

class FamilyCheckStore {
  constructor(file = path.join(__dirname, '..', 'data', 'family-checks.json'), { now = () => Date.now() } = {}) {
    this.file = file;
    this.now = now;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) this.write({ profiles: {} });
  }
  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return { profiles: {} }; } }
  write(db) {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
    try { fs.chmodSync(this.file, 0o600); } catch {}
  }
  consent(c) {
    if (!c || c.granted !== true || typeof c.purpose !== 'string' || !c.purpose.trim()) fail('Explicit consent and a stated purpose are required.', 403);
  }
  publicView(row) {
    return { id: row.id, question: row.question, label: row.label, status: row.status, createdAt: row.createdAt, answerStored: 'salted_hash_only' };
  }
  create(profileId, input, consent) {
    this.consent(consent);
    if (!profileId || !input) fail('Profile and question are required.', 400);
    const question = String(input.question || '').trim();
    const answer = normaliseAnswer(input.answer);
    if (question.length < 8) fail('Please write a question only your family would know how to answer.', 400);
    if (answer.length < 2) fail('Please give an answer of at least two characters.', 400);
    if (normaliseAnswer(question).includes(answer)) fail('The answer must not appear in the question.', 400);
    const db = this.read(); db.profiles[profileId] ||= [];
    const salt = crypto.randomBytes(16).toString('hex');
    const ts = new Date(this.now()).toISOString();
    const row = {
      id: 'fvq-' + crypto.randomUUID(), label: String(input.label || 'Family question').trim().slice(0, 60),
      question: question.slice(0, 200), salt, answerHash: hashAnswer(answer, salt),
      purpose: consent.purpose.trim().slice(0, 240), status: 'active', createdAt: ts, updatedAt: ts,
      failedAttempts: 0, lockedUntil: null
    };
    db.profiles[profileId].push(row); this.write(db);
    return this.publicView(row);
  }
  list(profileId) {
    return (this.read().profiles[profileId] || []).filter(r => r.status === 'active').map(r => this.publicView(r));
  }
  verify(profileId, id, candidate) {
    const db = this.read();
    const row = (db.profiles[profileId] || []).find(r => r.id === id && r.status === 'active');
    if (!row) fail('Active family question not found in this profile.', 404);
    const now = this.now();
    if (row.lockedUntil && Date.parse(row.lockedUntil) > now) {
      return { result: 'LOCKED', match: false, retryAfterSeconds: Math.ceil((Date.parse(row.lockedUntil) - now) / 1000),
        guidance: 'Too many wrong answers. Treat this caller as unverified and contact your family member directly on a number you already know.',
        authorization: false };
    }
    const expected = Buffer.from(row.answerHash, 'hex');
    const actual = Buffer.from(hashAnswer(candidate, row.salt), 'hex');
    const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual) && normaliseAnswer(candidate).length > 0;
    if (match) { row.failedAttempts = 0; row.lockedUntil = null; }
    else {
      row.failedAttempts = (row.failedAttempts || 0) + 1;
      if (row.failedAttempts >= MAX_ATTEMPTS) { row.lockedUntil = new Date(now + LOCK_MS).toISOString(); row.failedAttempts = 0; }
    }
    row.updatedAt = new Date(now).toISOString(); row.lastCheckedAt = row.updatedAt;
    this.write(db);
    return match
      ? { result: 'MATCH', match: true, authorization: false,
          guidance: 'The answer matches your family question. That is a good sign, but it does not approve any payment. If money is involved, still call your family member back on a number you already know.' }
      : { result: 'NO_MATCH', match: false, authorization: false,
          guidance: 'The answer does not match. Do not send money or share codes. Hang up and contact your family member directly on a number you already know.' };
  }
  revoke(profileId, id, consent) {
    this.consent(consent);
    const db = this.read(); const row = (db.profiles[profileId] || []).find(r => r.id === id && r.status === 'active');
    if (!row) fail('Active family question not found in this profile.', 404);
    row.status = 'revoked'; row.question = ''; row.answerHash = ''; row.salt = ''; row.erasedAt = row.updatedAt = new Date(this.now()).toISOString(); this.write(db);
    return this.publicView(row);
  }
}

/** True when a request looks like a family or new-contact identity claim worth challenging. */
function familyCheckApplies(request) {
  const c = (request && request.cues) || {};
  return Boolean(c.familyEmergency || (c.newContact && c.transfer) || c.romance);
}

module.exports = { FamilyCheckStore, familyCheckApplies, normaliseAnswer, MAX_ATTEMPTS };
