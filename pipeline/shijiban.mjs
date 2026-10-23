#!/usr/bin/env node
/**
 * 配信指示板（https://claude.ai/artifact/1yPGRu9dsA56nYEq6NcHni）の HTML を扱う。
 * 指示板はページ自身が state（JSON）を埋め込んで自分を再公開する作りなので、
 * ワーカーは「読む → state を直す → 同じ HTML を公開し直す」だけでよい。
 *
 *   node pipeline/shijiban.mjs list  <page.html>                       # 受付待ちの指示を一覧
 *   node pipeline/shijiban.mjs reply <page.html> <id> <status> <返事>   # 指示 id の status を変え、ワーカーの返事を追記して HTML を書き戻す
 *     status: working | done | question | skipped
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [cmd, file, id, status, ...rest] = process.argv.slice(2);
if (!cmd || !file) { console.error('usage: shijiban.mjs list|reply <page.html> [id status 返事]'); process.exit(1); }
const html = readFileSync(file, 'utf8');
const m = html.match(/(<script type="application\/json" id="state">)([\s\S]*?)(<\/script>)/);
if (!m) throw new Error('state ブロックが見つかりません');
const state = JSON.parse(m[2].replace(/<\\\//g, '</'));

if (cmd === 'list') {
  for (const x of state.messages) if (x.from !== 'claude' && (x.status === 'pending' || x.status === 'working')) console.log(`${x.id}\t${x.t}\t${x.status}\t${x.text}`);
  process.exit(0);
}
if (cmd === 'reply') {
  const text = rest.join(' ');
  if (!id || !status || !text) { console.error('reply には id, status, 返事 が必要'); process.exit(1); }
  const target = state.messages.find((x) => x.id === id);
  if (!target) throw new Error(`id ${id} が見つかりません`);
  target.status = status;
  state.messages.push({ id: 'c' + Date.now().toString(36), t: new Date().toISOString(), from: 'claude', re: id, text });
  const json = JSON.stringify(state).replace(/<\//g, '<\\/');
  writeFileSync(file, html.replace(m[0], m[1] + json + m[3]));
  console.log(`書き戻しました: ${id} -> ${status}`);
}
