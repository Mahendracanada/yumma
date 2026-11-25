const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/** Consent-led reminder contract. It recalls a person's own words; it never grants authority. */
class CalmContractStore {
  constructor(file = path.join(__dirname, '..', 'data', 'calm-contracts.json')) {
    this.file = file;
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
    if (!c || c.granted !== true || typeof c.purpose !== 'string' || !c.purpose.trim()) {
      const e = new Error('Explicit consent and a stated purpose are required.'); e.statusCode = 403; throw e;
    }
  }
  create(profileId, input, consent) {
    this.consent(consent);
    if (!profileId || !input || typeof input.commitment !== 'string' || !input.commitment.trim()) {
      const e = new Error('Profile and the person’s own commitment are required.'); e.statusCode = 400; throw e;
    }
    if (input.selfAttestedCalm !== true) {
      const e = new Error('The person must explicitly confirm they are comfortable making this commitment now.'); e.statusCode = 400; throw e;
    }
    const triggers = Array.isArray(input.triggers) ? [...new Set(input.triggers.map(x => String(x).trim().toLowerCase()).filter(x => x.length >= 2))].slice(0, 12) : [];
    if (!triggers.length) { const e = new Error('At least one specific recall trigger is required.'); e.statusCode = 400; throw e; }
    const expiresAt = input.expiresAt || null;
    if (expiresAt && (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) {
      const e = new Error('Expiry must be a valid future date.'); e.statusCode = 400; throw e;
    }
    const db = this.read(); db.profiles[profileId] ||= [];
    const now = new Date().toISOString();
    const row = { id: 'csc-' + crypto.randomUUID(), commitment: input.commitment.trim().slice(0, 1000), triggers,
      purpose: consent.purpose.trim().slice(0, 240), status: 'active', createdAt: now, updatedAt: now,
      expiresAt, source: 'person_self_attested', selfAttestedCalm: true, recallCount: 0 };
    db.profiles[profileId].push(row); this.write(db); return row;
  }
  list(profileId) {
    const db = this.read(), rows = db.profiles[profileId] || [], now = Date.now(); let changed = false;
    for (const r of rows) if (r.status === 'active' && r.expiresAt && Date.parse(r.expiresAt) <= now) { r.status = 'expired'; r.updatedAt = new Date().toISOString(); changed = true; }
    if (changed) this.write(db);
    return rows.filter(r => r.status === 'active');
  }
  match(profileId, message) {
    const lower = String(message || '').toLowerCase();
    // Refresh expiry on the same database snapshot before updating recall counters.
    // Previously list() wrote a second snapshot which match() could overwrite.
    const db = this.read(), rows = db.profiles[profileId] || [];
    const now = Date.now();
    let changed = false;
    for (const row of rows) {
      if (row.status === 'active' && row.expiresAt && (!Number.isFinite(Date.parse(row.expiresAt)) || Date.parse(row.expiresAt) <= now)) {
        row.status = 'expired'; row.updatedAt = new Date().toISOString(); changed = true;
      }
    }
    const matches = rows.filter(r => r.status === 'active' && r.triggers.some(t => lower.includes(t)));
    for (const m of matches) { m.recallCount = (m.recallCount || 0) + 1; m.lastRecalledAt = new Date().toISOString(); changed = true; }
    if (changed) this.write(db);
    return matches.map(({ id, commitment, purpose }) => ({ id, commitment, purpose,
      prompt: `You asked me to remind you: “${commitment}” Would you still like to follow that guidance? You remain in control.`, authorization: false, canExecute: false }));
  }
  revoke(profileId, id, consent) {
    this.consent(consent); const db = this.read(), row = (db.profiles[profileId] || []).find(x => x.id === id && x.status === 'active');
    if (!row) { const e = new Error('Active contract not found in this profile.'); e.statusCode = 404; throw e; }
    row.status = 'revoked'; row.commitment = ''; row.triggers = []; row.erasedAt = row.updatedAt = new Date().toISOString(); this.write(db); return row;
  }
}
module.exports = { CalmContractStore };
