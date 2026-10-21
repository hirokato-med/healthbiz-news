import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 紺の縦棒付きセクション見出し。右端に補足（更新時刻など）を置ける。 */
export function SectionHeader({ title, aside, color }: { title: string; aside?: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.bar, { backgroundColor: color ?? theme.accent }]} />
      <ThemedText type="section" style={styles.title}>
        {title}
      </ThemedText>
      {aside ? (
        <ThemedText type="caption" style={{ color: theme.up }}>
          {aside}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
  bar: {
    width: 4,
    height: 20,
    borderRadius: 1,
  },
  title: {
    flex: 1,
  },
});
