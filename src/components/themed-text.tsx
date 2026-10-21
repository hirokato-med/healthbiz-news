import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'headline' | 'featured' | 'title' | 'caption' | 'eyebrow' | 'section' | 'comment';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'], fontFamily: Fonts.sans }, styles[type], style]} {...rest} />;
}

/**
 * 型スケール（DESIGN.md）。すべてゴシック。
 *   caption 12 / body 15 / headline 16 / featured 19 / title 22 / section 17
 */
const styles = StyleSheet.create({
  default: {
    fontSize: 15,
    lineHeight: 25,
  },
  /** 一覧行の見出し。太ゴシック */
  headline: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  /** 大きな注目記事の見出し */
  featured: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
  },
  /** 記事詳細の見出し */
  title: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '700',
  },
  /** 発信元・時刻・注記 */
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  /** 見出しの上の分類ラベル（Deep Insight のような位置） */
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  /** セクション見出し（注目ニュース） */
  section: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  /** 加藤コメント */
  comment: {
    fontSize: 15,
    lineHeight: 26,
  },
});
