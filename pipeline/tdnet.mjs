#!/usr/bin/env node
/**
 * TDnet（適時開示情報閲覧サービス）の当日一覧から、ヘルスケアに関係しそうな開示を取り出す。
 * 上場企業は PR TIMES ではなく適時開示や自社 IR で出すことが多いので、PR TIMES の補完として使う。
 *
 *   node pipeline/tdnet.mjs              # 今日（JST）
 *   node pipeline/tdnet.mjs 2026-10-20   # 日付指定
 *
 * 結果は JSON（配列）。各要素: { time, code, company, title, pdf, exchange }
 * 表題か会社名にヘルスケア関連語を含むものだけを返す（決算短信・自己株式などの定型開示は除く）。
 */
import { fetchText } from './lib/fetch-text.mjs';

const dateArg = process.argv[2];
const date = (dateArg ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date())).replace(/-/g, '');

const Keywords = /医療|医薬|製薬|創薬|治験|承認|薬事|ヘルスケア|健康|介護|病院|クリニック|診療|検査|診断|医師|看護|薬局|調剤|バイオ|再生医療|細胞|遺伝子|ワクチン|医療機器|SaMD|ウェアラブル|フレイル|メディカル|ファーマ|バイオ|デンタル|歯科|眼科|美容|リハビリ|福祉|PMDA|FDA|CE マーク|保険適用|保険収載/i;
const Boilerplate = /決算短信|四半期|自己株式|譲渡制限付株式|ストックオプション|新株予約権|日々の開示事項|配当|株式分割|株主総会|役員の異動|人事|訂正|定款|監査|コーポレート・ガバナンス|持株会|逝去/;

const items = [];
for (let page = 1; page <= 20; page++) {
  const url = `https://www.release.tdnet.info/inbs/I_list_${String(page).padStart(3, '0')}_${date}.html`;
  let html;
  try {
    html = await fetchText(url);
  } catch {
    break;
  }
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  let found = 0;
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => strip(m[1]));
    if (cells.length < 6 || !/^\d{1,2}:\d{2}$/.test(cells[0])) continue;
    found++;
    const pdf = row.match(/href="([^"]+\.pdf)"/)?.[1];
    const [time, code, company, title, , exchange] = cells;
    items.push({ time, code: code.slice(0, 4), company, title, pdf: pdf ? new URL(pdf, url).href : null, exchange });
  }
  if (!found || !html.includes(`I_list_${String(page + 1).padStart(3, '0')}_${date}.html`)) break;
}

const picked = items.filter((x) => Keywords.test(x.title + x.company) && !Boilerplate.test(x.title));
console.log(JSON.stringify(picked, null, 2));
console.error(`${date}: 全${items.length}件中 ${picked.length}件`);

function strip(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
