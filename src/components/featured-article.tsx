import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
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
/** wide: PC 向け。画像を左、見出しとコメントを右に並べる */
export function FeaturedArticle({ article, wide = false }: { article: Article; wide?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const channel = channelOf(article.category);

  const body = (
    <>
      <ThemedText type="eyebrow" style={{ color: channel.color }}>
        {channel.name}
      </ThemedText>
      <ThemedText type="featured" style={wide ? styles.wideTitle : undefined}>
        {article.title}
      </ThemedText>
      <View style={[styles.comment, { borderLeftColor: theme.accent }]}>
        <View style={styles.commentBy}>
          <KatoAvatar size={22} />
          <ThemedText type="caption" themeColor="textSecondary">
            加藤浩晃のコメント
          </ThemedText>
        </View>
        <ThemedText type="comment" numberOfLines={wide ? 5 : 2} style={styles.commentText}>
          {article.comment}
        </ThemedText>
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {article.source_name}・{formatRelative(article.published_date)}
      </ThemedText>
    </>
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.card, wide && styles.wideCard, { borderBottomColor: theme.line, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button">
      {wide ? (
        <>
          <Thumb article={article} style={styles.wideImage} large />
          <View style={styles.wideBody}>{body}</View>
        </>
      ) : (
        <>
          <Thumb article={article} style={styles.image} large />
          {body}
        </>
      )}
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
  wideCard: { flexDirection: 'row', gap: Spacing.five, alignItems: 'flex-start', paddingTop: Spacing.two },
  wideImage: { flex: 1.1, aspectRatio: 16 / 10 },
  wideBody: { flex: 1, gap: Spacing.two },
  wideTitle: { fontSize: 24, lineHeight: 35 },
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
