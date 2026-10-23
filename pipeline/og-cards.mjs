#!/usr/bin/env node
/**
 * 記事ごとのリンク用カード（og:image）と、それを指す記事ページを作る。
 * X・Facebook・LINE に記事のリンクを貼ると、その記事の見出しとコメントが入ったカードが出るようになる。
 *
 *   node pipeline/og-cards.mjs <公開サイトのフォルダ> [data/articles.json]
 *     → <フォルダ>/og/<id>.png と <フォルダ>/article/<id>.html を書く（GitHub Pages では /article/<id> で開く）
 *   node pipeline/og-cards.mjs --sample <出力.png> [記事の見出しの一部]
 *     → 見本を 1 枚だけ描く
 *
 * カードの絵は src/lib/share-card-draw.ts の drawLinkCard（アプリの共有カードと同じ描き方）を Chromium の canvas で描く。
 * 記事ページの HTML はサイトの 404.html（どの URL でもアプリが開くようにしているもの）に og タグを足したもの。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import ts from 'typescript';

const Root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SiteUrl = 'https://hirokato-med.github.io/healthbiz-news';
const Channels = {
  device: ['医療機器', '#2BA8E0'], wearable: ['ウェアラブル', '#22B573'], longevity: ['ロンジェビティ', '#D4357A'], drug: ['製薬・創薬', '#8E44D6'],
  digital: ['デジタルヘルス', '#F28C28'], dx: ['医療DX', '#C8373E'], service: ['ヘルスケアサービス', '#17A2A2'], policy: ['政策・規制', '#5B6B8A'],
  earnings: ['決算', '#2E7D4F'], global: ['海外', '#0E6E8C'], substack: ['メルマガ', '#B8860B'], weekly: ['今週のまとめ', '#1E4FD8'],
};

const args = process.argv.slice(2);
const sample = args[0] === '--sample';
const site = sample ? null : args[0];
const dataPath = sample ? join(Root, 'data/articles.json') : (args[1] ?? join(Root, 'data/articles.json'));
if (!sample && !site) {
  console.error('usage: node pipeline/og-cards.mjs <site-dir> [articles.json] | --sample <out.png> [title]');
  process.exit(1);
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
let articles = (Array.isArray(raw) ? raw : raw.articles).filter((a) => a.id && a.status !== 'draft');
if (sample) articles = [articles.find((a) => !args[2] || a.title.includes(args[2])) ?? articles[0]];

const drawJs = ts.transpileModule(readFileSync(join(Root, 'src/lib/share-card-draw.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 },
}).outputText;
const avatar = `data:image/png;base64,${readFileSync(join(Root, 'assets/images/kato-avatar.png')).toString('base64')}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(`<!doctype html><meta charset="utf-8"><body><script type="module">
${drawJs}
const img = new Image(); img.src = ${JSON.stringify(avatar)}; await img.decode();
window.render = (input) => {
  const c = document.createElement('canvas'); c.width = LinkCardWidth; c.height = LinkCardHeight;
  drawLinkCard(c.getContext('2d'), { ...input, avatar: img, fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif' });
  return c.toDataURL('image/png');
};
window.ready = true;
</script></body>`);
await page.waitForFunction(() => window.ready === true);
await page.evaluate(() => document.fonts.ready);

const render = async (a) => {
  const [name, color] = Channels[a.kind === 'weekly' ? 'weekly' : a.category] ?? ['', '#1E4FD8'];
  const url = await page.evaluate((input) => window.render(input), { title: a.title, comment: a.comment ?? '', categoryName: name, categoryColor: color });
  return Buffer.from(url.split(',')[1], 'base64');
};

if (sample) {
  writeFileSync(args[1], await render(articles[0]));
  console.log('sample:', articles[0].title);
} else {
  const template = readFileSync(join(site, '404.html'), 'utf8');
  mkdirSync(join(site, 'og'), { recursive: true });
  mkdirSync(join(site, 'article'), { recursive: true });
  // 前回と同じ中身の記事は描き直さない（og/index.json に中身のハッシュを覚えておく）
  const indexPath = join(site, 'og/index.json');
  const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};
  let drawn = 0;
  for (const a of articles) {
    const hash = createHash('sha1').update(JSON.stringify([a.title, a.comment, a.category, a.kind, drawJs.length])).digest('hex').slice(0, 12);
    const png = join(site, 'og', `${a.id}.png`);
    if (index[a.id] !== hash || !existsSync(png)) {
      writeFileSync(png, await render(a));
      index[a.id] = hash;
      drawn++;
    }
    writeFileSync(join(site, 'article', `${a.id}.html`), withOgTags(template, a, hash));
  }
  writeFileSync(indexPath, JSON.stringify(index));
  console.log(`og cards: ${articles.length} articles, ${drawn} drawn`);
}
await browser.close();

function withOgTags(html, a, hash) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const desc = (a.comment ?? '').replace(/\s+/g, ' ').slice(0, 110);
  const pageUrl = `${SiteUrl}/article/${a.id}`;
  const image = `${SiteUrl}/og/${a.id}.png?v=${hash}`;
  const tags = [
    `<title>${esc(a.title)}｜Healthcare Business News</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Healthcare Business News">`,
    `<meta property="og:title" content="${esc(a.title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${pageUrl}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('');
  return html.replace(/<title>[^<]*<\/title>/, '').replace('</head>', `${tags}</head>`);
}
