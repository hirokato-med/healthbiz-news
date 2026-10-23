import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Article } from '@/lib/types';

/** 決算の概要（売上・利益などを前年同期比つきで表にする） */
export function EarningsTable({ earnings }: { earnings: NonNullable<Article['earnings']> }) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { borderColor: theme.line }]}>
      <View style={[styles.head, { backgroundColor: theme.surface }]}>
        <ThemedText type="caption" style={{ fontWeight: '700' }}>
          {earnings.period}
        </ThemedText>
        {earnings.kind ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {earnings.kind}
          </ThemedText>
        ) : null}
      </View>
      {earnings.rows.map((r, i) => {
        const up = r.change?.trim().startsWith('+') || r.change?.includes('増');
        const down = r.change?.trim().startsWith('-') || r.change?.trim().startsWith('−') || r.change?.includes('減') || r.change?.includes('赤字');
        return (
          <View key={i} style={[styles.row, { borderTopColor: theme.line }]}>
            <ThemedText style={styles.label}>{r.label}</ThemedText>
            <ThemedText style={styles.value}>{r.value}</ThemedText>
            <ThemedText style={[styles.change, { color: up ? theme.up : down ? theme.accent : theme.textSecondary }]}>{r.change ?? ''}</ThemedText>
          </View>
        );
      })}
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

const styles = StyleSheet.create({
  box: { borderWidth: Hairline, borderRadius: Radius.thumb, overflow: 'hidden', marginTop: Spacing.two },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: Hairline, gap: Spacing.two },
  label: { flex: 1.2, fontSize: 14, lineHeight: 20 },
  value: { flex: 1.3, fontSize: 15, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
  change: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
  forecast: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderTopWidth: Hairline, gap: 2 },
  forecastText: { fontSize: 14, lineHeight: 22 },
});
