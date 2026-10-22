#!/usr/bin/env node
/**
 * 海外のヘルスケア・ヘルステックのニュース一覧を取る（RSS）。
 *
 *   node pipeline/overseas.mjs                      # 直近24時間
 *   node pipeline/overseas.mjs 2026-10-21T09:00:00Z # その時刻以降（前回配信の updated_at を渡す）
 *
 * 出力: JSON の配列 [{ feed, title, url, published_at, summary }]（新しい順）
 * 取得元: PR Newswire（ヘルスケア）、Fierce Healthcare、MedCity News、STAT News
 * STAT+ はログインが必要な記事なので、見出しだけで書かず一次情報（企業のリリース）を探すこと。
 */
import { fetchText } from './lib/fetch-text.mjs';

const Feeds = {
  prnewswire: 'https://www.prnewswire.com/rss/health-latest-news/health-latest-news-list.rss',
  fiercehealthcare: 'https://www.fiercehealthcare.com/rss/xml',
  medcitynews: 'https://medcitynews.com/feed/',
  statnews: 'https://www.statnews.com/feed/',
};

const sinceArg = process.argv[2];
const since = sinceArg ? new Date(sinceArg) : new Date(Date.now() - 24 * 3600 * 1000);
if (Number.isNaN(since.getTime())) {
  console.error('時刻は ISO 形式で指定してください: 2026-10-21T09:00:00Z');
  process.exit(1);
}

const out = [];
for (const [feed, url] of Object.entries(Feeds)) {
  let xml;
  try {
    xml = await fetchText(url);
  } catch (e) {
    console.error(`${feed}: 取得に失敗しました（${e.message.slice(0, 80)}）`);
    continue;
  }
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = clean(tag(item, 'title'));
    const link = clean(tag(item, 'link')) || item.match(/<link[^>]*href="([^"]+)"/)?.[1];
    const pub = tag(item, 'pubDate') ?? tag(item, 'dc:date');
    if (!title || !link || !pub) continue;
    const at = new Date(pub);
    if (Number.isNaN(at.getTime()) || at < since) continue;
    // 英語以外（ドイツ語・フランス語など）の配信は外す
    if (/[äöüßéèàçñ]/i.test(title)) continue;
    out.push({ feed, title, url: link, published_at: at.toISOString(), summary: clean(tag(item, 'description')).slice(0, 300) });
  }
}
out.sort((a, b) => b.published_at.localeCompare(a.published_at));
console.log(JSON.stringify(out, null, 2));
console.error(`${out.length}件（${since.toISOString()} 以降）`);

function tag(s, name) {
  const m = s.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
  return m ? m[1].trim() : null;
}
function clean(s) {
  return (s ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
