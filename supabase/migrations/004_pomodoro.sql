-- Focus sessions for Pomodoro timer
create table public.focus_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_minutes int not null default 25,
  type text default 'focus' check (type in ('focus', 'break')),
  completed boolean default false,
  created_at timestamptz default now()
);
alter table public.focus_sessions enable row level security;

create policy "Users can manage own focus sessions" on public.focus_sessions
  for all using (auth.uid() = user_id);
