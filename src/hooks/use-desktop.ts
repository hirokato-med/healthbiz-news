import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/** この横幅以上の Web では PC 向けの 2 列の画面にする（スマホ・タブレット縦はこれまでどおり） */
export const DesktopMinWidth = 1024;
/** PC 向け画面の中身の最大幅と、右の列の幅 */
export const DesktopMaxWidth = 1240;
export const SidebarWidth = 340;

/**
 * PC 向けの画面にするか。静的書き出しの HTML はスマホの形で作られているので、
 * 最初の描画はスマホの形のままにして（ハイドレーションの不一致を避ける）、表示後に横幅を見て切り替える。
 */
export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && Platform.OS === 'web' && width >= DesktopMinWidth;
}
