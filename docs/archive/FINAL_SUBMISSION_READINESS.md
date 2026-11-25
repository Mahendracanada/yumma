# Yumma — Championship submission readiness

Updated 19 November 2026. Internal evidence tracker; not an official judging result.

## Verified
- Local prototype version 2.6.0 starts and responds on `http://127.0.0.1:4173`.
- `npm run verify`: 64/64 automated tests, 4/4 synthetic judge scenarios, source integrity, syntax checks and local HTTP smoke test all pass.
- Browser judge mode includes synthetic scenario selection, run/reset, risk explanation and local evidence.
- Calm-State Contract and profile-scoped memory have consent, expiry and revocation tests.
- Emerald-and-gold Abaya hologram is a visual concept, not a live 3D avatar.
- Definitive 15-slide deck candidate: `Yumma_Championship_Submission_Deck_v2.9_Final_Visual_QA.pptx`; rendered to a 15-page PDF and checked for visual contrast/overflow in the corrected slides.

## Still required before submission
1. Record the actual browser/Android agent with participant webcam overlay and spoken explanation; maximum 120 seconds. The current cinematic explainer is not a compliant substitute.
2. Decide/obtain an organiser-approved judge access path. Localhost is not remotely reachable.
3. Recover the existing Android Gradle project if Android is to be part of the submission; build and test on an emulator/device before claiming completion.
4. Review the six-minute pitch media for content, audio and organiser requirements.
5. Check the live submission portal for current deadline, file types, size limits, category and access instructions.

## Not claimed as complete
- Live generative model provider or live reasoning evaluation.
- Live bank, wallet, payment, notification, healthcare, calendar or emergency integrations.
- External transaction execution.
- Production identity assurance, encryption assurance, independent penetration testing or security certification.
- User research, pilot outcomes, measured fraud-loss reduction or validated willingness to pay.
- Android build/device validation.

## Safe demo commands
```sh
npm run verify
npm start
```
Then open `http://127.0.0.1:4173`. Use synthetic data only. Do not expose this local development server directly to the public internet.
