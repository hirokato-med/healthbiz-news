#!/usr/bin/env node
/**
 * 加藤浩晃のメルマガ（Substack: https://hiroakikato.substack.com/）の投稿を全件読み、
 * アプリ用の data/substack.json に書く。配信の各回で実行する。
 *
 *   node pipeline/substack.mjs            # 全件（アーカイブ API をページ送り）
 *   node pipeline/substack.mjs --recent   # 直近の RSS 20件だけで既存の JSON を更新（速い）
 *
 * RSS は最新20件しか返さないので、全件はアーカイブ API（/api/v1/archive）で取る。
 * 本文の冒頭（excerpt）は各投稿の API（/api/v1/posts/<slug>）の body_html から作る。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fetchText } from './lib/fetch-text.mjs';

const Site = 'https://hiroakikato.substack.com';
const OutFile = new URL('../data/substack.json', import.meta.url);
const recentOnly = process.argv.includes('--recent');

const posts = recentOnly ? await fromRss() : await fromArchive();

await writeFile(OutFile, JSON.stringify({ updated_at: new Date().toISOString(), posts }, null, 2) + '\n');
console.log(`${posts.length}件を data/substack.json に書きました（最古 ${posts.at(-1)?.published_date ?? '-'}）`);

/** アーカイブ API を offset でページ送りして全件。各投稿の本文は投稿 API から取る */
async function fromArchive() {
  const seen = new Map();
  for (let offset = 0; ; ) {
    const page = JSON.parse(await fetchText(`${Site}/api/v1/archive?sort=new&search=&offset=${offset}&limit=50`));
    if (!Array.isArray(page) || page.length === 0) break;
    for (const p of page) if (p?.id && p.canonical_url && p.title !== 'Coming soon') seen.set(p.id, p);
    offset += page.length; // 返る件数が limit より少ないことがあるので、実際に返った数だけ進める
  }
  const list = [...seen.values()].sort((a, b) => new Date(b.post_date) - new Date(a.post_date));

  // 本文は 4 並列で取る（取れなければ一覧の truncated_body_text で代用）
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < list.length) {
        const i = next++;
        const p = list[i];
        let body = '';
        try {
          const full = JSON.parse(await fetchText(`${Site}/api/v1/posts/${encodeURIComponent(p.slug)}`));
          body = full.body_html || '';
        } catch {
          body = '';
        }
        out[i] = toPost({
          guid: p.canonical_url,
          title: p.title,
          url: p.canonical_url,
          pub: p.post_date,
          html: body || p.truncated_body_text || p.description || '',
          image: p.cover_image || body.match(/<img[^>]+src="([^"]+)"/)?.[1] || null,
          paidOnly: p.audience === 'only_paid',
        });
      }
    }),
  );
  return out;
}

/** RSS（最新20件）で既存の JSON を更新する。古い投稿はそのまま残す */
async function fromRss() {
  let existing = [];
  try {
    existing = JSON.parse(await readFile(OutFile, 'utf8')).posts ?? [];
  } catch {
    existing = [];
  }
  const xml = await fetchText(`${Site}/feed`);
  const fresh = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = tag(item, 'title');
    const url = tag(item, 'link');
    const pub = tag(item, 'pubDate');
    if (!title || !url || !pub) continue;
    const description = tag(item, 'description');
    const content = tag(item, 'content:encoded');
    const image = item.match(/<enclosure[^>]+url="([^"]+)"/)?.[1] ?? content?.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;
    fresh.push(toPost({ guid: tag(item, 'guid') ?? url, title, url, pub, html: content || description || '', image }));
  }
  const byUrl = new Map(existing.map((p) => [p.url, p]));
  for (const p of fresh) byUrl.set(p.url, p);
  return [...byUrl.values()].sort((a, b) => (a.published_date < b.published_date ? 1 : a.published_date > b.published_date ? -1 : 0));
}

function toPost({ guid, title, url, pub, html, image, paidOnly = false }) {
  const text = excerpt(html);
  return {
    id: `substack:${guid}`,
    title: cleanTitle(title),
    url,
    // 公開日（JST）
    published_date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(pub)),
    // 有料限定の投稿は API が本文を返さないので、その旨だけ出す
    excerpt: text || (paidOnly ? '有料購読者向けの記事です。全文はメルマガで読めます。' : ''),
    image_url: image ? unescapeHtml(image) : null,
  };
}

function tag(s, name) {
  const m = s.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
  return m ? m[1].trim() : null;
}

/** 「10月21日（水）：」のような日付の前置きはアプリ側で日付を出すので外す */
function cleanTitle(t) {
  return unescapeHtml(t)
    .replace(/^(?:\d{4}年)?\d{1,2}月\d{1,2}日\s*[（(][月火水木金土日](?:・祝)?[）)]\s*(?:[＃#]\d+)?\s*[：:]\s*/, '')
    .trim();
}

/** 本文の冒頭。あいさつ・号数の罫線・購読のお願いを外して 300 字まで */
function excerpt(htmlText) {
  let t = unescapeHtml(unescapeHtml(htmlText).replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n').replace(/<[^>]+>/g, ''));
  t = t
    .replace(/おはようございます[！!]?\s*加藤浩晃です[。.]?/g, '')
    .replace(/加藤浩晃のヘルスケアイノベーション通信\s*をお読みいただきありがとうございます[！!]?\s*新しいポストを受け取って[^\n]*?購読してください[。.]?/g, '')
    .replace(/This is 加藤浩晃のヘルスケアイノベーション通信\.?\s*Subscribe now/g, '')
    .replace(/[━─]{5,}/g, '')
    .replace(/加藤浩晃のヘルスケアイノベーション通信\s*vol\.?\s*\d+[^\n]*/g, '')
    .replace(/加藤浩晃のヘルスケアイノベーション通信\s*は読者の支援[^\n]*/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
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
