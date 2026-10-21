import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase クライアント。`.env` に URL と anon key が無いときは null になり、
 * アプリはサンプル記事で動く。
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        // 読み取り専用アプリなのでセッション保持は不要
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
