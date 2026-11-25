# Yumma v1.9 — Multilingual Safety and Accessibility

## Implemented
- Added a bounded Arabic safety lexicon for selected urgent transfer, bank, secrecy, OTP/password, account-block and remote-access terms.
- Preserves original user text while normalising known Arabic safety phrases for deterministic cue detection.
- Returns language metadata and explicitly labels Arabic coverage as a limited safety lexicon, not general Arabic fluency.
- Provides simple Arabic safety responses for supported high-risk, medium-risk and clarification paths.
- Added a plain-language presentation toggle; it changes display density only and cannot change risk or policy.
- Added visible keyboard focus and reduced-motion CSS support.

## Limitations
- Arabic dialects, spelling variation, mixed-language messages and nuanced intent are not comprehensively supported.
- This is not certified translation or a validated multilingual fraud classifier.
- Accessibility CSS changes have not been evaluated with users or assistive technology certification.
- All testing uses synthetic examples.
