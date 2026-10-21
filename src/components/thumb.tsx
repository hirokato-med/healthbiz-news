import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { channelOf } from '@/constants/channels';
import { Radius } from '@/constants/theme';
import type { Article } from '@/lib/types';

/**
 * 記事のサムネイル。画像があればそれを、無ければチャンネル色の薄い下地に
 * チャンネル名を置いた代替タイルを出す（プレスリリースは画像が無いことが多い）。
 */
export function Thumb({ article, style, large }: { article: Article; style?: StyleProp<ViewStyle>; large?: boolean }) {
  const channel = channelOf(article.category);

  if (article.image_url) {
    return (
      <Image
        source={{ uri: article.image_url }}
        style={[styles.base, style as StyleProp<ImageStyle>]}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.base, styles.placeholder, { backgroundColor: `${channel.color}1A` }, style]}>
      <ThemedText style={[styles.placeholderText, { color: channel.color, fontSize: large ? 22 : 13 }]} numberOfLines={2}>
        {channel.name}
      </ThemedText>
      {large && (
        <ThemedText style={[styles.placeholderSub, { color: channel.color }]} numberOfLines={1}>
          {article.source_name}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.thumb,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 4,
  },
  placeholderText: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  placeholderSub: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
});
