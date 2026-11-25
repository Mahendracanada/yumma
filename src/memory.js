const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { classifyWisdom, TYPES } = require('./wisdom-graph');

class MemoryStore {
  constructor(file = path.join(__dirname, '..', 'data', 'memory-store.json')) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), {recursive:true});
    if (!fs.existsSync(file)) this.write({profiles:{}});
  }
  read() {
    try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    catch { return {profiles:{}}; }
  }
  write(data) {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), {mode:0o600});
    fs.renameSync(tmp, this.file);
    try { fs.chmodSync(this.file, 0o600); } catch {}
  }
  requireConsent(consent) {
    if (!consent || consent.granted !== true || typeof consent.purpose !== 'string' || !consent.purpose.trim()) {
      const e = new Error('Explicit consent and a stated purpose are required.');
      e.statusCode = 403; throw e;
    }
  }
  list(profileId) {
    const db = this.read();
    const rows = db.profiles[profileId] || [];
    const now = Date.now();
    const active = rows.filter(x => x.status === 'active' && (!x.expiresAt || (Number.isFinite(Date.parse(x.expiresAt)) && Date.parse(x.expiresAt) > now)));
    if (active.length !== rows.filter(x=>x.status==='active').length) {
      db.profiles[profileId] = rows.map(x => x.status==='active' && x.expiresAt && (!Number.isFinite(Date.parse(x.expiresAt)) || Date.parse(x.expiresAt)<=now)
        ? {...x,status:'expired',updatedAt:new Date().toISOString()} : x);
      this.write(db);
    }
    return active;
  }
  create(profileId, input, consent) {
    this.requireConsent(consent);
    if (!profileId || !input || typeof input.content !== 'string' || !input.content.trim()) {
      const e = new Error('Profile and non-empty memory content are required.'); e.statusCode=400; throw e;
    }
    const db = this.read(); db.profiles[profileId] ||= [];
    const now = new Date().toISOString();
    const row = {
      id: 'mem-' + crypto.randomUUID(),
      type: classifyWisdom(input.content, input.type).type,
      classificationConfidence: classifyWisdom(input.content, input.type).confidence,
      classificationBasis: classifyWisdom(input.content, input.type).basis,
      content: input.content.trim().slice(0,1200),
      purpose: consent.purpose.trim().slice(0,240),
      source: 'user_supplied',
      status: 'active',
      createdAt: now, updatedAt: now,
      expiresAt: input.expiresAt || null
    };
    if (row.expiresAt && (!Number.isFinite(Date.parse(row.expiresAt)) || Date.parse(row.expiresAt) <= Date.now())) {
      const e = new Error('Expiry must be a valid future date.'); e.statusCode=400; throw e;
    }
    db.profiles[profileId].push(row); this.write(db); return row;
  }
  update(profileId, memoryId, patch, consent) {
    this.requireConsent(consent);
    const db=this.read(), rows=db.profiles[profileId]||[];
    const i=rows.findIndex(x=>x.id===memoryId && x.status==='active');
    if(i<0){const e=new Error('Active memory not found in this profile.');e.statusCode=404;throw e;}
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) { const e=new Error('A valid memory patch is required.'); e.statusCode=400; throw e; }
    if (patch.content !== undefined) {
      if (typeof patch.content !== 'string' || !patch.content.trim()) { const e=new Error('Memory content must be non-empty.'); e.statusCode=400; throw e; }
      rows[i].content=patch.content.trim().slice(0,1200);
      const classification=classifyWisdom(rows[i].content, patch.type);
      rows[i].type=classification.type; rows[i].classificationConfidence=classification.confidence; rows[i].classificationBasis=classification.basis;
    }
    if(patch.expiresAt!==undefined) {
      if(patch.expiresAt && (!Number.isFinite(Date.parse(patch.expiresAt)) || Date.parse(patch.expiresAt)<=Date.now())) {
        const e=new Error('Expiry must be a valid future date.');e.statusCode=400;throw e;
      }
      rows[i].expiresAt=patch.expiresAt;
    }
    rows[i].updatedAt=new Date().toISOString(); this.write(db); return rows[i];
  }
  revoke(profileId, memoryId, consent) {
    this.requireConsent(consent);
    const db=this.read(), rows=db.profiles[profileId]||[];
    const row=rows.find(x=>x.id===memoryId && x.status==='active');
    if(!row){const e=new Error('Active memory not found in this profile.');e.statusCode=404;throw e;}
    row.status='revoked'; row.content=''; row.erasedAt=row.updatedAt=new Date().toISOString(); this.write(db); return row;
  }
  retrieve(profileId, query='') {
    const terms=String(query).toLowerCase().split(/\W+/).filter(x=>x.length>2);
    return this.list(profileId).map(row=>{
      const hay=(row.content+' '+row.type).toLowerCase();
      const score=terms.filter(t=>hay.includes(t)).length;
      return {...row, relevance: terms.length ? score/terms.length : 0};
    }).filter(x=>!terms.length || x.relevance>0).sort((a,b)=>b.relevance-a.relevance);
  }
}
module.exports={MemoryStore};
