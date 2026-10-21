import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Thumb } from '@/components/thumb';
import { channelOf } from '@/constants/channels';
import { Hairline, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateLong } from '@/lib/articles';
import { useStore } from '@/lib/store';

/**
 * 記事詳細。白いバー（戻る・保存・共有）→ 分類ラベル → 太い見出し → 画像 →
 * ポイント → 加藤コメント（紺の縦棒付きの薄い面）→ 原文ボタン。
 */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { articles, isSaved, toggleSaved } = useStore();

  const article = articles.find((a) => a.id === id);
  if (!article) {
    return (
      <ThemedView style={styles.root}>
        <ThemedText themeColor="textSecondary" style={styles.missing}>
          この記事は見つかりませんでした。
        </ThemedText>
      </ThemedView>
    );
  }

  const channel = channelOf(article.category);
  const saved = isSaved(article.id);

  const share = () =>
    Share.share({
      message: `${article.title}\n${article.source_url}\n\n— Healthcare Business News（加藤浩晃のコメント付き）`,
    }).catch(() => {});

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <BarButton label="‹ 戻る" onPress={() => router.back()} color={theme.accent} />
        <View style={{ flex: 1 }} />
        <BarButton label={saved ? '★ 保存済み' : '☆ 保存'} onPress={() => toggleSaved(article.id)} color={theme.accent} />
        <BarButton label="共有" onPress={share} color={theme.accent} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}>
        <ThemedText type="eyebrow" style={{ color: channel.color }}>
          {channel.name}
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          {article.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
          {article.source_name}・{formatDateLong(article.published_date)}
        </ThemedText>

        {article.image_url ? <Thumb article={article} style={styles.image} large /> : null}

        {article.summary.length > 0 && (
          <ThemedText type="section" style={styles.sectionLabel}>
            ポイント
          </ThemedText>
        )}
        {article.summary.map((line, i) => (
          <View key={i} style={styles.bullet}>
            <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            <ThemedText style={{ flex: 1 }}>{line}</ThemedText>
          </View>
        ))}

        <ThemedText type="section" style={styles.sectionLabel}>
          加藤浩晃のコメント
        </ThemedText>
        <View style={[styles.commentBox, { backgroundColor: theme.surface, borderLeftColor: theme.accent }]}>
          <View style={styles.byline}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <ThemedText style={[styles.avatarText, { color: theme.onAccent }]}>加</ThemedText>
            </View>
            <View>
              <ThemedText type="caption" style={{ fontWeight: '700' }}>
                加藤浩晃
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={{ fontSize: 11 }}>
                医師・ヘルスケアビジネス
              </ThemedText>
            </View>
          </View>
          <ThemedText type="comment">{article.comment}</ThemedText>
        </View>

        {article.company ? (
          <>
            <ThemedText type="section" style={styles.sectionLabel}>
              {article.company.name}
            </ThemedText>
            <ThemedText style={styles.companyText}>{article.company.profile}</ThemedText>
            {article.company.ceo ? (
              <View style={styles.ceo}>
                <ThemedText type="caption" style={{ fontWeight: '700' }}>
                  ▸ 代表：{article.company.ceo.name}
                </ThemedText>
                <ThemedText style={styles.companyText}>{article.company.ceo.bio}</ThemedText>
              </View>
            ) : null}
            {article.company.url ? (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(article.company!.url!)} accessibilityRole="link">
                <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
                  会社サイト ↗
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(article.source_url)}
          style={({ pressed }) => [styles.sourceButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="link">
          <ThemedText style={[styles.sourceButtonText, { color: theme.onAccent }]}>プレスリリース原文を読む ↗</ThemedText>
        </Pressable>
        {article.source_url_2 ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(article.source_url_2!)}
            style={({ pressed }) => [styles.sourceButton, styles.sourceButtonSecondary, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="link">
            <ThemedText style={[styles.sourceButtonText, { color: theme.accent }]}>相手方のリリースも読む ↗</ThemedText>
          </Pressable>
        ) : null}
        <ThemedText type="caption" themeColor="textSecondary" style={styles.disclaimer}>
          要約はプレスリリースをもとに作成しています。正確な内容は原文をご確認ください。
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function BarButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={styles.barButton} accessibilityRole="button" hitSlop={6}>
      <ThemedText style={[styles.barButtonText, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  missing: { textAlign: 'center', marginTop: Spacing.ten * 2 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: Hairline,
  },
  barButton: { paddingHorizontal: Spacing.two, paddingVertical: 6 },
  barButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: { marginTop: Spacing.one, marginBottom: Spacing.two },
  meta: { marginBottom: Spacing.four },
  image: { width: '100%', aspectRatio: 16 / 9, marginBottom: Spacing.two },
  sectionLabel: { marginTop: Spacing.five, marginBottom: Spacing.two },
  bullet: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start', marginBottom: Spacing.one },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 10 },
  commentBox: {
    borderLeftWidth: 4,
    borderRadius: Radius.thumb,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  sourceButton: {
    marginTop: Spacing.six,
    borderRadius: Radius.button,
    paddingVertical: Spacing.four - 2,
    alignItems: 'center',
  },
  sourceButtonSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, marginTop: Spacing.two },
  sourceButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  companyText: { fontSize: 14, lineHeight: 23 },
  ceo: { marginTop: Spacing.two, gap: Spacing.one },
  disclaimer: { marginTop: Spacing.three, lineHeight: 18 },
});
