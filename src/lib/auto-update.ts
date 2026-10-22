import { Platform } from 'react-native';

/**
 * Web 版の自動更新。ビルドごとに version.json（scripts/build-web.sh が書く）を置いておき、
 * アプリが前面に戻ったとき・起動時に取りに行って、手元の版と違えば読み込み直す。
 * ホーム画面に追加したアプリは古い版を長く持ち続けるので、その対策。
 */
const BuildId = process.env.EXPO_PUBLIC_BUILD_ID ?? '';

export function startAutoUpdate() {
  if (Platform.OS !== 'web' || !BuildId || typeof window === 'undefined') return;
  let checking = false;
  const check = async () => {
    if (checking) return;
    checking = true;
    try {
      const base = window.location.pathname.startsWith('/healthbiz-news') ? '/healthbiz-news' : '';
      const res = await fetch(`${base}/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { build } = (await res.json()) as { build?: string };
      if (build && build !== BuildId) {
        // 同じ版への読み込み直しを繰り返さないよう、試した版を覚えておく
        const tried = sessionStorage.getItem('healthbiz.reloaded-for');
        if (tried === build) return;
        sessionStorage.setItem('healthbiz.reloaded-for', build);
        window.location.reload();
      }
    } catch {
      // 通信できないときは何もしない
    } finally {
      checking = false;
    }
  };
  void check();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  window.addEventListener('pageshow', () => void check());
}
