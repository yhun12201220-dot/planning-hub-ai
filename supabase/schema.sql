create extension if not exists pgcrypto;

create table if not exists public.marketing_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  title text,
  project_name text not null default '',
  brand_name text not null default '',
  work_type text not null,
  tone text,
  target text,
  objective text,
  key_message text,
  required_points text,
  excluded_points text,
  reference_text text,
  source_text text not null default '',
  result_text text,
  result text,
  primary_result text,
  status text not null default '초안',
  tags text[] not null default '{}'::text[],
  outputs jsonb not null default '[]'::jsonb,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_outputs alter column user_id drop not null;
alter table public.marketing_outputs alter column project_name set default '';
alter table public.marketing_outputs alter column brand_name set default '';
alter table public.marketing_outputs alter column source_text set default '';

alter table public.marketing_outputs
  add column if not exists title text,
  add column if not exists tone text,
  add column if not exists target text,
  add column if not exists objective text,
  add column if not exists key_message text,
  add column if not exists required_points text,
  add column if not exists excluded_points text,
  add column if not exists reference_text text,
  add column if not exists result_text text,
  add column if not exists result text,
  add column if not exists status text default '초안',
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists is_deleted boolean default false,
  add column if not exists updated_at timestamptz default now();

update public.marketing_outputs
set
  result_text = coalesce(result_text, result, primary_result),
  result = coalesce(result, result_text, primary_result),
  primary_result = coalesce(primary_result, result_text, result),
  title = coalesce(title, ''),
  tone = coalesce(tone, '기본'),
  target = coalesce(target, ''),
  objective = coalesce(objective, ''),
  key_message = coalesce(key_message, ''),
  required_points = coalesce(required_points, ''),
  excluded_points = coalesce(excluded_points, ''),
  reference_text = coalesce(reference_text, ''),
  status = coalesce(status, '초안'),
  tags = coalesce(tags, '{}'::text[]),
  is_deleted = coalesce(is_deleted, false),
  updated_at = coalesce(updated_at, created_at, now());

create or replace function public.set_marketing_outputs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketing_outputs_set_updated_at on public.marketing_outputs;

create trigger marketing_outputs_set_updated_at
before update on public.marketing_outputs
for each row
execute function public.set_marketing_outputs_updated_at();

alter table public.marketing_outputs enable row level security;

drop policy if exists "Users can read own marketing outputs" on public.marketing_outputs;
drop policy if exists "Users can insert own marketing outputs" on public.marketing_outputs;
drop policy if exists "Users can update own marketing outputs" on public.marketing_outputs;
drop policy if exists "Users can delete own marketing outputs" on public.marketing_outputs;

create policy "Users can read own marketing outputs"
  on public.marketing_outputs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own marketing outputs"
  on public.marketing_outputs
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own marketing outputs"
  on public.marketing_outputs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own marketing outputs"
  on public.marketing_outputs
  for delete
  using (auth.uid() = user_id);
