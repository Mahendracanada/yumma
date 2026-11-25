# Yumma: judge quick-start

**The judge link from the submission signs a judge in and opens a private copy of Salma, a synthetic user.** Salma has already saved a promise ("I will never share an OTP or transfer money under pressure") and a family question. Everything here is test data.

## What Yumma shows in about three minutes

Turn the sound on: Yumma speaks, in a woman's voice from the browser. On a laptop, Salma's phone sits in the middle of the page and **Under the hood** sits beside it. On a phone, the app fills the screen and **Judges** at the top opens the same panel.

1. **A relative on a new number.** A few seconds after the link opens, a message arrives on Salma's phone: *"Hi Mum, it's me… new number… AED 4,000 today. Please don't call."* **Check with Yumma** brings her up as a hologram. She pauses Salma, says why, plays back Salma's promise (in Salma's own voice if one is recorded in the **Promise** tab) and asks the caller: *What did we call Grandma's old green car?* In the chat's **Family check**, a wrong answer such as `Bluebird` gets "does not match: call back on a number you already know". The real answer is `Turtle`, and even a match approves nothing.
2. **Any scam a judge writes.** **Under the hood → Send a test message to Salma's phone** takes any message, in English or Arabic, including disguised ones such as `0TP`, `O T P` or text with invisible characters. The six ready-made messages include an Arabic bank-code scam.
3. **An ordinary question.** Typed in the chat, *What time does the bank open on Saturday?* gets a plain answer and no alarm. Short follow-ups such as *Why is this risky?* explain the last decision.

## What each decision shows

- **What Yumma just did:** all 14 steps as they run, with timings: the AI signal (status and latency), the pattern match, the policy and the promise recall. **Download trace** saves the full JSON.
- **Decision record:** each decision goes into an append-only, hash-chained log that keeps a fingerprint of the message, not the message itself. **Verify record chain** recomputes every link.
- **Safety, every time:** authorisation granted: NO; external action taken: NONE; the AI can never lower a risk.

## Running it locally

```bash
git clone <repository link from the submission> && cd yumma
npm run verify && npm start      # Node.js 20+, no packages to install; http://127.0.0.1:4173
```
