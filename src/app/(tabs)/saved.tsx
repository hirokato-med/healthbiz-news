import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleList } from '@/components/article-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SavedChannel } from '@/constants/channels';
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackScreen } from '@/lib/analytics';

/** 保存した記事の一覧 */
export default function SavedScreen() {
  useEffect(() => {
    trackScreen('saved');
  }, []);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <ThemedView style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <ThemedText type="section" style={styles.title}>
          保存
        </ThemedText>
      </View>
      <ArticleList channel={SavedChannel} bottomInset={insets.bottom} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, borderBottomWidth: Hairline },
  title: { fontSize: 18 },
});
