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
  kind?: 'news' | 'substack' | 'weekly';
  /** 今週のまとめ: 対象期間と、選んだ記事（id と一言コメント）。comment には加藤の総括が入る */
  weekly?: { range: string; total?: number | null; items: { article_id: string; comment: string }[] } | null;
  /** 海外記事: 原文（英語）からの一文引用と出典 */
  quote?: { text: string; source?: string | null; url?: string | null } | null;
  /** 配信した時刻（publish.mjs が付ける）。新着の判定に使う */
  created_at?: string;
};
