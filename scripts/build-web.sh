#!/usr/bin/env bash
# Web 版（GitHub Pages 用）をビルドする。出力先は第1引数（既定: web-dist）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="${1:-web-dist}"
# 利用状況の計測（Google アナリティクス）の測定 ID。空にすると計測しない
export EXPO_PUBLIC_GA_ID="${EXPO_PUBLIC_GA_ID-G-PYC7DZRBKW}"
# ビルドごとの版。アプリはこれと公開中の version.json を比べて、違えば読み込み直す（src/lib/auto-update.ts）
export EXPO_PUBLIC_BUILD_ID="${EXPO_PUBLIC_BUILD_ID:-$(date -u +%Y%m%d%H%M%S)}"
CI=1 npx expo export --platform web --output-dir "$OUT"
cd "$OUT"
echo "{\"build\":\"$EXPO_PUBLIC_BUILD_ID\"}" > version.json
# Jekyll に _expo フォルダを無視させない
touch .nojekyll
# どの URL でも index.html を返せるように（記事ページの直接アクセス・再読み込み用）
cp index.html 404.html
# iPhone の「ホーム画面に追加」で全画面アプリとして動くようにする
cp "$ROOT/assets/images/icon.png" apple-touch-icon.png
# ホーム画面に追加したときの「アプリの範囲」（scope）。これが無いと iPhone が記事のページをアプリの外とみなし、
# 上下に「完了」などのブラウザの枠を出すことがある
python3 - <<'PY'
import json
from PIL import Image
Image.open("apple-touch-icon.png").convert("RGB").resize((512, 512)).save("icon-512.png")
Image.open("apple-touch-icon.png").convert("RGB").resize((192, 192)).save("icon-192.png")
json.dump({
    "name": "Healthcare Business News",
    "short_name": "HB News",
    "start_url": "/healthbiz-news/",
    "scope": "/healthbiz-news/",
    "id": "/healthbiz-news/",
    "display": "standalone",
    "background_color": "#FFFFFF",
    "theme_color": "#1E4FD8",
    "lang": "ja",
    "icons": [
        {"src": "/healthbiz-news/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "/healthbiz-news/icon-512.png", "sizes": "512x512", "type": "image/png"},
    ],
}, open("manifest.json", "w"), ensure_ascii=False)
PY
for f in *.html */*.html; do
  [ -f "$f" ] || continue
  sed -i 's#<meta name="viewport" content="[^"]*"#<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"#' "$f"
  sed -i 's#</head>#<link rel="manifest" href="/healthbiz-news/manifest.json"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="HB News"><link rel="apple-touch-icon" href="/healthbiz-news/apple-touch-icon.png"><meta name="theme-color" content="\#1E4FD8"></head>#' "$f"
  # iOS 26 以降のホーム画面アプリでは、画面の上端に「スクロール端のぼかし」がかかり、題字や分野タブの文字が滲む。
  # 上端に固定・全幅・不透明で高さ 10px を超える要素があると WebKit はこのぼかしを省くので、ステータスバーの高さぶんの帯を置く
  # （背景と同じ色なので見た目は変わらない。ホーム画面アプリのときだけ）
  grep -q 'hb-topband' "$f" || sed -i 's#</head>#<style>.hb-topband{display:none}@media (display-mode: standalone){.hb-topband{display:block;position:fixed;top:0;left:0;right:0;height:max(12px,env(safe-area-inset-top));background:\#FFFFFF;z-index:2147483647;pointer-events:none}}@media (display-mode: standalone) and (prefers-color-scheme: dark){.hb-topband{background:\#111214}}</style></head>#; s#</body>#<div class="hb-topband" aria-hidden="true"></div></body>#' "$f"
done
# 利用状況の計測（Google アナリティクス）。測定 ID があるときだけ全ページに読み込む
if [ -n "${EXPO_PUBLIC_GA_ID:-}" ]; then
  GA_ID="$EXPO_PUBLIC_GA_ID" python3 - <<'PY'
import glob, os
ga = os.environ["GA_ID"]
snippet = ('<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>'
           '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;'
           "gtag('js',new Date());gtag('config','%s',{send_page_view:false,anonymize_ip:true});</script>") % (ga, ga)
for f in glob.glob('*.html') + glob.glob('*/*.html'):
    h = open(f, encoding='utf-8').read()
    if 'googletagmanager' in h: continue
    open(f, 'w', encoding='utf-8').write(h.replace('</head>', snippet + '</head>', 1))
print('GA snippet injected:', ga)
PY
fi
echo "built: $OUT"
