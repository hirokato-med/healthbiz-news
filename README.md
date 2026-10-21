# Healthcare Business News

加藤浩晃のコメント付きヘルスケアビジネスニュースアプリ。
毎晩22時に1〜4本のプレスリリースを要約し、コメントを添えて配信する。

```
[22時の配信パイプライン] ──投稿──▶ [Supabase articles] ──取得──▶ [このアプリ (Expo)]
```

## 構成

| パス | 役割 |
|---|---|
| `src/app/index.tsx` | トップ画面。チャンネル（カラータブ）を横スワイプで切り替え |
| `src/app/article/[id].tsx` | 記事詳細。要約・コメント・原文リンク・保存・共有 |
| `src/constants/channels.ts` | チャンネル定義（名前・色）。カテゴリを増やすのはここ |
| `src/lib/articles.ts` | 記事の取得。Supabase 未設定時は `mock-articles.ts` を表示 |
| `src/lib/store.tsx` | 記事と「保存済み」の状態管理 |
| `supabase/schema.sql` | DB スキーマ（Supabase の SQL Editor で実行） |
| `pipeline/publish.mjs` | 記事 JSON を Supabase に投稿するスクリプト |

## セットアップ

```bash
npm install
cp .env.example .env   # Supabase のキーを入れる（無くてもサンプル記事で動く）
npx expo start         # iPhone の Expo Go アプリで QR コードを読む
```

## Supabase

1. https://supabase.com で無料プロジェクトを作る（リージョンは Tokyo）
2. SQL Editor で `supabase/schema.sql` を実行
3. Project Settings > API の URL と `anon` key を `.env` の `EXPO_PUBLIC_*` に入れる
4. `service_role` key は配信パイプライン側だけに置く（アプリには入れない）

## 記事の投稿

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node pipeline/publish.mjs articles.json
```

`articles.json` の形は `pipeline/example.json` を参照。
同じ `source_url` の記事は上書きされるので、二重配信にはならない。

## App Store への提出

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

Apple Developer Program（年 $99）のアカウントが必要。Mac は不要。
