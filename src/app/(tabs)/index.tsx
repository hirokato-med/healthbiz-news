import { useCallback, useMemo, useRef, useState } from 'react';
import {
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
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLong, formatDateShort, todayJST } from '@/lib/articles';
import { useStore } from '@/lib/store';

/**
 * トップ画面。白いヘッダー（題字・日付）→ 文字タブ（選択中だけチャンネル色の下線）→ ティッカー →
 * チャンネルごとの一覧を横にページング。
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { articles } = useStore();
  const pagerRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  // 横ページャーの高さ。各チャンネルの一覧に明示的に渡す（Web では stretch だけだと高さが 0 になる）
  const [pagerHeight, setPagerHeight] = useState(0);

  const ticker = useMemo(() => {
    const today = todayJST();
    const news = articles.filter((a) => a.kind !== 'substack');
    const count = news.filter((a) => a.published_date === today).length;
    const latest = news[0]?.published_date;
    return {
      label: '本日の配信',
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.masthead}>
          <View>
            <ThemedText type="section" style={styles.appName}>
              Healthcare Business News
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.tagline}>
              加藤浩晃のヘルスケアビジネスニュース
            </ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.date}>
            {formatDateLong(todayJST())}
          </ThemedText>
        </View>
        <ChannelTabs index={index} onSelect={selectTab} />
        <View style={[styles.ticker, { backgroundColor: theme.surface }]}>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {ticker.label}
          </ThemedText>
          <ThemedText type="caption" numberOfLines={1} style={[styles.tickerValue, { color: ticker.count ? theme.up : theme.textSecondary }]}>
            {ticker.value}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.tickerDate}>
            {ticker.right}
          </ThemedText>
        </View>
      </View>

      <View style={styles.pager} onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}>
        {/* 全チャンネルを並べた横ページャー。FlatList の仮想化だと Web で遠いページが描画されないので ScrollView にしている */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onScroll}
          scrollEventThrottle={32}>
          {Channels.map((c) => (
            <ArticleList key={c.id} channel={c} width={width} height={pagerHeight || undefined} />
          ))}
        </ScrollView>
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
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two - 1,
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
