#!/usr/bin/env node
/**
 * 今月の注目決算まとめ（毎月1日 7:00 配信。前の月に決算を発表した企業を領域ごとに表にする）。
 *
 *   node pipeline/monthly-earnings.mjs candidates [YYYY-MM]          # その月（既定は先月）の決算記事を領域ごとに出す
 *   node pipeline/monthly-earnings.mjs publish <draft.json> [--sample]
 *
 * 下書きの形:
 *   { "month": "2026-11", "headline": "その月を一言で", "note": "総括（2〜3文）",
 *     "highlights": ["<article_id>", ...],           // 注目企業（★が付く。3〜5社）
 *     "notes": { "<article_id>": "一言（40字前後）" }, // 表の一言。無ければ記事のポイント1つ目
 *     "items": [ ... ] }                              // 記事が無い企業を手で足すとき（形は data/monthly-earnings.json の items）
 * 決算記事（category: earnings）は自動で全部表に入る。
 */
import { readFile, writeFile } from 'node:fs/promises';

const [cmd, arg, flag] = process.argv.slice(2);
const sample = flag === '--sample';
const root = new URL('../', import.meta.url);
const file = new URL('data/monthly-earnings.json', root);
const Order = ['製薬・OTC', 'バイオ・創薬', '医療機器', '診断・検査', '医療DX', '調剤・ドラッグストア', '医薬品卸', '医療・介護サービス', 'フィットネス・ウェルネス', 'その他'];

const todayJST = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const lastMonth = () => {
  const [y, m] = todayJST().split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
const label = (ym) => `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`;

const { articles } = JSON.parse(await readFile(new URL('data/articles.json', root), 'utf8'));
const inMonth = (ym) => articles.filter((a) => a.category === 'earnings' && a.published_date.startsWith(ym) && a.earnings);

function itemOf(a, notes, highlights) {
  const row = (re) => a.earnings.rows.find((r) => re.test(r.label));
  const rev = row(/売上/) ?? a.earnings.rows[0];
  const prof = row(/コア営業利益/) ?? row(/営業利益/) ?? row(/税引前|経常/) ?? a.earnings.rows[1];
  return {
    company: a.source_name,
    period: a.earnings.period,
    revenue: rev?.value ?? '—',
    revenue_change: rev?.change ?? null,
    profit: prof?.value ?? '—',
    profit_change: prof?.change ?? null,
    profit_label: prof && !/^営業利益$/.test(prof.label) ? prof.label : null,
    note: notes?.[a.id] ?? a.summary?.[0] ?? '',
    highlight: highlights?.includes(a.id) ?? false,
    article_id: a.id,
    ir_url: a.ir_url ?? null,
    segment: a.earnings.segment ?? 'その他',
  };
}

function group(items) {
  const by = new Map();
  for (const it of items) {
    const seg = it.segment ?? 'その他';
    if (!by.has(seg)) by.set(seg, []);
    const { segment, ...rest } = it;
    by.get(seg).push(rest);
  }
  return [...by.entries()]
    .sort((a, b) => (Order.indexOf(a[0]) + 99 * (Order.indexOf(a[0]) < 0)) - (Order.indexOf(b[0]) + 99 * (Order.indexOf(b[0]) < 0)))
    .map(([name, items]) => ({ name, items: items.sort((x, y) => Number(!!y.highlight) - Number(!!x.highlight)) }));
}

if (cmd === 'candidates') {
  const ym = arg ?? lastMonth();
  const list = inMonth(ym).map((a) => itemOf(a, null, null));
  console.log(JSON.stringify({ month: ym, total: list.length, segments: group(list) }, null, 2));
} else if (cmd === 'publish') {
  if (!arg) throw new Error('usage: node pipeline/monthly-earnings.mjs publish <draft.json> [--sample]');
  const d = JSON.parse(await readFile(arg, 'utf8'));
  const ym = d.month ?? lastMonth();
  if (!d.note || d.note.length < 40) throw new Error('note（総括）を2〜3文で書いてください');
  const items = [...inMonth(ym).map((a) => itemOf(a, d.notes, d.highlights)), ...(d.items ?? [])];
  if (!items.length) throw new Error(`${label(ym)}の決算記事がありません`);
  const segments = group(items);
  const issue = {
    id: sample ? 'monthly-sample' : `monthly-${ym}`,
    published_date: todayJST(),
    title: `${sample ? '【見本】' : ''}今月の注目決算｜${d.headline ?? label(ym)}`,
    month: label(ym),
    note: d.note,
    image_url: d.image_url ?? null,
    segments,
    created_at: new Date().toISOString(),
  };
  const current = JSON.parse(await readFile(file, 'utf8').catch(() => '{"issues":[]}'));
  const issues = [issue, ...current.issues.filter((w) => w.id !== issue.id && (sample || w.id !== 'monthly-sample'))].sort((a, b) =>
    b.published_date.localeCompare(a.published_date),
  );
  await writeFile(file, JSON.stringify({ updated_at: issue.created_at, issues }, null, 2) + '\n');
  console.log(`data/monthly-earnings.json に「${issue.title}」（${items.length}社・${segments.length}領域）を書きました`);
} else {
  console.error('usage: node pipeline/monthly-earnings.mjs candidates [YYYY-MM] | publish <draft.json> [--sample]');
  process.exit(1);
}
