# Submission Changelog — v2.1

- Added restrictive Content Security Policy and same-origin resource policy.
- Bounded rate-limit client tracking and added stale-entry cleanup / overload response.
- Hardened malformed URL decoding with a controlled HTTP 400 response.
- Validated configured port range.
- Updated runtime/package version to 2.1.0.
- Added integration coverage for CSP and malformed request paths.
- Verification: 52/52 automated tests; syntax checks passed.
