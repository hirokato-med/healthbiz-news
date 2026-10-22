#!/usr/bin/env node
/**
 * Google アナリティクス 4（GA4）から HB News の直近1週間の利用状況を取り、
 * 日本語の週次レポート（プレーンテキスト）を標準出力に出す。毎週月曜の朝に実行してメールで送る。
 *
 *   node pipeline/ga-weekly.mjs            # 直近7日（昨日まで）と、その前の7日を比べる
 *   node pipeline/ga-weekly.mjs --days 14  # 期間を変える
 *   node pipeline/ga-weekly.mjs --json     # 集計した数字を JSON で出す（レポート文は出さない）
 *
 * 必要な環境変数（設定のしかたは pipeline/GA_WEEKLY.md）:
 *   GA_PROPERTY_ID           GA4 プロパティの数字の ID（測定 ID「G-…」ではない）
 *   GA_SERVICE_ACCOUNT_JSON  サービスアカウントの JSON キーの中身（またはそのファイルのパス）
 *
 * npm の依存は無し。HTTPS はプロキシ経由の環境でも動くよう curl で行う（lib/fetch-text.mjs と同じ理由）。
 * 認証は、サービスアカウントの鍵で RS256 の JWT を自分で署名し、Google のトークン発行所でアクセストークンに換える。
 * 終了コード: 0 成功 / 1 認証・API の失敗 / 2 環境変数や引数の不備
 */
import { execFile } from 'node:child_process';
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);

export const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DATA_API = 'https://analyticsdata.googleapis.com/v1beta';

/** アプリが page_title に付ける接尾辞（src/lib/analytics.ts） */
const TitleSuffix = '｜HB News';
/** 上タブのチャンネル名（src/constants/channels.ts と同じ並び）。page_title が「<名前>｜HB News」になる */
const ChannelNames = ['トップ', '医療機器', 'ウェアラブル', 'ロンジェビティ', '製薬・創薬', 'デジタルヘルス', '医療DX', 'ヘルスケアサービス', '政策・規制', '海外', 'メルマガ'];
/** チャンネル以外の画面。trackScreen('saved') などが「saved｜HB News」として届く */
const ScreenLabels = { saved: '保存済み（下タブ）', about: 'このアプリ（下タブ）', privacy: 'プライバシーポリシー' };
/** click イベントの kind と表示名（src/lib/analytics.ts の trackClick）。この並びで出す */
const ClickLabels = {
  substack_subscribe: 'メルマガ購読',
  share: '共有',
  save: '保存',
  unsave: '保存解除',
  source: '原文を読む',
  source_2: '原文を読む（2つ目のリンク）',
  company: '会社サイト',
  substack_read: 'メルマガを読む',
  privacy: 'プライバシーポリシー',
};

// ---------------------------------------------------------------------------
// 認証
// ---------------------------------------------------------------------------

/** base64url（末尾の = 無し） */
export function b64url(data) {
  return Buffer.from(data).toString('base64url');
}

/**
 * サービスアカウントの鍵で署名した JWT（RS256）を作る。
 * Google の仕様: iss=client_email, scope, aud=トークン発行所, iat, exp（最長1時間）
 */
export function buildJwt(sa, { now = Math.floor(Date.now() / 1000), scope = SCOPE, lifetime = 3600 } = {}) {
  if (!sa?.client_email || !sa?.private_key) throw new Error('サービスアカウントの JSON に client_email / private_key がありません');
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: sa.client_email, scope, aud: TOKEN_URL, iat: now, exp: now + lifetime };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).end().sign(normalizePem(sa.private_key));
  return `${signingInput}.${b64url(signature)}`;
}

/** 環境変数に入れたときに改行が「\n」の2文字に潰れている鍵を元に戻す */
function normalizePem(pem) {
  return pem.includes('\n') ? pem : pem.replace(/\\n/g, '\n');
}

/** JWT をアクセストークンに換える。失敗したら Google の応答本文ごと例外にする */
export async function fetchAccessToken(sa) {
  const assertion = buildJwt(sa);
  const form = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString();
  const res = await http(TOKEN_URL, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  if (res.status !== 200 || !res.json?.access_token) {
    throw new ApiError('認証に失敗しました（Google のトークン発行所の応答）', res, authHint(res.json));
  }
  return res.json.access_token;
}

function authHint(body) {
  const err = body?.error;
  const desc = body?.error_description ?? '';
  if (err === 'invalid_grant' && /account not found/i.test(desc)) return 'JSON キーのサービスアカウントが見つかりません。Google Cloud で削除されていないか、別のプロジェクトのキーを入れていないか確認してください。';
  if (err === 'invalid_grant' && /signature/i.test(desc)) return 'GA_SERVICE_ACCOUNT_JSON の鍵が正しくありません。JSON キーをダウンロードし直して、中身をそのまま（改行を含めて全部）入れてください。';
  if (err === 'invalid_grant' && /expired|too early|iat|exp/i.test(desc)) return '実行している端末の時計がずれています。時刻を合わせてから再実行してください。';
  if (err === 'invalid_grant') return 'サービスアカウントの鍵が無効化・削除されていないか、Google Cloud の「サービス アカウント」→「キー」で確認してください。';
  if (err === 'invalid_client') return 'client_email が正しくありません。JSON キーの中身を丸ごと入れ直してください。';
  return 'GA_SERVICE_ACCOUNT_JSON の中身（サービスアカウントの JSON キー）を確認してください。';
}

// ---------------------------------------------------------------------------
// HTTP（curl 経由）
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(summary, res, hint) {
    super(summary);
    this.status = res.status;
    this.body = res.text;
    this.json = res.json;
    this.hint = hint;
  }
}

/**
 * HTTP を curl で行う。Node の fetch は HTTPS_PROXY を見ないので、プロキシ経由の環境（クラウドの Claude セッションなど）で
 * ENOTFOUND になる。本文は標準入力で渡し（ps に出さない）、末尾にステータスコードを付けて受け取る。
 */
export async function http(url, { method = 'POST', headers = {}, body, maxTime = 60 } = {}) {
  const args = ['-sS', '--max-time', String(maxTime), '-X', method, '-w', '\n%{http_code}'];
  for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`);
  if (body !== undefined) args.push('--data-binary', '@-');
  args.push(url);

  const pending = run('curl', args, { maxBuffer: 50 * 1024 * 1024 });
  pending.child.stdin.end(body ?? '');
  let stdout;
  try {
    ({ stdout } = await pending);
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error('curl が見つかりません。curl をインストールしてください。');
    throw new Error(`通信に失敗しました（${url}）: ${String(e.stderr || e.message).trim()}`);
  }
  const cut = stdout.lastIndexOf('\n');
  const status = Number(stdout.slice(cut + 1));
  const text = stdout.slice(0, cut);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // JSON でない応答（プロキシのエラーページなど）はそのまま text で持つ
  }
  return { status, text, json };
}

// ---------------------------------------------------------------------------
// GA4 Data API
// ---------------------------------------------------------------------------

export function makeClient(token, propertyId) {
  const url = `${DATA_API}/properties/${propertyId}:runReport`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function runReport(body, attempt = 0) {
    const res = await http(url, { headers, body: JSON.stringify(body) });
    if (res.status === 200) return res.json;
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      return runReport(body, attempt + 1);
    }
    throw new ApiError('GA4 Data API の呼び出しに失敗しました', res, apiHint(res, propertyId));
  }

  return { runReport };
}

function apiHint(res, propertyId) {
  const msg = res.json?.error?.message ?? '';
  const status = res.json?.error?.status ?? '';
  if (res.status === 403 && /has not been used|is disabled|SERVICE_DISABLED/i.test(msg + status)) {
    return 'Google Cloud で「Google Analytics Data API」が有効になっていません。API ライブラリから有効にしてください（有効化後、数分かかることがあります）。';
  }
  if (res.status === 403) {
    return `サービスアカウントが GA4 プロパティ ${propertyId} の閲覧者になっていません。GA4 の「管理」→「プロパティのアクセス管理」でサービスアカウントのメールを「閲覧者」として追加してください。`;
  }
  if (res.status === 404 || (res.status === 400 && /property/i.test(msg))) {
    return `GA_PROPERTY_ID（${propertyId}）が正しくないようです。「管理」→「プロパティの詳細」にある数字の「プロパティ ID」を入れてください（「G-」で始まる測定 ID ではありません）。`;
  }
  if (res.status === 401) return 'アクセストークンが受け付けられませんでした。時間をおいて再実行してください。';
  return null;
}

/** 未登録のカスタムディメンションを指すエラーか */
function isUnknownDimension(e, dimName) {
  if (!(e instanceof ApiError) || e.status !== 400 || !dimName) return false;
  const msg = e.json?.error?.message ?? e.body ?? '';
  return msg.includes(dimName) || /not a valid dimension/i.test(msg);
}

/** rows を { dims, range, metrics } に平す。dateRanges が複数なら末尾の次元が期間名 */
function tabulate(res, multiRange) {
  return (res?.rows ?? []).map((r) => {
    const dims = (r.dimensionValues ?? []).map((d) => d.value);
    const range = multiRange ? dims.pop() : 'current';
    const metrics = (r.metricValues ?? []).map((m) => Number(m.value) || 0);
    return { dims, range, metrics };
  });
}

const eventFilter = (eventName) => ({ filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: eventName } } });
const byMetricDesc = (metricName) => [{ metric: { metricName }, desc: true }];

// ---------------------------------------------------------------------------
// 集計
// ---------------------------------------------------------------------------

/** 日付計算（JST）。end は昨日、start はその days-1 日前。previous はその直前の同じ長さ */
export function periods(days, todayJst = jstToday()) {
  const end = addDays(todayJst, -1);
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { current: { start, end }, previous: { start: prevStart, end: prevEnd } };
}

export function jstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
}

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** GA4 から必要な数字を全部集めて、素の構造にまとめる */
export async function collect({ runReport }, { days, today }) {
  const p = periods(days, today);
  const notes = [];
  const dateRanges = [
    { startDate: p.current.start, endDate: p.current.end, name: 'current' },
    { startDate: p.previous.start, endDate: p.previous.end, name: 'previous' },
  ];
  const currentOnly = [dateRanges[0]];

  /** カスタムディメンションが未登録なら、その次元を外して取り直す */
  async function withFallback(body, dimName, whatIsLost) {
    try {
      return { res: await runReport(body), dropped: false };
    } catch (e) {
      if (!isUnknownDimension(e, dimName)) throw e;
      notes.push(`カスタムディメンション「${dimName.replace('customEvent:', '')}」が GA4 に登録されていないため、${whatIsLost}（登録のしかたは GA_WEEKLY.md）。`);
      const rest = (body.dimensions ?? []).filter((d) => d.name !== dimName);
      return { res: await runReport({ ...body, dimensions: rest }), dropped: true };
    }
  }

  // 1. 利用者・セッション・表示回数（今週と前週）
  const totalsRes = await runReport({
    dateRanges,
    metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
  });
  const totals = { current: { users: 0, sessions: 0, views: 0 }, previous: { users: 0, sessions: 0, views: 0 } };
  for (const row of tabulate(totalsRes, true)) {
    const [users, sessions, views] = row.metrics;
    if (totals[row.range]) totals[row.range] = { users, sessions, views };
  }

  // 2. イベントごとの件数（カスタムディメンションが無くても取れる土台）
  const eventsRes = await runReport({
    dateRanges,
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    limit: 200,
  });
  const events = { current: {}, previous: {} };
  for (const row of tabulate(eventsRes, true)) {
    if (events[row.range]) events[row.range][row.dims[0]] = row.metrics[0];
  }

  // 3. page_title 別の表示回数（「…｜HB News」だけ）。タブ別と、記事タイトルの代替に使う
  const titlesRes = await runReport({
    dateRanges,
    dimensions: [{ name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: { filter: { fieldName: 'pageTitle', stringFilter: { matchType: 'ENDS_WITH', value: TitleSuffix } } },
    orderBys: byMetricDesc('screenPageViews'),
    limit: 2000,
  });
  const titleViews = new Map(); // title(接尾辞なし) -> { current, previous }
  for (const row of tabulate(titlesRes, true)) {
    const title = row.dims[0].slice(0, -TitleSuffix.length);
    const entry = titleViews.get(title) ?? { current: 0, previous: 0 };
    entry[row.range] = (entry[row.range] ?? 0) + row.metrics[0];
    titleViews.set(title, entry);
  }
  const tabs = [];
  for (const [title, v] of titleViews) {
    const label = ChannelNames.includes(title) ? title : ScreenLabels[title];
    if (label) tabs.push({ key: title, label, current: v.current, previous: v.previous });
  }
  tabs.sort((a, b) => b.current - a.current);

  // 4. よく読まれた記事（article_view を article_title で集計）
  const articlesReport = await withFallback(
    {
      dateRanges: currentOnly,
      dimensions: [{ name: 'customEvent:article_title' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: eventFilter('article_view'),
      orderBys: byMetricDesc('eventCount'),
      limit: 10,
    },
    'customEvent:article_title',
    '記事ランキングは記事ページの表示回数（page_view）で代用しています',
  );
  let articles;
  if (!articlesReport.dropped) {
    articles = tabulate(articlesReport.res, false).map((r) => ({ title: r.dims[0], count: r.metrics[0] }));
  } else {
    articles = [...titleViews]
      .filter(([title]) => !ChannelNames.includes(title) && !ScreenLabels[title])
      .map(([title, v]) => ({ title, count: v.current }))
      .filter((a) => a.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
  articles = articles.filter((a) => a.title && a.title !== '(not set)');
  const articleViewsTotal = events.current.article_view ?? 0;

  // 5. 記事閲覧のカテゴリ別（気づきと JSON 用）
  const categoryReport = await withFallback(
    {
      dateRanges: currentOnly,
      dimensions: [{ name: 'customEvent:category' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: eventFilter('article_view'),
      orderBys: byMetricDesc('eventCount'),
    },
    'customEvent:category',
    'カテゴリ別の記事閲覧は出せません',
  );
  const categories = {};
  if (!categoryReport.dropped) {
    for (const r of tabulate(categoryReport.res, false)) if (r.dims[0] !== '(not set)') categories[r.dims[0]] = r.metrics[0];
  }

  // 6. ボタン（click を kind で集計）
  const clicksReport = await withFallback(
    {
      dateRanges,
      dimensions: [{ name: 'customEvent:kind' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: eventFilter('click'),
    },
    'customEvent:kind',
    'ボタンの内訳（購読・共有・保存・原文）は出せず、クリックの合計だけになります',
  );
  const clicks = {}; // kind -> { current, previous }
  if (!clicksReport.dropped) {
    for (const r of tabulate(clicksReport.res, true)) {
      const kind = r.dims[0];
      if (kind === '(not set)') continue;
      clicks[kind] ??= { current: 0, previous: 0 };
      clicks[kind][r.range] = r.metrics[0];
    }
  }
  const clicksTotal = { current: events.current.click ?? 0, previous: events.previous.click ?? 0 };

  // 7. 役に立った（helpful を reaction で集計）
  const helpfulReport = await withFallback(
    {
      dateRanges,
      dimensions: [{ name: 'customEvent:reaction' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: eventFilter('helpful'),
    },
    'customEvent:reaction',
    '「役に立った」は反応の内訳なしで合計だけになります',
  );
  const reactions = {}; // reaction -> { current, previous }
  if (!helpfulReport.dropped) {
    for (const r of tabulate(helpfulReport.res, true)) {
      const reaction = r.dims[0];
      if (reaction === '(not set)') continue;
      reactions[reaction] ??= { current: 0, previous: 0 };
      reactions[reaction][r.range] = r.metrics[0];
    }
  }
  const helpful = { total: { current: events.current.helpful ?? 0, previous: events.previous.helpful ?? 0 }, reactions, hasBreakdown: !helpfulReport.dropped };

  return {
    generated_at: new Date().toISOString(),
    days,
    period: p.current,
    previous_period: p.previous,
    totals,
    articles,
    article_views_total: articleViewsTotal,
    articles_from: articlesReport.dropped ? 'page_view' : 'article_view',
    tabs,
    categories,
    clicks,
    clicks_total: clicksTotal,
    clicks_has_breakdown: !clicksReport.dropped,
    helpful,
    events,
    notes,
  };
}

// ---------------------------------------------------------------------------
// レポート文
// ---------------------------------------------------------------------------

const fmt = (n) => Number(n ?? 0).toLocaleString('ja-JP');

/** 「10/13」のような表記 */
function md(ymd) {
  const [, m, d] = ymd.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 前週比。「（↑ +12%、前週 110）」 */
export function compare(cur, prev, unit = '') {
  if (!prev) return cur ? `（前週 0${unit}）` : '（前週も 0）';
  const pct = Math.round(((cur - prev) / prev) * 100);
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
  const sign = pct > 0 ? '+' : pct < 0 ? '' : '±';
  return `（${arrow} ${sign}${pct}%、前週 ${fmt(prev)}${unit}）`;
}

export function renderReport(d) {
  const L = [];
  const title = d.days === 7 ? '週次レポート' : `直近${d.days}日レポート`;
  L.push(`【HB News ${title}】${md(d.period.start)}〜${md(d.period.end)}`);
  L.push(`前の${d.days}日（${md(d.previous_period.start)}〜${md(d.previous_period.end)}）と比べています。`);
  L.push('');

  const c = d.totals.current;
  const pv = d.totals.previous;
  L.push('■ 利用者 / セッション / 表示回数');
  L.push(`  利用者　　：${fmt(c.users)}人 ${compare(c.users, pv.users, '人')}`);
  L.push(`  セッション：${fmt(c.sessions)}回 ${compare(c.sessions, pv.sessions, '回')}`);
  L.push(`  表示回数　：${fmt(c.views)}回 ${compare(c.views, pv.views, '回')}`);
  L.push('');

  L.push('■ よく読まれた記事 Top10' + (d.articles_from === 'page_view' ? '（記事ページの表示回数）' : ''));
  if (d.articles.length === 0) L.push('  まだ記事の閲覧がありません。');
  d.articles.forEach((a, i) => L.push(`  ${String(i + 1).padStart(2, ' ')}. ${a.title}｜${fmt(a.count)}回`));
  L.push('');

  L.push('■ タブ別の閲覧');
  if (d.tabs.length === 0) L.push('  まだタブの閲覧がありません。');
  for (const t of d.tabs) L.push(`  ${t.label}：${fmt(t.current)}回（前週 ${fmt(t.previous)}回）`);
  L.push('');

  L.push('■ ボタン（購読・共有・保存・原文）');
  if (d.clicks_has_breakdown) {
    const order = [...Object.keys(ClickLabels), ...Object.keys(d.clicks).filter((k) => !ClickLabels[k])];
    const always = new Set(['substack_subscribe', 'share', 'save', 'source']);
    for (const kind of order) {
      const v = d.clicks[kind] ?? { current: 0, previous: 0 };
      if (!always.has(kind) && v.current === 0 && v.previous === 0) continue;
      L.push(`  ${ClickLabels[kind] ?? kind}：${fmt(v.current)}回（前週 ${fmt(v.previous)}回）`);
    }
  } else {
    L.push(`  クリック合計：${fmt(d.clicks_total.current)}回（前週 ${fmt(d.clicks_total.previous)}回）`);
  }
  L.push('');

  L.push('■ 役に立った');
  const h = d.helpful;
  if (h.total.current === 0 && h.total.previous === 0) {
    L.push('  まだ反応はありません。');
  } else {
    L.push(`  計 ${fmt(h.total.current)}件 ${compare(h.total.current, h.total.previous, '件')}`);
    for (const [reaction, v] of Object.entries(h.reactions).sort((a, b) => b[1].current - a[1].current)) {
      L.push(`    ${reaction}：${fmt(v.current)}件（前週 ${fmt(v.previous)}件）`);
    }
  }
  L.push('');

  L.push('■ 気づき');
  for (const s of insights(d)) L.push(`  ・${s}`);
  L.push('');

  if (d.notes.length) {
    L.push('※ 注記');
    for (const n of d.notes) L.push(`  ・${n}`);
    L.push('');
  }
  L.push('（Google アナリティクス 4 の集計。直近1〜2日分は反映が遅れることがあります）');
  return L.join('\n');
}

/** 数字から言える範囲で 1〜3 行。推測は書かない */
export function insights(d) {
  const c = d.totals.current;
  const pv = d.totals.previous;
  if (c.users === 0 && c.views === 0) {
    return ['今週はまだ計測データがありません。GA への反映には1〜2日かかることがあるので、翌週のレポートで確認してください。'];
  }
  const out = [];

  // 利用者の増減
  if (pv.users > 0) {
    const pct = Math.round(((c.users - pv.users) / pv.users) * 100);
    if (Math.abs(pct) >= 20) out.push(`利用者は前週から${Math.abs(pct)}%${pct > 0 ? '増え' : '減り'}、${fmt(c.users)}人でした。`);
    else out.push(`利用者は${fmt(c.users)}人で、前週（${fmt(pv.users)}人）とほぼ同じ水準でした。`);
  } else {
    out.push(`利用者は${fmt(c.users)}人でした（前週は計測がありません）。`);
  }

  // いちばん読まれた記事
  const top = d.articles[0];
  if (top) {
    const base = d.articles_from === 'article_view' ? d.article_views_total : d.articles.reduce((s, a) => s + a.count, 0);
    const share = base > 0 ? Math.round((top.count / base) * 100) : null;
    const t = top.title.length > 40 ? `${top.title.slice(0, 40)}…` : top.title;
    out.push(`いちばん読まれた記事は「${t}」（${fmt(top.count)}回）${share !== null && d.articles_from === 'article_view' ? `で、記事閲覧の${share}%を占めました` : 'でした'}。`);
  }

  // 購読ボタン
  const sub = d.clicks.substack_subscribe;
  if (sub?.current > 0) {
    out.push(`メルマガ購読ボタンは${fmt(sub.current)}回押されました${sub.previous ? `（前週 ${fmt(sub.previous)}回）` : ''}。`);
  } else if (sub?.previous > 0) {
    out.push(`メルマガ購読ボタンは今週は押されませんでした（前週 ${fmt(sub.previous)}回）。`);
  }

  // 繰り返し訪問
  if (c.users > 0 && c.sessions / c.users >= 1.5) {
    out.push(`1人あたり約${(c.sessions / c.users).toFixed(1)}回訪れていて、繰り返し見に来る人がいます。`);
  }

  // トップ以外でよく見られたタブ
  const tab = d.tabs.find((t) => t.key !== 'トップ' && ChannelNames.includes(t.key) && t.current > 0);
  if (tab) out.push(`タブでは「${tab.label}」がよく見られました（${fmt(tab.current)}回）。`);

  // 保存・共有
  const save = d.clicks.save?.current ?? 0;
  const share = d.clicks.share?.current ?? 0;
  if (save + share > 0) out.push(`記事の保存は${fmt(save)}回、共有は${fmt(share)}回でした。`);

  // 役に立った
  if (d.helpful.total.current > 0) out.push(`「役に立った」の反応は${fmt(d.helpful.total.current)}件ありました。`);

  return out.slice(0, 3);
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { json: false, days: 7, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--days') opts.days = Number(argv[++i]);
    else if (a.startsWith('--days=')) opts.days = Number(a.slice('--days='.length));
    else throw new Error(`不明な引数です: ${a}`);
  }
  if (!Number.isInteger(opts.days) || opts.days < 1 || opts.days > 365) throw new Error('--days には 1〜365 の整数を指定してください');
  return opts;
}

/** 環境変数を読む。足りなければ日本語で理由を返して終了コード 2 */
export async function loadConfig(env = process.env) {
  const problems = [];
  let propertyId = (env.GA_PROPERTY_ID ?? '').trim().replace(/^properties\//, '');
  if (!propertyId) problems.push('GA_PROPERTY_ID（GA4 の数字のプロパティ ID）が設定されていません。');
  else if (!/^\d+$/.test(propertyId)) problems.push(`GA_PROPERTY_ID は数字だけです（今の値: ${propertyId}）。「G-」で始まる測定 ID ではなく、「管理」→「プロパティの詳細」の「プロパティ ID」を入れてください。`);

  const raw = (env.GA_SERVICE_ACCOUNT_JSON ?? '').trim();
  let sa = null;
  if (!raw) {
    problems.push('GA_SERVICE_ACCOUNT_JSON（サービスアカウントの JSON キー）が設定されていません。');
  } else {
    let text = raw;
    if (!raw.startsWith('{')) {
      try {
        text = await readFile(raw, 'utf8');
      } catch {
        problems.push(`GA_SERVICE_ACCOUNT_JSON は JSON の中身か、JSON ファイルのパスにしてください（${raw.slice(0, 60)} は読めませんでした）。`);
      }
    }
    if (text.startsWith('{')) {
      try {
        sa = JSON.parse(text);
      } catch (e) {
        problems.push(`GA_SERVICE_ACCOUNT_JSON を JSON として読めませんでした: ${e.message}`);
      }
      if (sa && (!sa.client_email || !sa.private_key)) problems.push('GA_SERVICE_ACCOUNT_JSON に client_email / private_key がありません。サービスアカウントの JSON キーを丸ごと入れてください。');
    }
  }
  return { propertyId, sa, problems };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (opts.help) {
    console.log('使い方: node pipeline/ga-weekly.mjs [--days 7] [--json]\n環境変数 GA_PROPERTY_ID と GA_SERVICE_ACCOUNT_JSON が必要です（pipeline/GA_WEEKLY.md）。');
    return;
  }

  const { propertyId, sa, problems } = await loadConfig();
  if (problems.length) {
    console.error('環境変数が足りません:\n' + problems.map((p) => `  ・${p}`).join('\n') + '\n設定のしかたは pipeline/GA_WEEKLY.md を見てください。');
    process.exit(2);
  }

  let token;
  try {
    token = await fetchAccessToken(sa);
  } catch (e) {
    printFailure(e, `サービスアカウント: ${sa.client_email}`);
    process.exit(1);
  }

  let data;
  try {
    data = await collect(makeClient(token, propertyId), { days: opts.days });
  } catch (e) {
    printFailure(e, `プロパティ: ${propertyId} / サービスアカウント: ${sa.client_email}`);
    process.exit(1);
  }

  if (opts.json) console.log(JSON.stringify(data, null, 2));
  else console.log(renderReport(data));
}

function printFailure(e, context) {
  const lines = [e.message];
  if (e instanceof ApiError) {
    lines.push(`HTTP ${e.status}`);
    lines.push(e.json ? JSON.stringify(e.json, null, 2) : (e.body || '(応答本文なし)').slice(0, 2000));
    if (e.hint) lines.push(`→ ${e.hint}`);
  }
  lines.push(context);
  console.error(lines.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(`予期しないエラー: ${e.stack ?? e.message}`);
    process.exit(1);
  });
}
