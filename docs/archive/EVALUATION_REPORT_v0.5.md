# Yumma v0.5 — Model Boundary Evaluation

## Purpose
Introduce a provider-neutral model adapter boundary without allowing a language model to become the policy authority.

## Implemented
- `src/model-adapter.js` defines a provider-neutral adapter contract.
- The default adapter is disabled and reports `not_configured`.
- Model input is bounded to 8,000 characters and carries the deterministic risk/policy decision as read-only context.
- The only accepted model output is a bounded `explanation` string (maximum 2,400 characters).
- A conservative output screen rejects several explicit high-risk instructions involving credential disclosure, money movement, remote access, or secrecy.
- Tool, authorization, risk, and action fields are not accepted from model output.
- Provider failures propagate to the caller; the deterministic policy object is not mutated.
- No provider SDK, API key, network call, or live model connection is included.

## Test results
- **27/27 automated tests passed** on the local Node.js test run.
- This includes the existing 20 tests plus seven model-boundary tests.
- Tests cover disabled-by-default behaviour, bounded input, output allowlisting, invalid/oversized output rejection, provider failure isolation, unsafe-instruction rejection, and safe-guidance acceptance.

## Limitations
- This validates the adapter contract with a local test double only.
- It does not validate any live model, provider security, prompt-injection resistance in a deployed service, latency, cost, or production reliability.
- The adapter is not yet wired into the user-facing journey; deterministic response generation remains active.
- Yumma remains a local synthetic prototype with no external integrations or external action execution.

## Next validation gate
Before connecting a real model: select an approved provider, define data minimisation and retention controls, add authenticated server-side secret handling, run prompt-injection and refusal evaluations, and verify that policy decisions remain deterministic and authoritative under model outage or adversarial output.
