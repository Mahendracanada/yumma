# Yumma — Judge Quick Start (v2.3)

## Requirements
- Node.js 20 or later
- No external npm packages required
- Run on the machine where the prototype is being evaluated

## One-command verification
From the project directory:

```bash
npm run verify
```

This performs JavaScript syntax checks, runs the automated test suite, regenerates the synthetic scenario evaluation report, and starts a temporary local server to smoke-test the health endpoint, demo-only readiness declaration, four scenario listings, and browser interface.

## Start the demonstration

```bash
npm start
```

Open `http://127.0.0.1:4173` in a browser. The server binds to loopback (`127.0.0.1`) and is intended for a local demonstration, not public hosting.

## Runtime checks
- `GET /api/health` reports the running version and whether an optional language-model provider is configured.
- `GET /api/readiness` distinguishes local-demo readiness from public-production readiness.
- `GET /api/demo/scenarios` lists the four synthetic judge scenarios.
- `POST /api/demo/run` with `{ "scenarioId": "bank-transfer-pressure" }` runs a synthetic scenario.
- `POST /api/demo/reset` clears a temporary conversation session when a `sessionId` is supplied.

## Important boundaries
The profile and scenarios are synthetic. External bank, wallet, messaging, healthcare, emergency and payment integrations are not connected. No external action is enabled. The optional model adapter, if configured, is limited to explanation and does not control risk, policy or tool authorization. Do not enter real personal, medical or financial information.

A successful local verification is engineering evidence for this code revision. It is not a penetration test, production security certification, real-world fraud accuracy study, Android build verification or independent validation.
