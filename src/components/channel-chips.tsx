import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, type ScrollViewInstance } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Channels } from '@/constants/channels';
import { Radius, Spacing } from '@/constants/theme';

type Props = {
  index: number;
  onSelect: (index: number) => void;
};

/**
 * SmartNews 型のカラーチップ。チャンネルごとに塗りの色が違い、
 * 選択中は濃く、それ以外は少し薄くする。選択中のチップは画面内に追従する。
 */
export function ChannelChips({ index, onSelect }: Props) {
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
            style={[styles.chip, { backgroundColor: c.color, opacity: selected ? 1 : 0.8 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}>
            <ThemedText style={styles.chipText}>{c.name}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.two - 2,
  },
  chip: {
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.four,
    height: 38,
    justifyContent: 'center',
  },
  chipText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});
