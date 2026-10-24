import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { startAutoUpdate } from '@/lib/auto-update';
import { StoreProvider } from '@/lib/store';

// Web 版: 新しい版が公開されたら自動で読み込み直す
startAutoUpdate();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StoreProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            // iOS 26 以降の「スクロール端のぼかし（UIScrollEdgeEffect）」を切る。
            // 自前のヘッダー（題字・日付・分野タブ）が画面上端の下に入るため、放っておくと
            // iOS 27 でその文字が滲んで見える（2026-10-24 加藤さん報告）。iOS 25 以前と Android には影響しない。
            scrollEdgeEffects: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="article/[id]" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="search" />
          <Stack.Screen name="company/[name]" />
        </Stack>
        <StatusBar style="auto" />
      </StoreProvider>
    </ThemeProvider>
  );
}
