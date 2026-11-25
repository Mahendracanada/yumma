'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');
const packageInfo = require('../package.json');

const port = 44000 + Math.floor(Math.random() * 10000);
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['src/server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore'
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { return await fetch(`${base}/api/health`); }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  throw new Error('Local server did not become ready within four seconds.');
}

(async () => {
  try {
    const healthResponse = await waitForServer();
    if (!healthResponse.ok) throw new Error(`/api/health returned ${healthResponse.status}`);
    const health = await healthResponse.json();
    if (health.version !== packageInfo.version) throw new Error('Health endpoint version does not match package version.');
    if (health.externalActionsEnabled !== false || health.externalIntegrations !== false) throw new Error('Prototype must keep external actions and integrations disabled.');

    const readinessResponse = await fetch(`${base}/api/readiness`);
    const readiness = await readinessResponse.json();
    if (!readinessResponse.ok || readiness.readyForLocalDemo !== true || readiness.readyForPublicProduction !== false) throw new Error('Readiness endpoint did not report the expected demo-only state.');

    const scenariosResponse = await fetch(`${base}/api/demo/scenarios`);
    const scenariosPayload = await scenariosResponse.json();
    if (!scenariosResponse.ok || !Array.isArray(scenariosPayload.scenarios) || scenariosPayload.scenarios.length !== 5) throw new Error('Expected five published judge scenarios.');

    const homeResponse = await fetch(`${base}/`);
    if (!homeResponse.ok || !(await homeResponse.text()).includes('Yumma')) throw new Error('Browser interface did not load.');

    console.log(`Yumma ${health.version} local demo smoke test: PASS`);
    console.log('PASS health/version consistency');
    console.log('PASS demo-only readiness');
    console.log('PASS five judge scenarios available');
    console.log('PASS browser interface responds');
  } catch (error) {
    console.error(`Yumma smoke test: FAIL — ${error.message}`);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
})();
