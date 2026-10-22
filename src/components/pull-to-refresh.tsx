import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View, type FlatList } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 引っ張れる最大の深さ（px）。iOS の標準的な引っ張りと同じくらい */
const MaxPull = 220;
/** この深さまで引いて離すと更新する（px） */
const Threshold = 90;
/** 更新中に残す帯の高さ（px） */
const BusyHeight = 64;
/** 指の移動に対する追従の割合（1 より小さいと「重い」手応えになる） */
const Resistance = 0.8;

/**
 * Web 用の「下に引っ張って更新」。ネイティブでは RefreshControl が効くので何もしない。
 * 一覧が先頭にある状態で指を下へ引くと、引いた分だけ上に帯が開き「離すと更新」が出る。
 * 離すと帯は滑らかに閉じ、しきい値を超えていれば onRefresh を呼ぶ（更新中はスピナーの帯を残す）。
 */
export function PullToRefresh({
  children,
  onRefresh,
  listRef,
  width,
}: {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  refreshing?: boolean;
  listRef: RefObject<FlatList<any> | null>;
  width?: number;
}) {
  const theme = useTheme();
  const height = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<'idle' | 'pulling' | 'ready' | 'busy'>('idle');
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (listRef.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!node) return;
    // 一覧自体の弾む動き（ラバーバンド）を止めて、引っ張りの見た目はこちらの帯で出す
    const prevOverscroll = node.style.overscrollBehaviorY;
    node.style.overscrollBehaviorY = 'none';

    let startY: number | null = null;
    let depth = 0;
    let busy = false;
    const settle = (to: number, done?: () => void) =>
      Animated.timing(height, { toValue: to, duration: 220, useNativeDriver: false }).start(done);

    const onStart = (e: TouchEvent) => {
      if (busy) return;
      startY = node.scrollTop <= 0 ? e.touches[0].clientY : null;
      depth = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY == null) return;
      if (node.scrollTop > 0) {
        // 上に戻る動きだった。引っ張りはやめる
        startY = null;
        depth = 0;
        height.setValue(0);
        setState('idle');
        return;
      }
      const dy = e.touches[0].clientY - startY;
      depth = Math.max(0, Math.min(MaxPull, dy * Resistance));
      height.setValue(depth);
      setState(depth >= Threshold ? 'ready' : depth > 4 ? 'pulling' : 'idle');
    };
    const onEnd = () => {
      if (startY == null) return;
      startY = null;
      const fire = depth >= Threshold;
      depth = 0;
      if (!fire) {
        setState('idle');
        settle(0);
        return;
      }
      busy = true;
      setState('busy');
      settle(BusyHeight);
      Promise.resolve(onRefreshRef.current()).finally(() => {
        busy = false;
        settle(0, () => setState('idle'));
      });
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: true });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', onEnd);
    return () => {
      node.style.overscrollBehaviorY = prevOverscroll;
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    };
  }, [listRef, height]);

  if (Platform.OS !== 'web') return <>{children}</>;

  const label =
    state === 'busy' ? '最新の記事を取得しています…' : state === 'ready' ? '離すと更新します' : state === 'pulling' ? '引っ張って更新' : '';
  return (
    <View style={{ width, flex: 1 }}>
      <Animated.View style={[styles.band, { backgroundColor: theme.surface, height }]}>
        {state !== 'idle' ? (
          <View style={styles.bandContent}>
            {state === 'busy' ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <ThemedText style={[styles.arrow, { color: theme.accent, transform: [{ rotate: state === 'ready' ? '180deg' : '0deg' }] }]}>↓</ThemedText>
            )}
            <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
              {label}
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bandContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  arrow: { fontSize: 18, lineHeight: 22, fontWeight: '700' },
});
