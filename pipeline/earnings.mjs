#!/usr/bin/env node
/**
 * 国内の上場ヘルスケア企業の決算（決算短信・業績予想の修正）を TDnet から拾う。
 *
 *   node pipeline/earnings.mjs                       # 今日と昨日（JST）
 *   node pipeline/earnings.mjs 2026-10-20 2026-10-23 # 期間指定
 *
 * 対象企業は pipeline/healthcare-companies.json（証券コード・IR ページ）。一覧に無い会社は、
 * 社名にヘルスケアの語（製薬・メディカル など）があるものだけ拾う（ir_url は空。配信係が調べて足す）。
 * 出力: JSON の配列 [{ date, time, code, company, title, kind, pdf, ir_url, segment, market, priority, published }]
 *   priority: pipeline/earnings-watchlist.json の企業（月刊ヘルステックで取り上げる企業など）。上限に関係なく必ず配信する
 *   published: すでに data/articles.json に同じ PDF の記事があるか
 */
import { readFile } from 'node:fs/promises';

import { fetchText } from './lib/fetch-text.mjs';

const jst = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
const [fromArg, toArg] = process.argv.slice(2);
const to = toArg ?? fromArg ?? jst(new Date());
const from = fromArg ?? jst(new Date(Date.now() - 24 * 3600 * 1000));

const Kinds = [
  [/決算短信/, '決算短信'],
  [/業績予想.*修正|業績の修正|通期業績予想/, '業績予想の修正'],
  [/特別損失|減損/, '特別損失'],
];
const NameHint = /製薬|薬品|ファーマ|メディカル|メディカ|医療|バイオ|ヘルスケア|ライフサイエンス|調剤|薬局|ドラッグ|ホスピタル|ケア|クリニック|デンタル|ジェネリック|ワクチン|セラピュ/;

const root = new URL('../', import.meta.url);
const companies = await readFile(new URL('pipeline/healthcare-companies.json', root), 'utf8')
  .then((t) => JSON.parse(t).companies ?? [])
  .catch(() => []);
const byCode = new Map(companies.map((c) => [String(c.code).slice(0, 4), c]));
// 必ずカバーする企業（月刊ヘルステックに出てくる企業など）。社名の一部一致で判定（全角・半角は揃える）
const watch = await readFile(new URL('pipeline/earnings-watchlist.json', root), 'utf8')
  .then((t) => JSON.parse(t).companies ?? [])
  .catch(() => []);
const norm = (s) => s.normalize('NFKC').toLowerCase();
const watchNames = watch.flatMap((w) => [w.name, ...(w.alias ?? [])]).map(norm);
const watchCodes = new Set(watch.map((w) => w.code).filter(Boolean));
const isWatched = (company, code) => watchCodes.has(code) || watchNames.some((n) => norm(company).includes(n));
const watchSegment = (code) => watch.find((w) => w.code === code)?.segment ?? null;
const published = new Set(
  JSON.parse(await readFile(new URL('data/articles.json', root), 'utf8')).articles.flatMap((a) => [a.source_url, a.source_url_2].filter(Boolean)),
);

const out = [];
const Material = /説明資料|プレゼンテーション|補足資料|補足説明|ファクトブック|fact ?book|データ集|決算概要/i;
for (let d = from; d <= to; d = addDays(d, 1)) {
  const day = await tdnetDay(d);
  for (const item of day) {
    const kind = Kinds.find(([re]) => re.test(item.title))?.[1];
    if (!kind) continue;
    if (/訂正/.test(item.title) || Material.test(item.title)) continue;
    const c = byCode.get(item.code);
    const priority = isWatched(item.company, item.code);
    if (!c && !priority && !NameHint.test(item.company)) continue;
    out.push({
      date: d,
      ...item,
      kind,
      ir_url: c?.ir_news_url ?? c?.ir_url ?? null,
      segment: watchSegment(item.code) ?? c?.segment ?? null,
      market: c?.market ?? null,
      in_list: !!c,
      priority,
      // 同じ日に出た、同じ会社の決算説明資料・補足資料（TDnet の PDF）
      materials: day.filter((x) => x.code === item.code && x.pdf && Material.test(x.title)).map((x) => ({ title: x.title, pdf: x.pdf })),
      published: published.has(item.pdf),
    });
  }
}
// 必ずカバーする企業を先頭に
out.sort((a, b) => Number(b.priority) - Number(a.priority));
console.log(JSON.stringify(out, null, 2));
console.error(`${from}〜${to}: ヘルスケア企業の決算・業績修正 ${out.length}件（未配信 ${out.filter((x) => !x.published).length}件）`);

async function tdnetDay(date) {
  const ymd = date.replace(/-/g, '');
  const items = [];
  for (let page = 1; page <= 30; page++) {
    const url = `https://www.release.tdnet.info/inbs/I_list_${String(page).padStart(3, '0')}_${ymd}.html`;
    let html;
    try {
      html = await fetchText(url);
    } catch {
      break;
    }
    let found = 0;
    for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1]));
      if (cells.length < 6 || !/^\d{1,2}:\d{2}$/.test(cells[0])) continue;
      found++;
      const pdf = row.match(/href="([^"]+\.pdf)"/)?.[1];
      const [time, code, company, title, , exchange] = cells;
      items.push({ time, code: code.slice(0, 4), company, title, pdf: pdf ? new URL(pdf, url).href : null, exchange });
    }
    if (!found || !html.includes(`I_list_${String(page + 1).padStart(3, '0')}_${ymd}.html`)) break;
  }
  return items;
}

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function strip(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
