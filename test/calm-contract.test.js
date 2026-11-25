const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CalmContractStore } = require('../src/calm-contract');
function setup() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yumma-csc-')); return { store: new CalmContractStore(path.join(dir, 'contracts.json')), dir }; }
const consent = { granted: true, purpose: 'Remind me when a pressured payment request appears' };
const sample = { commitment: 'I will pause and independently call my bank.', triggers: ['transfer money', 'urgent payment'], selfAttestedCalm: true };
test('requires explicit consent and purpose', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); assert.throws(()=>store.create('p',sample,{granted:true}),/consent/i); });
test('requires explicit self-attestation of calm state', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); assert.throws(()=>store.create('p',{...sample,selfAttestedCalm:false},consent),/confirm/i); });
test('requires at least one concrete trigger', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); assert.throws(()=>store.create('p',{...sample,triggers:[]},consent),/trigger/i); });
test('stores the person’s wording and scoped purpose', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); const c=store.create('p',sample,consent); assert.equal(c.commitment,sample.commitment); assert.equal(c.source,'person_self_attested'); assert.equal(store.list('other').length,0); });
test('recalls gently only on a matching trigger', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); store.create('p',sample,consent); assert.equal(store.match('p','hello').length,0); const m=store.match('p','They demand urgent payment'); assert.match(m[0].prompt,/You remain in control/); });
test('does not expire before its expiry time', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); store.create('p',{...sample,expiresAt:new Date(Date.now()+60000).toISOString()},consent); assert.equal(store.list('p').length,1); });
test('revocation stops future recall', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); const c=store.create('p',sample,consent); store.revoke('p',c.id,consent); assert.equal(store.match('p','urgent payment').length,0); });
test('expired contracts are not recalled', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); const c=store.create('p',sample,consent); const db=store.read(); db.profiles.p[0].expiresAt=new Date(Date.now()-1000).toISOString(); store.write(db); assert.equal(store.match('p','urgent payment').length,0); assert.equal(store.read().profiles.p[0].status,'expired'); });
test('recall never creates authority or action permission', t => { const {store,dir}=setup(); t.after(()=>fs.rmSync(dir,{recursive:true,force:true})); store.create('p',sample,consent); const m=store.match('p','urgent payment'); assert.equal(m[0].canExecute,false); assert.equal(m[0].authorization,false); });
