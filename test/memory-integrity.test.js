const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MemoryStore } = require('../src/memory');
const { CalmContractStore } = require('../src/calm-contract');
const { buildWisdomGraph } = require('../src/wisdom-graph');
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yumma-privacy-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  return {memory:new MemoryStore(path.join(dir,'memory.json')), contracts:new CalmContractStore(path.join(dir,'contracts.json'))};
}
const consent={granted:true,purpose:'Protect my decisions'};
const commitment={commitment:'Never share my code',triggers:['code'],selfAttestedCalm:true};
test('memory is profile-scoped across listing, retrieval and revocation',t=>{
  const {memory}=fixture(t);const row=memory.create('alice',{content:'Never share my code'},consent);
  assert.equal(memory.list('bob').length,0);
  assert.equal(memory.retrieve('bob','code').length,0);
  assert.throws(()=>memory.revoke('bob',row.id,consent),/not found/i);
  assert.equal(memory.list('alice').length,1);
});
test('revoked memories never reappear in retrieval',t=>{
  const {memory}=fixture(t);const row=memory.create('alice',{content:'Never share my code'},consent);
  memory.revoke('alice',row.id,consent);
  assert.deepEqual(memory.retrieve('alice','code'),[]);
});
test('expired memories do not appear in graph or retrieval',t=>{
  const {memory}=fixture(t);memory.create('alice',{content:'Avoid sharing passwords'},consent);
  const db=memory.read();db.profiles.alice[0].expiresAt=new Date(Date.now()-1000).toISOString();memory.write(db);
  assert.equal(memory.retrieve('alice','passwords').length,0);
  assert.equal(buildWisdomGraph(memory.list('alice')).nodes.length,0);
  assert.equal(memory.read().profiles.alice[0].status,'expired');
});
test('memory updates reject invalid patches and refresh classification',t=>{
  const {memory}=fixture(t);const row=memory.create('alice',{content:'My account details'},consent);
  assert.throws(()=>memory.update('alice',row.id,null,consent),/patch/i);
  assert.throws(()=>memory.update('alice',row.id,{content:' '},consent),/non-empty/i);
  const updated=memory.update('alice',row.id,{content:'Never share my password'},consent);
  assert.equal(updated.type,'boundary');
});
test('conflicting memories remain visible for person-led resolution',t=>{
  const {memory}=fixture(t);
  memory.create('alice',{content:'I prefer sharing account updates'},consent);
  memory.create('alice',{content:'I do not prefer sharing account updates'},consent);
  const graph=buildWisdomGraph(memory.list('alice'));
  assert.equal(graph.nodes.length,2);
  assert.equal(graph.requiresUserResolution,true);
});
test('contract recalls are profile-scoped and revocable',t=>{
  const {contracts}=fixture(t);const row=contracts.create('alice',commitment,consent);
  assert.deepEqual(contracts.match('bob','code'),[]);
  assert.throws(()=>contracts.revoke('bob',row.id,consent),/not found/i);
  assert.equal(contracts.match('alice','code').length,1);
  contracts.revoke('alice',row.id,consent);
  assert.deepEqual(contracts.match('alice','code'),[]);
});
test('expiry transition is preserved when other contracts are recalled',t=>{
  const {contracts}=fixture(t);
  const expired=contracts.create('alice',commitment,consent);
  const active=contracts.create('alice',{...commitment,commitment:'Call my bank directly'},consent);
  const db=contracts.read();db.profiles.alice.find(x=>x.id===expired.id).expiresAt=new Date(Date.now()-1000).toISOString();contracts.write(db);
  const matched=contracts.match('alice','code');
  assert.equal(matched.length,1);assert.equal(matched[0].id,active.id);
  assert.equal(contracts.read().profiles.alice.find(x=>x.id===expired.id).status,'expired');
});
test('consent is required for memory and contract writes',t=>{
  const {memory,contracts}=fixture(t);
  assert.throws(()=>memory.create('alice',{content:'Private'},null),/consent/i);
  assert.throws(()=>contracts.create('alice',commitment,null),/consent/i);
});
