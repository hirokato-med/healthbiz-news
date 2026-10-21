#!/usr/bin/env node
/**
 * トップ記事（アプリの一番大きな枠）を差し替える。直近2日の記事のうち、指定した1本だけを featured にする。
 *
 *   node pipeline/feature.mjs <source_url または見出しの一部>
 */
import { readFile, writeFile } from 'node:fs/promises';

const key = process.argv[2];
if (!key) {
  console.error('usage: node pipeline/feature.mjs <source_url または見出しの一部>');
  process.exit(1);
}
const target = new URL('../data/articles.json', import.meta.url);
const data = JSON.parse(await readFile(target, 'utf8'));
const hit = data.articles.find((a) => a.source_url === key) ?? data.articles.find((a) => a.title.includes(key));
if (!hit) {
  console.error(`見つかりません: ${key}`);
  process.exit(1);
}
const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);
for (const a of data.articles) {
  if (a === hit) a.featured = true;
  else if (a.featured && a.published_date >= cutoff) a.featured = false;
}
data.updated_at = new Date().toISOString();
await writeFile(target, JSON.stringify(data, null, 2) + '\n');
console.log(`トップ記事: ${hit.title}`);
