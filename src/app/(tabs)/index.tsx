import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleList } from '@/components/article-list';
import { ChannelTabs } from '@/components/channel-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Channels } from '@/constants/channels';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { DesktopMaxWidth, useDesktop } from '@/hooks/use-desktop';
import { useTheme } from '@/hooks/use-theme';
import { trackScreen } from '@/lib/analytics';
import { formatDateLong, formatDateShort, todayJST } from '@/lib/articles';
import { useStore } from '@/lib/store';
import { uiState } from '@/lib/ui-state';

/**
 * トップ画面。白いヘッダー（題字・日付）→ 文字タブ（選択中だけチャンネル色の下線）→ ティッカー →
 * チャンネルごとの一覧を横にページング。
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const desktop = useDesktop();
  const { articles, reload } = useStore();
  const router = useRouter();
  const pagerRef = useRef<ScrollViewInstance>(null);
  // 記事から戻ってきたときに見ていたタブへ戻れるよう、位置はメモリに退避しておく
  const [index, setIndex] = useState(uiState.channelIndex);
  // 横ページャーの高さ。各チャンネルの一覧に明示的に渡す（Web では stretch だけだと高さが 0 になる）
  const [pagerHeight, setPagerHeight] = useState(0);
  // 見ているチャンネルを計測（横スワイプでもタブ押下でも index が変わる）
  // 遠いタブへ飛ぶとき途中のページも index に入るので、少し落ち着いてから記録する
  useEffect(() => {
    uiState.channelIndex = index;
    const t = setTimeout(() => trackScreen(`channel:${Channels[index].id}`, { channel: Channels[index].name }), 600);
    return () => clearTimeout(t);
  }, [index]);

  const ticker = useMemo(() => {
    // 日付が変わって当日分がまだ無い間も、直近の配信日の本数を出す
    const today = todayJST();
    const news = articles.filter((a) => a.kind !== 'substack' && a.kind !== 'weekly' && a.kind !== 'monthly' && (a.category !== 'earnings' || a.featured));
    const latest = news[0]?.published_date;
    const count = latest ? news.filter((a) => a.published_date === latest).length : 0;
    return {
      label: latest === today ? '本日の配信' : '最新の配信',
      count,
      value: count ? `${count}本` : '12時に更新',
      right: latest ? `${formatDateShort(latest)} 更新` : '',
    };
  }, [articles]);

  // Web（Safari）では onMomentumScrollEnd が発火しないので、onScroll でもページ位置を追従する
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      if (i >= 0 && i < Channels.length) setIndex((prev) => (prev === i ? prev : i));
    },
    [width],
  );

  const selectTab = useCallback(
    (i: number) => {
      setIndex(i);
      pagerRef.current?.scrollTo({ x: width * i, animated: true });
    },
    [width],
  );

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }, desktop && { borderBottomColor: theme.line, borderBottomWidth: Hairline }]}>
        <View style={desktop ? styles.desktopInner : undefined}>
        {desktop ? (
          // PC 向け: 題字を大きく、右に検索欄と「保存」「このアプリ」（下のタブバーの代わり）
          <View style={[styles.masthead, styles.mastheadDesktop]}>
            <View>
              <ThemedText style={styles.appNameDesktop}>Healthcare Business News</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                加藤浩晃のヘルスケアビジネスニュース
              </ThemedText>
            </View>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => router.push('/search')}
              accessibilityRole="search"
              style={({ pressed }) => [styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText type="caption" themeColor="textSecondary">
                🔍 記事・企業名で検索
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/saved')} accessibilityRole="link" hitSlop={6}>
              <ThemedText style={[styles.headerLink, { color: theme.accent }]}>☆ 保存</ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/about')} accessibilityRole="link" hitSlop={6}>
              <ThemedText style={[styles.headerLink, { color: theme.accent }]}>このアプリ</ThemedText>
            </Pressable>
          </View>
        ) : (
        <View style={styles.masthead}>
          <View>
            <ThemedText type="section" style={styles.appName}>
              Healthcare Business News
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.tagline}>
              加藤浩晃のヘルスケアビジネスニュース
            </ThemedText>
          </View>
          <View style={styles.mastheadRight}>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.date}>
              {formatDateLong(todayJST())}
            </ThemedText>
            <Pressable
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="記事を検索"
              hitSlop={8}
              style={({ pressed }) => [styles.searchButton, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
                🔍 検索
              </ThemedText>
            </Pressable>
          </View>
        </View>
        )}
        <ChannelTabs index={index} onSelect={selectTab} />
        </View>
        <Pressable
          onPress={() => void reload()}
          accessibilityRole="button"
          accessibilityLabel="記事を更新"
          style={[styles.ticker, { backgroundColor: theme.surface }, desktop && { paddingHorizontal: 0 }]}>
          <View style={[styles.tickerInner, desktop && styles.desktopInner, desktop && { paddingHorizontal: Spacing.five }]}>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {ticker.label}
            </ThemedText>
            <ThemedText type="caption" numberOfLines={1} style={[styles.tickerValue, { color: ticker.count ? theme.up : theme.textSecondary }]}>
              {ticker.value}
              {desktop ? <ThemedText type="caption" themeColor="textSecondary">{'　｜　毎日 12時・18時・22時に配信'}</ThemedText> : null}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.tickerDate}>
              {desktop ? `${formatDateLong(todayJST())}　` : ''}
              {ticker.right}
            </ThemedText>
          </View>
        </Pressable>
      </View>

      <View style={styles.pager} onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}>
        {/* 全チャンネルを並べた横ページャー。FlatList の仮想化だと Web で遠いページが描画されないので ScrollView にしている */}
        {pagerHeight > 0 && (
        <ScrollView
          ref={pagerRef}
          onLayout={() => {
            if (index > 0) pagerRef.current?.scrollTo({ x: width * index, animated: false });
          }}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={32}>
          {Channels.map((c) => (
            <ArticleList key={c.id} channel={c} width={width} height={pagerHeight} onSelectChannel={selectTab} />
          ))}
        </ScrollView>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {},
  pager: {
    flex: 1,
  },
  masthead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.one,
  },
  appName: {
    fontSize: 18,
  },
  tagline: {
    fontSize: 11,
    lineHeight: 14,
  },
  date: {
    fontVariant: ['tabular-nums'],
  },
  mastheadRight: { alignItems: 'flex-end', gap: 6 },
  searchButton: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.chip },
  ticker: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two - 1,
  },
  tickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  desktopInner: {
    width: '100%',
    maxWidth: DesktopMaxWidth,
    alignSelf: 'center',
  },
  mastheadDesktop: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.five,
  },
  appNameDesktop: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  searchBox: {
    width: 300,
    borderWidth: Hairline,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  headerLink: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  tickerValue: {
    flex: 1,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tickerDate: {
    fontVariant: ['tabular-nums'],
  },
});
