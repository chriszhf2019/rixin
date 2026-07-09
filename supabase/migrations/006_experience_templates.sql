-- 经验卡片表（个人知识库）
create table if not exists public.experience_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  content text not null,
  category text default 'lesson' check (category in ('lesson', 'insight', 'method', 'resource')),
  tags text[] default '{}',
  task_title text,
  actual_minutes int,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.experience_cards enable row level security;

create policy "Users can manage own experience cards"
  on public.experience_cards for all
  using (auth.uid() = user_id);

-- 任务模板表（SOP模板库）
create table if not exists public.task_templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text default 'general',
  use_count int default 0,
  subtasks jsonb default '[]'::jsonb,
  estimated_minutes int default 30,
  created_at timestamptz default now(),
  last_used_at timestamptz
);
alter table public.task_templates enable row level security;

create policy "Users can manage own task templates"
  on public.task_templates for all
  using (auth.uid() = user_id);

-- 更新 tasks 表：添加 task_type 和 blocker_reason 字段（如果不存在）
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'task_type') then
    alter table public.tasks add column task_type text default 'inbox' check (task_type in ('objective', 'inbox', 'routine'));
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'blocker_reason') then
    alter table public.tasks add column blocker_reason text check (blocker_reason in ('too_complex', 'time_conflict', 'procrastination') or blocker_reason is null);
  end if;
end $$;

-- 添加 updated_at 自动更新触发器（如果不存在）
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists experience_cards_updated_at on public.experience_cards;
create trigger experience_cards_updated_at
  before update on public.experience_cards
  for each row execute function public.handle_updated_at();

drop trigger if exists task_templates_updated_at on public.task_templates;
create trigger task_templates_updated_at
  before update on public.task_templates
  for each row execute function public.handle_updated_at();

-- 创建索引
create index if not exists idx_experience_cards_user_id on public.experience_cards(user_id);
create index if not exists idx_experience_cards_created_at on public.experience_cards(created_at desc);
create index if not exists idx_task_templates_user_id on public.task_templates(user_id);
create index if not exists idx_task_templates_last_used on public.task_templates(last_used_at desc nulls last);
