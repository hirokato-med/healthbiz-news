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
 */
export function ArticleRow({ article }: { article: Article }) {
  const theme = useTheme();
  const router = useRouter();
  const { isSaved } = useStore();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.line, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button">
      <View style={styles.top}>
        <View style={styles.body}>
          <ThemedText type="headline" numberOfLines={3}>
            {article.title}
          </ThemedText>
          <View style={styles.meta}>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.source}>
              {article.source_name}・{formatRelative(article.published_date)}
            </ThemedText>
            {isSaved(article.id) && (
              <ThemedText type="caption" themeColor="textSecondary">
                ★
              </ThemedText>
            )}
          </View>
        </View>
        <Thumb article={article} style={styles.thumb} />
      </View>

      <View style={[styles.comment, { borderLeftColor: theme.accent }]}>
        <View style={styles.avatar}>
          <KatoAvatar size={22} />
        </View>
        <ThemedText type="comment" numberOfLines={2} style={styles.commentText}>
          {article.comment}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.four,
    borderBottomWidth: Hairline,
    gap: Spacing.three,
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
