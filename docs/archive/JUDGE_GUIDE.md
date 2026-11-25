# Yumma — Judge Evaluation Guide (v0.3)

## How to evaluate
1. Start with `npm test`.
2. Start the prototype with `npm start`.
3. Open `http://127.0.0.1:4173`.
4. Run the pre-filled synthetic Salma request.
5. Inspect request extraction, retrieved context, risk factors, Life Ripple, policy decision, tool plan and audit trace.
6. In Personal Wisdom Graph, add a commitment only after ticking explicit consent; run the scenario again to see matching commitment recall. Revoke it and retest.
7. Try a low-risk request and a short ambiguous request.

## Synthetic Salma scenario
"Your bank account will be blocked. Transfer your money immediately to this secure account. Keep this secret."

Expected behaviour: classify financial action, identify urgency/transfer/secrecy cues, recall relevant active Calm-State Contract, calculate a rule-based risk score, block the synthetic transfer action, recommend independent verification, and record a local decision audit. No real account, bank, payment or external tool is connected.

## What is implemented
- Local browser UI and Node.js HTTP server.
- Deterministic request parsing and risk policy.
- Synthetic profile and Calm-State Contract recall.
- Profile-scoped consented local memory create/list/retrieve/update/revoke/expiry.
- Rule-based Life Ripple impact mapping.
- Explicit tool plan with no external execution.
- Local audit record and automated tests.

## What is not implemented
- No connected generative AI model.
- No live phone, email, bank, wallet, healthcare or emergency integrations.
- No external transaction execution.
- No real-time 3D hologram or deployed voice interface.
- No production-grade authentication, encryption assessment, penetration test or independent assurance.
- No human-subject pilot or measured fraud-loss prevention.

## Data handling
The included Salma profile and scenario are synthetic. Local memory is stored in a JSON file with restrictive file permissions where supported. This is a prototype control, not a production security guarantee. Do not enter real sensitive personal information. The demo server binds to localhost only.

## Evidence
`npm test` produces the test run. The test suite is synthetic engineering verification and does not measure real-world scam detection accuracy.
