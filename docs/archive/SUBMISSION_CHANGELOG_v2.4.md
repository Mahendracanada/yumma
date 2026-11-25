# Submission Changelog — v2.4

- Restored missing source modules, synthetic profile data, browser script, hologram concept asset, and baseline tests from the existing v0.3 source snapshot.
- Added `scripts/check-source-integrity.js` to fail fast when required runtime files are missing.
- Added `npm run integrity` and included it at the start of `npm run verify`.
- Updated package version to 2.4.0.
- Re-ran full verification: 51 tests, four judge scenarios, syntax checks, and local HTTP smoke checks passed.
- Documented that this is a local synthetic prototype, not a production-secure deployment.
