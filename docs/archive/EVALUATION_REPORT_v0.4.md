# Yumma adversarial evaluation — v0.4 increment

## Scope
A focused, repeatable synthetic evaluation was added to the v0.3 local prototype. It covers high-pressure financial requests, credential theft, remote-access coercion, gift-card/cryptocurrency payment pressure, forced app installation, benign requests and ambiguity handling.

## Results
- Automated suite: **20/20 tests passed** (Node.js built-in test runner).
- Adversarial/benign scenario set: **12 scenarios** asserted.
- Tested dangerous patterns: urgent transfer with secrecy; OTP under threat; remote access; gift-card payment; cryptocurrency penalty; forced app installation; screen sharing with secrecy.
- Benign/low-risk controls: appointment reminder; bank opening hours; historical rent transfer; password hygiene question.
- Ambiguity control: short request asks for clarification.
- Every scenario asserts that no external action was taken.

## Defect found and corrected
The first evaluation run found that the word `now` and the phrase `today` were not consistently treated as urgency cues. The cue patterns were expanded and the suite rerun. This is an example of a test-driven correction, not evidence of real-world fraud detection accuracy.

## Important interpretation
These are hand-authored synthetic scenarios, not a representative dataset. Passing them does not establish fraud-detection accuracy, recall, precision, bias performance, safety certification or production readiness. The classifier remains deterministic and rule-based. Real-world validation requires a consented, privacy-reviewed dataset, independent red-team testing and expert review.
