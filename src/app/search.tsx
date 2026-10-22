import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleRow } from '@/components/article-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Hairline, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track, trackScreen } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import type { Article } from '@/lib/types';

/** 検索。社名・見出し・コメント・会社情報を対象に、スペース区切りの AND 検索 */
export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { articles } = useStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    trackScreen('search');
  }, []);

  const terms = query
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .split(/[\s　]+/)
    .filter(Boolean);
  const results = useMemo(() => {
    if (!terms.length) return [];
    return articles.filter((a) => {
      const hay = haystack(a);
      return terms.every((t) => hay.includes(t));
    });
  }, [articles, terms.join(' ')]);

  // 検索語ごとの件数を計測（入力が落ち着いてから）
  useEffect(() => {
    if (!terms.length) return;
    const t = setTimeout(() => track('search', { query: query.trim().slice(0, 50), results: results.length }), 800);
    return () => clearTimeout(t);
  }, [query, results.length]);

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.barButton} accessibilityRole="button" hitSlop={6}>
          <ThemedText style={[styles.barButtonText, { color: theme.accent }]}>‹ 戻る</ThemedText>
        </Pressable>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="社名・キーワードで検索"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="検索"
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArticleRow article={item} compact />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          terms.length ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.count}>
              {results.length}件
            </ThemedText>
          ) : undefined
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {terms.length ? '見つかりませんでした。別の言葉で試してください。' : '社名（例: エムスリー、Ubie）や言葉（例: 電子カルテ、資金調達）で、これまでの記事を探せます。'}
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

function haystack(a: Article): string {
  return [a.title, a.source_name, a.comment, a.company?.name, a.company?.profile, ...(a.summary ?? [])]
    .filter(Boolean)
    .join('\n')
    .normalize('NFKC')
    .toLowerCase();
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: Hairline,
  },
  barButton: { paddingHorizontal: Spacing.two, paddingVertical: 6 },
  barButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.button,
    marginRight: Spacing.two,
  },
  content: { paddingHorizontal: Spacing.four, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  count: { paddingTop: Spacing.three },
  empty: { textAlign: 'center', paddingVertical: Spacing.ten * 2, paddingHorizontal: Spacing.six, lineHeight: 24 },
});
