/**
 * 共有カード（1080×1080 の PNG）の描画。Canvas 2D だけで描き、react-native には依存しない。
 * X や Slack に貼ったときに読めるよう、白地・太ゴシック・ロイヤルブルーの縦棒という
 * アプリの見た目（DESIGN.md）をそのまま 1 枚絵にする。
 *
 * 使い方: 1080×1080 の canvas を用意し、`drawShareCard(ctx, { ... })` を呼ぶ。
 * 日本語は空白で分かち書きしないので、折り返しは 1 文字ずつ測って行う（`wrapText`）。
 */

/** カードの一辺（px）。正方形 */
export const ShareCardSize = 1080;

/** 文字と色。DESIGN.md のライトテーマと同じ値 */
export const ShareCardColors = {
  background: '#FFFFFF',
  text: '#121A33',
  textSecondary: '#7A7A7A',
  line: '#E3E7F0',
  accent: '#1E4FD8',
  orange: '#F28C28',
} as const;

/** iOS は system-ui（ヒラギノ角ゴ）、他はそれぞれの標準ゴシックに落ちる */
export const ShareCardFontFamily =
  'system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';

/** カードの固定文言 */
export const ShareCardText = {
  appName: 'Healthcare Business News',
  author: '加藤浩晃のコメント',
  cta: '記事の続きはアプリで',
  qrHint: 'QRコードを読み取ると、この記事が開きます',
  url: 'https://hirokato-med.github.io/healthbiz-news/',
} as const;

/** コメントの引用は先頭から何文字まで出すか */
export const CommentExcerptLength = 110;

export type ShareCardInput = {
  title: string;
  comment: string;
  /** `channelOf(article.category).name` */
  categoryName: string;
  /** `channelOf(article.category).color` */
  categoryColor: string;
  /** 加藤浩晃の顔写真。無ければ薄いグレーの丸を置く */
  avatar?: CanvasImageSource | null;
  /** 記事 URL の QR コード（true が黒いマス）。あればフッターの右に置く */
  qr?: boolean[][] | null;
  /** 描画に使うフォント。既定は `ShareCardFontFamily`（テストで Linux のフォントに差し替えるために開けてある） */
  fontFamily?: string;
};

/** 余白。四辺とも 72px */
const Margin = 72;

/** 行頭に置かない文字（句読点・閉じ括弧・長音・小書き）。追い出しで前の行の末尾の字と一緒に次の行へ送る */
const NoLineStart = /^[、。，．・：；！？!?…‥」』）］｝〉》〕】〙〗〟’”ー〜～ゝゞヽヾ々ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ]$/u;
/** 行末に置かない文字（開き括弧）。次の行の先頭へ送る */
const NoLineEnd = /^[「『（［｛〈《〔【〘〖〝‘“]$/u;
/** 折り返しの単位。英数字の連なり（iBow, FDA, 12%, 3.5 など）は途中で切らない。空白は 1 単位。それ以外は 1 文字ずつ */
const Token = /[A-Za-z0-9][A-Za-z0-9.,'’&%+\-/:]*|\s+|./gsu;

export type WrapOptions = {
  /** これを超えた行は捨て、最後の行の末尾を `…` にする */
  maxLines?: number;
};

/**
 * 日本語の文章を `maxWidth` に収まるよう 1 文字ずつ測って折り返す。
 * 呼ぶ前に `ctx.font` を描画時と同じ値にしておくこと（measureText がそのフォントで測る）。
 * - `\n` は強制改行。空行は詰める
 * - 英数字の連なりは分割しない（1 行に収まらないほど長いときだけ文字単位で割る）
 * - 行頭の句読点・閉じ括弧は前の字ごと次の行へ、行末の開き括弧は次の行へ送る（簡易禁則）
 * - `maxLines` を超えた分は捨て、最後の行を `…` で締める
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, options: WrapOptions = {}): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');

  for (const paragraph of paragraphs) {
    const units = tokenize(paragraph);
    if (units.length === 0) continue;

    let line = '';
    const pushLine = () => {
      const trimmed = line.trimEnd();
      if (trimmed) lines.push(trimmed);
      line = '';
    };

    const fits = (candidate: string) => ctx.measureText(candidate).width <= maxWidth;

    for (const unit of units) {
      if (/^\s+$/.test(unit)) {
        // 行頭の空白は捨てる。行中の空白はそのまま続ける（幅は次の文字と一緒に判定）
        if (line) line += unit;
        continue;
      }
      if (fits(line + unit)) {
        line += unit;
        continue;
      }
      if (line) {
        // ここで折り返す。禁則: 行頭に句読点が来るなら前の字を道連れに、行末が開き括弧なら次の行へ
        let carry = '';
        let chars = Array.from(line.trimEnd());
        if (NoLineStart.test(unit) && chars.length >= 2) {
          carry = chars[chars.length - 1]!;
          chars = chars.slice(0, -1);
        }
        if (chars.length >= 2 && NoLineEnd.test(chars[chars.length - 1]!)) {
          carry = chars[chars.length - 1]! + carry;
          chars = chars.slice(0, -1);
        }
        line = chars.join('');
        pushLine();
        line = carry;
        if (fits(line + unit)) {
          line += unit;
          continue;
        }
      }
      // 1 単位だけで幅を超える（長い URL など）→ 文字単位で割る
      for (const ch of Array.from(unit)) {
        if (line && !fits(line + ch)) pushLine();
        line += ch;
      }
    }
    pushLine();
  }

  const { maxLines } = options;
  if (maxLines !== undefined && lines.length > maxLines) {
    const kept = lines.slice(0, Math.max(1, maxLines));
    kept[kept.length - 1] = ellipsize(ctx, kept[kept.length - 1]!, maxWidth);
    return kept;
  }
  return lines;
}

/** `line` の末尾を削って `…` を付け、`maxWidth` に収める */
export function ellipsize(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string {
  const chars = Array.from(line);
  // 読点や空白の直後に … が来ると間が抜けるので、そこまで削る
  const clean = () => {
    while (chars.length && /[、，\s]/.test(chars[chars.length - 1]!)) chars.pop();
  };
  clean();
  while (chars.length > 0 && ctx.measureText(chars.join('') + '…').width > maxWidth) {
    chars.pop();
    clean();
  }
  return chars.join('') + '…';
}

function tokenize(paragraph: string): string[] {
  return paragraph.match(Token) ?? [];
}

/** コメントの冒頭を `CommentExcerptLength` 文字で切り、続きがあれば `…` を付ける */
export function excerptComment(comment: string, length = CommentExcerptLength): string {
  const chars = Array.from(comment.trim());
  if (chars.length <= length) return chars.join('');
  let cut = chars.slice(0, length).join('').replace(/[、，。\s]+$/u, '');
  cut = cut.replace(/\n+$/u, '');
  return `${cut}…`;
}

/**
 * 1080×1080 の共有カードを描く。ctx は同じ大きさの canvas のもの。
 * 上から: アプリ名 → 分類ラベル（チャンネル色）→ 見出し（最大 4 行）→ 青い縦棒付きの引用 →
 * 丸いアバターと「加藤浩晃のコメント」→ 罫線 → 「記事の続きはアプリで」と URL（QR があれば右に QR コード）。
 * 見出しもコメントも短いときは中身が上に寄って下が空くので、空きの半分だけ（上限あり）下げて置く。
 */
export function drawShareCard(ctx: CanvasRenderingContext2D, input: ShareCardInput): void {
  const W = ShareCardSize;
  const H = ShareCardSize;
  const M = Margin;
  const contentWidth = W - M * 2;
  const family = input.fontFamily ?? ShareCardFontFamily;
  const font = (weight: 400 | 700, size: number) => `${weight} ${size}px ${family}`;
  const C = ShareCardColors;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 背景（白）
  ctx.fillStyle = C.background;
  ctx.fillRect(0, 0, W, H);

  // ── アプリ名。オレンジの小さな四角を目印に、紺の太字で小さく
  const appNameSize = 26;
  ctx.fillStyle = C.orange;
  ctx.fillRect(M, M + 7, 12, 12);
  ctx.fillStyle = C.accent;
  ctx.font = font(700, appNameSize);
  ctx.fillText(ShareCardText.appName, M + 12 + 14, M);

  // ── 下から固定の要素（罫線・CTA・URL）の位置
  const qr = input.qr && input.qr.length > 0 ? input.qr : null;
  const footerRuleY = H - M - (qr ? 150 : 96);
  const avatarSize = 60;
  const gapQuoteToAuthor = 28;
  const gapAuthorToFooter = 44;
  /** 著者行の下端はここまで */
  const bodyMaxBottom = footerRuleY - gapAuthorToFooter;

  // ── 先に測る: 見出しは 60px で 4 行に収まらなければ 54px、それでも溢れたら 4 行目を … で締める
  const TitleMaxLines = 4;
  let titleSize = 60;
  let titleLines: string[] = [];
  for (const size of [60, 54]) {
    titleSize = size;
    ctx.font = font(700, size);
    titleLines = wrapText(ctx, input.title.trim(), contentWidth);
    if (titleLines.length <= TitleMaxLines) break;
  }
  if (titleLines.length > TitleMaxLines) {
    ctx.font = font(700, titleSize);
    titleLines = wrapText(ctx, input.title.trim(), contentWidth, { maxLines: TitleMaxLines });
  }
  const titleLineHeight = titleSize === 60 ? 80 : 72;
  const titleHeight = titleLines.length * titleLineHeight;

  // ── 引用（コメント冒頭）。残りの高さに入る行数まで（2〜6 行）
  const categoryTop = 140;
  const categorySize = 30;
  const titleTop = categoryTop + categorySize + 22;
  const quoteTop = titleTop + titleHeight + 48;
  const barWidth = 4;
  const quoteX = M + barWidth + 30;
  const quoteWidth = W - M - quoteX;
  const quoteSize = 32;
  const quoteLineHeight = 50;
  const quoteMaxBottom = bodyMaxBottom - avatarSize - gapQuoteToAuthor;
  const quoteMaxLines = Math.max(2, Math.min(6, Math.floor((quoteMaxBottom - quoteTop) / quoteLineHeight)));
  ctx.font = font(400, quoteSize);
  const quoteLines = wrapText(ctx, excerptComment(input.comment), quoteWidth, { maxLines: quoteMaxLines });
  const quoteHeight = quoteLines.length * quoteLineHeight;
  /** コメントが空のときは縦棒も出さず、著者行を見出しの直下に置く */
  const hasQuote = quoteLines.length > 0;
  const quoteBlockHeight = hasQuote ? quoteHeight + gapQuoteToAuthor : 0;

  // ── 空きがあれば本文をその半分だけ下げる（上限 120px。アプリ名から離れすぎないように）
  const authorBottom = quoteTop + quoteBlockHeight + avatarSize;
  const shift = Math.min(120, Math.max(0, Math.floor((bodyMaxBottom - authorBottom) / 2)));

  // ── 分類ラベル（チャンネル色）
  ctx.font = font(700, categorySize);
  ctx.fillStyle = input.categoryColor;
  ctx.fillText(input.categoryName.trim(), M, categoryTop + shift);

  // ── 見出し
  ctx.fillStyle = C.text;
  ctx.font = font(700, titleSize);
  drawLines(ctx, titleLines, M, titleTop + shift, titleLineHeight, titleSize);

  // ── 引用。左に 4px のロイヤルブルーの縦棒
  if (hasQuote) {
    ctx.fillStyle = C.accent;
    ctx.fillRect(M, quoteTop + shift + 4, barWidth, quoteHeight - 8);
    ctx.fillStyle = C.text;
    ctx.font = font(400, quoteSize);
    drawLines(ctx, quoteLines, quoteX, quoteTop + shift, quoteLineHeight, quoteSize);
  }

  // ── 著者行。丸いアバター + 「加藤浩晃のコメント」
  const authorTop = quoteTop + quoteBlockHeight + shift;
  drawAvatar(ctx, input.avatar ?? null, quoteX, authorTop, avatarSize);
  const authorSize = 28;
  ctx.fillStyle = C.text;
  ctx.font = font(700, authorSize);
  ctx.fillText(ShareCardText.author, quoteX + avatarSize + 16, authorTop + (avatarSize - authorSize) / 2 - 1);

  // ── フッター。罫線 → 「記事の続きはアプリで」（オレンジの目印付き）→ URL（紺）。QR があれば右端に置き、文字はその左に収める
  ctx.fillStyle = C.line;
  ctx.fillRect(M, footerRuleY, contentWidth, 2);
  const qrSize = 168;
  const footerTextWidth = qr ? contentWidth - qrSize - 32 : contentWidth;
  const ctaTop = footerRuleY + (qr ? 36 : 26);
  const ctaSize = 28;
  ctx.fillStyle = C.orange;
  ctx.fillRect(M, ctaTop + 9, 10, 10);
  ctx.fillStyle = C.text;
  ctx.font = font(700, ctaSize);
  ctx.fillText(ShareCardText.cta, M + 10 + 12, ctaTop);
  let urlTop = ctaTop + ctaSize + 12;
  if (qr) {
    const hintSize = 24;
    ctx.fillStyle = C.textSecondary;
    ctx.font = font(400, hintSize);
    ctx.fillText(fitWidth(ctx, ShareCardText.qrHint, footerTextWidth), M, urlTop);
    urlTop += hintSize + 14;
  }
  const urlSize = 28;
  ctx.fillStyle = C.accent;
  ctx.font = font(400, urlSize);
  ctx.fillText(fitWidth(ctx, ShareCardText.url, footerTextWidth), M, urlTop);
  if (qr) drawQr(ctx, qr, W - M - qrSize, footerRuleY + 22, qrSize, C.text);

  ctx.restore();
}

/** QR コードを size×size の正方形に描く。周りに 2 マス分の白い余白（読み取りに要る）を取る */
function drawQr(ctx: CanvasRenderingContext2D, modules: boolean[][], x: number, y: number, size: number, color: string): void {
  const n = modules.length;
  const cell = size / (n + 4);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = color;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // 隣のマスと隙間ができないよう、座標を丸めてから塗る
      if (modules[r][c]) {
        const x0 = Math.round(x + (c + 2) * cell);
        const y0 = Math.round(y + (r + 2) * cell);
        ctx.fillRect(x0, y0, Math.round(x + (c + 3) * cell) - x0, Math.round(y + (r + 3) * cell) - y0);
      }
    }
  }
}

/** 行の配列を `lineHeight` 間隔で描き、最後の行の下端の y を返す。文字は行の高さの中央に置く */
function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, top: number, lineHeight: number, fontSize: number): number {
  const offset = (lineHeight - fontSize) / 2;
  lines.forEach((line, i) => ctx.fillText(line, x, top + i * lineHeight + offset));
  return top + lines.length * lineHeight;
}

/** 幅に収まらないときだけ末尾を … にする（URL 用。普通は収まる） */
function fitWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  return ctx.measureText(text).width <= maxWidth ? text : ellipsize(ctx, text, maxWidth);
}

/** 丸く切り抜いたアバター。画像が無ければ薄いグレーの丸。縦横比が 1:1 でなければ中央を正方形に切り出す */
function drawAvatar(ctx: CanvasRenderingContext2D, avatar: CanvasImageSource | null, x: number, y: number, size: number): void {
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = ShareCardColors.line;
  ctx.fill();
  if (avatar) {
    ctx.clip();
    const { w, h } = sourceSize(avatar);
    if (w > 0 && h > 0) {
      const side = Math.min(w, h);
      ctx.drawImage(avatar, (w - side) / 2, (h - side) / 2, side, side, x, y, size, size);
    } else {
      ctx.drawImage(avatar, x, y, size, size);
    }
  }
  ctx.restore();
  // 縁取り（写真の白い部分が背景に溶けないように）
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + r, y + r, r - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = ShareCardColors.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** 画像ソースの元の大きさ。取れなければ 0 */
function sourceSize(src: CanvasImageSource): { w: number; h: number } {
  if ('naturalWidth' in src) return { w: src.naturalWidth, h: src.naturalHeight };
  if ('videoWidth' in src) return { w: src.videoWidth, h: src.videoHeight };
  const w = 'width' in src ? src.width : 0;
  const h = 'height' in src ? src.height : 0;
  return typeof w === 'number' && typeof h === 'number' ? { w, h } : { w: 0, h: 0 };
}
