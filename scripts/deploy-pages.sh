#!/usr/bin/env bash
# アプリの画面（Web 版）を作り直して GitHub Pages（gh-pages ブランチ）に出す。リンク用カードも作り直す。
# 画面のコードを変えたときだけ使う（毎回の配信は scripts/update-og.sh）。
#   bash scripts/deploy-pages.sh "コミットメッセージ"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
MSG="${1:-Web: 更新}"
OUT="$(mktemp -d)/web-dist"
bash scripts/build-web.sh "$OUT" >/dev/null
WT="$(mktemp -d)/gh-pages"
git fetch -q origin +gh-pages:refs/remotes/origin/gh-pages
git worktree add -q -f --detach "$WT" origin/gh-pages
trap 'git worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
# og/ は残し（描き直しを省くため）、それ以外を新しいビルドで置き換える
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git ! -name og -exec rm -rf {} +
cp -a "$OUT/." "$WT/"
node pipeline/og-cards.mjs "$WT" data/articles.json
cd "$WT"
git add -A
git commit -q -m "$MSG"
git push -q origin HEAD:gh-pages
echo "deployed: $(cat version.json)"
