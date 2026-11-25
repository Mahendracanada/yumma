'use strict';
/**
 * Execution trace and tamper-evident decision record.
 *
 * Trace: every assessment records each step it ran (understand, recall, assess, AI signal,
 * consequences, policy, plan, family check, explanation, record) with its timing and result.
 * The trace is returned to the browser and printed to the server log as one JSON line.
 * Logs never carry the raw message: long numbers, emails and links are masked first.
 *
 * Decision record: an append-only JSON Lines file. Each entry stores a SHA-256 hash of the
 * message (never the message itself), the decision, and the hash of the previous entry, so
 * changing or deleting any past entry breaks the chain and `verify()` reports where.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');

function redact(text, max = 160) {
  return String(text || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+|\b[\w-]+\.(?:com|ae|net|org|ly|io|xyz)\/\S*/gi, '[link]')
    .replace(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/gi, '[iban]')
    .replace(/\d[\d\s-]{3,}\d/g, m => (m.replace(/\D/g, '').length >= 4 ? '[number]' : m))
    .slice(0, max);
}

class Trace {
  constructor({ kind = 'assessment', now = () => process.hrtime.bigint() } = {}) {
    this.id = `trc-${crypto.randomUUID()}`;
    this.kind = kind;
    this.startedAt = new Date().toISOString();
    this.now = now;
    this.t0 = now();
    this.last = this.t0;
    this.steps = [];
  }
  /** Records a step; `ms` is the time since the previous step unless given. */
  step(name, detail = {}, ms) {
    const at = this.now();
    const elapsed = ms ?? Number(at - this.last) / 1e6;
    this.last = at;
    this.steps.push({ n: this.steps.length + 1, step: name, ms: Math.round(elapsed * 1000) / 1000, ...detail });
    return this;
  }
  /** Adds steps measured elsewhere (for example inside the agent pipeline). */
  absorb(steps = []) {
    for (const s of steps) this.steps.push({ n: this.steps.length + 1, ...s });
    this.last = this.now();
    return this;
  }
  toJSON() {
    return { id: this.id, kind: this.kind, startedAt: this.startedAt, totalMs: Math.round(Number(this.now() - this.t0) / 1e3) / 1000, steps: this.steps };
  }
}

class DecisionLog {
  constructor(file = path.join(__dirname, '..', 'data', 'decision-log.jsonl')) {
    this.file = file;
    this.head = 'GENESIS';
    this.seq = 0;
    try {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
      if (lines.length) { const last = JSON.parse(lines[lines.length - 1]); this.head = last.hash; this.seq = last.seq; }
    } catch { /* new log */ }
  }
  static entryHash(entry) {
    const { hash, ...body } = entry;
    return sha256(JSON.stringify(body));
  }
  append(fields) {
    const entry = { seq: this.seq + 1, id: `dec-${crypto.randomUUID()}`, at: new Date().toISOString(), ...fields,
      authorizationGranted: false, externalActionTaken: false, prevHash: this.head };
    entry.hash = DecisionLog.entryHash(entry);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, JSON.stringify(entry) + '\n', { mode: 0o600 });
    this.head = entry.hash; this.seq = entry.seq;
    return entry;
  }
  entries() {
    try { return fs.readFileSync(this.file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; }
  }
  get(id) { return this.entries().find(e => e.id === id) || null; }
  /** Recomputes every hash and link. Returns the first broken entry if the chain was altered. */
  verify() {
    let prev = 'GENESIS', count = 0;
    for (const entry of this.entries()) {
      count += 1;
      if (entry.prevHash !== prev) return { ok: false, entries: count, brokenAt: entry.seq, reason: 'link to previous entry does not match' };
      if (DecisionLog.entryHash(entry) !== entry.hash) return { ok: false, entries: count, brokenAt: entry.seq, reason: 'entry content was changed after it was written' };
      prev = entry.hash;
    }
    return { ok: true, entries: count, headHash: prev };
  }
}

module.exports = { Trace, DecisionLog, redact, sha256 };
