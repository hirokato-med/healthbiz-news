import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { ThemedText } from '@/components/themed-text';
import { Thumb } from '@/components/thumb';
import { channelOf } from '@/constants/channels';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';
import { formatDateLong, formatDateShort } from '@/lib/articles';
import type { Article } from '@/lib/types';

/**
 * 今週のまとめ（週報の記事ページ）。
 * 見出し → 加藤の総括（コメント枠）→「今週の5本」を番号付きで（分類チップ・見出し・サムネ・一言コメント・記事を読む）→ 次回の配信日。
 */
export function WeeklyDetail({ issue, articles, onShare }: { issue: Article; articles: Article[]; onShare: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const weekly = issue.weekly;
  const entries = (weekly?.items ?? [])
    .map((it) => ({ ...it, article: articles.find((a) => a.id === it.article_id) }))
    .filter((e): e is { article_id: string; comment: string; article: Article } => !!e.article);

  return (
    <View>
      <View style={styles.eyebrowRow}>
        <ThemedText type="eyebrow" style={{ color: theme.accent }}>
          今週のまとめ
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatDateLong(issue.published_date)}
        </ThemedText>
      </View>
      <ThemedText type="title" style={styles.title}>
        {issue.title}
      </ThemedText>
      <View style={styles.byline}>
        <KatoAvatar size={22} />
        <ThemedText type="caption" themeColor="textSecondary">
          加藤浩晃・毎週土曜 7:00 配信
        </ThemedText>
      </View>

      <View style={[styles.noteBox, { backgroundColor: theme.surface, borderLeftColor: theme.accent }]}>
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

      <View style={styles.sectionRow}>
        <View style={[styles.sectionBar, { backgroundColor: theme.accent }]} />
        <ThemedText type="section" style={{ flex: 1 }}>
          今週の{entries.length}本
        </ThemedText>
        {weekly?.range ? (
          <ThemedText type="caption" style={{ color: theme.up }}>
            {weekly.range}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText style={styles.lead}>
        {weekly?.total ? `今週配信した${weekly.total}本のなかから、` : ''}押さえておきたい{entries.length}本を選びました。
      </ThemedText>

      {entries.map((e, i) => {
        const ch = channelOf(e.article.category);
        const open = () => (trackClick('weekly_item', { article_id: e.article.id, rank: i + 1 }), router.push({ pathname: '/article/[id]', params: { id: e.article.id } }));
        return (
          <Pressable
            key={e.article.id}
            onPress={open}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}位。${e.article.title}`}
            style={({ pressed }) => [styles.entry, { borderTopColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
            <View style={styles.rankRow}>
              <ThemedText style={[styles.rank, { color: theme.accent }]}>{i + 1}</ThemedText>
              <View style={[styles.chip, { borderColor: ch.color }]}>
                <ThemedText type="caption" style={{ color: ch.color, fontWeight: '700', fontSize: 11 }}>
                  {ch.name}
                </ThemedText>
              </View>
            </View>
            <View style={styles.entryTop}>
              <View style={{ flex: 1, gap: Spacing.one }}>
                <ThemedText type="headline">{e.article.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {e.article.source_name}・{formatDateShort(e.article.published_date)}
                </ThemedText>
              </View>
              <Thumb article={e.article} style={styles.thumb} />
            </View>
            <View style={[styles.oneLine, { borderLeftColor: theme.accent }]}>
              <KatoAvatar size={22} />
              <ThemedText type="comment" style={styles.oneLineText}>
                {e.comment}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
              記事を読む ›
            </ThemedText>
          </Pressable>
        );
      })}

      <View style={[styles.footer, { borderTopColor: theme.line }]}>
        <ThemedText style={{ fontWeight: '700' }}>来週は {formatDateLong(nextSaturday(issue.published_date))} に配信します</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={{ lineHeight: 18 }}>
          保存した記事は「保存」タブから読み返せます。気になった記事は共有ボタンからどうぞ。
        </ThemedText>
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          style={({ pressed }) => [styles.shareButton, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}>
          <ThemedText style={{ color: theme.accent, fontWeight: '700', fontSize: 15 }}>このまとめを共有する</ThemedText>
        </Pressable>
        <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          毎週土曜 7:00 に自動配信。記事の選定とコメントは加藤浩晃。
        </ThemedText>
      </View>
    </View>
  );
}

/** "2026-10-24" → "2026-10-31" */
function nextSaturday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: Spacing.one, marginBottom: Spacing.two },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.four },
  noteBox: { borderLeftWidth: 4, borderRadius: Radius.thumb, padding: Spacing.four },
  noteBy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.six },
  sectionBar: { width: 4, height: 20, borderRadius: 1 },
  lead: { marginTop: Spacing.two, marginBottom: Spacing.two, fontSize: 14, lineHeight: 23 },
  entry: { borderTopWidth: Hairline, paddingVertical: Spacing.four, gap: Spacing.two },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rank: { fontSize: 22, lineHeight: 26, fontWeight: '800' },
  chip: { borderWidth: 1, borderRadius: Radius.tag, paddingHorizontal: Spacing.two, paddingVertical: 1 },
  entryTop: { flexDirection: 'row', gap: Spacing.three },
  thumb: { width: 96, height: 96 },
  oneLine: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, borderLeftWidth: 3, paddingLeft: Spacing.three },
  oneLineText: { flex: 1, fontSize: 14, lineHeight: 23 },
  footer: { borderTopWidth: Hairline, paddingTop: Spacing.five, gap: Spacing.three },
  shareButton: { borderWidth: 1.5, borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
});
