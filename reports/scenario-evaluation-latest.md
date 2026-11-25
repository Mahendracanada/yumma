# Yumma synthetic scenario evaluation

Generated: 2026-11-24T13:28:52.674Z

**Result: 5/5 passed; 0 failed.**

| Scenario | Expected | Actual | Risk | Score | Result |
|---|---|---|---:|---:|---|
| Urgent bank transfer | PAUSE_AND_PROTECT | PAUSE_AND_PROTECT | HIGH | 90 | PASS |
| One-time code request | PAUSE_AND_PROTECT | PAUSE_AND_PROTECT | HIGH | 100 | PASS |
| Remote access request | PAUSE_AND_PROTECT | PAUSE_AND_PROTECT | HIGH | 75 | PASS |
| Relative on a new number | PAUSE_AND_PROTECT | PAUSE_AND_PROTECT | HIGH | 100 | PASS |
| Benign information request | INFORMATIONAL | INFORMATIONAL | LOW | 10 | PASS |

## Safety invariants

Every scenario checks that authorization remains false and no external action is taken.

## Limitations

- Synthetic authored scenarios only; not a real-world fraud detection accuracy estimate.
- The evaluation exercises the deterministic local agent engine, not live bank or messaging integrations.
- A passing result does not establish production security, independent validation, or Android readiness.
