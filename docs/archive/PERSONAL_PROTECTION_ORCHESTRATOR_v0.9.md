# Yumma Personal Protection Orchestrator — v0.9

## Purpose
Compose request understanding, personal context, Calm-State Contract recall, deterministic risk assessment, Life Ripple consequence mapping and policy into one explainable protection journey.

## Decision sequence
1. **Understand** — extract intent and identify ambiguity; request clarification when confidence is insufficient.
2. **Remember** — retrieve only relevant active profile-scoped context and matching commitments.
3. **Assess risk** — calculate a transparent deterministic risk score and list contributing cues.
4. **Map consequences** — identify possible life domains and proportionate interventions.
5. **Apply policy** — preserve the deterministic policy decision; the orchestrator cannot lower risk or authorize an action.
6. **Ask the person** — present a proportionate next step and require human confirmation where the situation warrants it.

## Postures
- `INFORMATIONAL`: ordinary low-risk requests; explain without alarm.
- `GENTLE_REMINDER`: a low-risk request matches a self-attested commitment; ask whether the person still wishes to follow it.
- `VERIFY`: medium-risk request; recommend independent verification.
- `PAUSE_AND_PROTECT`: high-risk request; advise not to proceed and preserve any policy block.

High risk takes precedence over a recalled commitment. A commitment is never authority. No posture enables external execution.

## Output contract
The plan includes staged status, matched commitment references, risk reasons, consequence domains, next step, human-confirmation requirement, and explicit `authorizationGranted: false` / `externalActionTaken: false` fields.

## Current limitations
This is a local synthetic prototype using deterministic rules. The profile is synthetic; there is no connected model provider, bank, wallet, messaging service, emergency service or external tool execution. The orchestrator is not a validated clinical, legal or financial decision system. The prototype's local persistence and demo profile are not production-grade identity or data protection controls.
