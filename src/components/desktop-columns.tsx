import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { KatoAvatar } from '@/components/kato-avatar';
import { ThemedText } from '@/components/themed-text';
import { Thumb } from '@/components/thumb';
import { channelOf } from '@/constants/channels';
import { Hairline, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRelative } from '@/lib/articles';
import { useStore } from '@/lib/store';
import type { Article } from '@/lib/types';

/** PC 向け 3 段組の各段の見出し。太字＋下に濃い罫線（新聞の段見出しの形） */
export function ColumnHeader({ title, aside, asideColor }: { title: string; aside?: string; asideColor?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.text }]}>
      <ThemedText style={styles.headerTitle}>{title}</ThemedText>
      {aside ? <ThemedText style={[styles.headerAside, { color: asideColor ?? theme.up }]}>{aside}</ThemedText> : null}
    </View>
  );
}

/**
 * 左の段のトップ記事。大きな画像 → 分類 → 大きな見出し → 加藤コメント（全文）。
 * horizontal: 2 段組のとき。見出しを横いっぱいに、その下に加藤コメント（左）と写真（右）を並べる
 */
export function DesktopLead({ article, horizontal = false }: { article: Article; horizontal?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const channel = channelOf(article.category);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.lead, pressed && styles.pressed]}
      accessibilityRole="button">
      {horizontal ? (
        // 2 段組: 見出しを横いっぱいに、その下の左に加藤コメント、右に写真
        <>
          <ThemedText style={[styles.label, { color: channel.color }]}>{channel.name}</ThemedText>
          <ThemedText style={[styles.leadTitle, styles.leadTitleRow]}>{article.title}</ThemedText>
          <View style={styles.leadRow}>
            <View style={styles.leadBody}>
              <Comment article={article} lines={7} />
              <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
                {article.source_name}・{formatRelative(article.published_date)}
              </ThemedText>
            </View>
            <Thumb article={article} style={[styles.leadImage, styles.leadImageRow]} large fit={article.category === 'earnings' ? 'contain' : 'cover'} />
          </View>
        </>
      ) : (
        <>
          <Thumb article={article} style={styles.leadImage} large fit={article.category === 'earnings' ? 'contain' : 'cover'} />
          <ThemedText style={[styles.label, { color: channel.color }]}>{channel.name}</ThemedText>
          <ThemedText style={styles.leadTitle}>{article.title}</ThemedText>
          <Comment article={article} lines={8} />
          <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
            {article.source_name}・{formatRelative(article.published_date)}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** トップ記事の下に 2 本並べる小さな記事（画像・分類・見出し） */
export function DesktopSubCard({ article }: { article: Article }) {
  const router = useRouter();
  const channel = channelOf(article.category);
  return (
    <Pressable onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })} style={({ pressed }) => [styles.sub, pressed && styles.pressed]} accessibilityRole="button">
      <Thumb article={article} style={styles.subImage} fit={article.category === 'earnings' ? 'contain' : 'cover'} />
      <ThemedText style={[styles.label, { color: channel.color }]}>{channel.name}</ThemedText>
      <ThemedText style={styles.subTitle} numberOfLines={3}>
        {article.title}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
        {article.source_name}・{formatRelative(article.published_date)}
      </ThemedText>
    </Pressable>
  );
}

/** 中の段（新着）の 1 行。分類 → 見出し → コメント 2 行、右に小さな画像 */
export function DesktopRow({ article, wide = false }: { article: Article; wide?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { isRead, isSaved } = useStore();
  const channel = channelOf(article.category);
  const digest = article.kind === 'weekly' || article.kind === 'monthly';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/article/[id]', params: { id: article.id } })}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.line }, pressed && styles.pressed]}
      accessibilityRole="button">
      <View style={styles.rowBody}>
        <ThemedText style={[styles.label, { color: digest ? theme.accent : channel.color }]}>
          {digest ? (article.kind === 'monthly' ? '今月の注目決算' : '今週のまとめ') : channel.name}
        </ThemedText>
        <ThemedText style={styles.rowTitle} numberOfLines={4}>
          {digest ? article.title.replace(/^(今週のまとめ|今月の注目決算)｜/, '') : article.title}
        </ThemedText>
        {article.comment ? <Comment article={article} lines={2} small /> : null}
        <ThemedText type="caption" themeColor="textSecondary" style={styles.meta}>
          {article.source_name}・{formatRelative(article.published_date)}
          {isSaved(article.id) ? '　★' : ''}
          {isRead(article.id) ? '　既読' : ''}
        </ThemedText>
      </View>
      <Thumb article={article} style={[styles.rowImage, wide && styles.rowImageWide]} fit={article.category === 'earnings' ? 'contain' : 'cover'} />
    </Pressable>
  );
}

function Comment({ article, lines, small = false }: { article: Article; lines: number; small?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.comment, { borderLeftColor: theme.accent }]}>
      <View style={styles.commentBy}>
        <KatoAvatar size={small ? 18 : 20} />
        <ThemedText type="caption" themeColor="textSecondary" style={{ fontSize: 11 }}>
          加藤浩晃のコメント
        </ThemedText>
      </View>
      <ThemedText numberOfLines={lines} style={small ? styles.commentSmall : styles.commentText}>
        {article.comment}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, paddingBottom: Spacing.two, marginBottom: Spacing.three },
  headerTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  headerAside: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  meta: { fontSize: 11.5, lineHeight: 16, marginTop: Spacing.one },
  lead: { gap: Spacing.two },
  leadImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: 0, marginBottom: Spacing.one },
  leadTitle: { fontSize: 26, lineHeight: 37, fontWeight: '800', letterSpacing: -0.2 },
  leadRow: { flexDirection: 'row', gap: Spacing.five, alignItems: 'flex-start', marginTop: Spacing.one },
  leadImageRow: { flex: 1, width: undefined, marginBottom: 0 },
  leadBody: { flex: 1, gap: Spacing.two },
  leadTitleRow: { fontSize: 28, lineHeight: 40 },
  sub: { flex: 1, gap: 4 },
  subImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: 0, marginBottom: 2 },
  subTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: Hairline },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  rowImage: { width: 96, height: 68, borderRadius: 4 },
  rowImageWide: { width: 150, height: 100 },
  comment: { borderLeftWidth: 3, paddingLeft: Spacing.three - 2, gap: 2, marginTop: 2 },
  commentBy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  commentText: { fontSize: 13.5, lineHeight: 23 },
  commentSmall: { fontSize: 12.5, lineHeight: 20 },
});
