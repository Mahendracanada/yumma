# Personal Wisdom Graph — v0.6 design

## Memory node types
- **Preference:** a recurring communication or service preference.
- **Commitment:** something the person has explicitly agreed to do or asked Yumma to remind them about.
- **Boundary:** a stated limit or refusal that should not be casually overridden.
- **Relationship:** a user-described relationship or trusted-person context.
- **Temporary instruction:** a time-bounded request that should not be treated as a lasting preference.
- **Context:** information that does not confidently fit another category.

## Classification
The prototype honours a type explicitly selected by the user. If no type is selected, a deterministic phrase classifier proposes one and stores its confidence and basis. A default context classification has lower confidence. This is a suggestion, not a claim that Yumma understands every nuance.

## Conflict handling
When two active memories contain shared terms but opposing preference/boundary language, the graph emits a possible-conflict record with `resolution: ask_user`. It does not pick the newer memory, merge the statements, or delete either one.

## Lifecycle and privacy
Profile-scoped storage, explicit purpose/consent, expiry and revocation remain in force. Only active, unexpired memories appear in the graph. Current prototype storage remains local plaintext JSON; it is not suitable for real sensitive personal information or production deployment.
