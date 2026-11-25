# Yumma — judge access security gate (v2.13)

## Decision

**Do not publish the current Node.js prototype directly to the public internet.** It is suitable for a controlled local demonstration with synthetic data. A judge-accessible hosted instance requires a separate, authenticated deployment boundary and additional verification.

## What was inspected

Source reviewed: `src/server.js`, `src/memory.js`, `package.json`; current verification executed with `npm run verify`.

### Existing positive controls

- Server binds to `127.0.0.1` by default, not all network interfaces.
- Response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive Permissions Policy, same-origin resource policy, and a Content Security Policy.
- API requests have an in-process per-remote-address rate limit.
- Request bodies are bounded on the principal API routes.
- Memory writes require explicit consent and a stated purpose at the application layer.
- Memory file writes request mode `0600` and attempt to re-apply that mode after replacement.
- Health/readiness output explicitly says production readiness is false, external integrations are false, and Android build is unverified.
- The prototype reports synthetic-demo mode and external actions disabled.

### Blocking issues for public hosting

1. **Memory API has no authentication or user identity binding.** `GET /api/memory/:profileId`, `POST`, `PATCH`, and `DELETE` accept a profile ID in the URL. The consent object is supplied by the caller; it is not an authenticated identity or cryptographic proof of consent. If the service were made reachable, a remote caller could attempt to list, create, update, or revoke data for a known profile ID.
2. **No session authentication or authorisation layer.** The current browser demo is a local prototype, not a multi-user judge portal.
3. **No built-in TLS termination.** The server is plain HTTP and relies on loopback for local use. Any hosted setup needs a properly configured HTTPS reverse proxy or platform edge.
4. **Rate limiting is process-local and IP-based.** It is not a substitute for edge protection, account-level quotas, or abuse monitoring.
5. **Local JSON persistence is not production storage.** File permissions help on a local filesystem but do not provide encryption at rest, key management, backup controls, tenant isolation, or audited retention.
6. **No independent security assessment or penetration test is evidenced.** Security headers and unit tests are not proof of security.
7. **No operational controls are evidenced for hosted use:** secret management, centralised security logging, alerting, vulnerability management, incident response, backup/restore testing, and data deletion verification.

## Safe judge-access options

### Option A — supervised local demonstration (preferred for the current build)

- Run the app on the present demo machine, bound to loopback.
- Use only the four built-in synthetic scenarios and fictional data.
- Share the screen in a live judging session or record the required demo with the participant visible as required by the competition rules.
- Do not expose port 4173 to the LAN or internet; do not use router port forwarding.
- Keep the readiness endpoint visible or available to demonstrate the prototype's stated limitations.

### Option B — hosted judge preview (only after a separate security wrapper is implemented and tested)

- Put the application behind an HTTPS reverse proxy or managed hosting edge.
- Require named judge accounts or time-limited access codes with strong authentication; do not rely on an unlisted URL.
- Disable the `/api/memory/*` routes entirely for the judge build unless proper authentication, profile ownership checks, authorisation, CSRF protection, and audit controls are implemented and tested.
- Use a dedicated synthetic-only instance with no personal or financial data, no production secrets, and no external integrations.
- Add edge rate limiting, request-size limits, security monitoring, and a documented shutdown/expiry date.
- Run a security test against the deployed configuration before sharing the URL.

A reverse proxy or access tunnel alone does **not** fix the missing application-level identity and profile authorisation. Do not treat a private URL as a security control.

## Release gate checklist

- [ ] Judge access method approved by competition organiser.
- [ ] Hosting owner and environment documented.
- [ ] HTTPS verified end-to-end.
- [ ] Authentication tested with an unauthorised user.
- [ ] Profile ownership and authorisation tests pass.
- [ ] Memory endpoints disabled or secured and tested.
- [ ] Synthetic-only data verified; no secrets or real personal data.
- [ ] Edge rate limits and request-size limits verified.
- [ ] Security headers checked on the deployed URL.
- [ ] Logs contain no message content, credentials, OTPs, or personal financial data.
- [ ] Reset, retention, and shutdown procedures tested.
- [ ] Independent security review completed or limitations explicitly disclosed.

## Current verification snapshot

The local prototype's `npm run verify` completed successfully in this workspace on 19 November 2026:

- Source integrity: 17 required files present.
- JavaScript syntax checks: passed.
- Automated tests: **64 passed, 0 failed**.
- Synthetic judge scenarios: **4/4 passed**.
- HTTP smoke test: passed (health/version consistency, demo-only readiness, four scenarios, browser response).

These results validate local engineering checks only. They do not establish production security, real-world fraud detection accuracy, hosted reliability, or Android build readiness.

## Recommendation

For the current competition submission, use **Option A** unless the organiser explicitly requires a hosted URL. Keep the public-facing claims aligned to a local synthetic prototype. If a hosted judge link is mandatory, implement Option B as a distinct deployment project; do not simply change the server bind address or deploy the current server unchanged.
