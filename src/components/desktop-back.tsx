import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useDesktop } from '@/hooks/use-desktop';
import { useTheme } from '@/hooks/use-theme';

/** PC 向け画面では下のタブバーが無いので、「保存」「このアプリ」の見出しの左にトップへ戻るリンクを出す */
export function DesktopBackToTop() {
  const desktop = useDesktop();
  const theme = useTheme();
  const router = useRouter();
  if (!desktop) return null;
  return (
    <Pressable onPress={() => router.navigate('/')} accessibilityRole="link" hitSlop={6}>
      <ThemedText style={{ color: theme.accent, fontWeight: '700', fontSize: 15, lineHeight: 20 }}>‹ トップへ</ThemedText>
    </Pressable>
  );
}
