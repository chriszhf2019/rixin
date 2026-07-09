-- 标签表
create table if not exists public.tags (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tags enable row level security;

create policy "Users can manage own tags"
  on public.tags for all
  using (auth.uid() = user_id);

-- 任务标签关联表
create table if not exists public.task_tags (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  unique (task_id, tag_id)
);
alter table public.task_tags enable row level security;

create policy "Users can manage own task tags"
  on public.task_tags for all
  using (
    exists (select 1 from tasks where tasks.id = task_tags.task_id and tasks.user_id = auth.uid())
  );

-- 自定义看板列表
create table if not exists public.board_columns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  status_key text not null unique,
  color text default '#6366f1',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.board_columns enable row level security;

create policy "Users can manage own board columns"
  on public.board_columns for all
  using (auth.uid() = user_id);

-- 更新 tasks 表：添加 task_type, blocker_reason 和 repeat_rule 字段
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'task_type') then
    alter table public.tasks add column task_type text default 'inbox' check (task_type in ('objective', 'inbox', 'routine'));
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'blocker_reason') then
    alter table public.tasks add column blocker_reason text check (blocker_reason in ('too_complex', 'time_conflict', 'procrastination') or blocker_reason is null);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'tasks' and column_name = 'repeat_rule') then
    alter table public.tasks add column repeat_rule jsonb;
  end if;
end $$;

-- 更新 updated_at 触发器
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tags_updated_at on public.tags;
create trigger tags_updated_at
  before update on public.tags
  for each row execute function public.handle_updated_at();

drop trigger if exists board_columns_updated_at on public.board_columns;
create trigger board_columns_updated_at
  before update on public.board_columns
  for each row execute function public.handle_updated_at();

-- 创建索引
create index if not exists idx_tags_user_id on public.tags(user_id);
create index if not exists idx_task_tags_task_id on public.task_tags(task_id);
create index if not exists idx_task_tags_tag_id on public.task_tags(tag_id);
create index if not exists idx_board_columns_user_id on public.board_columns(user_id);
create index if not exists idx_board_columns_sort_order on public.board_columns(sort_order);
