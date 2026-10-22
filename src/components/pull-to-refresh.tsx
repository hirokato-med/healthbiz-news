import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, type FlatList } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** これだけ引っ張ったら更新する（px） */
const Threshold = 72;

/**
 * Web 用の「下に引っ張って更新」。ネイティブでは RefreshControl が効くので何もしない。
 * 一覧が先頭にある状態で指を下へ引くと「離すと更新」が出て、離すと onRefresh を呼ぶ。
 */
export function PullToRefresh({
  children,
  onRefresh,
  refreshing,
  listRef,
  width,
}: {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  refreshing: boolean;
  listRef: RefObject<FlatList<any> | null>;
  width?: number;
}) {
  const theme = useTheme();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (listRef.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!node) return;
    let armedPull = 0;
    const onStart = (e: TouchEvent) => {
      startY.current = node.scrollTop <= 0 ? e.touches[0].clientY : null;
      armedPull = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      if (node.scrollTop > 0) {
        startY.current = null;
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      armedPull = Math.max(0, dy);
      setPull(armedPull);
    };
    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      const fire = armedPull >= Threshold;
      armedPull = 0;
      setPull(0);
      if (fire) {
        setBusy(true);
        Promise.resolve(onRefreshRef.current()).finally(() => setBusy(false));
      }
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: true });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', onEnd);
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    };
  }, [listRef]);

  if (Platform.OS !== 'web') return <>{children}</>;

  const showing = busy || (refreshing && busy) || pull > 8;
  const label = busy ? '最新の記事を取得しています…' : pull >= Threshold ? '離すと更新します' : '引っ張って更新';
  return (
    <View style={{ width, flex: 1 }}>
      {showing ? (
        <View style={[styles.banner, { backgroundColor: theme.surface, height: busy ? 40 : Math.min(pull * 0.5, 40) }]}>
          {busy ? <ActivityIndicator size="small" color={theme.accent} /> : null}
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
            {label}
          </ThemedText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    overflow: 'hidden',
  },
});
