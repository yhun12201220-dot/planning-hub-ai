create table if not exists public.marketing_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  project_name text not null,
  brand_name text not null,
  work_type text not null,
  source_text text not null,
  primary_result text not null,
  outputs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.marketing_outputs
  alter column user_id drop not null;

alter table public.marketing_outputs enable row level security;

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
