import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View, type FlatList } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 引っ張れる最大の深さ（px）。iOS の標準的な引っ張りと同じくらい */
const MaxPull = 110;
/** この深さまで引いて離すと更新する（px） */
const Threshold = 60;
/** 更新中・失敗表示のときに残す帯の高さ（px） */
const BusyHeight = 64;
/** 指の移動に対する追従の割合（1 より小さいと「重い」手応えになる） */
const Resistance = 0.8;
/** 縦か横かを決めるまでの遊び（px）。横ならタブ切り替えに任せる */
const AxisSlop = 8;

type State = 'idle' | 'pulling' | 'ready' | 'busy' | 'failed';

/**
 * Web 用の「下に引っ張って更新」。ネイティブでは RefreshControl が効くので何もしない。
 * 一覧が先頭にある状態で指を下へ引くと、引いた分だけ上に帯が開き「離すと更新」が出る。
 * 離すと帯は滑らかに閉じ、しきい値を超えていれば onRefresh を呼ぶ（更新中はスピナーの帯を残す）。
 * 横方向の動き（チャンネルのスワイプ）には反応しない。
 */
export function PullToRefresh({
  children,
  onRefresh,
  refreshing = false,
  listRef,
  width,
}: {
  children: ReactNode;
  /** false を返すと「更新できませんでした」を出す */
  onRefresh: () => Promise<boolean | void> | boolean | void;
  /** ストア側で読み込み中（このあいだは新しい引っ張りを始めない） */
  refreshing?: boolean;
  listRef: RefObject<FlatList<any> | null>;
  width?: number;
}) {
  const theme = useTheme();
  const height = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<State>('idle');
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (listRef.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!node) return;
    // 一覧自体の弾む動き（ラバーバンド）を止めて、引っ張りの見た目はこちらの帯で出す
    const prevOverscroll = node.style.overscrollBehaviorY;
    node.style.overscrollBehaviorY = 'none';

    let startX: number | null = null;
    let startY: number | null = null;
    let axis: 'undecided' | 'vertical' = 'undecided';
    let depth = 0;
    let busy = false;
    const settle = (to: number, done?: () => void) =>
      Animated.timing(height, { toValue: to, duration: 220, useNativeDriver: false }).start(done);
    const reset = () => {
      startX = startY = null;
      axis = 'undecided';
      depth = 0;
    };

    const onStart = (e: TouchEvent) => {
      // 2本目の指や、更新中・読み込み中は新しい引っ張りを始めない
      if (busy || refreshingRef.current || startY != null || e.touches.length > 1) return;
      if (node.scrollTop > 0) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      axis = 'undecided';
      depth = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY == null || startX == null) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (axis === 'undecided') {
        if (Math.hypot(dx, dy) < AxisSlop) return;
        // 横に動いたらチャンネルのスワイプ。上に動いたら普通のスクロール。どちらも引っ張りではない
        if (Math.abs(dx) > Math.abs(dy) || dy < 0) {
          reset();
          return;
        }
        axis = 'vertical';
      }
      if (node.scrollTop > 0) {
        reset();
        height.setValue(0);
        setState('idle');
        return;
      }
      // 縦の引っ張りと決まったら、ページ全体や横ページャーが動かないようにする
      if (e.cancelable) e.preventDefault();
      depth = Math.max(0, Math.min(MaxPull, dy * Resistance));
      height.setValue(depth);
      setState(depth >= Threshold ? 'ready' : depth > 4 ? 'pulling' : 'idle');
    };
    const finish = async (fire: boolean) => {
      reset();
      if (!fire) {
        settle(0, () => setState('idle'));
        return;
      }
      busy = true;
      setState('busy');
      settle(BusyHeight);
      let ok = true;
      try {
        ok = (await onRefreshRef.current()) !== false;
      } catch {
        ok = false;
      }
      if (ok) {
        settle(0, () => {
          busy = false;
          setState('idle');
        });
        return;
      }
      setState('failed');
      setTimeout(
        () =>
          settle(0, () => {
            busy = false;
            setState('idle');
          }),
        1600,
      );
    };
    const onEnd = (e: TouchEvent) => {
      if (startY == null) return;
      if (e.touches.length > 0) return; // まだ別の指が残っている
      void finish(axis === 'vertical' && depth >= Threshold);
    };
    // システムに取られた（通知センターなど）ときは更新しない
    const onCancel = () => {
      if (startY == null) return;
      void finish(false);
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', onCancel);
    return () => {
      node.style.overscrollBehaviorY = prevOverscroll;
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onCancel);
    };
  }, [listRef, height]);

  if (Platform.OS !== 'web') return <>{children}</>;

  const label =
    state === 'busy'
      ? '最新の記事を取得しています…'
      : state === 'failed'
        ? '更新できませんでした。通信環境をご確認ください'
        : state === 'ready'
          ? '離すと更新します'
          : state === 'pulling'
            ? '引っ張って更新'
            : '';
  const rotate = height.interpolate({ inputRange: [Threshold - 16, Threshold], outputRange: ['0deg', '180deg'], extrapolate: 'clamp' });
  // 一覧の高さは変えず、帯と一覧を同じ量だけ下へずらす（一覧の下端は親の外に隠れる）
  return (
    <View style={[styles.frame, { width }]}>
      <Animated.View
        role="status"
        aria-live="polite"
        style={[styles.band, { backgroundColor: theme.surface, transform: [{ translateY: Animated.subtract(height, MaxPull) }] }]}>
        {state !== 'idle' ? (
          <View style={styles.bandContent}>
            {state === 'busy' ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : state === 'failed' ? null : (
              <Animated.Text aria-hidden style={[styles.arrow, { color: theme.accent, transform: [{ rotate }] }]}>
                ↓
              </Animated.Text>
            )}
            <ThemedText type="caption" style={{ color: state === 'failed' ? theme.textSecondary : theme.accent, fontWeight: '700' }}>
              {label}
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.content, { transform: [{ translateY: height }] }]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: MaxPull,
    justifyContent: 'flex-end',
    zIndex: 1,
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
