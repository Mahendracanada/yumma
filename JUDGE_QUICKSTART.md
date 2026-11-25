# Yumma: judge quick-start

**The judge link from the submission signs a judge in and opens a private copy of Salma, a synthetic user.** Salma has already saved a promise ("I will never share an OTP or transfer money under pressure") and a family question. Everything here is test data.

## What Yumma shows in about three minutes

1. **A relative on a new number.** In *Judge demonstration mode*, **Relative on a new number** → **Run selected scenario** → **Ask Yumma to assess**. Yumma pauses, recalls Salma's promise and asks the caller: *What did we call Grandma's old green car?* A wrong answer, such as `Bluebird`, gets "does not match: call back on a number you already know". The real answer is `Turtle`, and even a match approves nothing.
2. **Any scam a judge writes.** The *Incoming request* box takes any message, in English or Arabic, including disguised ones such as `0TP`, `O T P` or text with invisible characters. **Ask Yumma to assess** runs it.
3. **An ordinary question.** *What time does the bank open on Saturday?* gets a plain answer and no alarm.

## What each result contains

- **07 · Execution trace:** every step Yumma ran, with its timing: the AI signal (status and latency), the pattern match, the policy and the promise recall. **Download trace** saves the full JSON.
- **Decision record:** each decision goes into an append-only, hash-chained log that keeps a fingerprint of the message, not the message itself. **Verify record chain** recomputes every link.
- **Decision audit:** `authorizationGranted: false` and `externalActionTaken: false`, every time.

## Running it locally

```bash
git clone <repository link from the submission> && cd yumma
npm run verify && npm start      # Node.js 20+, no packages to install; http://127.0.0.1:4173
```
