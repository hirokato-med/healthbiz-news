import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Links } from '@/constants/links';
import { Hairline, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const Updated = '2026年10月22日';

/** プライバシーポリシー。App Store の審査で URL が必要になるので、Web 版の /privacy として公開される */
export default function PrivacyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + Spacing.two, borderBottomColor: theme.line }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.barButton} accessibilityRole="button" hitSlop={6}>
          <ThemedText style={[styles.barButtonText, { color: theme.accent }]}>‹ 戻る</ThemedText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.ten }]}>
        <ThemedText type="featured">プライバシーポリシー</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.updated}>
          Healthcare Business News（以下「本アプリ」）｜最終更新 {Updated}
        </ThemedText>

        <Section title="1. 個人情報の取得">
          本アプリは、氏名、メールアドレス、電話番号、位置情報などの個人情報を取得しません。会員登録やログインの仕組みもありません。
        </Section>
        <Section title="2. 端末内に保存する情報">
          「保存」した記事の識別子は、お使いの端末内にのみ保存されます。この情報が外部のサーバーへ送信されることはなく、アプリを削除すると消去されます。
        </Section>
        <Section title="3. 通信について">
          本アプリは、記事データを取得するために運営者が管理する配信サーバー（GitHub）と通信します。記事の画像は、各社のプレスリリース配信サイトから読み込みます。これらの通信に、利用者を識別する情報は含まれません。
        </Section>
        <Section title="4. 外部サイトへのリンク">
          記事の原文（プレスリリース・適時開示）、Substack などの外部サイトへのリンクを含みます。リンク先のサイトでの情報の取り扱いは、各サイトのプライバシーポリシーに従います。
        </Section>
        <Section title="5. アクセス解析・広告">
          本アプリは、アクセス解析ツールや広告配信の仕組みを使用していません。
        </Section>
        <Section title="6. 記事の内容について">
          要約は各社のプレスリリース・適時開示をもとに作成しています。正確な内容は原文をご確認ください。コメントは運営者個人の見解であり、特定の企業や商品を推奨するものではありません。
        </Section>
        <Section title="7. 本ポリシーの変更">
          本ポリシーの内容は、必要に応じて変更することがあります。変更した場合は、本ページで公開します。
        </Section>
        <Section title="8. 運営者・お問い合わせ">
          {`運営者：加藤浩晃（医師）\nお問い合わせ：${Links.contactEmail}`}
        </Section>
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <ThemedText type="section" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.body}>{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.two, paddingBottom: Spacing.two, borderBottomWidth: Hairline },
  barButton: { paddingHorizontal: Spacing.two, paddingVertical: 6 },
  barButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.five, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  updated: { marginTop: Spacing.two, marginBottom: Spacing.four },
  section: { marginTop: Spacing.five },
  sectionTitle: { fontSize: 16, marginBottom: Spacing.two },
  body: { fontSize: 15, lineHeight: 25 },
});
