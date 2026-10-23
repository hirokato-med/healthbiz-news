import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { trackClick } from '@/lib/analytics';
import { articleUrlOf, copyText, snsAppUrlOf, snsShareUrlOf, type SnsId } from '@/lib/share-card';
import type { Article } from '@/lib/types';

/** 記事の下に並べるシェアボタン（X / Facebook / LINE / LinkedIn / リンクのコピー / 画像で共有） */
export function ShareButtons({ article, onShareImage }: { article: Article; onShareImage: () => void }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const openSns = (sns: SnsId) => {
    trackClick('share_sns', { article_id: article.id, sns });
    const webUrl = snsShareUrlOf(sns, article);
    if (!isMobileWeb()) {
      void Linking.openURL(webUrl);
      return;
    }
    // スマホの X・LINE はアプリの投稿画面を直接開く（入っていなければ Web）。リンクに記事のカードが付く
    const appUrl = snsAppUrlOf(sns, article);
    if (appUrl) {
      openAppOrWeb(appUrl, webUrl);
      return;
    }
    // Facebook・LinkedIn は投稿文を渡せるアプリの URL が無いので、共有シートからアプリを選んでもらう
    if (typeof navigator.share === 'function') {
      navigator.share({ title: article.title, text: article.title, url: articleUrlOf(article) }).catch(() => {});
      return;
    }
    void Linking.openURL(webUrl);
  };

  const copy = async () => {
    trackClick('share_sns', { article_id: article.id, sns: 'copy' });
    if (await copyText(`${article.title}\n${articleUrlOf(article)}`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  const buttons: { key: string; mark: string; label: string; bg: string; fg?: string; onPress: () => void }[] = [
    { key: 'x', mark: '𝕏', label: 'X', bg: '#000000', onPress: () => openSns('x') },
    { key: 'facebook', mark: 'f', label: 'Facebook', bg: '#1877F2', onPress: () => openSns('facebook') },
    { key: 'line', mark: 'LINE', label: 'LINE', bg: '#06C755', onPress: () => openSns('line') },
    { key: 'linkedin', mark: 'in', label: 'LinkedIn', bg: '#0A66C2', onPress: () => openSns('linkedin') },
    { key: 'copy', mark: '🔗', label: copied ? 'コピー済み' : 'リンク', bg: theme.surface, fg: theme.text, onPress: () => void copy() },
    { key: 'image', mark: '🖼', label: '画像で', bg: theme.surface, fg: theme.text, onPress: onShareImage },
  ];

  return (
    <View style={[styles.box, { borderColor: theme.line }]}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.title}>
        この記事をシェア
      </ThemedText>
      <View style={styles.row}>
        {buttons.map((b) => (
          <Pressable key={b.key} onPress={b.onPress} accessibilityRole="button" accessibilityLabel={`${b.label}でシェア`} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
            <View style={[styles.circle, { backgroundColor: b.bg }, b.fg ? { borderWidth: 1, borderColor: theme.line } : null]}>
              <ThemedText style={[styles.mark, { color: b.fg ?? '#FFFFFF', fontSize: b.mark.length > 2 ? 11 : 18 }]}>{b.mark}</ThemedText>
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.label} numberOfLines={1}>
              {b.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  title: { fontWeight: '700', marginBottom: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', width: 54, gap: 4 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mark: { fontWeight: '800', lineHeight: 22 },
  label: { fontSize: 11, lineHeight: 14 },
});

function isMobileWeb(): boolean {
  return Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** アプリの URL を開き、アプリが入っていなくて画面がそのまま残っていたら Web の投稿画面を開く */
function openAppOrWeb(appUrl: string, webUrl: string) {
  window.location.href = appUrl;
  setTimeout(() => {
    if (document.visibilityState === 'visible') window.location.href = webUrl;
  }, 1500);
}
