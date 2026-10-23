import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { channelOf } from '@/constants/channels';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Article } from '@/lib/types';

type Earnings = NonNullable<Article['earnings']>;

/** 決算の概要（今期・比べた相手・増減率を表にする） */
export function EarningsTable({ earnings }: { earnings: Earnings }) {
  const theme = useTheme();
  const hasPrev = earnings.rows.some((r) => r.prev);
  const cols = {
    value: earnings.columns?.value ?? '今期',
    prev: earnings.columns?.prev ?? '前年同期',
    change: earnings.columns?.change ?? '前年同期比',
  };
  return (
    <View style={[styles.box, { borderColor: theme.line }]}>
      <View style={[styles.head, { backgroundColor: theme.surface }]}>
        <ThemedText type="caption" style={{ fontWeight: '700', flexShrink: 1 }}>
          {earnings.period}
        </ThemedText>
        {earnings.kind ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {earnings.kind}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.row, { borderTopColor: theme.line }]}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
          {' '}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colHead, styles.value]}>
          {cols.value}
        </ThemedText>
        {hasPrev ? (
          <ThemedText type="caption" themeColor="textSecondary" style={[styles.colHead, styles.prev]}>
            {cols.prev}
          </ThemedText>
        ) : null}
        <ThemedText type="caption" themeColor="textSecondary" style={[styles.colHead, styles.change]}>
          {cols.change}
        </ThemedText>
      </View>
      {earnings.rows.map((r, i) => {
        const up = r.change?.trim().startsWith('+') || r.change?.includes('増');
        const down = r.change?.trim().startsWith('-') || r.change?.trim().startsWith('−') || r.change?.includes('減') || r.change?.includes('赤字');
        return (
          <View key={i} style={[styles.row, { borderTopColor: theme.line }]}>
            <ThemedText style={styles.label}>{r.label}</ThemedText>
            <ThemedText style={[styles.value, styles.valueText]}>{r.value}</ThemedText>
            {hasPrev ? (
              <ThemedText themeColor="textSecondary" style={[styles.prev, styles.prevText]}>
                {r.prev ?? '—'}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.change, styles.changeText, { color: up ? theme.up : down ? theme.accent : theme.textSecondary }]}>{r.change ?? '—'}</ThemedText>
          </View>
        );
      })}
      {earnings.compare_note ? (
        <View style={[styles.note, { borderTopColor: theme.line }]}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.noteText}>
            {earnings.compare_note}
          </ThemedText>
        </View>
      ) : null}
      {earnings.forecast ? (
        <View style={[styles.forecast, { borderTopColor: theme.line }]}>
          <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '700' }}>
            通期予想
          </ThemedText>
          <ThemedText style={styles.forecastText}>{earnings.forecast}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** 業績の推移（直近の通期実績と今期予想。売上高の大きさを横棒で見せる） */
export function EarningsHistory({ history }: { history: NonNullable<Earnings['history']> }) {
  const theme = useTheme();
  const max = Math.max(0, ...history.rows.map((r) => r.bar ?? 0));
  return (
    <View style={[styles.box, { borderColor: theme.line }]}>
      <View style={[styles.row, { backgroundColor: theme.surface, borderTopWidth: 0 }]}>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.period}>
          {' '}
        </ThemedText>
        {history.columns.map((c) => (
          <ThemedText key={c} type="caption" themeColor="textSecondary" style={[styles.colHead, styles.histValue]}>
            {c}
          </ThemedText>
        ))}
      </View>
      {history.rows.map((r, i) => (
        <View key={i} style={[styles.histRow, { borderTopColor: theme.line }]}>
          <View style={styles.histLine}>
            <View style={styles.period}>
              <ThemedText style={[styles.periodText, r.forecast && { color: theme.textSecondary }]}>{r.period}</ThemedText>
              {r.note ? (
                <ThemedText type="caption" themeColor="textSecondary" style={styles.periodNote}>
                  {r.note}
                </ThemedText>
              ) : null}
            </View>
            {r.values.map((v, j) => (
              <ThemedText key={j} style={[styles.histValue, styles.histValueText, r.forecast && { color: theme.textSecondary }]}>
                {v}
              </ThemedText>
            ))}
          </View>
          {max > 0 && r.bar ? (
            <View style={[styles.barTrack, { backgroundColor: theme.surface }]}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.max(2, (r.bar / max) * 100)}%`, backgroundColor: channelOf('earnings').color, opacity: r.forecast ? 0.35 : 1 },
                ]}
              />
            </View>
          ) : null}
        </View>
      ))}
      {history.note ? (
        <View style={[styles.note, { borderTopColor: theme.line }]}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.noteText}>
            {history.note}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: Hairline, borderRadius: Radius.thumb, overflow: 'hidden', marginTop: Spacing.two },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: Hairline, gap: Spacing.two },
  colHead: { fontSize: 11, lineHeight: 16, textAlign: 'right' },
  label: { flex: 0.8, fontSize: 14, lineHeight: 20 },
  value: { flex: 1.45, textAlign: 'right' },
  valueText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  prev: { flex: 1.2, textAlign: 'right' },
  prevText: { fontSize: 12, lineHeight: 20 },
  change: { flex: 0.9, textAlign: 'right' },
  changeText: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  note: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: Hairline },
  noteText: { fontSize: 12, lineHeight: 18 },
  forecast: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: Hairline, gap: 2 },
  forecastText: { fontSize: 14, lineHeight: 22 },
  histRow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: Hairline, gap: 6 },
  histLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  period: { flex: 1.3 },
  periodText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  periodNote: { fontSize: 11, lineHeight: 15 },
  histValue: { flex: 1, textAlign: 'right' },
  histValueText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
});
