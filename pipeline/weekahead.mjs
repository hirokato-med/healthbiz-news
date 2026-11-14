#!/usr/bin/env node
/**
 * 来週の注目（毎週日曜 7:00）を data/weekahead.json に書く。
 *
 *   node pipeline/weekahead.mjs publish pipeline/weekahead-draft.json [--date YYYY-MM-DD]
 *     --date: 配信日（既定は今日）。前日に用意して日曜の号として出すとき
 *
 * 下書きの形（pipeline/samples/weekahead-sample.json の issues[0] と同じ）:
 *   { "headline": "来週を一言で", "note": "加藤浩晃のひとこと", "sections": [{ "name": "決算発表", "items": [{ "date": "YYYY-MM-DD", "label": "…", "note": "…", "url": "公式の発表" }] }] }
 * 対象は「次の月曜〜日曜」。日付が範囲の外の予定、url の無い予定は受け付けない。同じ日の号は上書き。
 */
import { readFile, writeFile } from 'node:fs/promises';

const [cmd, file, ...rest] = process.argv.slice(2);
const dateArg = rest[0] === '--date' ? rest[1] : null;
if (cmd !== 'publish' || !file) {
  console.error('usage: node pipeline/weekahead.mjs publish <draft.json>');
  process.exit(1);
}

const jst = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(d);
const today = dateArg ?? jst(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('--date は YYYY-MM-DD');
const addDays = (date, n) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
// 次の月曜（今日が日曜なら明日）〜その日曜
const dow = new Date(today + 'T00:00:00Z').getUTCDay();
const from = addDays(today, ((8 - dow) % 7) || 7);
const to = addDays(from, 6);
const md = (s) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

const draft = JSON.parse(await readFile(file, 'utf8'));
for (const k of ['headline', 'note', 'sections']) if (!draft[k] || (Array.isArray(draft[k]) && !draft[k].length)) throw new Error(`${k} が空です`);
for (const sec of draft.sections) {
  for (const it of sec.items) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.date)) throw new Error(`${it.label}: date は YYYY-MM-DD`);
    if (it.date < from || it.date > to) throw new Error(`${it.label}: ${it.date} は対象の週（${from}〜${to}）の外です`);
    if (!it.url) throw new Error(`${it.label}: 公式の発表の url がありません`);
  }
}

const target = new URL('../data/weekahead.json', import.meta.url);
const current = JSON.parse(await readFile(target, 'utf8').catch(() => '{"issues":[]}'));
const issue = {
  id: `weekahead-${today}`,
  published_date: today,
  title: `来週の注目｜${draft.headline}`,
  week: `${md(from)}–${md(to)}`,
  note: draft.note,
  sections: draft.sections.filter((s) => s.items.length),
  created_at: new Date().toISOString(),
};
const issues = [issue, ...current.issues.filter((i) => i.id !== issue.id)].slice(0, 12);
await writeFile(target, JSON.stringify({ updated_at: issue.created_at, issues }, null, 2) + '\n');
console.log(`来週の注目を書きました: ${issue.title}（${issue.week}、${issue.sections.reduce((n, s) => n + s.items.length, 0)}件）`);
