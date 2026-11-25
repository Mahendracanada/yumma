# Yumma — Master Competition Completion Workplan
**Updated:** 19 November 2026  
**Purpose:** Single source of truth for submission readiness. Internal tracker, not an official judging result.

## Completed in this pass

### 1. Core local agent verification — DONE
- Runtime package: `2.6.0`.
- `npm run verify`: PASS.
- Source integrity: 17 required files present.
- JavaScript syntax checks: PASS.
- Automated tests: **64 passed, 0 failed**.
- Synthetic judge scenarios: **4/4 passed**.
- HTTP smoke checks: PASS.
- Expected scenario postures: bank-transfer-pressure → `PAUSE_AND_PROTECT`; otp-request → `PAUSE_AND_PROTECT`; remote-access → `PAUSE_AND_PROTECT`; benign-information → `INFORMATIONAL`.
- No live bank/payment integration or external financial action. Model provider is not configured. Local JSON storage is not certified secure or encrypted.

### 2. Definitive 15-slide deck — VISUAL QA PASS
- Final candidate: `/mnt/data/Yumma_Championship_Submission_Deck_v2.9_Final_Visual_QA.pptx`.
- Rendered to `/mnt/data/Yumma_QA_v29/Yumma_Championship_Submission_Deck_v2.9_Final_Visual_QA.pdf` (15 pages).
- PPTX archive integrity: PASS.
- Corrected inherited dark text on dark backgrounds in slides 10, 11, 13 and selected text elements on slides 8 and 14.
- Adjusted slide 11 evidence-card body text to fit the existing card dimensions. Re-rendered and visually inspected slide 11 after correction.
- Retains 15 slides and the established emerald/gold Abaya visual direction.

### 3. Recording materials — DONE (materials only)
- Corrected `TWO_MINUTE_DEMO_RECORDING_GUIDE.md` to use the real runtime port `4173`, correct scenario names and current evidence count.
- Created `FINAL_DEMO_RECORDING_SCRIPT_v2.9.md` with time-coded screen cues and spoken narration.
- The existing 118.613-second MP4 is a cinematic explainer; it does **not** meet the working-agent + participant-webcam format and is not the final competition demo.

### 4. Readiness and judge guidance — UPDATED
- `FINAL_SUBMISSION_READINESS.md` now reflects current runtime, deck and honest outstanding gates.
- `JUDGE_GUIDE.md` remains a technical walkthrough of the local synthetic prototype; the app runs at `http://127.0.0.1:4173`.
- `SUBMISSION_QA_v2.9.md` records the evidence and limitations from this pass.

## Still blocked / requires resources or participant action

### A. Android companion — BLOCKED
- Recovered configuration: project `Yumma`, package `com.yumma.guardian`, Kotlin, Jetpack Compose, Kotlin DSL, min SDK API 26.
- Earlier records say the starter project was created and an early risk-engine milestone built. The integrated Gradle source could not be recovered from the current working directory or Library search.
- No `settings.gradle(.kts)`, `build.gradle(.kts)`, `gradlew`, `MainActivity.kt` or Android archive was found in the available workspace. No Gradle executable, Android SDK or ADB device tooling is available in this environment.
- Do not claim Android build/APK/device validation complete.

### B. Two-minute compliant video — BLOCKED ON PARTICIPANT RECORDING
- Must show the actual running browser/Android agent and participant webcam overlay with spoken explanation.
- Script and recording guide are ready; participant webcam capture and final MP4 export are not done.

### C. Judge access — BLOCKED ON APPROVED HOSTING / ORGANISER METHOD
- The server binds to `127.0.0.1`. This is local-only and cannot be reached by remote judges.
- Do not expose the development server directly to the public internet. Need an approved hosted deployment or organiser-provided access method and an external-network test.

### D. External validation and assurance — NOT COMPLETED
- No live model provider is configured; no live model quality evaluation.
- No adult-user pilot/interviews, measured outcomes, validated willingness to pay or partner commitment.
- No independent penetration test, legal/privacy opinion or production security certification.
- Child/guardian research and sensitive health use require specialist safeguards and appropriate consent; not part of this prototype validation.

### E. Six-minute pitch — REVIEW STILL REQUIRED
- Existing review video is 356.761 seconds (5m 56.8s), 1280×720. Duration is within six minutes. Full delivery/audio and organiser-specific requirements still need review.

### F. Submission portal — USER/ORGANISER DEPENDENCY
- Verify the live portal's deadline, category, required formats, upload size limits and judge-access instructions before upload. Do not infer current requirements from older working notes.

## Submission truth statement
The strongest supported claim is a working local synthetic prototype with deterministic protection orchestration, consent-aware local memory/Calm-State Contract mechanics, a browser judge walkthrough and reproducible local tests. It is not a production-ready service and has no live bank/payment integrations or external financial actions.

## Completion rule
A workstream is DONE only when its artifact or external evidence exists and has been checked. A plan, script, synthetic test or design concept is not equivalent to a live integration, user validation, security certification or device run.


## Update — 2026-11-19 (v2.10 pitch review)
- Reviewed the existing six-minute pitch video metadata and sampled frames across its duration. Runtime is 5:56.8, within the six-minute ceiling but with minimal margin.
- Found superseded evidence displayed in the video: 70/70 regression cases and 13/13 packaged test files. Current verified evidence is 64/64 automated tests and 4/4 synthetic judge scenarios.
- Decision: existing six-minute video is not submission-ready; replacement recording required. Audio was not fully transcribed/reviewed, so no audio-quality or narration-accuracy claim is made.
- Created `FINAL_SIX_MINUTE_PITCH_SCRIPT_v2.10.md`, aligned to the 15-slide v2.9 deck, and `PITCH_VIDEO_AUDIT_v2.10.md`.
- Still outstanding: record the revised six-minute pitch; record the separate required two-minute live-agent demo with participant webcam overlay; recover/validate Android source and build; establish safe judge access; verify external statistics and founder credentials; review current portal requirements.
