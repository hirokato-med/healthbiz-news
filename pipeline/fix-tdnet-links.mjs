#!/usr/bin/env node
/**
 * data/articles.json の TDnet のリンク（release.tdnet.info、約1か月で消える）を、
 * 東証の上場会社情報サービス（www2.jpx.co.jp/disc/<コード>0/<番号>.pdf、長く残る）の同じPDFに置き換える。
 * 毎週土曜の「今週のまとめ」の回に実行する（pipeline/WEEKLY.md）。
 *
 *   node pipeline/fix-tdnet-links.mjs            # 置き換えて data/articles.json を書き換える
 *   node pipeline/fix-tdnet-links.mjs --dry-run  # 書き換えずに結果だけ出す
 *
 * - JPX 側で PDF が開けたものだけ置き換える（JPX への掲載は開示の数日後なので、まだのものは次の土曜に回す）。
 * - 証券コードは company.listed の「（1234）」、無ければ社名・見出しを
 *   pipeline/healthcare-companies.json と pipeline/earnings-watchlist.json の社名で引く。
 * - 最後に「置き換えた／JPX未掲載で次回へ／コード不明／TDnetもJPXも開けない」を一覧で出す。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const dryRun = process.argv.includes('--dry-run');
const path = new URL('../data/articles.json', import.meta.url);
const data = JSON.parse(readFileSync(path, 'utf8'));

const TdnetRe = /https:\/\/www\.release\.tdnet\.info\/inbs\/(\d{18})\.pdf/g;

// 社名 → コード（全角英数・空白・「株式会社」などをそろえて比べる）
const norm = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(/株式会社|\(株\)|㈱|ホールディングス|HD|グループ/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
const names = [];
const addName = (name, code) => {
  const n = norm(name);
  if (n.length >= 2 && code) names.push([n, String(code)]);
};
const hc = JSON.parse(readFileSync(new URL('./healthcare-companies.json', import.meta.url), 'utf8'));
for (const c of hc.companies ?? []) addName(c.name, c.code);
const wl = JSON.parse(readFileSync(new URL('./earnings-watchlist.json', import.meta.url), 'utf8'));
for (const c of wl.companies ?? []) {
  addName(c.name, c.code);
  for (const a of c.aliases ?? []) addName(a, c.code);
}
names.sort((a, b) => b[0].length - a[0].length); // 長い社名から先に当てる

function codeOf(article) {
  const listed = article.company?.listed ?? '';
  const m = String(listed).normalize('NFKC').match(/\((\d{3}[0-9A-Z])\)/);
  if (m) return m[1];
  for (const text of [article.company?.name, article.title]) {
    const t = norm(text);
    if (!t) continue;
    // 社名は見出しの先頭に来るので、先頭一致を優先し、次に部分一致
    for (const [n, code] of names) if (t.startsWith(n)) return code;
    if (text === article.company?.name) for (const [n, code] of names) if (t.includes(n)) return code;
  }
  return null;
}

const statusCache = new Map();
function pdfStatus(url) {
  if (statusCache.has(url)) return statusCache.get(url);
  let ok = false;
  try {
    const out = execFileSync('curl', ['-sS', '-o', '/dev/null', '-m', '30', '-A', 'Mozilla/5.0', '-w', '%{http_code} %{content_type}', url], { encoding: 'utf8' });
    const [code, type = ''] = out.trim().split(' ');
    ok = code === '200' && /pdf/i.test(type);
  } catch {
    ok = false;
  }
  statusCache.set(url, ok);
  return ok;
}

const result = { replaced: [], pending: [], noCode: [], dead: [] };

// 記事の中の文字列をすべてたどって置き換える（source_url・source_url_2・ir_docs・本文中など）
function walk(value, replace) {
  if (typeof value === 'string') return replace(value);
  if (Array.isArray(value)) return value.map((v) => walk(v, replace));
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = walk(value[k], replace);
    return value;
  }
  return value;
}

for (const article of data.articles) {
  if (!JSON.stringify(article).includes('release.tdnet.info')) continue;
  const code = codeOf(article);
  const label = `${article.published_date} ${article.title.slice(0, 30)}`;
  walk(article, (s) =>
    s.replace(TdnetRe, (url, id) => {
      if (!code) {
        result.noCode.push(`${label} | ${url}`);
        return url;
      }
      const jpx = `https://www2.jpx.co.jp/disc/${code}0/${id}.pdf`;
      if (pdfStatus(jpx)) {
        result.replaced.push(`${label} | ${jpx}`);
        return jpx;
      }
      if (pdfStatus(url)) result.pending.push(`${label} | ${url}`);
      else result.dead.push(`${label} | ${url}（コード ${code}）`);
      return url;
    }),
  );
}

if (!dryRun && result.replaced.length) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');

const show = (title, list) => {
  console.log(`${title}: ${list.length}件`);
  for (const l of list) console.log(`  ${l}`);
};
show(dryRun ? '置き換えできる（--dry-run のため未書き込み）' : '置き換えた', result.replaced);
show('JPX未掲載（TDnetはまだ開ける。次の土曜に再実行）', result.pending);
show('証券コードが引けない（手で確認）', result.noCode);
show('TDnetもJPXも開けない（会社IRの同じ資料に手で差し替え）', result.dead);
