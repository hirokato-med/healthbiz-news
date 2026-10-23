#!/usr/bin/env bash
# 公開中の GitHub Pages（gh-pages ブランチ）に、記事ごとのリンク用カード（og/<id>.png）と記事ページ（article/<id>.html）を足して push する。
# 配信（data/articles.json の push）のあとに毎回実行する。アプリの画面（JS）は作り直さない。
#   bash scripts/update-og.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -d node_modules/playwright-core ] && [ -d node_modules/typescript ] || npm ci --ignore-scripts --no-audit --no-fund >/dev/null
WT="$(mktemp -d)/gh-pages"
git fetch -q origin +gh-pages:refs/remotes/origin/gh-pages
git worktree add -q -f --detach "$WT" origin/gh-pages
trap 'git worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
node pipeline/og-cards.mjs "$WT" data/articles.json
cd "$WT"
git add -A og article
if git diff --cached --quiet; then
  echo "og cards: no changes"
  exit 0
fi
git -c user.name="${GIT_AUTHOR_NAME:-healthbiz-news bot}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@anthropic.com}" commit -q -m "Web: 記事のリンク用カードを更新"
for i in 1 2 3 4; do
  git push -q origin HEAD:gh-pages && break
  sleep $((2 ** i))
  git fetch -q origin gh-pages && git rebase -q origin/gh-pages
done
echo "og cards: pushed"
