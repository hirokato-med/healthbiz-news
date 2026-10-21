import type { Category } from '@/constants/channels';

/** Supabase の articles テーブル1行と同じ形 */
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
  /** 要約。箇条書き1項目ずつ */
  summary: string[];
  /** 加藤浩晃のコメント */
  comment: string;
  image_url?: string | null;
};
