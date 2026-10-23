import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { ThemedText } from '@/components/themed-text';
import { channelOf } from '@/constants/channels';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';
import { formatDateLong } from '@/lib/articles';
import type { Article } from '@/lib/types';

const Green = channelOf('earnings').color;

/**
 * 今月の注目決算まとめ。
 * 見出し → 加藤の総括 → 領域ごとに「企業名・決算期・売上高・営業利益（前年同期比）・一言」の表 → 共有。
 * 行をタップすると、その会社の決算記事（無ければ IR ページ）を開く。
 */
export function MonthlyEarningsDetail({ issue, onShare }: { issue: Article; onShare: () => void }) {
  const theme = useTheme();
  const router = useRouter();
  const m = issue.monthly;
  const total = m?.segments.reduce((n, s) => n + s.items.length, 0) ?? 0;

  return (
    <View>
      <View style={styles.eyebrowRow}>
        <ThemedText type="eyebrow" style={{ color: Green }}>
          今月の注目決算
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
          加藤浩晃・毎月1日 7:00 配信
        </ThemedText>
      </View>

      <View style={[styles.noteBox, { backgroundColor: theme.surface, borderLeftColor: Green }]}>
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

      <ThemedText type="caption" themeColor="textSecondary" style={styles.lead}>
        {m?.month}に決算を発表したヘルスケア関連の上場企業 {total}社。金額は百万円を億円に直して丸めています。（ ）内は前年同期比。
      </ThemedText>

      {(m?.segments ?? []).map((seg) => (
        <View key={seg.name} style={styles.segment}>
          <View style={styles.segHead}>
            <View style={[styles.segBar, { backgroundColor: Green }]} />
            <ThemedText type="section" style={{ flex: 1 }}>
              {seg.name}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.up }}>
              {seg.items.length}社
            </ThemedText>
          </View>
          <View style={[styles.table, { borderColor: theme.line }]}>
            <View style={[styles.headRow, { backgroundColor: theme.surface }]}>
              <ThemedText type="caption" themeColor="textSecondary" style={[styles.colName, styles.headText]}>
                企業・決算期
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={[styles.colNum, styles.headText]}>
                売上高
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={[styles.colNum, styles.headText]}>
                営業利益
              </ThemedText>
            </View>
            {seg.items.map((it) => {
              const open = () => {
                trackClick('monthly_item', { company: it.company });
                if (it.article_id) router.push({ pathname: '/article/[id]', params: { id: it.article_id } });
                else if (it.ir_url) WebBrowser.openBrowserAsync(it.ir_url);
              };
              const tappable = !!(it.article_id || it.ir_url);
              return (
                <Pressable
                  key={it.company}
                  onPress={open}
                  disabled={!tappable}
                  accessibilityRole={tappable ? 'button' : undefined}
                  style={({ pressed }) => [styles.row, { borderTopColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
                  <View style={styles.rowTop}>
                    <View style={styles.colName}>
                      <ThemedText style={styles.company}>
                        {it.highlight ? <ThemedText style={{ color: theme.up, fontWeight: '800' }}>★ </ThemedText> : null}
                        {it.company}
                        {tappable ? <ThemedText style={{ color: theme.accent }}> ›</ThemedText> : null}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {it.period}
                      </ThemedText>
                    </View>
                    <Num value={it.revenue} change={it.revenue_change} />
                    <Num value={it.profit} change={it.profit_change} label={it.profit_label} />
                  </View>
                  <ThemedText style={styles.note}>{it.note}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={[styles.footer, { borderTopColor: theme.line }]}>
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          style={({ pressed }) => [styles.shareButton, { borderColor: Green, opacity: pressed ? 0.85 : 1 }]}>
          <ThemedText style={{ color: Green, fontWeight: '700', fontSize: 15 }}>このまとめを共有する</ThemedText>
        </Pressable>
        <ThemedText type="caption" themeColor="textSecondary" style={{ textAlign: 'center', lineHeight: 18 }}>
          数字は各社の決算短信をもとにしています。正確な内容は各社の IR ページでご確認ください。{'\n'}毎月1日 7:00 に自動配信。注目企業の選定とコメントは加藤浩晃。
        </ThemedText>
      </View>
    </View>
  );
}

function Num({ value, change, label }: { value: string; change?: string | null; label?: string | null }) {
  const theme = useTheme();
  const c = change?.trim() ?? '';
  const up = c.startsWith('+');
  const down = c.startsWith('-') || c.startsWith('−') || c.startsWith('△');
  return (
    <View style={styles.colNum}>
      <ThemedText style={styles.num}>{value}</ThemedText>
      {c ? <ThemedText style={[styles.change, { color: up ? theme.up : down ? theme.accent : theme.textSecondary }]}>{c}</ThemedText> : null}
      {label ? (
        <ThemedText type="caption" themeColor="textSecondary" style={{ fontSize: 10 }}>
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: Spacing.one, marginBottom: Spacing.two },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.four },
  noteBox: { borderLeftWidth: 4, borderRadius: Radius.thumb, padding: Spacing.four },
  noteBy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three },
  lead: { marginTop: Spacing.four, lineHeight: 18 },
  segment: { marginTop: Spacing.five },
  segHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  segBar: { width: 4, height: 20, borderRadius: 1 },
  table: { borderWidth: Hairline, borderRadius: Radius.thumb, overflow: 'hidden' },
  headRow: { flexDirection: 'row', paddingHorizontal: Spacing.three, paddingVertical: 6, gap: Spacing.two },
  headText: { fontWeight: '700' },
  row: { borderTopWidth: Hairline, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: Spacing.one },
  rowTop: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  colName: { flex: 1.4 },
  colNum: { flex: 1, alignItems: 'flex-end' },
  company: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  num: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
  change: { fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'right' },
  note: { fontSize: 13, lineHeight: 20 },
  footer: { borderTopWidth: Hairline, marginTop: Spacing.six, paddingTop: Spacing.five, gap: Spacing.three },
  shareButton: { borderWidth: 1.5, borderRadius: Radius.button, paddingVertical: Spacing.three, alignItems: 'center' },
});
