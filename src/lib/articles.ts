import { MockArticles } from './mock-articles';
import { supabase } from './supabase';
import type { Article } from './types';

/** 本番の記事データ。配信パイプラインが毎晩ここに push する */
const DefaultArticlesUrl = 'https://raw.githubusercontent.com/hirokato-med/healthbiz-news/main/data/articles.json';
/** 今月の注目決算まとめ（pipeline/monthly-earnings.mjs が書く） */
const DefaultMonthlyUrl = 'https://raw.githubusercontent.com/hirokato-med/healthbiz-news/main/data/monthly-earnings.json';
/** 今週のまとめ（pipeline/weekly.mjs が書く） */
const DefaultWeeklyUrl = 'https://raw.githubusercontent.com/hirokato-med/healthbiz-news/main/data/weekly.json';
/** Substack の投稿（pipeline/substack.mjs が書く） */
const DefaultSubstackUrl = 'https://raw.githubusercontent.com/hirokato-med/healthbiz-news/main/data/substack.json';

/**
 * 記事の取得元。EXPO_PUBLIC_ARTICLES_URL で切り替える:
 *   未設定      → 本番の JSON（DefaultArticlesUrl）
 *   "mock"      → サンプル記事（画面を作るとき用）
 *   "supabase"  → Supabase（EXPO_PUBLIC_SUPABASE_URL / ANON_KEY が必要）
 *   それ以外の URL → その JSON
 */
const articlesUrl = process.env.EXPO_PUBLIC_ARTICLES_URL ?? DefaultArticlesUrl;

type ArticleRow = Article & { status?: string };

/** 直近の配信を新しい順に取得する。 */
export async function fetchArticles(): Promise<Article[]> {
  if (articlesUrl === 'mock') return MockArticles;
  if (articlesUrl === 'supabase') {
    if (!supabase) throw new Error('Supabase の設定がありません');
    return fetchFromSupabase();
  }
  return fetchFromJson(articlesUrl);
}

type SubstackPost = { id: string; title: string; url: string; published_date: string; excerpt: string; image_url?: string | null };

/** Substack の投稿を記事と同じ形にして返す。取れなくても配信記事の表示は止めない。 */
export async function fetchSubstack(): Promise<Article[]> {
  if (articlesUrl === 'mock') return [];
  try {
    const url = articlesUrl.includes('/data/articles.json') ? articlesUrl.replace('/data/articles.json', '/data/substack.json') : DefaultSubstackUrl;
    const bust = Math.floor(Date.now() / 60_000);
    const res = await fetch(`${url}?t=${bust}`);
    if (!res.ok) return [];
    const body = (await res.json()) as { posts?: SubstackPost[] };
    return (body.posts ?? []).map((p) => ({
      id: p.id,
      kind: 'substack' as const,
      published_date: p.published_date,
      category: 'substack' as const,
      title: p.title,
      source_name: '加藤浩晃のメルマガ',
      source_url: p.url,
      summary: [],
      comment: p.excerpt,
      image_url: p.image_url ?? null,
    }));
  } catch {
    return [];
  }
}

type WeeklyIssue = {
  id: string;
  published_date: string;
  title: string;
  range: string;
  total?: number | null;
  note: string;
  image_url?: string | null;
  items: { article_id: string; comment: string }[];
};

/** 今週のまとめを記事と同じ形にして返す。取れなくても配信記事の表示は止めない。 */
export async function fetchWeekly(): Promise<Article[]> {
  if (articlesUrl === 'mock') return [];
  try {
    const url = articlesUrl.includes('/data/articles.json') ? articlesUrl.replace('/data/articles.json', '/data/weekly.json') : DefaultWeeklyUrl;
    const bust = Math.floor(Date.now() / 60_000);
    const res = await fetch(`${url}?t=${bust}`);
    if (!res.ok) return [];
    const body = (await res.json()) as { issues?: WeeklyIssue[] };
    return (body.issues ?? []).map((w) => ({
      id: w.id,
      kind: 'weekly' as const,
      published_date: w.published_date,
      category: 'weekly' as const,
      title: w.title,
      source_name: '加藤浩晃',
      source_url: `https://hirokato-med.github.io/healthbiz-news/article/${w.id}`,
      summary: [],
      comment: w.note,
      image_url: w.image_url ?? null,
      weekly: { range: w.range, total: w.total ?? null, items: w.items },
    }));
  } catch {
    return [];
  }
}

type MonthlyIssue = {
  id: string;
  published_date: string;
  title: string;
  month: string;
  note: string;
  image_url?: string | null;
  segments: NonNullable<Article['monthly']>['segments'];
};

/** 今月の注目決算まとめを記事と同じ形にして返す。取れなくても配信記事の表示は止めない。 */
export async function fetchMonthly(): Promise<Article[]> {
  if (articlesUrl === 'mock') return [];
  try {
    const url = articlesUrl.includes('/data/articles.json') ? articlesUrl.replace('/data/articles.json', '/data/monthly-earnings.json') : DefaultMonthlyUrl;
    const bust = Math.floor(Date.now() / 60_000);
    const res = await fetch(`${url}?t=${bust}`);
    if (!res.ok) return [];
    const body = (await res.json()) as { issues?: MonthlyIssue[] };
    return (body.issues ?? []).map((m) => ({
      id: m.id,
      kind: 'monthly' as const,
      published_date: m.published_date,
      category: 'earnings' as const,
      title: m.title,
      source_name: '加藤浩晃',
      source_url: `https://hirokato-med.github.io/healthbiz-news/article/${m.id}`,
      summary: [],
      comment: m.note,
      image_url: m.image_url ?? null,
      monthly: { month: m.month, segments: m.segments },
    }));
  } catch {
    return [];
  }
}

/** まとめ記事（今週のまとめ・今月の注目決算）か */
export function isDigest(a: Article): boolean {
  return a.kind === 'weekly' || a.kind === 'monthly';
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
