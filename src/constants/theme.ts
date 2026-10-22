/**
 * アプリ全体で使う色・フォント・余白。ライト／ダークの両方を定義する。
 * 方向性は DESIGN.md（白地＋太ゴシック、基調はロイヤルブルー×オレンジ）を参照。
 * チャンネルごとの色は `@/constants/channels` にある。
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    /** 見出し・本文 */
    text: '#121A33',
    /** 発信元・時刻などの脇役 */
    textSecondary: '#7A7A7A',
    /** 既読の見出し。脇役より濃く、本文より薄い */
    textMuted: '#5A6272',
    /** 白地。ニュースアプリの基本 */
    background: '#FFFFFF',
    /** 一段沈んだ面（ティッカー、コメント欄、サムネイルの下地） */
    surface: '#F2F5FD',
    /** 区切り線 */
    line: '#E3E7F0',
    /** アプリの基調色（ロイヤルブルー）。セクションの縦棒、コメントの縦棒、ボタン */
    accent: '#1E4FD8',
    onAccent: '#FFFFFF',
    /** 強調（ティッカーの数字、セクション右端の補足）。オレンジ */
    up: '#F28C28',
  },
  dark: {
    text: '#F2F2F2',
    textSecondary: '#9A9A9A',
    textMuted: '#A7B0C0',
    background: '#111214',
    surface: '#1C1E22',
    line: '#2A2D33',
    accent: '#8FB0FF',
    onAccent: '#0B1529',
    up: '#FFA054',
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
