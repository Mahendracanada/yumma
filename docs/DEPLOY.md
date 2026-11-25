# Publishing Yumma: GitHub repo and hosted judge link

These are my steps. They take about 20 minutes and need a GitHub account, a Render account and my Anthropic API key.

**The quick way:** double-click `PUBLISH_AND_DEPLOY.command`. It creates the public `yumma` repository with the GitHub CLI and opens Render's one-click deploy for it. Steps 1 and 3 below are what it does.

## 1. Put the code on GitHub (public)

1. On github.com, create a new **public** repository named `yumma`, with no README (this folder already has one).
2. In Terminal, inside this folder:

```bash
git init -b main
git add .
git commit -m "Yumma v2.8.0: pre-commitment AI agent for the Create AI Agents Championship"
git remote add origin https://github.com/<my-username>/yumma.git
git push -u origin main
```

`.gitignore` keeps runtime data, logs and any `.env` file out of the repository.

## 2. Cap the AI spend

In the Anthropic Console, set a monthly spend limit (for example USD 20) on the key I'll use for the judge link. Yumma also stops calling the AI after 2,000 checks a day (`YUMMA_AI_DAILY_CAP`) and carries on with its rules.

## 3. Deploy the judge link on Render

1. render.com → **New → Blueprint** → connect GitHub → choose the `yumma` repository. Render reads `render.yaml`.
2. It asks for two values:
   - `JUDGE_ACCESS_CODE`: 16 or more letters and digits that I make up, for example `YummaJudges2027Dubai`.
   - `ANTHROPIC_API_KEY`: my key.
3. Click **Apply**. The first deploy takes 2 to 3 minutes. The service is on the Starter plan (about USD 7 a month), so it never sleeps.

## 4. Build and test the judge link

The link judges click is:

```
https://<service-name>.onrender.com/?access=<my JUDGE_ACCESS_CODE>
```

I test it in a private browser window. It opens straight into Yumma with the gold "Judge link" banner. In Render → Logs, each assessment prints a `[yumma-trace]` line with the steps and timings, and the message is masked.

## 5. Put the link in the submission

The link goes in the submission form and in the summary report. I don't post it publicly. If it ever leaks, I change `JUDGE_ACCESS_CODE` in Render; the old link and every session made with it stop working.
