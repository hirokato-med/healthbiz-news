#!/usr/bin/env node
/**
 * 記事に画像（image_url）を後から付ける。画像の無い記事にロゴなどを入れるときに使う。
 *
 *   node pipeline/setimage.mjs <source_url または見出しの一部> <画像URL>
 */
import { readFile, writeFile } from 'node:fs/promises';

const [key, image] = process.argv.slice(2);
if (!key || !image) {
  console.error('usage: node pipeline/setimage.mjs <source_url または見出しの一部> <画像URL>');
  process.exit(1);
}
const target = new URL('../data/articles.json', import.meta.url);
const data = JSON.parse(await readFile(target, 'utf8'));
const hit = data.articles.find((a) => a.source_url === key) ?? data.articles.find((a) => a.title.includes(key));
if (!hit) {
  console.error(`見つかりません: ${key}`);
  process.exit(1);
}
hit.image_url = image;
data.updated_at = new Date().toISOString();
await writeFile(target, JSON.stringify(data, null, 2) + '\n');
console.log(`画像を付けました: ${hit.title}`);
