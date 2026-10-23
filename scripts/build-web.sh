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
# SNS でリンクを共有したときのカード（X / Facebook / LINE など）
cp "$ROOT/assets/images/og-image.png" og-image.png
OG='<meta property="og:type" content="website"><meta property="og:site_name" content="Healthcare Business News"><meta property="og:title" content="Healthcare Business News｜加藤浩晃のヘルスケアビジネスニュース"><meta property="og:description" content="医師・加藤浩晃のコメント付きで、医療機器・創薬・医療DX・政策・決算のニュースを毎日配信。"><meta property="og:image" content="https://hirokato-med.github.io/healthbiz-news/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="description" content="医師・加藤浩晃のコメント付きで、医療機器・創薬・医療DX・政策・決算のニュースを毎日配信。">'
for f in *.html */*.html; do
  [ -f "$f" ] || continue
  sed -i 's#<meta name="viewport" content="[^"]*"#<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"#' "$f"
  grep -q 'og:title' "$f" || sed -i "s#</head>#${OG}</head>#" "$f"
  sed -i 's#</head>#<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="HB News"><link rel="apple-touch-icon" href="/healthbiz-news/apple-touch-icon.png"><meta name="theme-color" content="\#1E4FD8"></head>#' "$f"
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
