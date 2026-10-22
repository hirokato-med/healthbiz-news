import { useMemo, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { PullToRefresh } from '@/components/pull-to-refresh';

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
import { uiState } from '@/lib/ui-state';
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
  const listRef = useRef<FlatList<Row>>(null);
  // 記事から戻ってきたとき、読んでいた位置に戻す（復元は一覧が十分な高さになった最初の1回だけ）
  const restored = useRef(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    uiState.scroll.set(channel.id, e.nativeEvent.contentOffset.y);
  };
  const onContentSizeChange = (_w: number, h: number) => {
    if (restored.current) return;
    const y = uiState.scroll.get(channel.id) ?? 0;
    if (y <= 0) {
      restored.current = true;
      return;
    }
    if (h >= y + (height ?? 0)) {
      restored.current = true;
      listRef.current?.scrollToOffset({ offset: y, animated: false });
    }
  };

  const rows = useMemo<Row[]>(() => {
    const today = todayJST();
    const out: Row[] = [];

    if (channel.id === 'today') {
      const news = articles.filter((a) => a.kind !== 'substack');
      // 先頭の枠は「直近の配信日」の記事。日付が変わって当日分がまだ無い間も、前日の配信を大きく出し続ける
      const latest = news[0]?.published_date;
      if (!latest) {
        out.push({ kind: 'section', key: 'h-today', title: '本日の配信', aside: '12時・18時・22時に更新' });
        return out;
      }
      // いちばん大きな枠は「直近24時間でいちばん大事な1本」（featured）。新しい順ではない。
      // 画像を大きく出す枠なので、画像のある記事を優先する。直近の配信日とその前日から探す
      const recent = (a: Article) => a.published_date >= dayBefore(latest);
      const lead =
        news.find((a) => a.featured && a.image_url && recent(a)) ??
        news.find((a) => a.image_url && a.published_date === latest) ??
        news.find((a) => a.featured && recent(a)) ??
        news[0];
      const todays = news.filter((a) => a.published_date === latest && a !== lead);
      const past = news.filter((a) => a.published_date !== latest && a !== lead);
      const title = latest === today ? '本日の配信' : `${formatDateLong(latest)}の配信`;
      out.push({ kind: 'section', key: 'h-today', title, aside: `${todays.length + (lead.published_date === latest ? 1 : 0)}本` });
      out.push({ kind: 'featured', key: lead.id, article: lead });
      todays.forEach((a) => out.push({ kind: 'article', key: a.id, article: a }));
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
        title: channel.id === 'substack' ? '加藤浩晃のメルマガ' : channel.name,
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
    <PullToRefresh onRefresh={reload} refreshing={loading} listRef={listRef} width={width}>
      <FlatList
      ref={listRef}
      onScroll={onScroll}
      scrollEventThrottle={100}
      onContentSizeChange={onContentSizeChange}
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
    </PullToRefresh>
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

/** "2026-10-21" → "2026-10-20" */
function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
