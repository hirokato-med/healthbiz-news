import type { Category } from '@/constants/channels';

/** 取り上げた会社の情報（未上場で知名度が高くない会社にだけ付く） */
export type Company = {
  name: string;
  /** 設立年月、所在地、資本金、上場/未上場、事業内容など。1段落 */
  profile: string;
  url?: string | null;
  /** 上場市場（「東証プライム」など）。未上場なら無し */
  listed?: string | null;
  /** 上場企業の直近の業績（「2026年3月期 売上647億円、営業利益…」）。1〜2文 */
  financials?: string | null;
  /** 代表者。経歴は前職・創業の経緯を1〜3文 */
  ceo?: { name: string; bio: string } | null;
};

/** data/articles.json の1件と同じ形 */
export type Article = {
  id: string;
  /** 配信日 YYYY-MM-DD（JST） */
  published_date: string;
  category: Category;
  title: string;
  /** 発信元（企業名・省庁名など） */
  source_name: string;
  /** プレスリリース原文の URL */
  source_url: string;
  /** 関連するもう一方の原文（両社がリリースを出している案件など） */
  source_url_2?: string | null;
  /** 要約。箇条書き1項目ずつ */
  summary: string[];
  /** 加藤浩晃のコメント */
  comment: string;
  image_url?: string | null;
  company?: Company | null;
  /** 直近24時間でいちばん大事な記事（トップで大きく出す）。常に1本だけ。無ければ直近の配信の先頭 */
  featured?: boolean | null;
  /** news: 配信記事（既定）/ substack: Substack の投稿（comment に冒頭、summary は空） */
  kind?: 'news' | 'substack' | 'weekly' | 'monthly';
  /** 今週のまとめ: 対象期間と、選んだ記事（id と一言コメント）。comment には加藤の総括が入る */
  weekly?: { range: string; total?: number | null; items: { article_id: string; comment: string }[] } | null;
  /** 海外記事: 原文（英語）からの一文引用と出典 */
  quote?: { text: string; source?: string | null; url?: string | null } | null;
  /** 今月の注目決算まとめ: 対象月と、領域ごとの決算の表。comment には加藤の総括が入る */
  monthly?: {
    month: string;
    segments: {
      name: string;
      items: {
        company: string;
        period: string;
        revenue: string;
        revenue_change?: string | null;
        profit: string;
        profit_change?: string | null;
        /** 営業利益以外を載せるとき（IFRS の税引前利益など）の名前 */
        profit_label?: string | null;
        note: string;
        /** 注目企業（太字・オレンジの印） */
        highlight?: boolean;
        article_id?: string | null;
        ir_url?: string | null;
      }[];
    }[];
  } | null;
  /** 上場企業の IR ページ（決算・適時開示の一覧）。決算記事では必ず付く */
  ir_url?: string | null;
  /** 決算記事: 関連する IR 資料（決算説明資料・補足資料・有価証券報告書／半期報告書など）。上から順に出す */
  ir_docs?: { label: string; url: string }[] | null;
  /** 決算記事: 対象期間と主要な数字（前年同期比つき）、通期予想 */
  earnings?: {
    /** 「2027年3月期 第2四半期（中間期）」など */
    period: string;
    /** 決算短信 / 業績予想の修正 など */
    kind?: string | null;
    /** value = 今回、prev = 比べた相手（前年同期・前回予想など）、change = 増減率 */
    rows: { label: string; value: string; prev?: string | null; change?: string | null }[];
    /** 列の見出し。省略時は 今期 / 前年同期 / 前年同期比 */
    columns?: { value?: string; prev?: string; change?: string } | null;
    /** 何と比べた数字かの説明（「前年同期＝2025年3〜8月」など） */
    compare_note?: string | null;
    /** 業績の推移（直近の通期実績と今期予想）。bar は売上高を億円単位の数値で */
    history?: {
      columns: string[];
      rows: { period: string; values: string[]; bar?: number | null; note?: string | null; forecast?: boolean }[];
      note?: string | null;
    } | null;
    /** 領域（月刊ヘルステックの分け方: 製薬・OTC / 医療機器 / 医療DX / 調剤・ドラッグストア など） */
    segment?: string | null;
    /** 通期予想（据え置き・上方修正など）を1文で */
    forecast?: string | null;
  } | null;
  /** 同じ配信日の中での並び順（加藤さんが指定したときだけ。小さいほど上。publish.mjs の並べ替えで使う） */
  order?: number;
  /** 配信した時刻（publish.mjs が付ける）。新着の判定に使う */
  created_at?: string;
};
