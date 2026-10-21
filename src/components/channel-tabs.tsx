import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Channels } from '@/constants/channels';
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  index: number;
  onSelect: (index: number) => void;
};

/**
 * 白地の文字タブ。選択中のチャンネルだけ、そのチャンネル色の下線と文字色がつく。
 * 塗りのチップにはしない（色は「選ばれているチャンネル」を示すためだけに使う）。
 * 選択中のタブは画面内に追従する。
 */
export function ChannelTabs({ index, onSelect }: Props) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const l = layouts[index];
    if (!l || !viewportWidth) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, l.x + l.width / 2 - viewportWidth / 2), animated: true });
  }, [index, layouts, viewportWidth]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.bar, { borderBottomColor: theme.line }]}
      contentContainerStyle={styles.row}
      onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}>
      {Channels.map((c, i) => {
        const selected = i === index;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(i)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLayouts((prev) => (prev[i]?.x === x && prev[i]?.width === width ? prev : { ...prev, [i]: { x, width } }));
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}>
            <ThemedText style={[styles.label, { color: selected ? c.color : theme.textSecondary, fontWeight: selected ? '700' : '500' }]}>
              {c.name}
            </ThemedText>
            <View style={[styles.underline, { backgroundColor: selected ? c.color : 'transparent' }]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: Hairline,
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: Spacing.two,
  },
  tab: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
  },
  underline: {
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});
