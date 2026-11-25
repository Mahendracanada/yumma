# Yumma v2.4 — Source Integrity and Reproducible Build

## Purpose
Restore the missing baseline modules and assets in the active working copy, then verify the complete local prototype using one reproducible command.

## Restoration
The working copy was missing core modules, the synthetic Salma profile, the browser application script, and the hologram concept asset. These were restored from the existing `/mnt/data/Yumma_Rebuild_v0.3` baseline while preserving the later `agent.js`, `server.js`, package configuration, evaluation scripts, and later test files already in the v2.3 working copy.

Restored files include:
- `src/memory.js`
- `src/wisdom-graph.js`
- `src/life-ripple.js`
- `src/protection-orchestrator.js`
- `src/calm-contract.js`
- `src/model-adapter.js`
- `src/demo-mode.js`
- `src/conversation-session.js`
- `data/salma-profile.json`
- `public/app.js`
- `public/yumma-hologram-concept.png`
- Baseline module tests not already present

## Verification
Run `npm run verify`. The command checks required files, JavaScript syntax, the Node test suite, four synthetic judge scenarios, and the local HTTP smoke test.

Verified in this run:
- Required source integrity: 17/17 files present
- Syntax checks: passed
- Automated tests: 51 passed, 0 failed
- Synthetic judge scenarios: 4/4 passed
- Local HTTP smoke checks: passed (health/version consistency, demo readiness, scenario listing, browser response)

## Important scope and limitations
This establishes a reproducible local synthetic demonstration build only. It does not establish production security, live banking or messaging integrations, independent fraud-detection accuracy, Android build readiness, external user validation, or production deployment readiness. The restored baseline modules were copied from the existing v0.3 source snapshot; this is source restoration, not a new independent implementation or audit.
