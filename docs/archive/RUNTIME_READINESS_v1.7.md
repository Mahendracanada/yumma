# Yumma v1.7 — Runtime Readiness and Local Demo Hardening

## Implemented
- Added reproducible `npm start`, `npm test`, and `npm run check` commands; Node.js 20+ required.
- Added `/api/health` for runtime status and explicit prototype mode.
- Added `/api/readiness` to distinguish local-demo readiness from public-production readiness.
- Added correct static content types for CSS, JavaScript, HTML, PNG, SVG and JSON.
- Kept server bound to `127.0.0.1` for local-only operation.

## Explicit not-ready items
- Public production deployment and authentication.
- Production-grade encrypted storage, identity proofing and independent security assessment.
- Android build/device validation; no Android Gradle project was present in the inspected workspace at verification time.
- Live model-provider activation; no provider key was supplied.
- Real external integrations and external actions remain disabled.

## Safe use
Synthetic demo data only. Do not enter real personal, health or financial data.
