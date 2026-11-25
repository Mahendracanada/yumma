#!/bin/bash
# Yumma v2.8 — one-click championship demo (Mac). Synthetic data only.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
echo "=============================================="
echo " YUMMA — CHAMPIONSHIP DEMO LAUNCHER (v2.8)"
echo "=============================================="
if ! command -v node >/dev/null 2>&1; then echo "Install Node.js 20 or later, then run this again."; read -r -p "Press Return to close..."; exit 1; fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then echo "Node.js 20 or later is required. Detected: $(node --version)"; read -r -p "Press Return to close..."; exit 1; fi
echo "STEP 1/3 — Running full verification..."
npm run verify
echo "STEP 2/3 — Starting the local synthetic demo..."
LOG_FILE="${TMPDIR:-/tmp}/yumma-championship-demo.log"
npm start >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT INT TERM
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:4173/api/health >/dev/null 2>&1 && break; sleep 1; done
echo "STEP 3/3 — Preparing Salma's synthetic promise and family question (with consent)..."
node <<'NODE'
(async () => {
  const base = 'http://127.0.0.1:4173', profile = 'salma-demo';
  const purpose = 'Synthetic championship demonstration only';
  const post = (u, b) => fetch(base + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const commitment = 'I will never share an OTP or transfer money under pressure.';
  const contracts = await (await fetch(`${base}/api/calm-contract/${profile}`)).json();
  if (!(contracts.contracts || []).some(c => c.commitment === commitment)) {
    const r = await post(`/api/calm-contract/${profile}`, { contract: { commitment, triggers: ['otp', 'transfer', 'pressure', 'send money', 'aed'], selfAttestedCalm: true }, consent: { granted: true, purpose } });
    if (!r.ok) throw new Error((await r.json()).error);
  }
  const question = 'What did we call Grandma’s old green car?';
  const fq = await (await fetch(`${base}/api/family-check/${profile}`)).json();
  if (!(fq.questions || []).some(q => q.question === question)) {
    const r = await post(`/api/family-check/${profile}`, { question: { question, answer: 'Turtle' }, consent: { granted: true, purpose } });
    if (!r.ok) throw new Error((await r.json()).error);
  }
  console.log('Ready: promise saved; family question saved (demo answer: Turtle).');
})().catch(e => { console.error(e.message); process.exit(1); });
NODE
echo "Yumma is ready at http://127.0.0.1:4173 — record your promise in the browser before filming."
open "http://127.0.0.1:4173"
wait "$SERVER_PID"
