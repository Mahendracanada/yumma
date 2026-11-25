# Yumma — submission quality assurance v2.9
**Date:** 19 November 2026  
**Scope:** current local synthetic prototype, definitive 15-slide deck candidate and available media.

## Verified in this pass

### Runtime
- `npm run verify`: PASS.
- Source integrity: 17 required files present.
- JavaScript syntax checks: PASS.
- Automated tests: 64 passed, 0 failed.
- Synthetic judge scenarios: 4/4 passed.
- Local HTTP smoke test: PASS (health/version, demo readiness, scenario availability, browser response).
- Package/runtime version: 2.6.0.

### Deck
- Definitive candidate: `Yumma_Championship_Submission_Deck_v2.9_Final_Visual_QA.pptx`.
- 15 slides; LibreOffice PDF render: 15 pages.
- PPTX archive integrity: PASS.
- Visual QA found inherited dark text on dark backgrounds on slides 10, 11 and 13 (and a small number of other text elements). These text runs were changed to explicit high-contrast light colours.
- Slide 11 evidence-card copy was reduced in font size to fit the existing card geometry; claims and figures were not changed.
- Slides 10, 11 and 13 were re-rendered and inspected after correction. Slide 11 card content now fits visibly within the cards.
- This is a visual QA pass of the rendered deck; organiser portal/upload compatibility is not verified.

## Current media status
- Existing two-minute review video: 118.613 seconds, 1920×1080. It is a cinematic explainer and does not meet the required working-agent + participant webcam-overlay evidence format. It must not be represented as the final compliant demo.
- Existing six-minute pitch review video: 356.761 seconds, 1280×720. Duration is within six minutes; full delivery/audio review and organiser-specific checks remain outstanding.
- A corrected two-minute live-agent script and recording guide have been prepared. Actual participant webcam capture remains outstanding.

## External and environment-dependent blockers
1. Android: no Gradle project files, wrapper, Kotlin source or Android archive were found in the available runtime or Library searches. No Gradle executable, Android SDK or ADB device tooling is available in this environment. Android build/device verification is not complete.
2. Judge access: the server binds to `127.0.0.1`; this is local-only and cannot be used by remote judges. No approved hosted judge environment has been configured or tested.
3. Live model: provider is unconfigured; no live model call or quality evaluation is claimed.
4. Human validation: no user pilot/interviews or measured outcomes are claimed.
5. Independent assurance: no penetration test, legal/privacy review or production security certification is claimed.
6. Participant recording: the compliant working-agent video needs the participant's webcam overlay and own spoken explanation.

## Submission truth statement
The strongest supported claim is a working local synthetic prototype with deterministic protection orchestration, consent-aware local memory/Calm-State Contract mechanics, a browser judge walkthrough and reproducible local tests. It is not a production-ready service and has no live bank/payment integrations or external financial actions.
