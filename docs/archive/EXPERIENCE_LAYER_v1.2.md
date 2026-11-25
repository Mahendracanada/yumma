# Yumma Experience Layer v1.2 — Bounded Conversational Intelligence

## Delivered
- Added an optional server-side OpenAI Responses API adapter configured through `OPENAI_API_KEY` and optional `OPENAI_MODEL` environment variables.
- Added `/api/conversation`, which runs the deterministic assessment first and then requests a bounded explanation-only suggestion.
- The model receives the message as untrusted data plus read-only risk, policy, deterministic guidance and relevant preferences.
- Only a single explanation string is accepted. Output is length-limited and rejected when it contains selected unsafe instructions relating to credentials, payments, remote access or secrecy.
- Provider errors and missing credentials fall back to the deterministic explanation; the API still returns the deterministic assessment.
- The browser renders the conversational explanation, labels its source/status, and retains browser speech playback.
- Model output cannot change risk, policy, permissions, tool plans or execute actions.

## Configuration
Set `OPENAI_API_KEY` in the server environment. Optionally set `OPENAI_MODEL` (default `gpt-4.1-mini`). Restart the server. Do not put API keys in browser JavaScript, source control, screenshots or competition materials. No key is included in this deliverable.

## Current verification boundary
Automated tests use a mocked provider response. No live provider call has been made in this environment. Without an API key, Yumma operates in deterministic fallback mode. This is not evidence of production readiness, privacy certification, or independent security validation.
