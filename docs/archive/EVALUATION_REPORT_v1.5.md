# Evaluation Report — v1.5

- Added four fixed synthetic judge scenarios.
- Each scenario is executed through `runSalmaJourney`, not a mocked posture.
- Automated checks compare actual posture to expected posture and assert no authorization or external action.
- Full test suite: 40 passed, 0 failed.
- HTTP smoke test: `/api/demo/scenarios` and `/api/demo/run` both returned successfully; urgent bank transfer returned `PAUSE_AND_PROTECT` and both safety flags false.
- One-time-code scenario initially returned `VERIFY`; scenario wording was refined to include urgency and secrecy signals, after which it returned the declared `PAUSE_AND_PROTECT`. This is transparent tuning of a deterministic demo scenario, not evidence of general detection accuracy.

Limitations: synthetic tests only; no independent security audit, external pilot, real-world fraud benchmark, production hosting or judge access provisioning.
