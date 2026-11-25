# Yumma: a pre-commitment AI agent (prototype v2.8.0)

Designed, built and tested by Mahendra Dhillon for the Create AI Agents Championship.

Yumma protects a family the way a mother does. While calm, a person records a promise in their own voice. When a call or message pushes for money, Yumma recognises the scam pattern, plays that promise back, asks the family question a cloned voice cannot answer, and points to a trusted way to check. **The person always decides.** Yumma never moves money, handles a code or contacts anyone on its own.

## Try it

**Hosted judge link:** one click opens Yumma as a phone app, with a private copy of Salma, our synthetic user. A message arrives on her phone, Yumma appears as a talking hologram, and **Under the hood** shows every step the agent takes. No sign-in, no key. The link is in the submission. See [JUDGE_QUICKSTART.md](JUDGE_QUICKSTART.md) for three things to try.

**Run it yourself** (Node.js 20 or later; there are no packages to install):

```bash
npm run verify   # integrity, syntax, 87 tests, 5 judge scenarios, 216 challenge messages, 59 red-team attacks, smoke test
npm start        # http://127.0.0.1:4173
```

On a Mac, double-click `START_YUMMA_DEMO.command`. It verifies, starts the server and saves Salma's promise and family question with consent (demo answer: Turtle).

Optional live AI risk signal (see `.env.example` for every setting):

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # or OPENAI_API_KEY=...
npm start
```

## How one request flows

Every assessment produces an **execution trace** (shown in the app, downloadable, and printed to the server log) and a **tamper-evident decision record**:

1. `receive_input`: length and a masked preview (numbers, emails and links are hidden in logs)
2. `ai_risk_signal`: provider, status, level and latency. The AI may only raise caution; it is ignored on error, after 4 seconds, or once the daily cap is reached
3. `understand` → `recall_profile_promises` → `match_scam_patterns` (19 named UAE patterns) → `apply_ai_signal` → `map_consequences` → `policy` → `protection_plan` → `family_check`
4. `recall_saved_promises`: the person's own consented promises
5. `explain`: a bounded AI explanation, rejected if it ever urges payment or reassures during a cautious decision
6. `write_decision_record`: an append-only log where each entry stores the message's SHA-256 fingerprint (never the text) and the hash of the entry before it. `GET /api/decision-log/verify` recomputes the whole chain
7. `output`: posture, with `authorizationGranted: false` and `externalActionTaken: false`

## What works in this build

| Capability | Status |
|---|---|
| 19 named UAE scam patterns (13 high-risk, 6 verify), English and Arabic | Working, tested |
| Defences against disguised wording: invisible characters, look-alike letters, spaced or dotted letters, digits for letters, full-width text, Arabic vowel marks | Working, red-teamed |
| The person's promise, recalled on trigger and played back in their own voice (recorded in the browser, kept on the device) | Working |
| Family Verification Question: salted scrypt hash, constant-time check, lockout after 5 wrong answers, never authorises | Working, red-teamed |
| Consent for every saved memory, promise and question; revoking erases the content, not just hides it | Working, red-teamed |
| Optional AI risk signal (raise-only, capped per day) and bounded AI explanation (explain-only) | Working; failure modes red-teamed |
| Execution trace and hash-chained decision record | Working |
| Judge mode: access link, private synthetic profile per judge, proxy-aware rate limits, synthetic-data banner | Working, red-teamed |
| After-the-fact path: bank first, then Aman 800 2626 (Abu Dhabi), ecrime.ae (Dubai) or 999 | Working |

## Evidence

| Command | What it shows |
|---|---|
| `npm run verify` | 87/87 tests, 5/5 judge scenarios, 216/216 challenge messages, 59/59 red-team attacks contained, smoke PASS |
| `npm run challenge` | 216 synthetic UAE messages in seven sets, including an official-warnings round of 20 scam types that UAE authorities warned about in 2025–2026. First time seen (149 messages over five unseen rounds): 79 of 85 scams warned, 6 missed; 7 false alarms on 42 ordinary requests; 79.2% overall. All 216 pass after fixes. See `evaluation/CHALLENGE_TEST_REPORT_v2.7.md` |
| `npm run redteam` | 59 attacks on evasion, prompt injection, AI manipulation, voice spoofing, data protection, access control and error handling. Results in `evaluation/redteam-results.json` |
| `npm run blind -- file.csv` | Messages written by other people, run once; refuses to rerun the same file as first sight. See `evaluation/BLIND_TEST_KIT.md` |
| `npm run benchmark` | 10 scenarios: expected vs actual, first-sight result, latency (about 0.03 ms per message for the rules). Add `--ai` with a key to time the AI call |
| `npm run challenge:ai` | All 216 messages with the live AI signal, using my key on my machine. Saves `evaluation/results-ai-run.json` |
| `npm run ai-gap` | Every message the rules got wrong the first time they saw it, sent to the AI signal alone: how many it would have caught. `RUN_AI_TEST.command` runs this, the AI challenge run and the AI benchmark in one go, asking for the key without saving it |

## Hosting the judge build

`render.yaml` deploys the judge build on Render in one step; [docs/DEPLOY.md](docs/DEPLOY.md) has the steps. In judge mode the server listens on all interfaces behind Render's HTTPS, requires the access link, gives every judge a private synthetic profile, and caps AI calls per day. [JUDGE_ACCESS_SECURITY_GATE.md](JUDGE_ACCESS_SECURITY_GATE.md) lists each control and what remains for production.

## Scope

Yumma runs on synthetic data. The only real input it takes is optional, anonymous three-tap feedback from people who try it (who they are, whether it would help, whether their family would pay), with no names, numbers or free text; judges' answers are counted separately. Live bank, payment, messaging and wallet connections, production identity, encrypted storage and an independent security assessment come with the production path. The tests are engineering evidence; real-world fraud-prevention accuracy comes from a supervised pilot.

Superseded design notes and earlier evidence are kept in `docs/archive/` for audit trail. Copyright © 2026 Mahendra Dhillon; see [LICENSE](LICENSE).
