#!/usr/bin/env node
/**
 * ページの og:image（SNS 共有用の画像）の URL を取り出す。
 *
 *   node pipeline/ogimage.mjs https://prtimes.jp/main/html/rd/p/000000001.000012345.html
 *
 * 見つかれば URL を1行出力、見つからなければ何も出力せず終了コード 1。
 */
import { fetchText } from './lib/fetch-text.mjs';

const [url] = process.argv.slice(2);
if (!url) {
  console.error('usage: node pipeline/ogimage.mjs <url>');
  process.exit(2);
}

let html;
try {
  html = (await fetchText(url)).slice(0, 300_000);
} catch (e) {
  console.error(`取得に失敗しました: ${e.message}`);
  process.exit(1);
}

// <meta property="og:image" content="..."> / <meta content="..." property="og:image"> の両方に対応
const tag = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i)?.[0];
const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
if (!content) process.exit(1);

console.log(new URL(unescapeHtml(content), url).href);

function unescapeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
