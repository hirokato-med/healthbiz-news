import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleRow } from '@/components/article-row';
import { KatoAvatar } from '@/components/kato-avatar';
import { SubscribeLink } from '@/components/subscribe-link';
import { WeeklyDetail } from '@/components/weekly-detail';
import { SubstackSubscribe } from '@/components/substack-subscribe';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Thumb } from '@/components/thumb';
import { channelOf } from '@/constants/channels';
import { Hairline, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track, trackArticle, trackClick } from '@/lib/analytics';
import { articlesOfCompany, relatedArticles } from '@/lib/related';
import { preloadShareCard, shareArticle } from '@/lib/share-card';
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
  const { articles, isSaved, toggleSaved, markRead, reactionOf, setReaction } = useStore();

  const article = articles.find((a) => a.id === id);
  // 共有の結果を短く知らせる（画像を保存した／コピーした）
  const [shareNote, setShareNote] = useState<string | null>(null);
  useEffect(() => {
    if (article) {
      trackArticle(article);
      markRead(article.id);
    }
  }, [article, markRead]);
  useEffect(() => {
    // 最初の共有で待たせないよう、顔写真を先に読んでおく
    preloadShareCard();
  }, []);
  useEffect(() => {
    if (!shareNote) return;
    const t = setTimeout(() => setShareNote(null), 2800);
    return () => clearTimeout(t);
  }, [shareNote]);
  const related = useMemo(() => (article ? relatedArticles(article, articles) : []), [article, articles]);
  // 発信元の企業ページは、記事が2本以上あるか会社情報があるときだけリンクにする（1本だけのページに飛ばさない）
  const sourceHasPage = useMemo(() => {
    if (!article || article.kind === 'substack' || article.kind === 'weekly') return false;
    const { articles: list, info } = articlesOfCompany(article.source_name, articles);
    return list.length > 1 || !!info;
  }, [article, articles]);
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

  // 共有: 見出し・コメント・顔写真入りの画像カードを共有シートへ（対応していない環境では画像を保存して本文をコピー）
  const share = async () => {
    trackClick('share', { article_id: article.id });
    const result = await shareArticle(article);
    if (result === 'download') setShareNote('画像を保存し、本文をコピーしました');
  };

  return (
    <ThemedView style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <BarButton label="‹ 戻る" onPress={() => router.back()} color={theme.accent} />
        <View style={{ flex: 1 }} />
        <BarButton label={saved ? '★ 保存済み' : '☆ 保存'} onPress={() => (trackClick(saved ? 'unsave' : 'save', { article_id: article.id }), toggleSaved(article.id))} color={theme.accent} />
        <BarButton label="共有" onPress={() => void share()} color={theme.accent} />
      </View>
      {shareNote ? (
        <View style={[styles.note, { backgroundColor: theme.surface }]}>
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
            {shareNote}
          </ThemedText>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}>
        {article.kind === 'weekly' ? (
          <WeeklyDetail issue={article} articles={articles} onShare={() => void share()} />
        ) : (
          <>
          <ThemedText type="eyebrow" style={{ color: channel.color }}>
            {channel.name}
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            {article.title}
          </ThemedText>
          <View style={[styles.meta, styles.metaRow]}>
            {!sourceHasPage ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {article.source_name}
              </ThemedText>
            ) : (
              <Pressable
                onPress={() => router.push({ pathname: '/company/[name]', params: { name: article.source_name } })}
                accessibilityRole="link"
                hitSlop={6}>
                <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
                  {article.source_name} ›
                </ThemedText>
              </Pressable>
            )}
            <ThemedText type="caption" themeColor="textSecondary">
              ・{formatDateLong(article.published_date)}
            </ThemedText>
          </View>

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

          {article.quote?.text ? (
            <View style={[styles.quote, { borderLeftColor: theme.line }]}>
              <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '700' }}>
                原文より
              </ThemedText>
              <ThemedText style={styles.quoteText}>“{article.quote.text}”</ThemedText>
              {article.quote.source || article.quote.url ? (
                <Pressable
                  onPress={() => article.quote?.url && (trackClick('quote_source', { article_id: article.id }), WebBrowser.openBrowserAsync(article.quote.url))}
                  accessibilityRole="link"
                  disabled={!article.quote.url}>
                  <ThemedText type="caption" style={{ color: article.quote.url ? theme.accent : theme.textSecondary }}>
                    — {article.quote.source ?? '出典'}
                    {article.quote.url ? ' ↗' : ''}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ThemedText type="section" style={styles.sectionLabel}>
            {article.kind === 'substack' ? '記事の冒頭' : '加藤浩晃のコメント'}
          </ThemedText>
          <View style={[styles.commentBox, { backgroundColor: theme.surface, borderLeftColor: theme.accent }]}>
            <View style={styles.byline}>
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
            <ThemedText type="comment">{article.comment}</ThemedText>
          </View>
          {article.kind !== 'substack' ? (
            <>
              <View style={styles.afterComment}>
                <SubscribeLink where="article" />
              </View>
              <Reactions
                value={reactionOf(article.id)}
                onPick={(r) => {
                  setReaction(article.id, r);
                  track('helpful', { article_id: article.id, reaction: r, category: article.category });
                }}
              />
            </>
          ) : null}

          {article.company ? (
            <>
              <Pressable
                onPress={() => router.push({ pathname: '/company/[name]', params: { name: article.company!.name } })}
                accessibilityRole="link"
                style={styles.sectionLabel}>
                <ThemedText type="section">
                  {article.company.name} <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>記事一覧 ›</ThemedText>
                </ThemedText>
              </Pressable>
              {article.company.listed ? (
                <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
                  {article.company.listed}
                </ThemedText>
              ) : null}
              {article.company.financials ? <ThemedText style={styles.companyText}>{article.company.financials}</ThemedText> : null}
              <ThemedText style={styles.companyText}>{article.company.profile}</ThemedText>
              {article.company.ceo ? (
                <View style={styles.ceo}>
                  <ThemedText type="caption" style={{ fontWeight: '700' }}>
                    ▸ 代表：{article.company.ceo.name}
                  </ThemedText>
                  {/* 経歴が取れなかった記事は名前だけ出す（「経歴確認できない」を読者に見せない） */}
                  {article.company.ceo.bio && !/経歴確認できない|不明/.test(article.company.ceo.bio) ? (
                    <ThemedText style={styles.companyText}>{article.company.ceo.bio}</ThemedText>
                  ) : null}
                </View>
              ) : null}
              {article.company.url ? (
                <Pressable onPress={() => (trackClick('company', { article_id: article.id }), WebBrowser.openBrowserAsync(article.company!.url!))} accessibilityRole="link">
                  <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
                    会社サイト ↗
                  </ThemedText>
                </Pressable>
              ) : null}
            </>
          ) : null}

          <Pressable
            onPress={() => (trackClick(article.kind === 'substack' ? 'substack_read' : 'source', { article_id: article.id }), WebBrowser.openBrowserAsync(article.source_url))}
            style={({ pressed }) => [styles.sourceButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="link">
            <ThemedText style={[styles.sourceButtonText, { color: theme.onAccent }]}>
              {article.kind === 'substack' ? 'メルマガで続きを読む ↗' : 'プレスリリース原文を読む ↗'}
            </ThemedText>
          </Pressable>
          {article.kind === 'substack' ? <SubstackSubscribe compact /> : null}
          {article.source_url_2 ? (
            <Pressable
              onPress={() => (trackClick('source_2', { article_id: article.id }), WebBrowser.openBrowserAsync(article.source_url_2!))}
              style={({ pressed }) => [styles.sourceButton, styles.sourceButtonSecondary, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="link">
              <ThemedText style={[styles.sourceButtonText, { color: theme.accent }]}>相手方のリリースも読む ↗</ThemedText>
            </Pressable>
          ) : null}
          <ThemedText type="caption" themeColor="textSecondary" style={styles.disclaimer}>
            {article.kind === 'substack'
              ? '加藤浩晃が連載しているメルマガの記事です。全文はメルマガで読めます。購読するとメールで届きます。'
              : '要約はプレスリリースをもとに作成しています。正確な内容は原文をご確認ください。'}
          </ThemedText>

          {related.length ? (
            <View style={styles.related}>
              <ThemedText type="section" style={styles.sectionLabel}>
                関連する記事
              </ThemedText>
              {related.map((a) => (
                <ArticleRow key={a.id} article={a} compact />
              ))}
            </View>
          ) : null}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/** 「役に立った」「もっと詳しく知りたい」のワンタップ反応。押したら端末に残し、GA に送る */
function Reactions({ value, onPick }: { value: 'helpful' | 'more' | null; onPick: (r: 'helpful' | 'more') => void }) {
  const theme = useTheme();
  if (value) {
    return (
      <ThemedText type="caption" themeColor="textSecondary" style={styles.reactionThanks}>
        {value === 'helpful' ? '「役に立った」を受け付けました。ありがとうございます。' : '「もっと詳しく知りたい」を受け付けました。今後の配信の参考にします。'}
      </ThemedText>
    );
  }
  return (
    <View style={styles.reactions}>
      <ThemedText type="caption" themeColor="textSecondary">
        この記事は
      </ThemedText>
      {(
        [
          ['helpful', '👍 役に立った'],
          ['more', '🔎 もっと詳しく知りたい'],
        ] as const
      ).map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => onPick(key)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.reactionButton, { borderColor: theme.line, backgroundColor: pressed ? theme.surface : 'transparent' }]}>
          <ThemedText type="caption" style={{ fontWeight: '700' }}>
            {label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
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
  note: { alignItems: 'center', paddingVertical: Spacing.two },
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
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  quote: { marginTop: Spacing.five, borderLeftWidth: 3, paddingLeft: Spacing.three, gap: Spacing.one },
  quoteText: { fontSize: 15, lineHeight: 24, fontStyle: 'italic' },
  afterComment: { marginTop: Spacing.three },
  related: { marginTop: Spacing.four },
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
  reactions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.four },
  reactionButton: { borderWidth: 1, borderRadius: Radius.tag, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  reactionThanks: { marginTop: Spacing.four },
});
