import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Web 用の下部タブ。ネイティブタブバーが無いので expo-router の JS 版を使う。 */
export default function TabsLayout() {
  const theme = useTheme();
  const icon = (glyph: string) =>
    function TabIcon({ color }: { color: ColorValue }) {
      return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.line },
      }}>
      <Tabs.Screen name="index" options={{ title: 'トップ', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="saved" options={{ title: '保存', tabBarIcon: icon('☆') }} />
      <Tabs.Screen name="about" options={{ title: 'このアプリ', tabBarIcon: icon('ⓘ') }} />
    </Tabs>
  );
}
