const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForHealth(base, child) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Yumma server exited early (${child.exitCode})`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Yumma server did not become healthy within 8 seconds');
}

test('HTTP integration: local judge journey, safeguards and error handling', async t => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore'
  });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  await waitForHealth(base, child);

  const health = await fetch(`${base}/api/health`);
  const healthBody = await health.json();
  assert.equal(healthBody.status, 'ok');
  assert.equal(healthBody.mode, 'synthetic_demo');
  assert.equal(healthBody.externalActionsEnabled, false);
  assert.equal(health.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), true);

  const readiness = await fetch(`${base}/api/readiness`).then(r => r.json());
  assert.equal(readiness.readyForLocalDemo, true);
  assert.equal(readiness.readyForPublicProduction, false);
  assert.equal(readiness.checks.androidBuildVerified, false);

  const scenarios = await fetch(`${base}/api/demo/scenarios`).then(r => r.json());
  assert.equal(scenarios.scenarios.length, 5);

  const demo = await fetch(`${base}/api/demo/run`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'bank-transfer-pressure' })
  });
  const demoBody = await demo.json();
  assert.equal(demo.status, 200);
  assert.equal(demoBody.checks.postureMatchesExpected, true);
  assert.equal(demoBody.checks.authorizationGranted, false);
  assert.equal(demoBody.checks.externalActionTaken, false);

  const unknown = await fetch(`${base}/api/demo/run`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'not-a-real-scenario' })
  });
  assert.equal(unknown.status, 404);

  const invalidAssess = await fetch(`${base}/api/assess`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: '   ' })
  });
  assert.equal(invalidAssess.status, 400);

  const missingConsent = await fetch(`${base}/api/memory/integration-person`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ memory: { content: 'Do not share my OTP' } })
  });
  assert.equal(missingConsent.status, 403);

  const contractNoConsent = await fetch(`${base}/api/calm-contract/integration-person`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contract: { commitment: 'I will pause before an urgent transfer', triggers: ['urgent transfer'], selfAttestedCalm: true } })
  });
  assert.equal(contractNoConsent.status, 403);

  const contractCreate = await fetch(`${base}/api/calm-contract/integration-person`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contract: { commitment: 'I will pause and independently call my bank.', triggers: ['urgent transfer'], selfAttestedCalm: true },
      consent: { granted: true, purpose: 'User-requested synthetic demo reminder' }
    })
  });
  assert.equal(contractCreate.status, 201);
  const contractBody = await contractCreate.json();
  assert.equal(contractBody.contract.selfAttestedCalm, true);

  const contractList = await fetch(`${base}/api/calm-contract/integration-person`).then(r => r.json());
  assert.equal(contractList.contracts.length, 1);

  const contractRevoke = await fetch(`${base}/api/calm-contract/integration-person/${contractBody.contract.id}`, {
    method: 'DELETE', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ consent: { granted: true, purpose: 'User-requested synthetic demo revocation' } })
  });
  assert.equal(contractRevoke.status, 200);
  const contractAfterRevoke = await fetch(`${base}/api/calm-contract/integration-person`).then(r => r.json());
  assert.equal(contractAfterRevoke.contracts.length, 0);

  // End-to-end proof: the person's own calm-state commitment is recalled in
  // the same turn as a high-risk assessment, without granting authority.
  const journeyContract = await fetch(`${base}/api/calm-contract/salma-demo`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contract: {
        commitment: 'I will pause and independently call my bank before any urgent transfer.',
        triggers: ['urgent transfer'], selfAttestedCalm: true
      },
      consent: { granted: true, purpose: 'End-to-end synthetic competition demonstration' }
    })
  });
  assert.equal(journeyContract.status, 201);
  const journeyContractBody = await journeyContract.json();
  const protectedJourney = await fetch(`${base}/api/conversation`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'My bank says I must make an urgent transfer and send money right now or my account will be blocked.' })
  });
  assert.equal(protectedJourney.status, 200);
  const protectedJourneyBody = await protectedJourney.json();
  assert.equal(protectedJourneyBody.assessment.risk.level, 'HIGH');
  assert.equal(protectedJourneyBody.assessment.protectionPlan.posture, 'PAUSE_AND_PROTECT');
  assert.equal(protectedJourneyBody.personalContext.calmStateReminders.length >= 1, true);
  assert.equal(protectedJourneyBody.assessment.protectionPlan.matchedContracts.some(c => c.id === journeyContractBody.contract.id), true);
  assert.equal(protectedJourneyBody.assessment.protectionPlan.authorizationGranted, false);
  assert.equal(protectedJourneyBody.assessment.protectionPlan.externalActionTaken, false);
  assert.equal(protectedJourneyBody.safeguards.recalledCommitmentCannotOverrideRisk, true);
  assert.equal(protectedJourneyBody.assessment.audit.recalledContractIds.includes(journeyContractBody.contract.id), true);
  const journeyRevoke = await fetch(`${base}/api/calm-contract/salma-demo/${journeyContractBody.contract.id}`, {
    method: 'DELETE', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ consent: { granted: true, purpose: 'End-to-end test cleanup' } })
  });
  assert.equal(journeyRevoke.status, 200);

  const browser = await fetch(`${base}/`);
  assert.equal(browser.status, 200);
  assert.match(browser.headers.get('content-type'), /text\/html/);

  // Chat follow-ups: a short question about the last assessment reuses it; a new, longer question is assessed afresh.
  const chat = (message, sessionId) => fetch(`${base}/api/conversation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, sessionId }) }).then(r => r.json());
  const first = await chat("Hi Mum, it's me. My phone broke so this is my new number. I'm in trouble and need AED 4,000 sent today to a friend's account. Please don't call.");
  assert.equal(first.assessment.protectionPlan.posture, 'PAUSE_AND_PROTECT');
  const why = await chat('Why is this risky?', first.sessionId);
  assert.equal(why.isFollowUp, true);
  const fresh = await chat('What time does the bank open on Saturday, and is it open on public holidays?', first.sessionId);
  assert.equal(fresh.isFollowUp, false);
  assert.notEqual(fresh.assessment.protectionPlan.posture, 'PAUSE_AND_PROTECT');
});
