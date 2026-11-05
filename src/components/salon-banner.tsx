import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet } from 'react-native';

import { Links } from '@/constants/links';
import { trackClick } from '@/lib/analytics';

/**
 * ヘルスケアビジネス研究会の案内バナー（研究会ページのキービジュアルと同じ水彩を細い帯に使った画像）。
 * mobile: スマホの一覧の記事と記事の間 / pc: PC 向け画面の右の列。押すと研究会のページを開く。
 */
export function SalonBanner({ variant }: { variant: 'mobile' | 'pc' }) {
  return (
    <Pressable
      onPress={() => (trackClick('salon_banner', { where: variant }), WebBrowser.openBrowserAsync(Links.salon))}
      accessibilityRole="link"
      accessibilityLabel="ヘルスケアビジネス研究会。2017年より10年目、1年ぶりの新規メンバー募集"
      style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <Image
        source={variant === 'mobile' ? require('@/assets/images/salon-banner-mobile.png') : require('@/assets/images/salon-banner-pc.png')}
        style={[styles.image, { aspectRatio: variant === 'mobile' ? 1440 / 176 : 960 / 216 }]}
        contentFit="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%' },
});
