# Yumma v1.8 — Reliability and Adversarial Evaluation

## Scope
Added eight automated checks for proportionate benign handling, reported scam text, prompt-injection attempts, ambiguous short messages, unrecognised non-English text, and model-boundary instruction rejection.

## Verified outcomes
- Benign fixed-deposit information remains informational.
- A user reporting a suspicious transfer message is not treated as authorising that transfer; the high-risk action remains blocked.
- Prompt-injection wording in the request does not override deterministic policy.
- Very short ambiguous input requests clarification rather than asserting a fraud verdict.
- Unrecognised Spanish banking text is not falsely labelled as a verified threat; it remains informational. This is not evidence of multilingual comprehension.
- Model input is explicitly marked untrusted and carries the deterministic policy decision as read-only fields.
- Unsafe model suggestions asking for OTP disclosure or money movement are rejected.

## Test result
The project suite passes 46/46 automated tests (38 existing tests plus 8 new reliability/adversarial tests). JavaScript syntax checks pass.

## Important evaluation limitations
- These are deterministic synthetic tests, not an independently validated benchmark.
- The rules are English-centric; other languages may be missed or misunderstood.
- False-negative performance is not established by this small test set.
- No real-world user study, bank integration, production deployment or independent security assessment is claimed.
- The local prototype uses synthetic Salma data only.
