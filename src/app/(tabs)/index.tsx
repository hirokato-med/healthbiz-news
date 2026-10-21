import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleList } from '@/components/article-list';
import { ChannelChips } from '@/components/channel-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Channels, type Channel } from '@/constants/channels';
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLong, formatDateShort, todayJST } from '@/lib/articles';
import { useStore } from '@/lib/store';

/**
 * トップ画面。白いヘッダー（題字・日付）→ カラーチップ → ティッカー →
 * チャンネルごとの一覧を横にページング。
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { articles } = useStore();
  const pagerRef = useRef<FlatList<Channel>>(null);
  const [index, setIndex] = useState(0);
  // 横ページャーの高さ。各チャンネルの一覧に明示的に渡す（Web では stretch だけだと高さが 0 になる）
  const [pagerHeight, setPagerHeight] = useState(0);

  const ticker = useMemo(() => {
    const today = todayJST();
    const count = articles.filter((a) => a.published_date === today).length;
    const latest = articles[0]?.published_date;
    return {
      label: '本日の配信',
      count,
      value: count ? `${count}本` : '22時ごろ',
      right: latest ? `${formatDateShort(latest)} 更新` : '',
    };
  }, [articles]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width],
  );

  const selectTab = useCallback((i: number) => {
    setIndex(i);
    pagerRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
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
        <ChannelChips index={index} onSelect={selectTab} />
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
        {pagerHeight > 0 && (
          <FlatList
            ref={pagerRef}
            data={Channels}
            keyExtractor={(c) => c.id}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            renderItem={({ item }) => <ArticleList channel={item} width={width} height={pagerHeight} />}
            // 隣のチャンネルは先に描いておき、スワイプ時に白く見えないようにする
            initialNumToRender={2}
            windowSize={3}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    borderBottomWidth: Hairline,
  },
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
