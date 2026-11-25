# Yumma Experience Layer v1.1 — Conversational interaction

## Delivered
- Added an optional browser speech-input control using the browser's SpeechRecognition API where supported.
- Microphone access begins only after the person presses **Speak to Yumma** and grants browser permission.
- Recognised words are placed in the request field for review. Speech input never submits a request automatically.
- The UI explicitly explains that speech recognition is browser-managed and may use the browser/vendor speech service; it is not represented as a private on-device model.
- Added a visible protection-posture card showing the orchestrator's posture and next-step guidance after an assessment.
- Kept browser-native speech playback, stop control, larger text, keyboard focus, and reduced-motion support.

## Boundaries
- Speech input is optional and browser-dependent; unsupported browsers retain typed input.
- This is not continuous listening, wake-word detection, or a connected conversational model.
- Speech recognition may process audio through the browser vendor's service. The UI does not claim local-only microphone processing.
- Speech-to-text does not trigger an assessment, authorize tools, or execute an external action.
- The protection posture is produced by the deterministic synthetic rules in the existing agent.

## Next increment
Add explicit turn-taking and a bounded conversational layer only after selecting and configuring a model provider. Keep the deterministic policy engine authoritative and preserve human confirmation for consequential actions.
