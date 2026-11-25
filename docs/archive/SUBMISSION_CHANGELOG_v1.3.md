# Changelog v1.3
- Added bounded process-local conversation sessions with 30-minute inactivity expiry.
- Added eight-turn history cap and message-length limits.
- Added follow-up continuity that reuses the previous complete assessment.
- Passed bounded conversation history and read-only prior assessment into the optional model adapter.
- Added UI indicator for new assessment versus follow-up.
- Added automated tests for session isolation, turn bounds, malformed IDs and expiry.
- Verified 36 automated tests and local HTTP high-risk/follow-up smoke test.
- No external integrations, identity verification or real-world actions added.
