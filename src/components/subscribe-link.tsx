import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Links } from '@/constants/links';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';

/**
 * メルマガ登録への小さな導線。注目記事の下や記事詳細のコメントの下に置く。
 * where は計測用（どこから登録されたかを GA で見分ける）。
 */
export function SubscribeLink({ where }: { where: 'featured' | 'article' }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => (trackClick('substack_subscribe', { where }), WebBrowser.openBrowserAsync(Links.substackSubscribe))}
      accessibilityRole="link"
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={6}>
      <View style={[styles.dot, { backgroundColor: theme.up }]} />
      <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
        加藤浩晃のメルマガを毎朝メールで受け取る ↗
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
