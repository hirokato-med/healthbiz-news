import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { ThemedText } from '@/components/themed-text';
import { Thumb } from '@/components/thumb';
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/articles';
import { useStore } from '@/lib/store';
import type { Article } from '@/lib/types';

/**
 * 一覧の1行。上段は「太ゴシックの見出し＋発信元・日付」と右のサムネイル、
 * 下段に加藤コメントの冒頭2行（40字前後）を全幅で出す。
 * compact は関連記事・検索結果用（コメント行なし、サムネイル小）。
 */
export function ArticleRow({ article, compact = false }: { article: Article; compact?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { isSaved, isRead } = useStore();
  const read = isRead(article.id);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, { borderBottomColor: theme.line, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${read ? '既読。' : ''}${article.title}。${article.source_name}、${formatRelative(article.published_date)}${isSaved(article.id) ? '、保存済み' : ''}`}>
      <View style={styles.top}>
        <View style={styles.body}>
          {article.kind === 'weekly' ? (
            // 今週のまとめは、見出しの上に青い帯のラベルを出してひと目で分かるように
            <View style={styles.weeklyBadgeRow}>
              <View style={[styles.weeklyBadge, { backgroundColor: theme.accent }]}>
                <ThemedText type="caption" style={{ color: theme.onAccent, fontWeight: '800' }}>
                  今週のまとめ
                </ThemedText>
              </View>
              {article.weekly?.range ? (
                <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
                  {article.weekly.range}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          <View style={styles.headlineRow}>
            <ThemedText type="headline" numberOfLines={compact ? 2 : 3} style={styles.headline}>
              {article.kind === 'weekly' ? article.title.replace(/^(【見本】)?今週のまとめ｜/, '$1') : article.title}
            </ThemedText>
          </View>
          <View style={styles.meta}>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.source}>
              {article.source_name}・{formatRelative(article.published_date)}
            </ThemedText>
            {isSaved(article.id) && (
              <ThemedText type="caption" themeColor="textSecondary">
                ★
              </ThemedText>
            )}
            {/* 開いたことのある記事は、発信元・日付の横に小さく「既読」 */}
            {read ? (
              <ThemedText type="caption" themeColor="textSecondary">
                既読
              </ThemedText>
            ) : null}
          </View>
        </View>
        <Thumb article={article} style={compact ? styles.thumbCompact : styles.thumb} />
      </View>

      {!compact ? (
        <View style={[styles.comment, { borderLeftColor: theme.accent }]}>
          <View style={styles.avatar}>
            <KatoAvatar size={22} />
          </View>
          <ThemedText type="comment" numberOfLines={2} style={styles.commentText}>
            {article.comment}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.four,
    borderBottomWidth: Hairline,
    gap: Spacing.three,
  },
  rowCompact: {
    paddingVertical: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  weeklyBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  weeklyBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headline: { flex: 1 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  source: {
    flexShrink: 1,
  },
  thumb: {
    width: 96,
    height: 96,
  },
  thumbCompact: {
    width: 64,
    height: 64,
  },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderLeftWidth: 3,
    paddingLeft: Spacing.three,
  },
  avatar: {
    marginTop: 0,
  },
  /** 2行で40字前後 */
  commentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 21,
  },
});
