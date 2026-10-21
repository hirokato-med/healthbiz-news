import type { Category } from '@/constants/channels';

/** 取り上げた会社の情報（未上場で知名度が高くない会社にだけ付く） */
export type Company = {
  name: string;
  /** 設立年月、所在地、資本金、上場/未上場、事業内容など。1段落 */
  profile: string;
  url?: string | null;
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
};
