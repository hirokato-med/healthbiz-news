import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleRow } from '@/components/article-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Hairline, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick, trackScreen } from '@/lib/analytics';
import { articlesOfCompany } from '@/lib/related';
import { useStore } from '@/lib/store';

/**
 * 企業ページ。その会社が当事者の記事一覧と、会社情報（未上場なら概要と代表、上場企業なら市場と直近の業績）。
 * URL は /company/<社名>。
 */
export default function CompanyScreen() {
  const { name: raw } = useLocalSearchParams<{ name: string }>();
  const name = safeDecode(raw ?? '');
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { articles } = useStore();
  const { articles: list, info } = useMemo(() => articlesOfCompany(name, articles), [name, articles]);

  useEffect(() => {
    trackScreen('company', { company: name });
  }, [name]);

  const header = (
    <View style={styles.header}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {info ? '企業' : '発信元'}
      </ThemedText>
      <ThemedText type="title">{info?.name ?? name}</ThemedText>
      {info?.listed ? (
        <View style={[styles.tag, { backgroundColor: theme.surface }]}>
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
            {info.listed}
          </ThemedText>
        </View>
      ) : null}
      {info?.financials ? (
        <View style={[styles.financials, { borderLeftColor: theme.up }]}>
          <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '700' }}>
            直近の業績
          </ThemedText>
          <ThemedText style={styles.body}>{info.financials}</ThemedText>
        </View>
      ) : null}
      {info?.profile ? <ThemedText style={styles.body}>{info.profile}</ThemedText> : null}
      {info?.ceo ? (
        <View style={styles.ceo}>
          <ThemedText type="caption" style={{ fontWeight: '700' }}>
            ▸ 代表：{info.ceo.name}
          </ThemedText>
          {info.ceo.bio && !/経歴確認できない|不明/.test(info.ceo.bio) ? <ThemedText style={styles.body}>{info.ceo.bio}</ThemedText> : null}
        </View>
      ) : null}
      {info?.url ? (
        <Pressable onPress={() => (trackClick('company', { company: name }), WebBrowser.openBrowserAsync(info.url!))} accessibilityRole="link">
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
            会社サイト ↗
          </ThemedText>
        </Pressable>
      ) : null}
      <ThemedText type="section" style={styles.sectionLabel}>
        {info ? 'この会社の記事' : 'この発信元の記事'} <ThemedText type="caption" style={{ color: theme.up }}>{list.length}本</ThemedText>
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.barButton} accessibilityRole="button" hitSlop={6}>
          <ThemedText style={[styles.barButtonText, { color: theme.accent }]}>‹ 戻る</ThemedText>
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArticleRow article={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            この会社の記事はまだありません。
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

/** expo-router が復号済みのことも、%xx のままのこともあるので、失敗したらそのまま使う */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.two, paddingBottom: Spacing.two, borderBottomWidth: Hairline },
  barButton: { paddingHorizontal: Spacing.two, paddingVertical: 6 },
  barButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  content: { paddingHorizontal: Spacing.four, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  header: { paddingTop: Spacing.five, gap: Spacing.two },
  tag: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.chip },
  financials: { borderLeftWidth: 3, paddingLeft: Spacing.three, gap: 2, marginTop: Spacing.one },
  body: { fontSize: 14, lineHeight: 23 },
  ceo: { gap: Spacing.one },
  sectionLabel: { marginTop: Spacing.five, marginBottom: Spacing.one },
  empty: { textAlign: 'center', paddingVertical: Spacing.ten },
});
