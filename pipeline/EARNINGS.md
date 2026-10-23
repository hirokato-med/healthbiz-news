# 決算の回（平日 16:05 開始）

配信係が平日の16時台に読む手順書。上場企業の決算短信・業績予想の修正は15:00〜15:30ごろに TDnet に集中して出るので、その日のうちに **1社1本ずつ** 記事にする。
書き方の細部（タイトル・数字の表・IR 資料・コメントの長さ）は `pipeline/NIGHTLY.md` の「国内の上場ヘルスケア企業の決算も見る」と `pipeline/example-earnings.json` に従う。文体は `COMMENT_STYLE.md`。

## 手順
1. `git pull origin main`
2. `node pipeline/earnings.mjs <今日> <今日> > /tmp/earnings.json`（前日分の取りこぼしがあれば前日から）
3. `published: false` の **すべて** を対象にする。**1社1本**（同じ会社が決算短信と業績修正を同時に出したら1本にまとめる）。この回には本数の上限はない。
   - 多い日は `priority: true`（`pipeline/earnings-watchlist.json` の企業）→ プライム → スタンダード → グロースの順に書き、17:20 までに終わらない分は17時台の通常の回（18時配信）に回す。
4. 各社: 決算短信 PDF の1ページ目のサマリーから数字を写す → `materials`（決算説明資料など）と IR ページを `ir_docs` / `ir_url` に → ポイント3つ → コメント（60〜120字、数字の意味を1つ）→ ロゴ画像。
5. 5社書くごとに `node pipeline/publish.mjs pipeline/today.json` → `git add data/ && git commit -m "決算 YYYY-MM-DD: N社" && git push origin main`（書いた分から順に出す）。
6. 報告: 配信した会社ごとにタイトル・決算の表・コメント全文。回しきれなかった会社があれば社名。

## 守ること
- 数字は決算短信からだけ。読めない・表が崩れているときは推測せず、その会社は次の回に回して報告する。
- ニュースの記事（PR TIMES など）はこの回では扱わない（通常の回で扱う）。
