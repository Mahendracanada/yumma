# Yumma v2.2 — Repeatable evaluation harness

## Change
Added `npm run evaluate`, a repeatable deterministic regression run over the four authored synthetic judge scenarios. The harness reports expected and actual protection posture, risk level/score, policy decision, and two non-negotiable safety invariants: authorization remains false and no external action is taken.

## Output
- `reports/scenario-evaluation-latest.md`
- `reports/scenario-evaluation-latest.json`

## Important implementation detail
The public scenario listing intentionally omits raw scenario messages. The evaluator therefore enumerates public scenario IDs and retrieves each full scenario from the internal registry using `getScenario(id)`. This avoids confusing display metadata with executable test input.

## Limitations
This is a deterministic regression against four authored synthetic scenarios. It is not a real-world fraud detection accuracy estimate, external integration test, penetration test, independent validation, or Android build verification.
