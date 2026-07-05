-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Goals (季度目标)
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  quarter int not null check (quarter between 1 and 4),
  year int not null,
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.goals enable row level security;

-- Monthly Plans
create table public.monthly_plans (
  id uuid default uuid_generate_v4() primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  title text not null,
  month int not null check (month between 1 and 12),
  year int not null,
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.monthly_plans enable row level security;

-- Weekly Plans
create table public.weekly_plans (
  id uuid default uuid_generate_v4() primary key,
  monthly_plan_id uuid references public.monthly_plans(id) on delete cascade not null,
  title text not null,
  week_number int not null check (week_number between 1 and 53),
  year int not null,
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.weekly_plans enable row level security;

-- Tasks
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  weekly_plan_id uuid references public.weekly_plans(id) on delete set null,
  title text not null,
  description text,
  due_date timestamptz,
  priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  assignee_id uuid references public.profiles(id) on delete set null,
  sort_order int default 0,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks enable row level security;

-- Subtasks
create table public.subtasks (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  title text not null,
  done boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.subtasks enable row level security;

-- Tags
create table public.tags (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  unique(user_id, name)
);
alter table public.tags enable row level security;

-- Task-Tag junction
create table public.task_tags (
  task_id uuid references public.tasks(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  primary key (task_id, tag_id)
);
alter table public.task_tags enable row level security;

-- Comments
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.comments enable row level security;

-- Reminders
create table public.reminders (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  remind_at timestamptz not null,
  type text default 'time' check (type in ('time', 'smart')),
  notified boolean default false,
  created_at timestamptz default now()
);
alter table public.reminders enable row level security;

-- Reviews (复盘)
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('day', 'week', 'month', 'quarter')),
  period_start date not null,
  period_end date not null,
  content text,
  ai_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.reviews enable row level security;

-- RLS Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can manage own goals" on public.goals
  for all using (auth.uid() = user_id);

create policy "Users can manage own monthly plans" on public.monthly_plans
  for all using (
    exists (select 1 from public.goals where goals.id = monthly_plans.goal_id and goals.user_id = auth.uid())
  );

create policy "Users can manage own weekly plans" on public.weekly_plans
  for all using (
    exists (select 1 from public.monthly_plans
      join public.goals on goals.id = monthly_plans.goal_id
      where monthly_plans.id = weekly_plans.monthly_plan_id and goals.user_id = auth.uid())
  );

create policy "Users can view assigned tasks" on public.tasks
  for select using (auth.uid() = user_id or auth.uid() = assignee_id);
create policy "Users can insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);
create policy "Users can update own or assigned tasks" on public.tasks
  for update using (auth.uid() = user_id or auth.uid() = assignee_id);
create policy "Users can delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

create policy "Users can manage subtasks of accessible tasks" on public.subtasks
  for all using (
    exists (select 1 from public.tasks where tasks.id = subtasks.task_id and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid()))
  );

create policy "Users can manage own tags" on public.tags
  for all using (auth.uid() = user_id);

create policy "Users can manage task tags" on public.task_tags
  for all using (
    exists (select 1 from public.tasks where tasks.id = task_tags.task_id and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid()))
  );

create policy "Users can read comments on accessible tasks" on public.comments
  for select using (
    exists (select 1 from public.tasks where tasks.id = comments.task_id and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid()))
  );
create policy "Users can insert own comments" on public.comments
  for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.comments
  for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments
  for delete using (auth.uid() = user_id);

create policy "Users can manage reminders on accessible tasks" on public.reminders
  for all using (
    exists (select 1 from public.tasks where tasks.id = reminders.task_id and (tasks.user_id = auth.uid() or tasks.assignee_id = auth.uid()))
  );

create policy "Users can manage own reviews" on public.reviews
  for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
