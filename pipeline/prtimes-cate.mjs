#!/usr/bin/env node
/**
 * PR TIMES の「ビジネスカテゴリ」一覧ページからリリースを取り出す。
 *
 * キーワード検索（prtimes.mjs）は検索語ごとに最新40件までしか返さず、見出しに検索語が無いリリース
 * （例: 「産業医がつくった健康管理クラウド」）を取りこぼす。カテゴリ一覧は投稿者が付けた分類なので、
 * 見出しの言葉に左右されずに拾える。両方を合わせて使う（2026-10-27、VITAL SYNC の取りこぼしを受けて追加）。
 *
 *   node pipeline/prtimes-cate.mjs                 # 既定の医療系カテゴリ（下の Categories）
 *   node pipeline/prtimes-cate.mjs 025/47 025/48   # カテゴリ指定（busi_cate_id/lv2）
 *   node pipeline/prtimes-cate.mjs --since 2026-10-26T03:00:00Z   # この時刻以降だけ
 *
 * 結果は JSON（配列）。prtimes.mjs と同じ形: { url, title, company, when, queries }
 * `when` は一覧の <time datetime> から取った ISO 形式（キーワード検索の「3時間前」より正確）。
 * 1ページ40件固定でページ送りが無いので、カテゴリあたり直近1〜4日分しか見えない。
 * 注意: カテゴリ一覧は更新が半日ほど遅れる（10/27 8:40 時点で最新が 10/26 19:01）。当日の新着はキーワード検索で、
 * 前日の取りこぼしはこのカテゴリ一覧で拾う、という使い分けにする。
 */
import { fetchText } from './lib/fetch-text.mjs';

const Categories = {
  '025/47': '医療・病院',
  '025/48': '医薬・製薬',
  '025/49': '福祉・介護・リハビリ',
  '014/46': 'ダイエット・健康食品・サプリメント',
};

const args = process.argv.slice(2);
let since = null;
const picked = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--since') since = new Date(args[++i]);
  else picked.push(args[i]);
}
const targets = picked.length ? picked : Object.keys(Categories);

const seen = new Map();
for (const key of targets) {
  const [busi, lv2] = key.split('/');
  const url = `https://prtimes.jp/main/html/searchbiscate/busi_cate_id/${busi}/lv2/${lv2}/`;
  let html;
  try {
    html = await fetchText(url);
  } catch (e) {
    console.error(`${key}: 取得に失敗しました (${e.message})`);
    continue;
  }
  const label = Categories[key] ?? html.match(/<title>([^<|｜]+)/)?.[1]?.replace(/のプレスリリース.*/, '').trim() ?? key;
  // 1件 = <article> ... </article>。中に記事リンク・<time datetime>・会社リンクがある
  for (const [, art] of html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)) {
    const href = art.match(/href="(?:https:\/\/prtimes\.jp)?(\/main\/html\/rd\/p\/\d+\.\d+\.html)"/)?.[1];
    if (!href) continue;
    const full = `https://prtimes.jp${href}`;
    const title = strip(art.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? art.match(/title="([^"]+)"/)?.[1] ?? '');
    const when = art.match(/<time[^>]*datetime="([^"]+)"/)?.[1] ?? '';
    const company = strip(art.match(/searchrlp\/company_id\/\d+"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '');
    if (since && when && new Date(when) < since) continue;
    const item = seen.get(full) ?? { url: full, title: '', company: '', when: '', queries: [] };
    if (title.length > item.title.length) item.title = title;
    item.when ||= when;
    item.company ||= company;
    if (!item.queries.includes(label)) item.queries.push(label);
    seen.set(full, item);
  }
}

const items = [...seen.values()].filter((x) => x.title).sort((a, b) => (a.when < b.when ? 1 : -1));
console.log(JSON.stringify(items, null, 2));
console.error(`${items.length}件（${targets.map((k) => Categories[k] ?? k).join('・')}${since ? `、${since.toISOString()} 以降` : ''}）`);

function strip(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
