# Yumma v2.5 — Consent and Personal Memory Integrity

Date: 2026-11-19. Scope: local synthetic prototype; no live user or bank data.

## Verified results
- `npm run verify`: PASS.
- Automated tests: 63/63 passed, 0 failed.
- Synthetic judge scenarios: 4/4 passed.
- Local browser/API smoke test: PASS.
- Source integrity and syntax checks: PASS.

## Implemented
- Fixed stale snapshot in Calm-State Contract recall: expiry transitions are persisted before recall counters are updated, avoiding accidental restoration of an expired contract to active status.
- Memory updates now reject missing/invalid patches and empty replacement content.
- Memory content edits refresh rule-based classification and its confidence/basis.
- Added eight tests covering profile-scoped memory and contracts, revocation, expiry, conflicting memories, consent, and updates.

## Evidence boundaries
- Profile IDs are identifiers, **not authentication**. Local memory endpoints are not suitable for internet exposure or multi-user deployment.
- Contradiction detection is heuristic and may miss nuanced conflicts.
- Tests use synthetic inputs and isolated temporary stores; no real-world effectiveness claim.
- The prototype does not have production identity proofing, secure account authorization, audited encryption-at-rest, or an independent security assessment.
