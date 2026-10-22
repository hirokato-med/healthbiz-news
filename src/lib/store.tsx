import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchArticles, fetchSubstack } from './articles';
import type { Article } from './types';

const SavedKey = 'healthbiz.saved.v1';

type Store = {
  articles: Article[];
  loading: boolean;
  error: string | null;
  /** 取り直す。失敗したら false */
  reload: () => Promise<boolean>;
  savedIds: ReadonlySet<string>;
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

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
  }, [reload]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      AsyncStorage.setItem(SavedKey, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      articles,
      loading,
      error,
      reload,
      savedIds,
      isSaved: (id) => savedIds.has(id),
      toggleSaved,
    }),
    [articles, loading, error, reload, savedIds, toggleSaved],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
