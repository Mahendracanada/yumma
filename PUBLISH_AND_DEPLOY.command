#!/bin/bash
# Yumma: publish this folder to a public GitHub repository, then open Render's one-click deploy.
cd "$(dirname "$0")" || exit 1
echo "Yumma: publish to GitHub and deploy the judge link"
if ! command -v gh >/dev/null; then
  if command -v brew >/dev/null; then echo "Installing GitHub CLI..."; brew install gh || exit 1
  else echo "Please install the GitHub CLI from https://cli.github.com, then run me again."; read -r -p "Press Enter to close."; exit 1; fi
fi
gh auth status >/dev/null 2>&1 || gh auth login --web --git-protocol https || exit 1
GH_USER=$(gh api user --jq .login)
NAME=$(gh api user --jq '.name // .login')
[ -d .git ] || git init -q -b main
git add .
git -c user.name="$NAME" -c user.email="${GH_USER}@users.noreply.github.com" commit -q -m "Yumma v2.8.0: pre-commitment AI agent for the Create AI Agents Championship" || echo "(nothing new to commit)"
if gh repo view "$GH_USER/yumma" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$GH_USER/yumma.git"
  git push -u origin main
else
  gh repo create yumma --public --source=. --remote=origin --push --description "Yumma: a pre-commitment AI agent that protects a family the way a mother does"
fi
REPO="https://github.com/$GH_USER/yumma"
echo; echo "Repository: $REPO"
echo "Opening Render. Sign in, then enter two values:"
echo "  JUDGE_ACCESS_CODE  16+ letters and digits that you choose, e.g. YummaJudges2027Dubai"
echo "  ANTHROPIC_API_KEY  your key (set a monthly spend limit in the Anthropic Console first)"
echo "Then click Apply. Your judge link will be: https://<service-name>.onrender.com/?access=<your code>"
open "https://render.com/deploy?repo=$REPO"
read -r -p "Press Enter to close."
