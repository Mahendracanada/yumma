# Blind test kit: messages written by other people

My own test sets are messages I wrote. A blind test answers the fair question a judge will ask: does Yumma work on messages written by people who have never seen its rules? I ask five colleagues to write 20 messages each. I run them through Yumma **once**, and I report exactly what comes out.

## What each contributor writes (about 15 minutes)

- **10 scam messages**: calls, texts, WhatsApp, emails or payment requests a scammer might send someone in the UAE. Any style, English or Arabic, as realistic and as tricky as they like.
- **5 ordinary messages**: genuine requests that mention money, codes or banks but are not scams, e.g. a family member's real request, a bill reminder, a code they asked for themselves.
- **5 grey-zone messages**: genuinely unclear, e.g. a supplier changing bank details, a friend asking for a loan.

Rules: invented names, numbers, links and account details only; nothing from a real person's messages. Don't look at Yumma's code, test sets or demo first.

## Collecting them

A Google Form or Microsoft Form with email collection off and four questions:

1. Your initials (optional)
2. Type of message: Scam / Ordinary / Unsure, could be either
3. Language: English / Arabic / Both
4. The message (long answer)

Export the responses as CSV. `evaluation/blind/blind-template.csv` shows the same columns if anyone prefers a spreadsheet.

## Running it

```bash
npm run blind -- responses.csv          # first sight: runs once and records the file's SHA-256 first
npm run blind -- responses.csv --ai     # the same, with the live AI risk signal (my key, my machine)
npm run blind -- responses.csv --retest # after any fixes: a separate, labelled retest
```

The runner refuses to run the same file twice as "first sight", so that result cannot be redone. Results go to `evaluation/blind/runs/`: a JSON record and a short report listing every message that was not fully correct.

## How I report it

The first-sight result goes into the summary report and the deck as it is, including misses. If I fix anything, the retest is reported separately and labelled as a retest.
