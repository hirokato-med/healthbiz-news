import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

/** 加藤浩晃の顔写真を丸く切り抜いたアバター。コメント欄の目印として使う。 */
export function KatoAvatar({ size = 24 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/kato-avatar.png')}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      contentFit="cover"
      accessibilityLabel="加藤浩晃"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#E3E7F0',
  },
});
