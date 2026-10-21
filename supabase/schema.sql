-- Healthcare Business News: 記事テーブル
-- Supabase ダッシュボード > SQL Editor にそのまま貼り付けて実行する。

create extension if not exists pgcrypto;

create table if not exists public.articles (
  id             uuid primary key default gen_random_uuid(),
  published_date date not null,                       -- 配信日（JST）
  category       text not null check (category in ('device','wearable','drug','digital','service','policy')),
  title          text not null,
  source_name    text not null,                       -- 発信元（企業名・省庁名）
  source_url     text not null,                       -- プレスリリース原文 URL
  summary        jsonb not null default '[]'::jsonb,  -- 要約の箇条書き ["...", "..."]
  comment        text not null,                       -- 加藤浩晃のコメント
  image_url      text,
  status         text not null default 'draft' check (status in ('draft','published')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists articles_published_idx
  on public.articles (status, published_date desc, created_at desc);

-- 同じ原文を二重投稿しない
create unique index if not exists articles_source_url_key on public.articles (source_url);

-- updated_at を自動更新
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

-- Row Level Security: アプリ（anon key）は公開済み記事の読み取りのみ。
-- 書き込みは service_role key を持つ配信パイプラインだけが行う。
alter table public.articles enable row level security;

drop policy if exists "public read published" on public.articles;
create policy "public read published" on public.articles
  for select to anon, authenticated
  using (status = 'published');
