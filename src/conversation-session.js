'use strict';

const crypto = require('node:crypto');
const MAX_TURNS = 8;
const MAX_MESSAGE_CHARS = 2000;
const SESSION_TTL_MS = 30 * 60 * 1000;
class ConversationSessions {
  constructor({ now = () => Date.now(), ttlMs = SESSION_TTL_MS } = {}) { this.sessions = new Map(); this.now = now; this.ttlMs = ttlMs; }
  validId(id) { return typeof id === 'string' && /^[a-zA-Z0-9_-]{12,80}$/.test(id); }
  getOrCreate(id) {
    const sessionId = this.validId(id) ? id : crypto.randomUUID(); this.prune();
    let session = this.sessions.get(sessionId);
    if (!session) { session = { id: sessionId, turns: [], previousAssessment: null, updatedAt: this.now() }; this.sessions.set(sessionId, session); }
    session.updatedAt = this.now(); return session;
  }
  addTurn(session, role, content) {
    if (!['user','assistant'].includes(role) || typeof content !== 'string') throw new TypeError('Invalid conversation turn.');
    session.turns.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS), at: new Date(this.now()).toISOString() });
    session.turns = session.turns.slice(-MAX_TURNS); session.updatedAt = this.now();
  }
  setAssessment(session, assessment) {
    session.previousAssessment = assessment;
    session.updatedAt = this.now();
  }
  prune() { const cutoff=this.now()-this.ttlMs; for(const [id,s] of this.sessions) if(s.updatedAt<cutoff) this.sessions.delete(id); }
}
module.exports={ConversationSessions,MAX_TURNS,MAX_MESSAGE_CHARS,SESSION_TTL_MS};
