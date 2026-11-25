# Yumma Model Boundary — Design Contract

## Authority separation
1. Request extraction and deterministic risk assessment remain in Yumma's trusted application layer.
2. Policy evaluation remains authoritative and runs independently of any model.
3. A model may draft an explanation only.
4. Model output cannot create, approve, or execute tools; change a risk score; alter a policy decision; or override an action block.
5. If no model is configured or a provider fails, Yumma continues with deterministic response generation.

## Input contract
The adapter receives a bounded task object containing the untrusted message, assessed risk summary, policy decision, action-block flag, and a small set of relevant preferences. The message is explicitly treated as untrusted data.

## Output contract
The only accepted field is `explanation`, a non-empty string up to 2,400 characters. Additional fields are discarded. Invalid output is rejected.

## Current state
The interface is implemented and tested using an injected local test double. No provider is configured, no API credentials are present, and the live journey does not yet call the adapter.

## Production gates
- Provider and deployment approval
- Data minimisation, consent, retention and deletion design
- Secret management and authenticated service boundary
- Prompt-injection, jailbreak, hallucination and refusal test suite
- Model outage/fallback and latency/cost testing
- Independent security and privacy review
- Proof that policy gates cannot be bypassed through model output
