# Yumma: judge access security gate (v2.14, 24 November 2026)

## Decision

The hosted judge build is suitable for judges to evaluate Yumma with **synthetic data**. It is not a production deployment. Each blocking issue from v2.13 now has a control, and every control below is exercised by `npm run redteam` (59 attacks, all contained).

## Blocking issues from v2.13 and how each is handled

| v2.13 issue | Control in v2.8.0 judge mode | Red-team check |
|---|---|---|
| Memory API had no authentication | Judge mode requires the access link. The code becomes a signed, HttpOnly, Secure cookie; every API call without it gets 401 | J1, J2, J3 |
| No identity binding between users | Each judge gets a private synthetic profile; any other profile ID is refused (403); decision records are scoped per judge (404) | J4, J5 |
| No TLS | Render terminates HTTPS; the cookie is marked Secure | Deployment check |
| Rate limits keyed to the proxy address | Judge mode reads the client address from X-Forwarded-For; 120 API calls a minute per client | H8 |
| Local JSON storage | Synthetic data only; files are 0600; revoking erases the content; the decision record keeps only a fingerprint of each message | D2, D3, D4, D5, F7 |
| Tester feedback | Three fixed-choice answers only (no names, numbers or free text); one answer per session, kept as a salted fingerprint; judges counted separately | HTTP integration test |
| Unbounded AI cost and outage risk | Daily AI cap; 4-second timeout; any AI error is ignored and the rules decide | A3, A4, A5, J6, J7 |
| Secrets exposure | Keys live only in environment variables; never returned by any endpoint or written to logs | J8 |
| No operational logging | Every assessment logs a masked execution trace; the decision record is hash-chained and verifiable | D6, D7, J9 |

## What remains for production

An independent penetration test, encryption at rest with managed keys, real identity (UAE Pass or bank login), centralised monitoring and alerting, backup and restore, and a data-protection impact assessment under the UAE Personal Data Protection Law (Federal Decree-Law 45 of 2021).
