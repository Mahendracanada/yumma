# Yumma v0.6 — Personal Wisdom Graph evaluation

## Scope
This increment adds a typed Personal Wisdom Graph to the local synthetic prototype. It separates preferences, commitments, boundaries, relationships, temporary instructions and general context. User-selected types take precedence; otherwise deterministic phrase rules suggest a type with a confidence value and basis.

## Safety properties
- Expired/revoked memories are excluded from the active graph.
- Possible contradictory statements are surfaced for user resolution; the system does not silently overwrite either statement.
- Memory creation/update/revocation continues to require explicit consent and a stated purpose.
- This is heuristic classification, not semantic certainty. The user must be able to correct the classification.

## Verification
- Automated suite: 31 passed, 0 failed.
- Added coverage: temporary-vs-durable classification, commitment/boundary recognition, conflict flagging, active-node filtering and category counts.
- No live model, external service, or real-person data used in this evaluation.

## Known limitations
- Phrase matching can misclassify nuanced or multilingual statements.
- Conflict detection is deliberately conservative and may miss paraphrases or flag superficially similar statements.
- This does not infer sensitive traits, establish identity, or decide which memory is correct.
