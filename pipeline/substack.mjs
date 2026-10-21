#!/usr/bin/env node
/**
 * 加藤浩晃の Substack（https://hiroakikato.substack.com/）の RSS を読み、
 * アプリ用の data/substack.json に書く。配信の各回で実行する。
 *
 *   node pipeline/substack.mjs
 */
import { writeFile } from 'node:fs/promises';
import { fetchText } from './lib/fetch-text.mjs';

const FeedUrl = 'https://hiroakikato.substack.com/feed';
const xml = await fetchText(FeedUrl);

const posts = [];
for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
  const title = tag(item, 'title');
  const url = tag(item, 'link');
  const pub = tag(item, 'pubDate');
  if (!title || !url || !pub) continue;
  const description = tag(item, 'description');
  const content = tag(item, 'content:encoded');
  const image = item.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ?? content?.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;
  posts.push({
    id: `substack:${tag(item, 'guid') ?? url}`,
    title: cleanTitle(title),
    url,
    // 公開日（JST）
    published_date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(pub)),
    excerpt: excerpt(description || content || ''),
    image_url: image ? unescapeHtml(image) : null,
  });
}

await writeFile(new URL('../data/substack.json', import.meta.url), JSON.stringify({ updated_at: new Date().toISOString(), posts }, null, 2) + '\n');
console.log(`${posts.length}件を data/substack.json に書きました`);

function tag(s, name) {
  const m = s.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
  return m ? m[1].trim() : null;
}

/** 「10月21日（水）：」のような日付の前置きはアプリ側で日付を出すので外す */
function cleanTitle(t) {
  return unescapeHtml(t).replace(/^\d{1,2}月\d{1,2}日（[月火水木金土日]）[：:]\s*/, '');
}

/** 本文の冒頭。あいさつ文を外して 300 字まで */
function excerpt(htmlText) {
  let t = unescapeHtml(unescapeHtml(htmlText).replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, ''));
  t = t.replace(/おはようございます[！!]?\s*加藤浩晃です[。.]?\s*/g, '').replace(/\n\s*\n+/g, '\n').trim();
  return t.length > 300 ? t.slice(0, 300).trimEnd() + '…' : t;
}

function unescapeHtml(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
