import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { ThemedText } from '@/components/themed-text';
import { Links } from '@/constants/links';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Substack の購読を勧めるカード。Substack タブの先頭に出す。 */
export function SubstackSubscribe({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const open = () => WebBrowser.openBrowserAsync(Links.substackSubscribe);

  if (compact) {
    return (
      <Pressable
        onPress={open}
        style={({ pressed }) => [styles.button, styles.buttonOutline, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="link">
        <ThemedText style={[styles.buttonText, { color: theme.accent }]}>Substack を購読する ↗</ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.head}>
        <KatoAvatar size={36} />
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>加藤浩晃のヘルスケアイノベーション通信</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Substack で配信中。登録するとメールで届きます。
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={open}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="link">
        <ThemedText style={[styles.buttonText, { color: theme.onAccent }]}>Substack を購読する ↗</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.thumb,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.three,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  button: {
    borderRadius: Radius.button,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1.5, marginTop: Spacing.two },
  buttonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
});
