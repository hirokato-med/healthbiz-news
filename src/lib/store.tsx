import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchArticles, fetchSubstack } from './articles';
import type { Article } from './types';

const SavedKey = 'healthbiz.saved.v1';
const ReadKey = 'healthbiz.read.v1';
const LastSeenKey = 'healthbiz.lastseen.v1';
const ReactionKey = 'healthbiz.reactions.v1';

export type Reaction = 'helpful' | 'more';

type Store = {
  articles: Article[];
  loading: boolean;
  error: string | null;
  /** 取り直す。失敗したら false */
  reload: () => Promise<boolean>;
  savedIds: ReadonlySet<string>;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  /** 開いたことのある記事 */
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  /** 前回アプリを開いたあとに配信された、まだ開いていない記事 */
  isNew: (a: Article) => boolean;
  newCount: number;
  /** 記事への反応（役に立った／もっと詳しく）。端末内にだけ残す */
  reactionOf: (id: string) => Reaction | null;
  setReaction: (id: string, r: Reaction) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  // 前回開いた時刻。これより後に配信された記事を「新着」として目印を付ける
  const [newSince, setNewSince] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [news, substack] = await Promise.all([fetchArticles(), fetchSubstack()]);
      setArticles([...news, ...substack]);
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '記事を読み込めませんでした');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    AsyncStorage.getItem(SavedKey)
      .then((raw) => raw && setSavedIds(new Set(JSON.parse(raw) as string[])))
      .catch(() => {});
    AsyncStorage.getItem(ReadKey)
      .then((raw) => raw && setReadIds(new Set(JSON.parse(raw) as string[])))
      .catch(() => {});
    AsyncStorage.getItem(ReactionKey)
      .then((raw) => raw && setReactions(JSON.parse(raw) as Record<string, Reaction>))
      .catch(() => {});
    // 前回開いた時刻を読んでから、今回の時刻を書く（次回の「新着」の基準になる）
    AsyncStorage.getItem(LastSeenKey)
      .then((raw) => {
        setNewSince(raw);
        return AsyncStorage.setItem(LastSeenKey, new Date().toISOString());
      })
      .catch(() => {});
  }, [reload]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      // 端末に残すのは直近 500 件まで
      const list = [...next].slice(-500);
      AsyncStorage.setItem(ReadKey, JSON.stringify(list)).catch(() => {});
      return next;
    });
  }, []);

  const setReaction = useCallback((id: string, r: Reaction) => {
    setReactions((prev) => {
      const next = { ...prev, [id]: r };
      AsyncStorage.setItem(ReactionKey, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      AsyncStorage.setItem(SavedKey, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Store>(() => {
    const isNew = (a: Article) =>
      newSince != null && a.kind !== 'substack' && !!a.created_at && a.created_at > newSince && !readIds.has(a.id);
    return {
      articles,
      loading,
      error,
      reload,
      savedIds,
      isSaved: (id) => savedIds.has(id),
      toggleSaved,
      isRead: (id) => readIds.has(id),
      markRead,
      isNew,
      newCount: articles.filter(isNew).length,
      reactionOf: (id) => reactions[id] ?? null,
      setReaction,
    };
  }, [articles, loading, error, reload, savedIds, toggleSaved, readIds, markRead, newSince, reactions, setReaction]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
