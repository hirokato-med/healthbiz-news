/**
 * 記事の共有。Web では 1080×1080 の共有カード（PNG）を canvas で描いて Web Share API に渡す。
 * 画像付きの共有ができない環境（デスクトップのブラウザなど）では PNG をダウンロードし、
 * 見出しと URL をクリップボードに入れる。それも駄目ならテキスト共有に落ちる。
 * ネイティブは今のところテキスト共有だけ（画像は後で react-native-view-shot で画面を撮る）。
 *
 * 注意（Web）:
 * - ファイル付きの `navigator.share` は HTTPS と iOS 15 以降の Safari が必要
 * - 共有シートはタップ直後（transient activation の間）にしか開けないので、
 *   タップから `navigator.share` までの非同期処理は最小にしてある。顔写真は 1 回読んだら使い回し、
 *   PNG 化は同期の `toDataURL` で行う。画面を開いたときに `preloadShareCard()` を呼んでおくと初回も速い
 */

import qrcode from 'qrcode-generator';
import { Image, Platform, Share } from 'react-native';

import { channelOf } from '@/constants/channels';
import { drawShareCard, ShareCardSize } from '@/lib/share-card-draw';
import type { Article } from '@/lib/types';

/** 公開している Web アプリの URL（末尾スラッシュ付き） */
export const AppUrl = 'https://hirokato-med.github.io/healthbiz-news/';

/** どの形で共有できたか。image: 画像付き / download: PNG を保存して本文をコピー / text: テキストのみ */
export type ShareResult = 'image' | 'text' | 'download';

/** 記事詳細の URL */
export function articleUrlOf(article: Article): string {
  return `${AppUrl}article/${article.id}`;
}

/** SNS ごとの投稿画面の URL（ログイン済みならそのまま投稿できる） */
export type SnsId = 'x' | 'facebook' | 'line' | 'linkedin';
export function snsShareUrlOf(sns: SnsId, article: Article): string {
  const url = encodeURIComponent(articleUrlOf(article));
  const text = encodeURIComponent(`${article.title}｜加藤浩晃のコメント付き`);
  switch (sns) {
    case 'x':
      return `https://x.com/intent/post?text=${text}&url=${url}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case 'line':
      return `https://social-plugins.line.me/lineit/share?url=${url}&text=${text}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }
}

/** 共有シートに添える本文（見出しと記事 URL） */
function shareTextOf(article: Article): string {
  return `${article.title}\n${articleUrlOf(article)}`;
}

/** 記事を共有する。戻り値で画面側のトースト文言などを変えられる */
export async function shareArticle(article: Article): Promise<ShareResult> {
  const text = shareTextOf(article);

  if (Platform.OS !== 'web') {
    // TODO(native): react-native-view-shot で共有カードを撮って画像共有にする。それまではテキスト
    await Share.share({ message: `${text}\n\n— Healthcare Business News（加藤浩晃のコメント付き）` }).catch(() => {});
    return 'text';
  }

  try {
    const file = await renderShareCardFile(article);
    if (canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: article.title, text });
      } catch (e) {
        // 共有シートを閉じただけ（AbortError）は成功扱い。それ以外は下のフォールバックへ
        if (!isAbortError(e)) throw e;
      }
      return 'image';
    }
    downloadFile(file);
    await copyText(text);
    return 'download';
  } catch {
    await shareTextOnWeb(article.title, text, articleUrlOf(article));
    return 'text';
  }
}

/** 顔写真を先に読んでおく（Web のみ。記事画面を開いたときに呼ぶと初回の共有が速い） */
export function preloadShareCard(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  void loadAvatar();
}

// ── Web: 共有カードの生成 ─────────────────────────────────────────────

/** 共有カードを描いて PNG の File にする */
async function renderShareCardFile(article: Article): Promise<File> {
  if (typeof document === 'undefined') throw new Error('DOM がありません');
  const avatar = await loadAvatar();
  const canvas = document.createElement('canvas');
  canvas.width = ShareCardSize;
  canvas.height = ShareCardSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas を使えません');

  const channel = channelOf(article.category);
  drawShareCard(ctx, {
    title: article.title,
    comment: article.comment,
    categoryName: channel.name,
    categoryColor: channel.color,
    avatar,
    qr: qrModulesOf(articleUrlOf(article)),
  });

  // toBlob は別タスクで戻るためタップの activation が切れやすい。同期の toDataURL から Blob を組む
  const blob = dataUrlToBlob(canvas.toDataURL('image/png'));
  return new File([blob], `healthbiz-news-${article.id.slice(0, 8)}.png`, { type: 'image/png' });
}

/** URL を QR コードのマス目（true が黒）にする。誤り訂正は M（15%） */
function qrModulesOf(url: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(0, comma);
  const type = /^data:([^;,]+)/.exec(meta)?.[1] ?? 'image/png';
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

let avatarPromise: Promise<HTMLImageElement | null> | null = null;

/** 加藤浩晃の顔写真。読めなければ null（カードはグレーの丸で描く）。一度読んだら使い回す */
function loadAvatar(): Promise<HTMLImageElement | null> {
  avatarPromise ??= new Promise<HTMLImageElement | null>((resolve) => {
    const uri = avatarUri();
    if (!uri) {
      resolve(null);
      return;
    }
    const img = document.createElement('img');
    // 別オリジンから配信されても canvas が汚染されないように（同一オリジンでは無害）
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      avatarPromise = null; // 次の共有でもう一度試す
      resolve(null);
    };
    img.src = uri;
  });
  return avatarPromise;
}

/**
 * アセットの URI。Metro の require は Web では `{ uri, width, height }`、
 * ネイティブではアセット ID（数値）を返すので、どちらでも URI にする。
 * `@/components/kato-avatar.tsx` と同じファイルを使う。
 */
function avatarUri(): string | null {
  const asset: unknown = require('@/assets/images/kato-avatar.png');
  if (typeof asset === 'string') return asset;
  if (typeof asset === 'number') return Image.resolveAssetSource(asset)?.uri ?? null;
  if (asset && typeof asset === 'object' && 'uri' in asset && typeof asset.uri === 'string') return asset.uri;
  return null;
}

// ── Web: 共有・保存・コピー ──────────────────────────────────────────

/** ファイル付きの Web Share が使えるか（iOS 15+ の Safari、Android Chrome。HTTPS が必要） */
function canShareFiles(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try {
    return navigator.canShare?.({ files: [file] }) === true;
  } catch {
    return false;
  }
}

function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'name' in e && e.name === 'AbortError';
}

/** PNG を <a download> で保存する */
function downloadFile(file: File): void {
  const href = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // ダウンロードが始まるまで URL を生かしておく
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/** クリップボードに入れる。入れられたら true */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // クリップボードが使えない環境（HTTP など）では何もしない
    return false;
  }
}

/** 画像なしの共有。Web Share があればそれを、無ければクリップボードに入れる */
async function shareTextOnWeb(title: string, text: string, url: string): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return;
    }
  } catch {
    // 閉じられた・使えない → 下でコピーだけする
  }
  await copyText(text);
}
