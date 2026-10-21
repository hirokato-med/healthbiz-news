import { MockArticles } from './mock-articles';
import { supabase } from './supabase';
import type { Article } from './types';

/**
 * 記事の取得元。優先順:
 *   1. EXPO_PUBLIC_ARTICLES_URL — 記事 JSON の URL（GitHub 上の data/articles.json など）
 *   2. Supabase（EXPO_PUBLIC_SUPABASE_URL / ANON_KEY）
 *   3. どちらも無ければサンプル記事
 */
const articlesUrl = process.env.EXPO_PUBLIC_ARTICLES_URL;

type ArticleRow = Article & { status?: string };

/** 直近の配信を新しい順に取得する。 */
export async function fetchArticles(): Promise<Article[]> {
  if (articlesUrl) return fetchFromJson(articlesUrl);
  if (supabase) return fetchFromSupabase();
  return MockArticles;
}

async function fetchFromJson(url: string): Promise<Article[]> {
  // CDN キャッシュを避けるため分単位のクエリを付ける
  const bust = Math.floor(Date.now() / 60_000);
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${bust}`);
  if (!res.ok) throw new Error(`記事の取得に失敗しました (${res.status})`);
  const body = (await res.json()) as { articles?: ArticleRow[] } | ArticleRow[];
  const rows = Array.isArray(body) ? body : (body.articles ?? []);
  return rows
    .filter((a) => !a.status || a.status === 'published')
    .sort((a, b) => b.published_date.localeCompare(a.published_date));
}

async function fetchFromSupabase(): Promise<Article[]> {
  const { data, error } = await supabase!
    .from('articles')
    .select('id, published_date, category, title, source_name, source_url, summary, comment, image_url')
    .eq('status', 'published')
    .order('published_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) throw error;
  return (data ?? []) as Article[];
}

/** 今日の日付（JST）を YYYY-MM-DD で返す */
export function todayJST(): string {
  // sv-SE ロケールは ISO 形式 (YYYY-MM-DD) を返す
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

const Weekdays = ['日', '月', '火', '水', '木', '金', '土'];

/** "2026-10-21" → "10月21日（水）" */
export function formatDateLong(date: string): string {
  // 端末のタイムゾーンに左右されないよう、日付文字列をそのまま分解して曜日だけ UTC で求める
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日（${Weekdays[weekday]}）`;
}

/** "2026-10-21" → "10/21" */
export function formatDateShort(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 今日なら「今日」、昨日なら「昨日」、それ以外は "10/19" */
export function formatRelative(date: string): string {
  const today = todayJST();
  if (date === today) return '今日';
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  if (date === yesterday) return '昨日';
  return formatDateShort(date);
}
