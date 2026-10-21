# Healthcare Business News

加藤浩晃のコメント付きヘルスケアビジネスニュースアプリ。
毎晩22時に、その日のプレスリリースから1〜5本を選び、コメントを添えて配信する。

```
[毎晩の配信（Claude の定期タスク）] ──push──▶ [data/articles.json] ──取得──▶ [アプリ (Expo)]
```

## 構成

| パス | 役割 |
|---|---|
| `src/app/(tabs)/index.tsx` | トップ画面。カラーチップでチャンネルを切り替え、横スワイプ対応 |
| `src/app/(tabs)/saved.tsx` | 保存した記事 |
| `src/app/article/[id].tsx` | 記事詳細。要約・コメント・会社情報・原文リンク・保存・共有 |
| `src/constants/channels.ts` | チャンネル定義（名前・色）。カテゴリを増やすのはここ |
| `src/lib/articles.ts` | 記事の取得。既定は GitHub 上の `data/articles.json` |
| `data/articles.json` | 配信済みの記事。配信パイプラインが毎晩追記する |
| `pipeline/NIGHTLY.md` | 毎晩の配信手順（Claude が読む） |
| `pipeline/COMMENT_STYLE.md` | 加藤コメントの文体ガイド |
| `pipeline/prtimes.mjs` | PR TIMES の検索結果からリリース一覧を取る |
| `pipeline/tdnet.mjs` | TDnet（適時開示）からヘルスケア関連の開示を取る |
| `pipeline/release.mjs` | リリースページから本文・日時・画像・会社概要を取る |
| `pipeline/publish.mjs` | 記事 JSON を `data/articles.json` にマージする |
| `DESIGN.md` | 画面デザインのルール |

## 開発

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_ARTICLES_URL=mock でサンプル記事が出る
npx expo start         # iPhone の Expo Go で QR コードを読む
```

## 記事の投稿（手動で行う場合）

```bash
node pipeline/publish.mjs articles.json   # 形は pipeline/example.json
git add data/articles.json && git commit -m "配信 2026-10-21: 3本" && git push
```

同じ `source_url` の記事は上書きされるので、二重配信にはならない。

## App Store への提出

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

Apple Developer Program（年額）と Expo アカウントが必要。Mac は不要。
