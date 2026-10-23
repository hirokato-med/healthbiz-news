import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleRow } from '@/components/article-row';
import { ColumnHeader } from '@/components/desktop-columns';
import { DesktopHeader } from '@/components/desktop-header';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { EarningsHistory, EarningsTable } from '@/components/earnings-table';
import { KatoAvatar } from '@/components/kato-avatar';
import { ShareButtons } from '@/components/share-buttons';
import { SubscribeLink } from '@/components/subscribe-link';
import { MonthlyEarningsDetail } from '@/components/monthly-earnings-detail';
import { WeeklyDetail } from '@/components/weekly-detail';
import { SubstackSubscribe } from '@/components/substack-subscribe';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Thumb } from '@/components/thumb';
import { channelOf } from '@/constants/channels';
import { Hairline, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DesktopMaxWidth, SidebarWidth, useDesktop } from '@/hooks/use-desktop';
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
  const desktop = useDesktop();
  // PC 向け: 左の段の目次から各見出しへ飛ぶための位置
  const scrollRef = useRef<ScrollViewInstance>(null);
  const anchors = useRef<Record<string, number>>({});
  const mainTop = useRef(0);
  const anchor = (key: string) => (e: LayoutChangeEvent) => {
    anchors.current[key] = e.nativeEvent.layout.y;
  };
  const jump = (key: string) => scrollRef.current?.scrollTo({ y: Math.max(0, mainTop.current + (anchors.current[key] ?? 0) - 16), animated: true });
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
    if (!article || article.kind === 'substack' || article.kind === 'weekly' || article.kind === 'monthly') return false;
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
      {desktop ? <DesktopHeader active={article.kind === 'weekly' || article.kind === 'monthly' ? undefined : channel.id} /> : null}
      {!desktop ? (
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <BarButton label="‹ 戻る" onPress={() => router.back()} color={theme.accent} />
        <View style={{ flex: 1 }} />
        <BarButton label={saved ? '★ 保存済み' : '☆ 保存'} onPress={() => (trackClick(saved ? 'unsave' : 'save', { article_id: article.id }), toggleSaved(article.id))} color={theme.accent} />
        <BarButton label="共有" onPress={() => void share()} color={theme.accent} />
      </View>
      ) : null}
      {shareNote ? (
        <View style={[styles.note, { backgroundColor: theme.surface }]}>
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
            {shareNote}
          </ThemedText>
        </View>
      ) : null}

      <ScrollView ref={scrollRef} contentContainerStyle={[desktop ? styles.contentDesktop : styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}>
        {/* PC 向け: 左の段（戻る・目次・保存・共有）／中の段（記事）／右の段（関連記事・今日の注目など）の 3 段組 */}
        <View style={desktop ? styles.desktopRow : undefined}>
        {desktop ? (
          <View style={styles.leftCol}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} accessibilityRole="link" hitSlop={6}>
              <ThemedText style={[styles.leftBack, { color: theme.accent }]}>‹ 一覧へ戻る</ThemedText>
            </Pressable>
            {!article.kind || article.kind === 'news' ? (
              <View style={[styles.toc, { borderLeftColor: theme.line }]}>
                {[
                  ['points', 'ポイント', article.summary.length > 0],
                  ['comment', '加藤浩晃のコメント', true],
                  ['earnings', '決算の概要', !!article.earnings],
                  ['history', '業績の推移', !!article.earnings?.history?.rows.length],
                  ['source', article.category === 'earnings' ? '資料・IR' : '原文・会社情報', true],
                ]
                  .filter(([, , show]) => show)
                  .map(([key, label]) => (
                    <Pressable key={key as string} onPress={() => jump(key as string)} style={styles.tocItem} accessibilityRole="link">
                      <ThemedText style={[styles.tocText, { color: theme.textSecondary }]}>{label as string}</ThemedText>
                    </Pressable>
                  ))}
              </View>
            ) : null}
            <Pressable
              onPress={() => (trackClick(saved ? 'unsave' : 'save', { article_id: article.id }), toggleSaved(article.id))}
              style={({ pressed }) => [styles.leftButton, { borderColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={[styles.leftButtonText, { color: theme.accent }]}>{saved ? '★ 保存済み' : '☆ 保存する'}</ThemedText>
            </Pressable>
            <Pressable onPress={() => void share()} style={({ pressed }) => [styles.leftButton, { borderColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
              <ThemedText style={[styles.leftButtonText, { color: theme.accent }]}>共有する</ThemedText>
            </Pressable>
          </View>
        ) : null}
        <View
          onLayout={(e) => (mainTop.current = e.nativeEvent.layout.y)}
          style={desktop ? [styles.desktopMain, { borderLeftColor: theme.line, borderRightColor: theme.line }] : undefined}>
        {article.kind === 'weekly' ? (
          <WeeklyDetail issue={article} articles={articles} onShare={() => void share()} />
        ) : article.kind === 'monthly' ? (
          <MonthlyEarningsDetail issue={article} onShare={() => void share()} />
        ) : (
          <>
          <View>
          <View>
          <ThemedText type="eyebrow" style={{ color: channel.color }}>
            {channel.name}
          </ThemedText>
          <ThemedText type="title" style={[styles.title, desktop && styles.titleDesktop]}>
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

          </View>
          {/* PC 向けでは見出しの下に、横長の画像を高さを抑えて置く（すぐ本文が読めるように） */}
          {desktop && article.image_url ? (
            <Thumb article={article} style={[styles.imageDesktop, article.category === 'earnings' && styles.logoDesktop]} fit={article.category === 'earnings' ? 'contain' : 'cover'} />
          ) : null}
          </View>

          {!desktop && article.image_url ? <Thumb article={article} style={styles.image} large /> : null}

          {article.summary.length > 0 && (
            <ThemedText type="section" style={styles.sectionLabel} onLayout={anchor('points')}>
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

          <ThemedText type="section" style={styles.sectionLabel} onLayout={anchor('comment')}>
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

          {article.earnings ? (
            <>
              <ThemedText type="section" style={styles.sectionLabel} onLayout={anchor('earnings')}>
                決算の概要
              </ThemedText>
              <EarningsTable earnings={article.earnings} />
              {article.earnings.history?.rows.length ? (
                <>
                  <ThemedText type="section" style={styles.sectionLabel} onLayout={anchor('history')}>
                    業績の推移
                  </ThemedText>
                  <EarningsHistory history={article.earnings.history} />
                </>
              ) : null}
            </>
          ) : null}
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
          <ShareButtons article={article} onShareImage={() => void share()} />

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
            onLayout={anchor('source')}
            onPress={() => (trackClick(article.kind === 'substack' ? 'substack_read' : 'source', { article_id: article.id }), WebBrowser.openBrowserAsync(article.source_url))}
            style={({ pressed }) => [styles.sourceButton, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="link">
            <ThemedText style={[styles.sourceButtonText, { color: theme.onAccent }]}>
              {article.kind === 'substack' ? 'メルマガで続きを読む ↗' : article.category === 'earnings' ? '決算短信（PDF）を読む ↗' : 'プレスリリース原文を読む ↗'}
            </ThemedText>
          </Pressable>
          {article.ir_docs?.length ? (
            <View style={[styles.irDocs, { borderColor: theme.line }]}>
              <ThemedText type="caption" themeColor="textSecondary" style={{ fontWeight: '700' }}>
                IR 資料
              </ThemedText>
              {article.ir_docs.map((d) => (
                <Pressable
                  key={d.url}
                  onPress={() => (trackClick('ir_doc', { article_id: article.id, doc: d.label }), WebBrowser.openBrowserAsync(d.url))}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.irDoc, { borderTopColor: theme.line, opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedText style={[styles.irDocText, { color: theme.accent }]}>{d.label}</ThemedText>
                  <ThemedText style={{ color: theme.accent }}>↗</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
          {article.ir_url ? (
            <Pressable
              onPress={() => (trackClick('ir', { article_id: article.id }), WebBrowser.openBrowserAsync(article.ir_url!))}
              style={({ pressed }) => [styles.sourceButton, styles.sourceButtonSecondary, { borderColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="link">
              <ThemedText style={[styles.sourceButtonText, { color: theme.accent }]}>{article.source_name}の IR ページを見る ↗</ThemedText>
            </Pressable>
          ) : null}
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
              : article.category === 'earnings'
                ? '数字は決算短信・適時開示をもとにまとめています。正確な内容は原文と IR ページをご確認ください。'
                : '要約はプレスリリースをもとに作成しています。正確な内容は原文をご確認ください。'}
          </ThemedText>

          {related.length && !desktop ? (
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
        </View>
        {desktop ? (
          <View style={styles.rightCol}>
            {related.length ? (
              <View style={{ marginBottom: Spacing.six }}>
                <ColumnHeader title="関連する記事" />
                {related.map((a) => (
                  <ArticleRow key={a.id} article={a} compact />
                ))}
              </View>
            ) : null}
            <DesktopSidebar />
          </View>
        ) : null}
        </View>
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
  titleDesktop: { fontSize: 26, lineHeight: 38 },
  contentDesktop: { paddingHorizontal: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: DesktopMaxWidth },
  desktopRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: Spacing.five },
  desktopMain: { flex: 1, borderLeftWidth: Hairline, borderRightWidth: Hairline, paddingHorizontal: Spacing.six, paddingBottom: Spacing.six },
  leftCol: { width: 210, paddingRight: Spacing.five, gap: Spacing.three, position: 'sticky' as 'relative', top: Spacing.four },
  leftBack: { fontSize: 14, lineHeight: 20, fontWeight: '700', marginBottom: Spacing.two },
  toc: { borderLeftWidth: 2, marginBottom: Spacing.three },
  tocItem: { paddingVertical: Spacing.two, paddingLeft: Spacing.three },
  tocText: { fontSize: 13.5, lineHeight: 19 },
  leftButton: { borderWidth: Hairline, borderRadius: Radius.button, paddingVertical: Spacing.two, alignItems: 'center' },
  leftButtonText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  rightCol: { width: SidebarWidth, paddingLeft: Spacing.five },
  imageDesktop: { width: '100%', aspectRatio: 2, marginBottom: Spacing.two },
  /** 決算記事の画像は会社ロゴなので、高さを抑える */
  logoDesktop: { aspectRatio: 4 },
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
  irDocs: { marginTop: Spacing.two, borderWidth: Hairline, borderRadius: Radius.button, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  irDoc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.three, borderTopWidth: Hairline, gap: Spacing.two },
  irDocText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  sourceButtonSecondary: { backgroundColor: 'transparent', borderWidth: 1.5, marginTop: Spacing.two },
  sourceButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  companyText: { fontSize: 14, lineHeight: 23 },
  ceo: { marginTop: Spacing.two, gap: Spacing.one },
  disclaimer: { marginTop: Spacing.three, lineHeight: 18 },
  reactions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.four },
  reactionButton: { borderWidth: 1, borderRadius: Radius.tag, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  reactionThanks: { marginTop: Spacing.four },
});
