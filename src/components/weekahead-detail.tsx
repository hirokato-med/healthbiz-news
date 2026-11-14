import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { ThemedText } from '@/components/themed-text';
import { WeekAheadColor } from '@/constants/channels';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';
import { formatDateLong } from '@/lib/articles';
import type { Article } from '@/lib/types';

const Weekdays = ['日', '月', '火', '水', '木', '金', '土'];
/** "2026-11-16" → "11/16（月）" */
function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}/${d}（${Weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
}

/**
 * 来週の注目（日曜配信の記事ページ）。
 * 見出し → 加藤のひとこと（コメント枠）→ 区分ごと（決算発表・政策・学会など）に日付順の予定。各予定は公式の発表へのリンク。
 */
export function WeekAheadDetail({ issue }: { issue: Article }) {
  const theme = useTheme();
  const wa = issue.weekahead;
  return (
    <View>
      <View style={styles.eyebrowRow}>
        <ThemedText type="eyebrow" style={{ color: WeekAheadColor }}>
          来週の注目
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatDateLong(issue.published_date)}
        </ThemedText>
      </View>
      <ThemedText type="title" style={styles.title}>
        {issue.title.replace(/^来週の注目｜/, '')}
      </ThemedText>
      <View style={styles.byline}>
        <KatoAvatar size={22} />
        <ThemedText type="caption" themeColor="textSecondary">
          加藤浩晃・毎週日曜 配信{wa?.week ? `　｜　${wa.week}` : ''}
        </ThemedText>
      </View>

      <View style={[styles.noteBox, { backgroundColor: theme.surface, borderLeftColor: WeekAheadColor }]}>
        <View style={styles.noteBy}>
          <KatoAvatar size={40} />
          <View>
            <ThemedText type="caption" style={{ fontWeight: '700' }}>
              加藤浩晃
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={{ fontSize: 11 }}>
              医師・ヘルスケアビジネス
            </ThemedText>
          </View>
        </View>
        <ThemedText type="comment">{issue.comment}</ThemedText>
      </View>

      {(wa?.sections ?? []).map((sec) =>
        sec.items.length ? (
          <View key={sec.name}>
            <View style={styles.sectionRow}>
              <View style={[styles.sectionBar, { backgroundColor: WeekAheadColor }]} />
              <ThemedText type="section" style={{ flex: 1 }}>
                {sec.name}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {sec.items.length}件
              </ThemedText>
            </View>
            {[...sec.items]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((it, i) => (
                <Pressable
                  key={i}
                  disabled={!it.url}
                  onPress={() => it.url && (trackClick('weekahead_item', { issue: issue.id, label: it.label }), WebBrowser.openBrowserAsync(it.url))}
                  style={({ pressed }) => [styles.item, { borderTopColor: theme.line, opacity: pressed ? 0.6 : 1 }]}
                  accessibilityRole={it.url ? 'link' : undefined}>
                  <ThemedText style={[styles.date, { color: WeekAheadColor }]}>{dayLabel(it.date)}</ThemedText>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.label}>
                      {it.label}
                      {it.url ? <ThemedText style={{ color: theme.accent }}> ›</ThemedText> : null}
                    </ThemedText>
                    {it.note ? (
                      <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
                        {it.note}
                      </ThemedText>
                    ) : null}
                  </View>
                </Pressable>
              ))}
          </View>
        ) : null,
      )}
      <ThemedText type="caption" themeColor="textSecondary" style={styles.disclaimer}>
        日程は各社・各機関の公式発表をもとにしています。変更されることがあるので、リンク先で最新の情報をご確認ください。
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: Spacing.one, marginBottom: Spacing.two },
  byline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four },
  noteBox: { borderLeftWidth: 4, borderRadius: Radius.thumb, padding: Spacing.four },
  noteBy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.six, marginBottom: Spacing.two },
  sectionBar: { width: 4, height: 20, borderRadius: 2 },
  item: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three, borderTopWidth: Hairline },
  date: { width: 72, fontSize: 13.5, lineHeight: 21, fontWeight: '800' },
  label: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  note: { marginTop: 2, lineHeight: 18 },
  disclaimer: { marginTop: Spacing.five, lineHeight: 18 },
});
