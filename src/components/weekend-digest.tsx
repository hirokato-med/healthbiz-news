import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';
import type { Article } from '@/lib/types';
import type { WeekendState } from '@/lib/weekend';

/** 週末版の先頭の枠: 今週のまとめのカードと、先週の注目 3 本 */
export function WeekendDigest({ state }: { state: WeekendState }) {
  const theme = useTheme();
  const router = useRouter();
  const open = (a: Article, where: string) => {
    trackClick('weekend', { article_id: a.id, where });
    router.push({ pathname: '/article/[id]', params: { id: a.id } });
  };
  const { weekly, picks } = state;
  return (
    <View style={[styles.root, { borderBottomColor: theme.line }]}>
      <SectionHeader title={state.title} aside={weekly.weekly?.range} />
      <Pressable onPress={() => open(weekly, 'weekly')} style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <ThemedText style={styles.badgeText}>今週のまとめ</ThemedText>
        </View>
        <ThemedText style={styles.title}>{weekly.title.replace(/^今週のまとめ｜/, '')}</ThemedText>
        <ThemedText style={styles.note} numberOfLines={3}>
          {weekly.comment}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700', marginTop: Spacing.two }}>
          {weekly.weekly?.items?.length ? `注目の${weekly.weekly.items.length}本を読む ›` : '読む ›'}
        </ThemedText>
      </Pressable>
      {state.weekahead ? (
        <Pressable
          onPress={() => open(state.weekahead!, 'weekahead')}
          style={({ pressed }) => [styles.card, styles.aheadCard, { borderColor: theme.up, opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button">
          <View style={[styles.badge, { backgroundColor: theme.up }]}>
            <ThemedText style={styles.badgeText}>来週の注目</ThemedText>
          </View>
          <ThemedText style={styles.aheadTitle}>{state.weekahead.title.replace(/^来週の注目｜/, '')}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.up, fontWeight: '700', marginTop: Spacing.one }}>
            {state.weekahead.weekahead?.week ? `${state.weekahead.weekahead.week} の予定を見る ›` : '予定を見る ›'}
          </ThemedText>
        </Pressable>
      ) : null}
      {picks.length ? (
        <>
          <ThemedText style={styles.picksTitle}>先週の注目</ThemedText>
          {picks.map((a, i) => (
            <Pressable key={a.id} onPress={() => open(a, 'pick')} style={({ pressed }) => [styles.pick, { borderTopColor: theme.line, opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
              <ThemedText style={[styles.rank, { color: theme.accent }]}>{i + 1}</ThemedText>
              <ThemedText style={styles.pickText} numberOfLines={2}>
                {a.title}
              </ThemedText>
            </Pressable>
          ))}
        </>
      ) : null}
      <ThemedText type="caption" themeColor="textSecondary" style={styles.foot}>
        {state.note}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: Spacing.four, borderBottomWidth: Hairline },
  card: { borderRadius: Radius.thumb + 4, padding: Spacing.four },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  badgeText: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontWeight: '800' },
  title: { fontSize: 18, lineHeight: 26, fontWeight: '800', marginTop: Spacing.two },
  note: { fontSize: 13.5, lineHeight: 22, marginTop: Spacing.one },
  aheadCard: { marginTop: Spacing.three, borderWidth: 1.5, backgroundColor: 'transparent' },
  aheadTitle: { fontSize: 16, lineHeight: 24, fontWeight: '800', marginTop: Spacing.two },
  picksTitle: { fontSize: 15, lineHeight: 22, fontWeight: '800', marginTop: Spacing.five, marginBottom: Spacing.one },
  pick: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two + 2, borderTopWidth: Hairline },
  rank: { fontSize: 16, lineHeight: 22, fontWeight: '800', width: 14 },
  pickText: { flex: 1, fontSize: 14.5, lineHeight: 22 },
  foot: { marginTop: Spacing.three, lineHeight: 18 },
});
