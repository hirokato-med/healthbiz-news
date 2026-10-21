/**
 * チャンネル（カラータブ）の定義。
 * `id` は articles.category と一致させる。
 * `today` は記事の category ではなく、アプリ側で組み立てる特殊チャンネル。
 * `saved` は下部タブの「保存」画面用で、上部のチャンネル一覧には出さない。
 */

export type ChannelId = 'today' | 'device' | 'wearable' | 'drug' | 'digital' | 'service' | 'longevity' | 'policy' | 'saved';

export type Channel = {
  id: ChannelId;
  name: string;
  /** タブの下線と分類ラベルの色 */
  color: string;
};

export const Channels: readonly Channel[] = [
  { id: 'today', name: 'トップ', color: '#1E4FD8' },
  { id: 'device', name: '医療機器', color: '#2BA8E0' },
  { id: 'wearable', name: 'ウェアラブル', color: '#22B573' },
  { id: 'drug', name: '製薬・創薬', color: '#8E44D6' },
  { id: 'digital', name: 'デジタルヘルス', color: '#F28C28' },
  { id: 'service', name: 'ヘルスケアサービス', color: '#17A2A2' },
  { id: 'longevity', name: 'ロンジェビティ', color: '#D4357A' },
  { id: 'policy', name: '政策・規制', color: '#5B6B8A' },
] as const;

export const SavedChannel: Channel = { id: 'saved', name: '保存済み', color: '#1E4FD8' };

/** 記事に付けられるカテゴリ（特殊チャンネルを除く） */
export type Category = Exclude<ChannelId, 'today' | 'saved'>;

export function channelOf(id: ChannelId): Channel {
  return Channels.find((c) => c.id === id) ?? (id === 'saved' ? SavedChannel : Channels[0]);
}
