import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { SubscribeLink } from '@/components/subscribe-link';
import { ThemedText } from '@/components/themed-text';
import { Thumb } from '@/components/thumb';
import { channelOf } from '@/constants/channels';
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/articles';
import type { Article } from '@/lib/types';

/**
 * トップの注目記事。大きな画像の下に分類ラベル・太い見出し・コメントの冒頭。
 */
export function FeaturedArticle({ article }: { article: Article }) {
  const theme = useTheme();
  const router = useRouter();
  const channel = channelOf(article.category);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.card, { borderBottomColor: theme.line, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button">
      <Thumb article={article} style={styles.image} large />
      <ThemedText type="eyebrow" style={{ color: channel.color }}>
        {channel.name}
      </ThemedText>
      <ThemedText type="featured">{article.title}</ThemedText>
      <View style={[styles.comment, { borderLeftColor: theme.accent }]}>
        <View style={styles.commentBy}>
          <KatoAvatar size={22} />
          <ThemedText type="caption" themeColor="textSecondary">
            加藤浩晃のコメント
          </ThemedText>
        </View>
        <ThemedText type="comment" numberOfLines={2} style={styles.commentText}>
          {article.comment}
        </ThemedText>
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {article.source_name}・{formatRelative(article.published_date)}
      </ThemedText>
      <SubscribeLink where="featured" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingBottom: Spacing.four,
    borderBottomWidth: Hairline,
    gap: Spacing.two,
  },
  image: {
    width: '100%',
    aspectRatio: 2,
    marginBottom: Spacing.one,
  },
  comment: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.three,
    marginVertical: Spacing.one,
    gap: Spacing.one,
  },
  commentBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  /** 2行で45字前後 */
  commentText: {
    fontSize: 14,
    lineHeight: 23,
  },
});
