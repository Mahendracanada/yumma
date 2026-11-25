# Evaluation Report — Yumma v1.1

## Scope
Conversational experience increment over v1.0: optional browser speech input and visible protection posture.

## Verified
- `node --check public/app.js` completed successfully.
- `npm test`: 51 passed, 0 failed, 0 skipped.
- Speech input is wired to a user-initiated browser API where available; unsupported browsers disable the control.
- Transcript is inserted into the editable request field and is not automatically submitted.
- Assessment UI displays the deterministic protection posture and its next-step guidance.

## Not verified / not claimed
- No browser automation or physical microphone test was performed in this environment.
- SpeechRecognition support and audio handling vary by browser and vendor.
- No live generative model, wake-word service, streaming conversation, or production voice stack is connected.
- No real user study or production security assessment has been performed.
