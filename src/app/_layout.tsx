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
        <Stack screenOptions={{ headerShown: false }}>
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
