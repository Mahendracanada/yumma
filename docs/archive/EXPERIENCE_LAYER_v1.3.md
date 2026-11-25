# Yumma Experience Layer v1.3 — Contextual Conversation

## Purpose
Add bounded, temporary conversational context so Yumma can respond to follow-up questions without losing the assessment being discussed.

## Implemented
- Browser creates a random session identifier and sends it with conversation requests.
- Server keeps a process-local session, with the latest eight user/assistant turns.
- Sessions expire after 30 minutes of inactivity and are pruned on the next session access.
- Conversation messages are capped at 2,000 characters; model history is limited to the latest six turns and bounded again at the model adapter.
- Follow-up prompts beginning with common clarification phrases (for example, “Why…?”, “How…?”, “What should I do…?”) reuse the previous assessment rather than re-running the short follow-up phrase through the risk classifier.
- The optional language model receives recent turns and a read-only summary of the prior assessment. It remains explanation-only.
- When no model is configured or the provider fails, deterministic fallback refers to the same previous assessment and its recommended next step.
- The browser labels whether the response is a new assessment or a follow-up.

## Privacy and scope
- Conversation turns are held in server memory only; they are not written to the persistent Personal Wisdom Graph or memory store.
- Session state is local to the running server process and is lost when the server restarts.
- A session ID is a continuity token, not identity proof or authentication. This prototype is single-user/local-demo oriented and is not production multi-tenant session security.
- No real personal, banking or health data should be entered.

## Limitations
- Follow-up detection uses a small deterministic phrase pattern, not semantic intent classification.
- A new unrelated request should be submitted as a new session for clean separation; a dedicated “new conversation” control is a later UI enhancement.
- Live model provider remains optional and is not assumed configured.
