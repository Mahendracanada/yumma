# Evaluation Report v0.8

- Automated Node test suite: **45/45 passed**.
- Calm-State Contract coverage: consent, purpose, self-attested calm state, trigger requirement, profile isolation, wording preservation, gentle trigger recall, expiry, revocation and no-authority boundary.
- Existing request, policy, Life Ripple, memory and model-boundary suites also pass.
- HTTP smoke test: capabilities endpoint responded; create returned HTTP 201; recall returned the person's wording and `authorization: false`, `canExecute: false`.
- Prototype mode: local synthetic; `externalIntegrations: false`.

These are software test results, not evidence of production security, clinical effectiveness, fraud-prevention outcomes or independent validation.
