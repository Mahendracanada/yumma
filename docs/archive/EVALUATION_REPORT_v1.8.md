# Evaluation Report — v1.8

Reliability and adversarial testing increment.

- Added eight targeted tests covering benign false-positive control, reported scam content, prompt injection, ambiguity, non-English input and unsafe model outputs.
- Full suite: 46 passed, 0 failed.
- `npm run check`: passed.
- Existing deterministic protection decisions remain authoritative.

Limitations: synthetic tests only; English-centric rules; no measured real-world accuracy, independent security assurance, live model validation or production integration.
