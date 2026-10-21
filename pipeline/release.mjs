#!/usr/bin/env node
/**
 * プレスリリースのページから、記事を書くのに必要なものを JSON で取り出す。
 *
 *   node pipeline/release.mjs https://prtimes.jp/main/html/rd/p/000000001.000012345.html
 *
 * 返すもの: { url, title, published_at, company, image_url, text, company_overview }
 *   - published_at: meta の article:published_time などから（取れなければ null）
 *   - image_url: og:image
 *   - text: 本文のテキスト（タグを除いたもの、先頭 8,000 字）
 *   - company_overview: 「会社概要」以降のテキスト（PR TIMES の場合）
 */
import { fetchText } from './lib/fetch-text.mjs';

const [url] = process.argv.slice(2);
if (!url) {
  console.error('usage: node pipeline/release.mjs <url>');
  process.exit(2);
}

let html;
try {
  html = await fetchText(url);
} catch (e) {
  console.error(`取得に失敗しました: ${e.message}`);
  process.exit(1);
}

const meta = (name) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'))?.[1] ??
  null;

const title = meta('og:title') ?? strip(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
const published_at =
  meta('article:published_time') ??
  html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ??
  html.match(/(\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}時\d{1,2}分)/)?.[1] ??
  null;
const company =
  meta('article:author') ??
  (strip(html.match(/<a[^>]+href="\/main\/html\/searchrlp\/company_id\/\d+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '') || null);
const image_url = meta('og:image') ? new URL(unescapeHtml(meta('og:image')), url).href : null;

// 本文: script/style/nav を落としてからテキスト化
const body = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, ' ');
const text = strip(body);
const idx = text.indexOf('会社概要');
const company_overview = idx >= 0 ? text.slice(idx, idx + 1500) : null;

console.log(
  JSON.stringify({ url, title, published_at, company, image_url, text: text.slice(0, 8000), company_overview }, null, 2),
);

function strip(s) {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function unescapeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
