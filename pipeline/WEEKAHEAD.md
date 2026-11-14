# 来週の注目（毎週日曜 7:00）

配信係が日曜の朝に読む手順書。文体は `COMMENT_STYLE.md`。アプリでは日曜・月曜の「週末版」で今週のまとめの下に出て、開くと予定の一覧のページになる。見本: `pipeline/samples/weekahead-sample.json`（2026-11-09 加藤さん承認の形）。

**2026-11-15 の回は何もしない**（初回の11/15号は加藤さんの確認を受けて、11/14 に公開済み）。前日に用意して日曜の号として出すときは `--date YYYY-MM-DD` を付ける。

## 手順
1. `git pull origin main`
2. 対象は **次の月曜〜日曜**。次の3つを、**公式の発表だけ**から集める（まとめサイト・ブログ・ニュースの記事は使わない）。日付はそのページで必ず確かめる。確かめられないものは載せない。
   - **決算発表**: 上場ヘルスケア企業の決算発表の予定日。優先は `pipeline/earnings-watchlist.json` → `pipeline/healthcare-companies.json`。出典は各社の IR カレンダーか、JPX の決算発表予定日（https://www.jpx.co.jp/listing/event-schedules/financial-announcement/index.html の一覧ファイル）。目安は最大8社。決算シーズン以外は0〜3社でよい。
   - **政策・審議会**: 中医協（総会・薬価専門部会・費用対効果評価専門部会など）、社会保障審議会の部会、薬事審議会、その他ヘルスケアの政府の会議。厚生労働省の「審議会・研究会等の開催予定」などで、議題が出ていれば一言で。
   - **学会・イベント**: 国内の主な医療・ヘルスケア・医療機器・デジタルヘルスの学会、展示会、ピッチイベント。海外は特に大きいもの（RSNA、MEDICA、HLTH、JPモルガン ヘルスケアカンファレンスなど）だけ。日付は主催者の公式ページで。
3. 各予定に `note`（事実だけの一言、40字以内。推測は書かない）と公式の `url` を付ける。会期が複数日にわたる学会・展示会は `date` を初日にし、`note` に会期を書く。
4. **見出し（headline）を20〜25字で**付ける。来週の流れを一言で（例: 「中間決算が出そろい、病院向けの展示会HOSPEXへ」）。アプリでは「来週の注目｜<見出し>」になる。
5. **加藤浩晃のひとこと（note）を3〜4文（150〜220字）**で書く。来週いちばん注目する予定を1つ挙げ、なぜ見るのかを書く。
6. `pipeline/weekahead-draft.json` に書く（形は見本の issues[0] の headline / note / sections）。
7. `node pipeline/weekahead.mjs publish pipeline/weekahead-draft.json` → `rm pipeline/weekahead-draft.json`（対象の週の外の日付や url の無い予定はスクリプトが止める）
8. `git add data/weekahead.json && git commit -m "来週の注目 YYYY-MM-DD" && git push origin main`
9. 報告: 号のタイトル、ひとことの全文、区分ごとの予定（日付・名前・出典 URL）、確かめられず載せなかったもの。

## 守ること
- 日付・会期・議題は公式の発表にあるものだけ。見つからない区分は空でよい（その区分は出ない）。
- 予定が全体で2件未満なら、無理に出さず push しない（報告だけ）。
