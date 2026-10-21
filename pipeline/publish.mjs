#!/usr/bin/env node
/**
 * 配信パイプラインの最終ステップ: 記事 JSON を配信先に投稿する。
 *
 *   node pipeline/publish.mjs articles.json            # 公開として投稿
 *   node pipeline/publish.mjs articles.json --draft    # 下書きとして投稿
 *
 * 配信先:
 *   - SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY があれば Supabase の articles テーブル
 *   - 無ければ data/articles.json にマージ（git で push すればアプリに届く）
 *
 * JSON の形は pipeline/example.json を参照。
 */
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error('usage: node pipeline/publish.mjs <articles.json> [--draft]');
  process.exit(1);
}

const status = flags.includes('--draft') ? 'draft' : 'published';
const Categories = new Set(['device', 'wearable', 'drug', 'digital', 'service', 'policy']);

const raw = JSON.parse(await readFile(file, 'utf8'));
const rows = (Array.isArray(raw) ? raw : raw.articles).map((a, i) => {
  for (const k of ['published_date', 'category', 'title', 'source_name', 'source_url', 'summary', 'comment']) {
    if (a[k] == null || a[k] === '') throw new Error(`記事${i + 1}: ${k} が空です`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.published_date)) throw new Error(`記事${i + 1}: published_date は YYYY-MM-DD にしてください`);
  if (!Categories.has(a.category)) throw new Error(`記事${i + 1}: category "${a.category}" は不正です`);
  if (!Array.isArray(a.summary)) throw new Error(`記事${i + 1}: summary は配列にしてください`);
  return { ...a, status };
});

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const saved = url && key ? await publishToSupabase(rows, url, key) : await publishToFile(rows);

console.log(`${saved.length}件を ${status} として投稿しました`);
for (const r of saved) console.log(`  [${r.category}] ${r.published_date} ${r.title}`);

/** 同じ source_url の記事は上書き（同じプレスリリースを二重配信しない） */
async function publishToSupabase(rows, url, key) {
  const res = await fetch(`${url}/rest/v1/articles?on_conflict=source_url`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.error(`投稿に失敗しました: ${res.status}`, await res.text());
    process.exit(1);
  }
  return res.json();
}

async function publishToFile(rows) {
  const target = new URL('../data/articles.json', import.meta.url);
  const current = JSON.parse(await readFile(target, 'utf8').catch(() => '{"articles":[]}'));
  const bySource = new Map(current.articles.map((a) => [a.source_url, a]));
  const now = new Date().toISOString();
  const saved = rows.map((a) => {
    const prev = bySource.get(a.source_url);
    const next = { id: prev?.id ?? randomUUID(), created_at: prev?.created_at ?? now, ...a, updated_at: now };
    bySource.set(a.source_url, next);
    return next;
  });
  const articles = [...bySource.values()].sort(
    (a, b) => b.published_date.localeCompare(a.published_date) || b.created_at.localeCompare(a.created_at),
  );
  await writeFile(target, JSON.stringify({ updated_at: now, articles }, null, 2) + '\n');
  console.log(`data/articles.json を更新しました（全${articles.length}件）`);
  return saved;
}
