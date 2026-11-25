#!/bin/bash
# Yumma: live AI test on my own Mac. My API key stays in this window and is never saved to disk.
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null || { echo "Node.js 20+ is needed: https://nodejs.org"; read -r -p "Press Enter to close."; exit 1; }
echo "Yumma live AI test"
echo "1. All 191 challenge messages with the AI risk signal on"
echo "2. Every message the rules got wrong the first time, sent to the AI alone (why Yumma needs AI)"
echo "3. The 10-scenario benchmark with AI latency"
echo
read -r -s -p "Paste your Anthropic API key (starts sk-ant-) and press Enter: " YUMMA_KEY; echo
[ -z "$YUMMA_KEY" ] && { echo "No key entered. Nothing was run."; read -r -p "Press Enter to close."; exit 1; }
export ANTHROPIC_API_KEY="$YUMMA_KEY"; unset YUMMA_KEY
node evaluation/run-challenge.js --ai --label ai-run --json evaluation/results-ai-run.json | grep -E "^==|^Scams|^AI:"
echo; node evaluation/run-ai-gap.js | tail -n 1
echo; node evaluation/run-benchmark.js --ai | tail -n 14
unset ANTHROPIC_API_KEY
echo
echo "Done. Please send these three files to Claude:"
echo "  evaluation/results-ai-run.json   evaluation/results-ai-gap.json   evaluation/benchmark-results.json"
open evaluation 2>/dev/null
read -r -p "Press Enter to close."
