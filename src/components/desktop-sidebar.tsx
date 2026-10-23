import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ColumnHeader } from '@/components/desktop-columns';
import { ThemedText } from '@/components/themed-text';
import { Channels } from '@/constants/channels';
import { Links } from '@/constants/links';
import { Hairline, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';
import { formatDateShort } from '@/lib/articles';
import { useStore } from '@/lib/store';
import type { Article } from '@/lib/types';
import { uiState } from '@/lib/ui-state';

/**
 * PC 向け画面の右の列。今日の注目 → 最新の決算 → メルマガ登録 → 分野から探す。
 * onSelectChannel があればトップのタブを切り替え、無ければ（記事ページなど）トップへ戻ってそのタブを開く。
 */
export function DesktopSidebar({ onSelectChannel }: { onSelectChannel?: (index: number) => void }) {
  const theme = useTheme();
  const router = useRouter();
  const { articles } = useStore();

  const { picks, earnings } = useMemo(() => {
    const news = articles.filter((a) => !a.kind || a.kind === 'news').filter((a) => a.category !== 'earnings' || a.featured);
    const latest = news[0]?.published_date;
    const todays = news.filter((a) => a.published_date === latest);
    return {
      picks: [...todays.filter((a) => a.featured), ...todays.filter((a) => !a.featured)].slice(0, 5),
      earnings: articles.filter((a) => a.category === 'earnings' && a.earnings).slice(0, 5),
    };
  }, [articles]);

  const open = (a: Article, where: string) => {
    trackClick('sidebar', { article_id: a.id, where });
    router.push({ pathname: '/article/[id]', params: { id: a.id } });
  };
  const selectChannel = (i: number) => {
    trackClick('sidebar_channel', { channel: Channels[i].id });
    if (onSelectChannel) return onSelectChannel(i);
    uiState.channelIndex = i;
    router.navigate('/');
  };
  const earningsIndex = Channels.findIndex((c) => c.id === 'earnings');

  return (
    <View style={styles.root}>
      {picks.length ? (
        <View>
          <ColumnHeader title="今日の注目" />
          {picks.map((a, i) => (
            <Pressable key={a.id} onPress={() => open(a, 'picks')} style={({ pressed }) => [styles.pick, { borderBottomColor: theme.line, borderBottomWidth: Hairline }, pressed && { opacity: 0.6 }]}>
              <ThemedText style={[styles.rank, { color: theme.accent }]}>{i + 1}</ThemedText>
              <ThemedText style={styles.pickText} numberOfLines={3}>
                {a.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {earnings.length ? (
        <View>
          <Pressable onPress={() => selectChannel(earningsIndex)} accessibilityRole="link">
            <ColumnHeader title="最新の決算" aside="決算タブへ ›" asideColor={theme.accent} />
          </Pressable>
          {earnings.map((a, i) => {
            const row = a.earnings!.rows.find((r) => r.label.includes('営業')) ?? a.earnings!.rows[0];
            const change = row?.change ?? '';
            const down = /^[-−]|減|拡大|赤字(?!縮小)/.test(change) && !change.includes('縮小');
            const up = !down && /^\+|増|黒字|上方|縮小/.test(change);
            return (
              <Pressable key={a.id} onPress={() => open(a, 'earnings')} style={({ pressed }) => [styles.earn, { borderBottomColor: theme.line, borderBottomWidth: Hairline }, pressed && { opacity: 0.6 }]}>
                <ThemedText style={styles.earnName} numberOfLines={1}>
                  {a.source_name}
                </ThemedText>
                {row ? (
                  <ThemedText style={styles.earnRow} numberOfLines={1}>
                    {row.label} {row.value}{' '}
                    <ThemedText style={[styles.earnRow, { color: down ? theme.accent : up ? theme.up : theme.textSecondary, fontWeight: '700' }]}>{change}</ThemedText>
                  </ThemedText>
                ) : null}
                <ThemedText type="caption" themeColor="textSecondary" style={styles.earnMeta}>
                  {formatDateShort(a.published_date)}・{a.earnings!.kind ?? '決算'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.card, styles.mail, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
        <ThemedText style={[styles.cardTitle, { color: '#FFFFFF' }]}>毎朝のメルマガ</ThemedText>
        <ThemedText style={styles.mailText}>加藤浩晃の「ヘルスケアイノベーション通信」。ニュースの背景と次の一手を、毎朝メールで。</ThemedText>
        <Pressable
          onPress={() => (trackClick('substack_subscribe', { where: 'sidebar' }), WebBrowser.openBrowserAsync(Links.substackSubscribe))}
          style={({ pressed }) => [styles.mailButton, { backgroundColor: theme.up, opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="link">
          <ThemedText style={styles.mailButtonText}>無料で受け取る</ThemedText>
        </Pressable>
      </View>

      <View>
        <ColumnHeader title="分野から探す" />
        <View style={styles.chips}>
          {Channels.map((c, i) =>
            c.id === 'today' ? null : (
              <Pressable key={c.id} onPress={() => selectChannel(i)} style={({ pressed }) => [styles.chip, { borderColor: theme.line, opacity: pressed ? 0.6 : 1 }]}>
                <ThemedText style={[styles.chipText, { color: c.color }]}>{c.name}</ThemedText>
              </Pressable>
            ),
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.six },
  card: { borderWidth: Hairline, borderRadius: Radius.thumb + 4, padding: Spacing.four },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, lineHeight: 22, fontWeight: '800', marginBottom: Spacing.two },
  pick: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two + 1 },
  rank: { fontSize: 18, lineHeight: 22, fontWeight: '800', width: 16 },
  pickText: { flex: 1, fontSize: 13.5, lineHeight: 21 },
  earn: { paddingVertical: Spacing.two + 2, gap: 1 },
  earnName: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  earnRow: { fontSize: 13, lineHeight: 19 },
  earnMeta: { fontSize: 12, lineHeight: 17 },
  mail: {},
  mailText: { color: '#FFFFFF', fontSize: 13, lineHeight: 21, opacity: 0.95, marginBottom: Spacing.three },
  mailButton: { borderRadius: Radius.button, paddingVertical: Spacing.three - 1, alignItems: 'center' },
  mailButtonText: { color: '#FFFFFF', fontSize: 15, lineHeight: 20, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: Hairline, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 5 },
  chipText: { fontSize: 13, lineHeight: 18 },
});
