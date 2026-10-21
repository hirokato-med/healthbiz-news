import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Hairline, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** アプリについて（App Store 審査で求められるプライバシーポリシーへの導線もここ） */
export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <ThemedView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <ThemedText type="section" style={styles.title}>
          このアプリ
        </ThemedText>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}>
        <ThemedText type="featured">Healthcare Business News</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lead}>
          医療機器・ウェアラブル・創薬・デジタルヘルスなど、ヘルスケアビジネスのプレスリリースと適時開示から1日5本前後を厳選し、
          医師・加藤浩晃のコメントを添えてお届けします。
        </ThemedText>

        <Row label="配信" value="毎日12時・18時・22時ごろ" theme={theme} />
        <Row label="コメント" value="加藤浩晃（医師・ヘルスケアビジネス）" theme={theme} />
        <Row label="要約について" value="各社のプレスリリースをもとに作成。正確な内容は原文をご確認ください。" theme={theme} />

        <Pressable
          onPress={() => WebBrowser.openBrowserAsync('https://example.com/privacy')}
          style={[styles.link, { borderBottomColor: theme.line }]}
          accessibilityRole="link">
          <ThemedText style={{ color: theme.accent, fontWeight: '700' }}>プライバシーポリシー ↗</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.line }]}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, borderBottomWidth: Hairline },
  title: { fontSize: 18 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  lead: { marginTop: Spacing.two, marginBottom: Spacing.five },
  row: { paddingVertical: Spacing.three, borderBottomWidth: Hairline, gap: Spacing.one },
  rowLabel: { fontWeight: '700' },
  rowValue: { lineHeight: 23 },
  link: { paddingVertical: Spacing.four, borderBottomWidth: Hairline },
});
