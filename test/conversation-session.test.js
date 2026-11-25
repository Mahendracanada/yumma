const test = require('node:test');
const assert = require('node:assert/strict');
const { ConversationSessions, MAX_TURNS } = require('../src/conversation-session');

test('conversation session creates an isolated temporary session', () => {
  const store = new ConversationSessions();
  const a = store.getOrCreate('session-user-123');
  const b = store.getOrCreate('session-user-456');
  store.addTurn(a, 'user', 'Hello Yumma');
  assert.equal(a.turns.length, 1);
  assert.equal(b.turns.length, 0);
});

test('conversation history is bounded to the latest eight turns', () => {
  const store = new ConversationSessions();
  const session = store.getOrCreate('session-user-123');
  for (let i=0;i<12;i++) store.addTurn(session, i%2 ? 'assistant' : 'user', `turn ${i}`);
  assert.equal(session.turns.length, MAX_TURNS);
  assert.equal(session.turns[0].content, 'turn 4');
});

test('session identifiers are replaced when malformed', () => {
  const store = new ConversationSessions();
  const session = store.getOrCreate('bad id');
  assert.notEqual(session.id, 'bad id');
  assert.match(session.id, /^[a-f0-9-]{36}$/);
});

test('expired sessions are pruned', () => {
  let now=1000;
  const store = new ConversationSessions({now:()=>now, ttlMs:100});
  store.getOrCreate('session-user-123');
  now=1200;
  store.getOrCreate('session-user-456');
  assert.equal(store.sessions.has('session-user-123'), false);
});
