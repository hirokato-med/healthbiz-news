#!/usr/bin/env node
/**
 * PR TIMES のキーワード検索結果からリリース一覧を取り出す。
 *
 *   node pipeline/prtimes.mjs 医療 ヘルスケア
 *
 * 結果は JSON（配列）。各要素: { url, title, company, when, queries }
 * `when` は一覧に出ている表記そのまま（「3時間前」のような相対表記のことがある）。
 * 正確な日時は release.mjs で記事ページから取る。
 */
import { fetchText } from './lib/fetch-text.mjs';

const words = process.argv.slice(2);
if (!words.length) {
  console.error('usage: node pipeline/prtimes.mjs <検索語> [<検索語>...]');
  process.exit(2);
}

const seen = new Map();
for (const word of words) {
  const url = `https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=${encodeURIComponent(word)}`;
  let html;
  try {
    html = await fetchText(url);
  } catch (e) {
    console.error(`${word}: 取得に失敗しました (${e.message})`);
    continue;
  }

  // 記事リンク /main/html/rd/p/000000123.000045678.html を含む a 要素を拾う
  for (const m of html.matchAll(/<a[^>]+href="(?:https:\/\/prtimes\.jp)?(\/main\/html\/rd\/p\/\d+\.\d+\.html)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = `https://prtimes.jp${m[1]}`;
    // タイトルの末尾に「3分前」のような時刻が混ざるので切り離す
    const raw = strip(m[2]);
    const timeTail = raw.match(/\s*(\d+(?:分|時間|日)前|\d{4}年\d{1,2}月\d{1,2}日[^\s]*)$/);
    const title = timeTail ? raw.slice(0, timeTail.index).trim() : raw;
    const item = seen.get(href) ?? { url: href, title: '', company: '', when: '', queries: [] };
    // 同じ記事へのリンクが画像とタイトルで2つあるので、長いほうをタイトルにする
    if (title.length > item.title.length) item.title = title;
    if (timeTail) item.when = timeTail[1];
    if (!item.queries.includes(word)) item.queries.push(word);
    // 直後 800 文字の範囲から会社名と日時らしきものを拾う（レイアウト依存なので取れないこともある）
    const tail = html.slice(m.index + m[0].length, m.index + m[0].length + 800);
    item.company ||= strip(tail.match(/<a[^>]+href="\/main\/html\/searchrlp\/company_id\/\d+"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? '');
    item.when ||= strip(
      tail.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] ??
        tail.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] ??
        tail.match(/(\d+(?:分|時間|日)前|\d{4}年\d{1,2}月\d{1,2}日[^<]*)/)?.[1] ??
        '',
    );
    seen.set(href, item);
  }
}

const items = [...seen.values()].filter((x) => x.title);
console.log(JSON.stringify(items, null, 2));
console.error(`${items.length}件`);

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
