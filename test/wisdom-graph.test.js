const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyWisdom, detectPotentialConflict, buildWisdomGraph } = require('../src/wisdom-graph');

test('classifies temporary instructions separately from durable preferences', () => {
  assert.equal(classifyWisdom('For today, remind me to call the bank').type, 'temporary_instruction');
  assert.equal(classifyWisdom('I prefer plain language').type, 'preference');
});

test('recognises commitments and boundaries', () => {
  assert.equal(classifyWisdom('I promised not to share my OTP').type, 'boundary');
  assert.equal(classifyWisdom('Remind me to verify independently').type, 'commitment');
});

test('flags contradictory memories for user resolution, never automatic overwrite', () => {
  const c = detectPotentialConflict('I prefer phone calls for updates', "I don't prefer phone calls for updates");
  assert.equal(c.possible, true);
  assert.equal(c.resolution, 'ask_user');
});

test('graph only includes active nodes and reports categories', () => {
  const graph = buildWisdomGraph([
    {id:'1',type:'preference',content:'I prefer tea',status:'active'},
    {id:'2',type:'context',content:'Old note',status:'revoked'}
  ]);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.counts.preference, 1);
});
