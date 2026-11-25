# Evaluation report — v2.3

This increment makes local judge verification reproducible and aligns runtime version reporting with the package metadata.

## Changes
- Project version advanced to 2.3.0.
- Added `npm run evaluate` to regenerate the four-scenario Markdown and JSON regression outputs.
- Added `npm run smoke` to launch a temporary loopback server and verify health/version consistency, demo-only readiness, four scenario listings and browser UI availability.
- Added `npm run verify` as the combined syntax, automated test, scenario evaluation and HTTP smoke-test sequence.
- Health and readiness endpoints now report the package version rather than a stale hard-coded version.

## Scope
These checks validate local prototype operation only. They do not establish production security, real-world fraud detection performance, independent assurance, Android readiness or live integration capability.
