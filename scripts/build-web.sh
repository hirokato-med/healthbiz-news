#!/usr/bin/env bash
# Web 版（GitHub Pages 用）をビルドする。出力先は第1引数（既定: web-dist）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="${1:-web-dist}"
CI=1 npx expo export --platform web --output-dir "$OUT"
cd "$OUT"
# Jekyll に _expo フォルダを無視させない
touch .nojekyll
# どの URL でも index.html を返せるように（記事ページの直接アクセス・再読み込み用）
cp index.html 404.html
# iPhone の「ホーム画面に追加」で全画面アプリとして動くようにする
cp "$ROOT/assets/images/icon.png" apple-touch-icon.png
for f in *.html */*.html; do
  [ -f "$f" ] || continue
  sed -i 's#<meta name="viewport" content="[^"]*"#<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"#' "$f"
  sed -i 's#</head>#<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="HB News"><link rel="apple-touch-icon" href="/healthbiz-news/apple-touch-icon.png"><meta name="theme-color" content="\#1B3A6B"></head>#' "$f"
done
echo "built: $OUT"
