/**
 * アプリ全体で使う色・フォント・余白。ライト／ダークの両方を定義する。
 * 方向性は DESIGN.md（日経電子版・SmartNews を手本にした白地＋太ゴシック）を参照。
 * チャンネルごとの色は `@/constants/channels` にある。
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** 見出し・本文 */
    text: '#1A1A1A',
    /** 発信元・時刻などの脇役 */
    textSecondary: '#7A7A7A',
    /** 白地。ニュースアプリの基本 */
    background: '#FFFFFF',
    /** 一段沈んだ面（ティッカー、コメント欄、サムネイルの下地） */
    surface: '#F4F5F7',
    /** 区切り線 */
    line: '#E6E6E6',
    /** アプリの基調色（紺）。セクションの縦棒、コメントタグ、ボタン */
    accent: '#1B3A6B',
    onAccent: '#FFFFFF',
    /** 上昇・強調（ティッカーの数字など） */
    up: '#E0462E',
  },
  dark: {
    text: '#F2F2F2',
    textSecondary: '#9A9A9A',
    background: '#111214',
    surface: '#1C1E22',
    line: '#2A2D33',
    accent: '#7FA6E8',
    onAccent: '#0B1529',
    up: '#FF7A66',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui' },
  android: { sans: 'sans-serif' },
  default: { sans: 'var(--font-sans)' },
})!;

/** 4px 基準 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
} as const;

export const Radius = {
  chip: 6,
  thumb: 6,
  tag: 999,
  button: 8,
} as const;

export const Hairline = 1;

export const MaxContentWidth = 720;
