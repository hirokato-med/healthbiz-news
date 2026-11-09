import type { Article } from '@/lib/types';

/**
 * 週末版（土日と月曜）。記事の少ない週末や月曜の朝に、古い日付の配信が先頭に出て
 * 「更新されていないサイト」に見えないよう、今週のまとめと先週の注目を先頭に出す（2026-11-09 加藤さん承認: 案A）。
 */
export type WeekendState = {
  /** 先頭の見出し（「月曜の朝に読む」「週末に読む」） */
  title: string;
  /** 次の配信（「今日 12時」など） */
  nextSlot: string;
  weekly: Article;
  /** 今週のまとめで選んだ記事の先頭 3 本 */
  picks: Article[];
  /** 先頭の枠の下に添える一言 */
  note: string;
  /**
   * 月曜でその日の配信がもう出ている（加藤さん指示: 月曜は一日中、トップの 2 つ目に「月曜の朝に読む」を置く）。
   * このときは帯をふだんどおりにし、枠はトップ記事のすぐ下に出す
   */
  afterDelivery: boolean;
};

/** 日付（YYYY-MM-DD）の曜日。0 = 日曜 */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 次の配信の時刻（12時・18時・22時、日本時間） */
export function nextSlotJST(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', hour: 'numeric', hourCycle: 'h23' }).format(now));
  if (h < 12) return '今日 12時';
  if (h < 18) return '今日 18時';
  if (h < 22) return '今日 22時';
  return '明日 12時';
}

/** 週末版にするか。する場合は先頭に出すものを返す（今週のまとめが無ければ週末版にしない） */
export function weekendStateOf(articles: Article[], today: string, now = new Date()): WeekendState | null {
  const dow = weekdayOf(today);
  const news = articles.filter((a) => (!a.kind || a.kind === 'news') && (a.category !== 'earnings' || a.featured));
  const latest = news.reduce<string | undefined>((m, a) => (!m || a.published_date > m ? a.published_date : m), undefined);
  // 日曜は終日。土曜と月曜は、その日の配信がまだ無い間だけ
  const delivered = latest === today;
  // 日曜は終日。土曜は、その日の配信がまだ無い間だけ。月曜は一日中（配信が出たあとはトップの 2 つ目）
  const weekend = dow === 0 || dow === 1 || (dow === 6 && !delivered);
  if (!weekend) return null;
  const afterDelivery = dow === 1 && delivered;
  const weekly = articles.filter((a) => a.kind === 'weekly').sort((a, b) => b.published_date.localeCompare(a.published_date))[0];
  if (!weekly) return null;
  const byId = new Map(articles.map((a) => [a.id, a]));
  const picks = (weekly.weekly?.items ?? []).map((i) => byId.get(i.article_id)).filter((a): a is Article => !!a).slice(0, 3);
  const nextSlot = nextSlotJST(now);
  return {
    title: dow === 1 ? '月曜の朝に読む' : '週末に読む',
    nextSlot,
    weekly,
    picks,
    note: afterDelivery
      ? '先週の振り返りです。今日の配信は上と下に続きます。'
      : dow === 1
        ? `今週の配信は${nextSlot}から。週末の配信は下に続きます。`
        : `次の配信は${nextSlot}。週末の配信は下に続きます。`,
    afterDelivery,
  };
}
