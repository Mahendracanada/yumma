const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {MemoryStore} = require('../src/memory');
const {CalmContractStore} = require('../src/calm-contract');
const {buildWisdomGraph} = require('../src/wisdom-graph');
const consent = {granted:true,purpose:'Personal reminders'};
function setup(t, Store) { const dir=fs.mkdtempSync(path.join(os.tmpdir(),'yumma-integrity-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return new Store(path.join(dir,'data.json')); }
test('memory is profile scoped and revocation prevents retrieval', t=>{
 const store=setup(t,MemoryStore);const row=store.create('person-a',{content:'Never send a bank OTP'},consent);
 assert.equal(store.list('person-b').length,0);assert.equal(store.retrieve('person-b','bank').length,0);
 assert.throws(()=>store.revoke('person-b',row.id,consent),/not found/);
 store.revoke('person-a',row.id,consent);assert.equal(store.retrieve('person-a','bank').length,0);
});
test('expired memory does not appear in retrieval', t=>{
 const store=setup(t,MemoryStore);const row=store.create('person-a',{content:'Do not share a password'},consent);
 const db=store.read();db.profiles['person-a'][0].expiresAt=new Date(Date.now()-1000).toISOString();store.write(db);
 assert.equal(store.retrieve('person-a','password').length,0);assert.equal(store.read().profiles['person-a'][0].status,'expired');
});
test('expiry and matching recall persist together without resurrecting expired contracts', t=>{
 const store=setup(t,CalmContractStore);const input={commitment:'Pause before transferring money',triggers:['transfer'],selfAttestedCalm:true};
 const expired=store.create('person-a',input,consent);const active=store.create('person-a',input,consent);
 const db=store.read();db.profiles['person-a'].find(x=>x.id===expired.id).expiresAt=new Date(Date.now()-1000).toISOString();store.write(db);
 const matches=store.match('person-a','transfer');assert.equal(matches.length,1);assert.equal(matches[0].id,active.id);
 const rows=store.read().profiles['person-a'];assert.equal(rows.find(x=>x.id===expired.id).status,'expired');assert.equal(rows.find(x=>x.id===active.id).recallCount,1);
 assert.equal(store.match('person-b','transfer').length,0);
 store.revoke('person-a',active.id,consent);assert.equal(store.match('person-a','transfer').length,0);
});
test('contradictory memories are surfaced for user resolution, not overwritten',t=>{
 const store=setup(t,MemoryStore);store.create('person-a',{content:'I prefer bank alerts by email',type:'preference'},consent);
 store.create('person-a',{content:'I do not prefer bank alerts by email',type:'preference'},consent);
 const graph=buildWisdomGraph(store.list('person-a'));assert.equal(graph.nodes.length,2);assert.equal(graph.requiresUserResolution,true);assert.equal(graph.conflicts[0].resolution,'ask_user');
});
