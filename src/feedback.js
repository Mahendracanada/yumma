'use strict';
// Anonymous tester feedback: three taps at the end of a Yumma check.
// No names, numbers, emails or free text are collected. Each browser session can answer once;
// the session is kept only as a salted 16-character fingerprint, so answers cannot be traced back.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FEEDBACK_CHOICES = Object.freeze({
  who: ['carer', 'older', 'banking', 'judge', 'other'],
  helped: ['yes', 'maybe', 'no'],
  pay: ['yes', 'maybe', 'no']
});

class FeedbackStore {
  constructor(file) {
    this.file = file;
    this.rows = [];
    this.seen = new Set();
    try {
      for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line); this.rows.push(r); if (r.key) this.seen.add(r.key); } catch { /* skip a damaged line */ }
      }
    } catch { /* no feedback yet */ }
  }

  record(input, sessionKey) {
    const row = {};
    for (const [field, allowed] of Object.entries(FEEDBACK_CHOICES)) {
      const value = String(input?.[field] ?? '');
      if (!allowed.includes(value)) { const e = new Error(`Please choose an answer for "${field}".`); e.statusCode = 400; throw e; }
      row[field] = value;
    }
    const key = sessionKey ? crypto.createHash('sha256').update('yumma-feedback:' + sessionKey).digest('hex').slice(0, 16) : null;
    if (key && this.seen.has(key)) return { duplicate: true, summary: this.summary() };
    const rec = { day: new Date().toISOString().slice(0, 10), ...row, key };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, JSON.stringify(rec) + '\n');
    this.rows.push(rec);
    if (key) this.seen.add(key);
    return { duplicate: false, summary: this.summary() };
  }

  // Judges are counted separately, so the totals describe real testers only.
  summary() {
    const testers = this.rows.filter(r => r.who !== 'judge');
    const count = (field, value) => testers.filter(r => r[field] === value).length;
    const pct = n => (testers.length ? Math.round((100 * n) / testers.length) : 0);
    const out = { testers: testers.length, judges: this.rows.length - testers.length, who: {}, helped: {}, pay: {} };
    for (const field of Object.keys(FEEDBACK_CHOICES)) {
      for (const value of FEEDBACK_CHOICES[field]) if (!(field === 'who' && value === 'judge')) out[field][value] = count(field, value);
    }
    out.wouldHelpPct = pct(out.helped.yes + out.helped.maybe);
    out.helpedYesPct = pct(out.helped.yes);
    out.wouldPayPct = pct(out.pay.yes + out.pay.maybe);
    out.firstDay = testers[0]?.day || null;
    out.lastDay = testers[testers.length - 1]?.day || null;
    return out;
  }

  csv() {
    return 'day,who,helped,pay\n' + this.rows.map(r => [r.day, r.who, r.helped, r.pay].join(',')).join('\n') + (this.rows.length ? '\n' : '');
  }
}

module.exports = { FeedbackStore, FEEDBACK_CHOICES };
