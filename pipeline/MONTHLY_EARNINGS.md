# 今月の注目決算まとめ（毎月1日 7:00）

配信係が毎月1日の朝に読む手順書。月刊ヘルステック（有村琢磨・加藤浩晃）の「その月の決算発表企業一覧」と同じ形で、前の月に決算を発表したヘルスケア関連の上場企業を領域ごとの表にする。

## 手順
1. `git pull origin main`
2. `node pipeline/monthly-earnings.mjs candidates > /tmp/monthly.json`（先月の決算記事が領域ごとに出る）
3. **注目企業を3〜5社選ぶ**（`highlights`）。基準: 業績修正・過去最高・大幅な減益・M&A や MBO など、その月に事業の構造が動いた会社。`pipeline/earnings-watchlist.json` の企業を優先。
4. 各社の **一言（40字前後）** を `notes` に書く（月刊ヘルステックの「備考」欄の書き方: 「○○が牽引し過去最高」「○○の減少で減収減益」）。書かなければ記事のポイント1つ目が入る。
5. **見出し（headline）を20字前後で**（例: 「製薬は過去最高、病院向けは苦戦」）。**総括（note）を2〜3文**。領域ごとの傾向を1つずつ、社名を入れて。
6. `pipeline/monthly-draft.json` に書いて `node pipeline/monthly-earnings.mjs publish pipeline/monthly-draft.json` → 下書きを削除。
7. `git add data/monthly-earnings.json && git commit -m "今月の注目決算 YYYY-MM" && git push origin main`
8. 報告: 見出し、総括、領域ごとの社数、注目企業と一言。

## 守ること
- 数字は決算記事（決算短信）の数字だけ。新しい数字を足さない。
- 記事にしていない会社を足すときは `items` に、決算短信を読んで同じ形で書く。
- 領域: 製薬・OTC / バイオ・創薬 / 医療機器 / 診断・検査 / 医療DX / 調剤・ドラッグストア / 医薬品卸 / 医療・介護サービス / フィットネス・ウェルネス / その他。
