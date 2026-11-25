# Yumma Calm-State Contract 2.0 — v0.8

## Purpose
A consent-led reminder mechanism that stores a person's own commitment made when they explicitly self-attest that they are comfortable making it. When a user-defined trigger later appears, Yumma gently recalls the commitment and asks whether the person still wants to follow it.

## Lifecycle
1. **Create:** requires profile scope, non-empty commitment, explicit consent with purpose, explicit `selfAttestedCalm: true`, at least one specific trigger, and optional future expiry.
2. **Store:** preserves the person's wording; records source, purpose, creation/update times, trigger list and status. Local JSON is written atomically with restrictive permissions where supported.
3. **Recall:** only active, non-expired contracts are considered. Trigger matching is deterministic substring matching. The recall is phrased as a question and explicitly says the person remains in control.
4. **Revoke:** requires renewed explicit consent and stops future recall.
5. **Expire:** expired contracts are marked and excluded from recall.

## API
- `GET /api/contracts/:profileId` — list active contracts.
- `POST /api/contracts/:profileId` — create with `{ contract, consent }`.
- `POST /api/contracts/:profileId/recall` — recall against `{ message }`.
- `DELETE /api/contracts/:profileId/:contractId` — revoke with `{ consent }`.

Create example:
```json
{
  "contract": {
    "commitment": "I will pause and call my bank independently.",
    "triggers": ["urgent transfer", "pressure to pay"],
    "selfAttestedCalm": true,
    "expiresAt": null
  },
  "consent": {
    "granted": true,
    "purpose": "Remind me when I receive a pressured payment request"
  }
}
```

## Non-negotiable authority boundary
A Calm-State Contract is a reminder, not a command, legal mandate, power of attorney, authentication factor, or authorization. It cannot execute or authorize a transaction, block a lawful user choice, override present consent, or grant another person authority. Recall payloads explicitly carry `authorization: false` and `canExecute: false`.

## Limitations
- This is a local synthetic prototype, not production-grade secure storage or identity verification.
- “Calm” is not inferred from voice, biometrics, sentiment, or AI. It is only a user self-attestation flag; the system cannot establish a person's actual mental state.
- Trigger matching is simple substring matching and may miss paraphrases or produce false matches.
- No external bank, wallet, messaging, calendar, caregiver or emergency integration is connected.
- A production implementation needs threat modelling, encryption/key management, authenticated profile ownership, accessibility testing, independent security review and user research.
