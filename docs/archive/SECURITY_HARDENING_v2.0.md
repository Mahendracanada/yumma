# Yumma v2.0 — Local Runtime Security Hardening

## Implemented
- Added defensive browser-facing HTTP headers: `nosniff`, frame denial, no-referrer, restrictive permissions policy and same-origin resource policy.
- Added a simple in-memory per-IP API request ceiling (120 requests per 60-second window) with HTTP 429 response.
- Updated project version metadata to 2.0.0.
- Kept local prototype readiness distinct from production readiness.

## Verification
- `npm test` includes a server integration test checking security headers and demo-only readiness.
- `npm run check` validates server, agent, adapter and browser JavaScript syntax.

## Limits
- This is local prototype hardening, not a production security control certification.
- Rate limiting is process-local and in-memory; it is not distributed or persistent.
- There is no user authentication or authorization layer. The service remains bound to loopback.
- No penetration test, threat-model review by an independent party, encryption-at-rest assessment or production deployment is claimed.
- Android build verification remains outstanding; no Gradle wrapper/build files were present in the inspected workspace.
