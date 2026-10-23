import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Channels, type ChannelId } from '@/constants/channels';
import { Hairline, Spacing } from '@/constants/theme';
import { DesktopMaxWidth } from '@/hooks/use-desktop';
import { useTheme } from '@/hooks/use-theme';
import { uiState } from '@/lib/ui-state';

/**
 * PC 向けの記事ページなどの上部。題字（押すとトップへ）・検索・保存・このアプリと、分野のタブ。
 * タブを押すとトップへ戻ってそのタブを開く。トップ画面は自前の上部（タブの切り替えつき）を使う。
 */
export function DesktopHeader({ active }: { active?: ChannelId }) {
  const theme = useTheme();
  const router = useRouter();
  const openChannel = (i: number) => {
    uiState.channelIndex = i;
    router.navigate('/');
  };
  return (
    <View style={[styles.root, { borderBottomColor: theme.line, backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Pressable onPress={() => openChannel(0)} accessibilityRole="link">
            <ThemedText style={styles.appName}>Healthcare Business News</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              加藤浩晃のヘルスケアビジネスニュース
            </ThemedText>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            style={({ pressed }) => [styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
            <ThemedText type="caption" themeColor="textSecondary">
              🔍 記事・企業名で検索
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/saved')} accessibilityRole="link" hitSlop={6}>
            <ThemedText style={[styles.link, { color: theme.accent }]}>☆ 保存</ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/about')} accessibilityRole="link" hitSlop={6}>
            <ThemedText style={[styles.link, { color: theme.accent }]}>このアプリ</ThemedText>
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {Channels.map((c, i) => {
            const on = c.id === active;
            return (
              <Pressable key={c.id} onPress={() => openChannel(i)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <ThemedText style={[styles.tabText, { color: on ? c.color : theme.textSecondary, fontWeight: on ? '700' : '500' }]}>{c.name}</ThemedText>
                <View style={[styles.underline, { backgroundColor: on ? c.color : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderBottomWidth: Hairline },
  inner: { width: '100%', maxWidth: DesktopMaxWidth, alignSelf: 'center', paddingHorizontal: Spacing.five },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  appName: { fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: -0.3 },
  searchBox: { width: 280, borderWidth: Hairline, borderRadius: 999, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  link: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.five },
  tab: { paddingTop: Spacing.two, gap: Spacing.two },
  tabText: { fontSize: 14, lineHeight: 20 },
  underline: { height: 3, borderRadius: 2 },
});
