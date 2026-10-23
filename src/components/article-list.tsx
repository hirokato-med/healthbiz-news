import { useMemo, useRef } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { PullToRefresh } from '@/components/pull-to-refresh';

import { ArticleRow } from '@/components/article-row';
import { ColumnHeader, DesktopLead, DesktopRow, DesktopSubCard } from '@/components/desktop-columns';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { FeaturedArticle } from '@/components/featured-article';
import { SectionHeader } from '@/components/section-header';
import { SubscribeLink } from '@/components/subscribe-link';
import { SubstackSubscribe } from '@/components/substack-subscribe';
import { ThemedText } from '@/components/themed-text';
import type { Channel } from '@/constants/channels';
import { Hairline, MaxContentWidth, Spacing } from '@/constants/theme';
import { DesktopMaxWidth, SidebarWidth, useDesktop } from '@/hooks/use-desktop';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLong, todayJST } from '@/lib/articles';
import { useStore } from '@/lib/store';
import { uiState } from '@/lib/ui-state';
import type { Article } from '@/lib/types';

type Row =
  | { kind: 'section'; key: string; title: string; aside?: string }
  | { kind: 'subscribe'; key: string }
  | { kind: 'subscribe-link'; key: string }
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
  onSelectChannel,
}: {
  channel: Channel;
  width?: number;
  height?: number;
  bottomInset?: number;
  /** PC 向け画面の右の列から、トップのタブを切り替える */
  onSelectChannel?: (index: number) => void;
}) {
  const theme = useTheme();
  const desktop = useDesktop();
  // PC 向けは 2 段組（記事の段＋右の段）。3 段組の描き方も残してあるが、いまは使わない（加藤さんの判断）
  const threeColumns = false;
  const { articles, loading, error, reload, savedIds } = useStore();
  const listRef = useRef<FlatList<Row>>(null);
  const deskListRef = useRef<FlatList<Article>>(null);
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
      // 決算は「決算」タブで見る（決算シーズンにトップが埋まらないように）。トップに出すのは featured にしたものだけ
      const news = articles.filter((a) => a.kind !== 'substack' && a.kind !== 'weekly' && a.kind !== 'monthly' && (a.category !== 'earnings' || a.featured));
      // まとめ（今週のまとめ・今月の注目決算）
      // 先頭の枠は「直近の配信日」の記事。日付が変わって当日分がまだ無い間も、前日の配信を大きく出し続ける
      const latest = news[0]?.published_date;
      if (!latest) {
        out.push({ kind: 'section', key: 'h-today', title: '本日の配信', aside: loading ? '読み込み中…' : '12時・18時・22時に更新' });
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
      // 今週のまとめ（土曜配信）は、出てから2日間は注目記事のすぐ下に出す
      const weeklies = articles.filter((a) => a.kind === 'weekly' || a.kind === 'monthly');
      // 出てから2日間は注目記事のすぐ下に出す（今週のまとめと今月の注目決算が重なれば両方）
      const freshDigests = weeklies.filter((w) => w.published_date >= dayBefore(latest));
      const todays = news.filter((a) => a.published_date === latest && a !== lead);
      const past = [...news.filter((a) => a.published_date !== latest && a !== lead), ...weeklies.filter((w) => !freshDigests.includes(w))].sort((a, b) => b.published_date.localeCompare(a.published_date));
      const title = latest === today ? '本日の配信' : `${formatDateLong(latest)}の配信`;
      out.push({ kind: 'section', key: 'h-today', title, aside: `${todays.length + (lead.published_date === latest ? 1 : 0)}本` });
      out.push({ kind: 'featured', key: lead.id, article: lead });
      // 注目記事の直下にメルマガ登録の導線（カードとは別の行にして、読み上げでも届くように）
      out.push({ kind: 'subscribe-link', key: 'subscribe-link' });
      freshDigests.forEach((w) => out.push({ kind: 'article', key: w.id, article: w }));
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
  }, [articles, channel, savedIds, loading]);

  // PC 向け 3 段組: 左の段（トップ記事＋小さな 2 本）と中の段（新着の一覧）に分ける。右の段は DesktopSidebar
  const desk = useMemo(() => {
    const articlesIn = rows.flatMap((r) => (r.kind === 'article' || r.kind === 'featured' ? [r.article] : []));
    const featured = rows.find((r) => r.kind === 'featured');
    const lead = featured?.kind === 'featured' ? featured.article : (articlesIn.slice(0, 6).find((a) => a.image_url && !a.kind) ?? articlesIn[0]);
    const latest = lead?.published_date;
    const subs =
      threeColumns ? articlesIn.filter((a) => a !== lead && a.image_url && !a.kind && a.published_date === latest).slice(0, 2) : [];
    const list = articlesIn.filter((a) => a !== lead && !subs.includes(a));
    const head = rows.find((r) => r.kind === 'section');
    return {
      lead,
      subs,
      list,
      leftTitle: channel.id === 'today' ? '本日のトップ' : channel.id === 'saved' ? '保存した記事' : channel.name,
      centerTitle: channel.id === 'today' ? '新着' : '記事一覧',
      aside: head?.kind === 'section' ? head.aside : undefined,
    };
  }, [rows, channel, threeColumns]);

  const empty = error
    ? `記事を読み込めませんでした。\n下に引っぱって再読み込みしてください。\n（${error}）`
    : channel.id === 'saved'
      ? '保存した記事はまだありません。\n記事を開いて「保存」を押すとここに残ります。'
      : 'このチャンネルの記事はまだありません。';

  const mobileList = (
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
        if (item.kind === 'subscribe-link')
          return (
            <View style={[styles.subscribeRow, { borderBottomColor: theme.line }]}>
              <SubscribeLink where="featured" />
            </View>
          );
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={theme.textSecondary} />}
    />
  );

  // PC 向け 2 段組: 左にトップ記事（横並び）と一覧をまとめ、右に「今日の注目」など
  if (desktop && !threeColumns) {
    return (
      <View style={{ width, height: height ?? '100%', alignItems: 'center' }}>
        <View style={[styles.desktopRow, { height: height ?? '100%' }]}>
          <FlatList
            ref={deskListRef}
            onScroll={onScroll}
            scrollEventThrottle={100}
            style={[styles.mainCol, { borderRightColor: theme.line }]}
            contentContainerStyle={styles.colContent}
            data={desk.list}
            keyExtractor={(a) => a.id}
            ListHeaderComponent={
              <View>
                <ColumnHeader title={desk.leftTitle} aside={desk.aside} />
                {desk.lead ? <DesktopLead article={desk.lead} horizontal /> : null}
                {desk.subs.length ? (
                  <View style={[styles.subs, { borderTopColor: theme.line }]}>
                    {desk.subs.map((a) => (
                      <DesktopSubCard key={a.id} article={a} />
                    ))}
                    {desk.subs.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ) : null}
                {channel.id === 'today' ? (
                  <View style={[styles.subscribeRow, { borderBottomColor: theme.line, marginTop: Spacing.four }]}>
                    <SubscribeLink where="featured" />
                  </View>
                ) : null}
                {channel.id === 'substack' ? <SubstackSubscribe /> : null}
                {desk.list.length ? (
                  <View style={{ marginTop: Spacing.six }}>
                    <ColumnHeader title={desk.centerTitle} />
                  </View>
                ) : null}
                {!desk.lead && !loading ? (
                  <ThemedText themeColor="textSecondary" style={styles.empty}>
                    {empty}
                  </ThemedText>
                ) : null}
              </View>
            }
            renderItem={({ item }) => <DesktopRow article={item} wide />}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={theme.textSecondary} />}
          />
          <ScrollView style={styles.rightCol} contentContainerStyle={styles.colContent} showsVerticalScrollIndicator={false}>
            <DesktopSidebar onSelectChannel={onSelectChannel} />
          </ScrollView>
        </View>
      </View>
    );
  }

  // PC 向け 3 段組（トップ・横幅が十分あるとき）: 左の段・中の段・右の段（各段は別々にスクロール）
  if (desktop) {
    return (
      <View style={{ width, height: height ?? '100%', alignItems: 'center' }}>
        <View style={[styles.desktopRow, { height: height ?? '100%' }]}>
          <ScrollView style={styles.leftCol} contentContainerStyle={styles.colContent} showsVerticalScrollIndicator={false}>
            <ColumnHeader title={desk.leftTitle} aside={channel.id === 'today' ? undefined : desk.aside} />
            {desk.lead ? <DesktopLead article={desk.lead} /> : null}
            {desk.subs.length ? (
              <View style={[styles.subs, { borderTopColor: theme.line }]}>
                {desk.subs.map((a) => (
                  <DesktopSubCard key={a.id} article={a} />
                ))}
                {desk.subs.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ) : null}
            {channel.id === 'today' ? (
              <View style={[styles.subscribeRow, { borderBottomColor: theme.line, marginTop: Spacing.four }]}>
                <SubscribeLink where="featured" />
              </View>
            ) : null}
            {channel.id === 'substack' ? <SubstackSubscribe /> : null}
            {!desk.lead && !loading ? (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                {empty}
              </ThemedText>
            ) : null}
          </ScrollView>
          <FlatList
            ref={deskListRef}
            onScroll={onScroll}
            scrollEventThrottle={100}
            style={[styles.centerCol, { borderLeftColor: theme.line, borderRightColor: theme.line }]}
            contentContainerStyle={styles.colContent}
            data={desk.list}
            keyExtractor={(a) => a.id}
            ListHeaderComponent={<ColumnHeader title={desk.centerTitle} aside={channel.id === 'today' ? desk.aside : undefined} />}
            renderItem={({ item }) => <DesktopRow article={item} />}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={theme.textSecondary} />}
          />
          <ScrollView style={styles.rightCol} contentContainerStyle={styles.colContent} showsVerticalScrollIndicator={false}>
            <DesktopSidebar onSelectChannel={onSelectChannel} />
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <PullToRefresh onRefresh={reload} refreshing={loading} listRef={listRef} width={width}>
      {mobileList}
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
  desktopRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: DesktopMaxWidth,
    paddingHorizontal: Spacing.five,
  },
  colContent: { paddingTop: Spacing.five, paddingBottom: Spacing.ten },
  leftCol: { width: 470, flexGrow: 0, paddingRight: Spacing.five },
  mainCol: { flex: 1, borderRightWidth: Hairline, paddingRight: Spacing.six },
  centerCol: { flex: 1, borderLeftWidth: Hairline, borderRightWidth: Hairline, paddingHorizontal: Spacing.five },
  rightCol: { width: SidebarWidth, flexGrow: 0, paddingLeft: Spacing.five },
  subs: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.five, paddingTop: Spacing.four, borderTopWidth: Hairline },
  subscribeRow: { paddingVertical: Spacing.two, borderBottomWidth: Hairline },
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
