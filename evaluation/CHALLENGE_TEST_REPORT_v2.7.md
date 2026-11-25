# Yumma — Challenge Test Report (v2.7 engine, carried into v2.8.0)

Prepared by Mahendra Dhillon

Date: 24 November 2026 · Runtime: Node.js 22 · Command: `npm run challenge` (also part of `npm run verify`)

## Why this test exists

Yumma's four built-in judge scenarios (4/4 PASS) were written to match the v2.6 rules. A judge will type their own messages, so I built 86 realistic UAE messages — scams, grey-zone cases and ordinary requests, in English and Arabic — to test Yumma the same way.

## Scoring rules

| Category | Pass | Partial | Fail |
|---|---|---|---|
| SCAM (48 messages) | PAUSE AND PROTECT | VERIFY (warned, but under-protected) | INFORMATIONAL (missed) |
| AMBIGUOUS (11) | VERIFY or PAUSE AND PROTECT | — | INFORMATIONAL (missed) |
| BENIGN (27) | INFORMATIONAL or GENTLE REMINDER | — | VERIFY / PAUSE AND PROTECT (false alarm) |

In every run, for every message: **authorisation granted = NO, external action taken = NO.**

## Results by round

| Round | Set (size) | Build | Scams fully protected | Scams verify-only | Scams missed | Grey-zone pass | False alarms | Overall |
|---|---|---|---|---|---|---|---|---|
| Baseline | Tuning (32) | v2.6.0 | 1 / 18 | 7 | 10 | 1 / 3 | 2 / 11 | 34.4% |
| Baseline | Holdout (30) | v2.6.0 | 0 / 18 | 5 | 13 | 2 / 4 | 1 / 8 | 30.0% |
| 1 — first unseen run | Holdout (30) | v2.7 rules | 16 / 18 | 2 | **0** | 4 / 4 | **0** / 8 | **93.3%** |
| 2 — retest after fixes | Holdout (30) | v2.7 | 18 / 18 | 0 | 0 | 4 / 4 | 0 / 8 | 100% |
| 3 — first unseen run | Fresh (24) | v2.7 | 10 / 12 | 2 | **0** | 2 / 4 | **0** / 8 | **83.3%** |
| 4 — retest after fixes | All 86 | v2.7.0 | 48 / 48 | 0 | 0 | 11 / 11 | 0 / 27 | 100% |

**Headline (first time each message was seen, rounds 1 and 3 combined, 54 messages):**
- 0 of 30 scams missed. 26 got full protection and 4 got a "verify" warning.
- 0 false alarms on 16 ordinary requests.
- 6 of 8 grey-zone cases flagged for verification.
- Overall 48 / 54 = **88.9%**.

## Failures found and fixed

| Round | Message (abridged) | Result | Root cause | Fix |
|---|---|---|---|---|
| 1 | Online girlfriend never met needs money for a flight, don't tell family | VERIFY | "needs money" not recognised as a money request | Money-request lexicon: needs / wants / asking for money |
| 1 | Landlord's agent wants deposit to a different account before viewing | VERIFY | Payee change only escalated with urgency or secrecy | Payee change pushed by a third party now escalates |
| 3 | Emirates Draw win, pay AED 1,200 processing before release | VERIFY | "processing … before they release" not recognised as an advance fee | Advance-fee lexicon extended |
| 3 | "Dad it's me … using a friend's number … don't call Mum" | VERIFY | "phone broke" / "friend's number" / "don't call Mum" not recognised | Family-emergency, new-contact and secrecy cues extended |
| 3 | Landlord WhatsApp with a new IBAN | MISSED | "new IBAN" not a payee-change cue | Added new IBAN / new account number |
| 3 | Unknown caller wants a copy of my passport | MISSED | "copy of my passport" not an identity request | Added copy/photo of passport or Emirates ID |

Each fix is a general cue pattern, not a copy of a test sentence. Yumma's original 64 tests and the 4 judge scenarios passed after every change.

## What changed in the agent (v2.6.0 → v2.7.0)

1. **19 named scam patterns** (13 HIGH, 6 MEDIUM) replace single-keyword scoring. They cover impersonation with pressure, credential requests, device takeover, safe-account moves, advance fees, prizes and guaranteed returns, romance, family emergencies, gift-card or crypto payment, secrecy, phishing links, payee changes and identity probing. Each decision names the pattern it matched, so it is explainable and auditable.
2. **Context awareness.** The rules tell apart a request from someone else (a caller, a message, an SMS) and a request the person starts themselves ("I'm paying my DEWA bill in the official app"). Self-started, routine or educational requests are not alarmed, which is how false alarms went from 3 to 0.
3. **Arabic lexicon extended** to cover prizes, fees, links, card numbers, police, safe accounts, new numbers and family terms.
4. **Optional AI risk signal (raise-only).** With an `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) set, a language model classifies each message. Its output can **raise** the level but never lower it. It cannot authorise anything, it is ignored on error, malformed output or timeout (4 s), and it is recorded in the audit trail. With no key, the agent runs on its rules alone. 9 new unit tests cover these guarantees.

## Cost and speed per task (measured)

- Deterministic assessment: **0.028 ms** mean per message (5,000 runs on the review machine). Local CPU only, so the compute cost is effectively zero.
- AI risk signal (when enabled): one call of about 350 input tokens (about 1,100-character instruction plus the message) and up to 60–150 output tokens with `max_tokens` = 150. See the deck's unit-economics slide for the AED cost at the provider's published price.

## Scope of these results

- I wrote all 86 messages myself, and they are synthetic. I froze the holdout and fresh sets before tuning (SHA-256 hashes recorded). An external test set written by someone outside the project is my next step.
- 100% after retest shows the fixes work. The first-run figures (93.3% and 83.3%) show how Yumma's rules handle new phrasing; real-world accuracy comes from a supervised pilot.
- Yumma's live AI risk signal is measured next, with a provider key on my Mac. Its fail-safe behaviour is already tested end-to-end against an unreachable provider: the deterministic result stood, and no action was taken.
- Yumma's Arabic coverage today is a targeted safety lexicon; fuller Arabic understanding is on my roadmap.

## Files

`evaluation/challenge-tuning.json`, `challenge-holdout.json` (+ `.sha256`), `challenge-fresh.json` (+ `.sha256`), `run-challenge.js`, and `results-*.json` for every round. Regression guard: `test/challenge-sets.test.js`.

---

## Rounds 5 to 7: raw pasted messages (v2.8.0, 24 November 2026)

My first sets mostly described a scam ("A caller says…"). Judges and real users will paste the message itself: an SMS, a WhatsApp text, an email line. So I wrote two more fresh rounds as raw messages, ran each once before changing anything for them, recorded the result, then fixed the gaps in general terms and retested everything. A tuning set of 35 raw messages came first and is not counted as first sight.

| Round | Set | First time seen | What it showed |
|---|---|---|---|
| 5 | Fresh round 2, 40 raw messages | 27 / 40 = 67.5%. Scams: 12 protected, 4 verify, **4 missed** of 20. Ordinary: **4 false alarms** of 12 | Pasted alerts and bills looked like requests; romance, advance-fee and task-job scams were under-recognised |
| 6 | Fresh round 3, 30 raw messages (written after round-5 fixes) | 21 / 30 = 70.0%. Scams: 9 protected, 4 verify, **2 missed** of 15. Ordinary: **2 false alarms** of 9 | Fake refund desks asking to install an app, onboarding-kit fees, service codes with "we will never ask" wording |
| 7 | Retest of all six sets, 191 messages | **191 / 191** | Every gap fixed with general rules (notices vs requests, service-delivered codes, more scam families, Arabic phrasing); 86/86 tests and 59/59 red-team attacks still pass |

### First time seen, all four unseen rounds together (124 messages)

- Scams: **59 of 65 warned** (90.8%), 47 fully protected, **6 missed**.
- Ordinary requests: **31 of 37 with no false alarm**, 6 false alarms.
- Overall: **96 / 124 = 77.4%** correct the first time.

The honest reading: the rules generalise well to scams written the way I write them, and less well to new phrasing. That is the job of the AI risk signal, which can only add caution, and of the blind test, where other people write the messages. Both results go into my submission as they come out.


## Round 8: official warnings (25 November 2026)

**Why:** to test Yumma against the scams UAE authorities are warning people about right now, not only against messages I imagined.

**Set:** `challenge-official-warnings.json`, locked by SHA-256 `d66600127915e62ed5d463a7eb56a669dd894d57f72352b0598cba15dcd5a877` before the first run. 20 scam messages in my own words, each matched to a 2025–2026 public warning (Ministry of Interior, Dubai Police, Dubai Electronic Security Centre, Ministry of Justice, MoHRE, UAE Cyber Security Council, and the GASA and Trend Micro State of Scams in the UAE 2025), three of them in Gulf Arabic, plus 5 ordinary control messages. Names, numbers and links are invented.

| Run | Scams warned | Paused | Verify only | Missed | False alarms |
|---|---|---|---|---|---|
| First sight (`results-official-warnings-first-sight.json`) | **20 / 20** | 18 | 2 | 0 | 1 of 5 |
| After general fixes (`results-official-warnings-after-fix.json`) | **20 / 20** | 20 | 0 | 0 | 0 of 5 |

**What first sight found, and the general fix for each:**
- *Gulf Arabic family emergency* ("phone broke, new number, transfer to this account, don't call now") was only "verify": the Arabic vocabulary for transfer-to-account, phone broke, don't call and urgent was missing, and Arabic-Indic digits were not read. Added that vocabulary and digit folding.
- *Advance payment to a stranger's personal account* (holiday chalet) was only "verify": a stranger pushing payment to "my personal account" now counts as a new payee under pressure.
- *Ordinary delivery notice* ("out for delivery, the courier will call") raised a false alarm: delivery-status notices that ask for nothing are now treated as routine notices.

**Cumulative first sight, five unseen rounds (149 messages):** 79 of 85 scams warned, 6 missed; 7 false alarms on 42 ordinary requests; 118 / 149 = 79.2% overall. All 216 messages across the seven sets pass after fixes, with no external action ever.
