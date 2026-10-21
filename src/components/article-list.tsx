import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { ArticleRow } from '@/components/article-row';
import { FeaturedArticle } from '@/components/featured-article';
import { SectionHeader } from '@/components/section-header';
import { SubstackSubscribe } from '@/components/substack-subscribe';
import { ThemedText } from '@/components/themed-text';
import type { Channel } from '@/constants/channels';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLong, todayJST } from '@/lib/articles';
import { useStore } from '@/lib/store';
import type { Article } from '@/lib/types';

type Row =
  | { kind: 'section'; key: string; title: string; aside?: string }
  | { kind: 'subscribe'; key: string }
  | { kind: 'featured'; key: string; article: Article }
  | { kind: 'article'; key: string; article: Article };

/**
 * チャンネル1つ分の記事一覧。
 * トップ: 「本日の配信」（先頭は大きな注目記事）→「これまでの配信」。
 * その他: チャンネル名の見出しの下に新しい順。
 */
export function ArticleList({
  channel,
  width,
  height,
  bottomInset = 0,
}: {
  channel: Channel;
  width?: number;
  height?: number;
  bottomInset?: number;
}) {
  const theme = useTheme();
  const { articles, loading, error, reload, savedIds } = useStore();

  const rows = useMemo<Row[]>(() => {
    const today = todayJST();
    const out: Row[] = [];

    if (channel.id === 'today') {
      const news = articles.filter((a) => a.kind !== 'substack');
      const todays = news.filter((a) => a.published_date === today);
      const past = news.filter((a) => a.published_date !== today);
      if (todays.length) {
        // featured が付いた記事を先頭に（無ければ先頭の記事）
        const lead = todays.find((a) => a.featured) ?? todays[0];
        const ordered = [lead, ...todays.filter((a) => a !== lead)];
        out.push({ kind: 'section', key: 'h-today', title: '本日の配信', aside: `${todays.length}本` });
        ordered.forEach((a, i) => out.push({ kind: i === 0 ? 'featured' : 'article', key: a.id, article: a }));
      } else {
        out.push({ kind: 'section', key: 'h-today', title: '本日の配信', aside: '12時・18時・22時に更新' });
      }
      if (past.length) out.push({ kind: 'section', key: 'h-past', title: 'これまでの配信' });
      past.forEach((a) => out.push({ kind: 'article', key: a.id, article: a }));
      return out;
    }

    const list =
      channel.id === 'saved'
        ? articles.filter((a) => savedIds.has(a.id))
        : articles.filter((a) => a.category === channel.id);

    if (list.length) {
      const latest = list[0].published_date;
      out.push({
        kind: 'section',
        key: 'h-channel',
        title: channel.id === 'substack' ? '加藤浩晃の Substack' : channel.name,
        aside: channel.id === 'saved' ? `${list.length}本` : `${formatDateLong(latest)} 更新`,
      });
    }
    // Substack タブの先頭に購読の案内
    if (channel.id === 'substack') out.push({ kind: 'subscribe', key: 'subscribe' });
    list.forEach((a) => out.push({ kind: 'article', key: a.id, article: a }));
    return out;
  }, [articles, channel, savedIds]);

  const empty = error
    ? `記事を読み込めませんでした。\n下に引っぱって再読み込みしてください。\n（${error}）`
    : channel.id === 'saved'
      ? '保存した記事はまだありません。\n記事を開いて「保存」を押すとここに残ります。'
      : 'このチャンネルの記事はまだありません。';

  return (
    <FlatList
      // 高さが測れていない間（Web の一部環境）は親いっぱいに広げる
      style={{ width, height: height ?? '100%' }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + Spacing.ten }]}
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) => {
        if (item.kind === 'section') return <SectionHeader title={item.title} aside={item.aside} color={channel.color} />;
        if (item.kind === 'subscribe') return <SubstackSubscribe />;
        if (item.kind === 'featured') return <FeaturedArticle article={item.article} />;
        return <ArticleRow article={item.article} />;
      }}
      ListEmptyComponent={
        loading ? undefined : (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {empty}
          </ThemedText>
        )
      }
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={theme.textSecondary} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.ten * 2,
    paddingHorizontal: Spacing.six,
  },
});
