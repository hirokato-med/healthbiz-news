#!/usr/bin/env node
/**
 * 今週のまとめ（毎週土曜 7:00 配信）。
 *
 *   node pipeline/weekly.mjs candidates [YYYY-MM-DD]   # その土曜（既定は今日 JST）の対象期間の記事を一覧で出す
 *   node pipeline/weekly.mjs publish pipeline/weekly-draft.json   # 検証して data/weekly.json に追加
 *   node pipeline/weekly.mjs publish <draft.json> --sample        # 見本として今日の日付で出す（本番の号が出るときに自動で消える）
 *
 * 対象期間: 前の土曜〜金曜の7日間（土曜 10/24 の号なら 10/17〜10/23）。
 * 下書きの形: { "note": "総括（2〜3文）", "items": [{ "article_id": "...", "comment": "一言（1〜2文）" }, ...5本] }
 */
import { readFile, writeFile } from 'node:fs/promises';

const [cmd, arg, flag] = process.argv.slice(2);
const sample = flag === '--sample';
const root = new URL('../', import.meta.url);
const articlesFile = new URL('data/articles.json', root);
const weeklyFile = new URL('data/weekly.json', root);

const todayJST = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const md = (date) => {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
};

/** その日を含む週の土曜（号の配信日）と対象期間 */
function period(issueDate) {
  const [y, m, d] = issueDate.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const saturday = addDays(issueDate, (6 - dow + 7) % 7);
  return { saturday, from: addDays(saturday, -7), to: addDays(saturday, -1) };
}

const { articles } = JSON.parse(await readFile(articlesFile, 'utf8'));

if (cmd === 'candidates') {
  const p = period(arg ?? todayJST());
  const list = articles.filter((a) => a.published_date >= p.from && a.published_date <= p.to);
  console.log(JSON.stringify({ issue_date: p.saturday, from: p.from, to: p.to, total: list.length, articles: list.map((a) => ({
    id: a.id,
    date: a.published_date,
    category: a.category,
    featured: !!a.featured,
    has_image: !!a.image_url,
    title: a.title,
    source: a.source_name,
    comment: a.comment,
  })) }, null, 2));
} else if (cmd === 'publish') {
  if (!arg) throw new Error('usage: node pipeline/weekly.mjs publish <draft.json>');
  const draft = JSON.parse(await readFile(arg, 'utf8'));
  const p = period(draft.issue_date ?? todayJST());
  const inRange = new Map(articles.filter((a) => a.published_date >= p.from && a.published_date <= p.to).map((a) => [a.id, a]));
  if (!draft.note || draft.note.length < 40) throw new Error('note（総括）を2〜3文で書いてください');
  if (!Array.isArray(draft.items) || draft.items.length < 3 || draft.items.length > 5) throw new Error('items は3〜5本にしてください');
  for (const [i, it] of draft.items.entries()) {
    if (!inRange.has(it.article_id)) throw new Error(`items[${i}]: ${it.article_id} は対象期間（${p.from}〜${p.to}）の記事ではありません`);
    if (!it.comment) throw new Error(`items[${i}]: comment が空です`);
  }
  const first = inRange.get(draft.items[0].article_id);
  const issue = {
    id: sample ? 'weekly-sample' : `weekly-${p.saturday}`,
    published_date: sample ? todayJST() : p.saturday,
    title: `${sample ? '【見本】' : ''}今週のヘルスケアビジネス ${md(p.from)}–${md(p.to)}`,
    range: `${md(p.from)}–${md(p.to)}`,
    total: inRange.size,
    note: draft.note,
    // 一覧のサムネは1本目の画像（無ければ画像のある最初の記事）
    image_url: first.image_url ?? draft.items.map((it) => inRange.get(it.article_id).image_url).find(Boolean) ?? null,
    items: draft.items.map((it) => ({ article_id: it.article_id, comment: it.comment })),
    created_at: new Date().toISOString(),
  };
  const current = JSON.parse(await readFile(weeklyFile, 'utf8').catch(() => '{"issues":[]}'));
  // 本番の号を出すときは見本を消す
  const issues = [issue, ...current.issues.filter((w) => w.id !== issue.id && (sample || w.id !== 'weekly-sample'))].sort((a, b) => b.published_date.localeCompare(a.published_date));
  await writeFile(weeklyFile, JSON.stringify({ updated_at: issue.created_at, issues }, null, 2) + '\n');
  console.log(`data/weekly.json に「${issue.title}」（${issue.items.length}本）を書きました`);
} else {
  console.error('usage: node pipeline/weekly.mjs candidates [YYYY-MM-DD] | publish <draft.json>');
  process.exit(1);
}
