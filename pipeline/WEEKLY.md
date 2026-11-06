# 今週のまとめ（毎週土曜 7:00）

配信係が土曜の朝に読む手順書。文体は `COMMENT_STYLE.md`。アプリではトップの注目記事のすぐ下に2日間出て、開くと週報のページになる。

## 手順
1. `git pull origin main`
2. `node pipeline/weekly.mjs candidates > /tmp/candidates.json` で、前の土曜〜金曜に配信した記事の一覧を見る（id・分類・見出し・コメント付き）。
3. **押さえておきたい5本を選ぶ。** 新しい順でも本数順でもなく、「この1週間でヘルスケアビジネスの構造が動いた話」から。目安: 上場企業の M&A・事業売却、制度・規制の変更、薬事承認、大型の資金調達、大手の新規参入。分類が偏らないように（同じ分類は最大2本）。1本目は画像がある記事にする（一覧のサムネになる）。
4. 各記事に **一言コメント（1〜2文、60〜90字）** を書く。元のコメントの言い換えではなく、「その週の中でなぜ大事か」を一言で。
5. **見出し（headline）を20字前後で** 付ける。その週を一言で言い表す（例: 「電子カルテが「国の仕様」に乗った週」）。アプリでは「今週のまとめ｜<見出し>」になる。
6. **総括（note）を2〜3文（150〜250字）** で書く。その週に共通して見えた流れを1つ挙げ、具体的な社名を2つほど入れる。「今週は〜の週でした。」で始めてよい。
7. `pipeline/weekly-draft.json` に書く:
   ```json
   { "headline": "その週を一言で", "note": "総括", "items": [{ "article_id": "…", "comment": "一言" }] }
   ```
8. `node pipeline/weekly.mjs publish pipeline/weekly-draft.json` → `rm pipeline/weekly-draft.json`
9. `git add data/weekly.json && git commit -m "今週のまとめ YYYY-MM-DD" && git push origin main`
10. **TDnet のリンクを東証（JPX）の保存先に置き換える。** TDnet（release.tdnet.info）のPDFは約1か月で消えるので、毎週ここで置き換える。
    `node pipeline/fix-tdnet-links.mjs` → 置き換えがあれば `git add data/articles.json && git commit -m "TDnet リンクを JPX に置き換え YYYY-MM-DD" && git push origin main` → `bash scripts/update-og.sh`
    - 「JPX未掲載」は開示から数日以内のもの。次の土曜に自動で置き換わるので、そのままでよい。
    - 「証券コードが引けない」「TDnetもJPXも開けない」が出たら、会社のIRページにある同じ資料のURLに手で差し替える。
11. 報告: 号のタイトル、総括の全文、5本の見出しと一言コメント、TDnet リンクの置き換え件数（置き換えた／次回へ／手で直した）。

## 守ること
- 対象期間の記事だけ選ぶ（スクリプトが検証する）。
- 事実は各記事の本文・コメントにあることだけ。新しい数字を足さない。
