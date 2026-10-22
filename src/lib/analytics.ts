import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * 利用状況の計測（Google アナリティクス 4）。
 *   Web   : gtag.js（+html.tsx で読み込む）に event を送る
 *   ネイティブ: Measurement Protocol に直接 POST する（EXPO_PUBLIC_GA_API_SECRET が必要）
 * 測定 ID（G-XXXXXXXX）が無ければ何もしない。個人を特定する情報は送らない。
 */
// 測定 ID は公開されるものなので既定値をここに置く（別のプロパティで計測したいときは環境変数で上書き）
const MeasurementId = process.env.EXPO_PUBLIC_GA_ID ?? 'G-PYC7DZRBKW';
const ApiSecret = process.env.EXPO_PUBLIC_GA_API_SECRET ?? '';
const ClientKey = 'healthbiz.ga.client.v1';

export const AnalyticsEnabled = MeasurementId.length > 0;

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** 画面（上タブのチャンネル、保存、このアプリ、記事）を見た */
export function trackScreen(screen: string, params: Params = {}) {
  track('screen_view', { screen_name: screen, ...params });
  // GA の標準レポート（ページとスクリーン、リアルタイムの表示回数）に出るよう、Web では page_view も送る
  pageView(typeof params.channel === 'string' ? `${params.channel}｜HB News` : `${screen}｜HB News`);
}

/** 記事を開いた */
export function trackArticle(a: { id: string; title: string; category: string; source_name: string; kind?: string }) {
  pageView(`${a.title.slice(0, 80)}｜HB News`);
  track('article_view', {
    article_id: a.id,
    article_title: a.title.slice(0, 100),
    category: a.category,
    source: a.source_name,
    kind: a.kind ?? 'news',
  });
}

/** 外部リンクやボタンを押した。kind: source / source_2 / company / substack_read / substack_subscribe / share / save / unsave */
export function trackClick(kind: string, params: Params = {}) {
  track('click', { kind, ...params });
}

function pageView(title: string) {
  if (!AnalyticsEnabled || Platform.OS !== 'web') return;
  try {
    window.gtag?.('event', 'page_view', { page_title: title, page_location: window.location.href });
  } catch {
    // 計測の失敗でアプリを止めない
  }
}

export function track(name: string, params: Params = {}) {
  if (!AnalyticsEnabled) return;
  try {
    if (Platform.OS === 'web') {
      window.gtag?.('event', name, params);
      return;
    }
    if (ApiSecret) void sendMeasurementProtocol(name, params);
  } catch {
    // 計測の失敗でアプリを止めない
  }
}

let clientIdPromise: Promise<string> | null = null;
function clientId(): Promise<string> {
  clientIdPromise ??= AsyncStorage.getItem(ClientKey).then(async (saved) => {
    if (saved) return saved;
    const id = `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
    await AsyncStorage.setItem(ClientKey, id).catch(() => {});
    return id;
  });
  return clientIdPromise;
}

async function sendMeasurementProtocol(name: string, params: Params) {
  const client_id = await clientId();
  await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MeasurementId}&api_secret=${ApiSecret}`, {
    method: 'POST',
    body: JSON.stringify({ client_id, events: [{ name, params: { ...params, engagement_time_msec: 100 } }] }),
  });
}
