# Yumma v1.5 — Competition Demonstration Mode

## Purpose
Repeatable judge-facing synthetic scenarios with explicit expected protection postures and verification flags.

## Endpoints
- `GET /api/demo/scenarios` lists scenario metadata without exposing full prompt text.
- `POST /api/demo/run` accepts `{ "scenarioId": "bank-transfer-pressure" }` and runs the selected synthetic scenario through the actual deterministic agent journey.

## Scenarios
1. Urgent bank transfer — expected `PAUSE_AND_PROTECT`.
2. One-time code request — expected `PAUSE_AND_PROTECT`.
3. Remote access request — expected `PAUSE_AND_PROTECT`.
4. Benign information request — expected `INFORMATIONAL`.

The response includes the actual assessment, expected posture comparison, and explicit `authorizationGranted:false` and `externalActionTaken:false` checks.

## Verification
`node --test`: 40 passed, 0 failed. HTTP smoke test confirmed scenario listing and a bank-transfer run returning `PAUSE_AND_PROTECT` with no authorization or external action.

## Boundaries
Synthetic scenarios only. No live bank, wallet, messaging, device-control or external service integration. This API is a repeatable demonstration backend; it is not a public judge deployment or a substitute for the required two-minute participant video.
