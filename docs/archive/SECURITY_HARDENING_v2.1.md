# Yumma v2.1 — Browser and Runtime Hardening

## Scope
This increment strengthens the local synthetic prototype's browser boundary and runtime behaviour. It does not make the prototype production-secure.

## Changes
- Added a restrictive Content Security Policy: same-origin scripts, styles, images and API connections; no plug-ins or embedded frames; same-origin base and form targets.
- Added `Cross-Origin-Resource-Policy: same-origin` alongside the existing browser security headers.
- Bounded the in-memory API rate-limit client table and prune expired entries when the table reaches its configured ceiling.
- Return a controlled HTTP 503 when the local rate-limit table is full, rather than growing it without bound.
- Return HTTP 400 for malformed percent-encoded request paths instead of allowing URI decoding to throw.
- Validate the configured port before binding the server.
- Updated package and health endpoint version to 2.1.0.

## Verification
- `npm run check`: passed.
- `npm test`: 52 passed, 0 failed.
- Integration test verifies CSP and cross-origin response headers.
- Integration test verifies malformed encoded paths return HTTP 400.

## Limitations
- Rate limiting is process-local and IP-keyed; it is not a distributed abuse-control service.
- There is no production authentication, authorization, TLS termination, encrypted database, secrets management, independent penetration test, or security certification.
- Memory APIs remain intended only for the loopback synthetic demonstration. Do not expose this server to a public network or enter real personal, health, or financial data.
