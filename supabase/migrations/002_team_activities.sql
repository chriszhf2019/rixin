-- Team Activities
create table public.team_activities (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  date timestamptz,
  location text,
  organizer_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'planning' check (status in ('planning', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.team_activities enable row level security;

-- Activity Members
create table public.activity_members (
  id uuid default uuid_generate_v4() primary key,
  activity_id uuid references public.team_activities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member',
  created_at timestamptz default now(),
  unique(activity_id, user_id)
);
alter table public.activity_members enable row level security;

-- RLS Policies
create policy "Users can view activities they organize or are members of" on public.team_activities
  for select using (
    auth.uid() = organizer_id or
    exists (select 1 from public.activity_members where activity_members.activity_id = id and activity_members.user_id = auth.uid())
  );
create policy "Users can insert own activities" on public.team_activities
  for insert with check (auth.uid() = organizer_id);
create policy "Organizers can update their activities" on public.team_activities
  for update using (auth.uid() = organizer_id);
create policy "Organizers can delete their activities" on public.team_activities
  for delete using (auth.uid() = organizer_id);

create policy "Members can view members of their activities" on public.activity_members
  for select using (
    exists (select 1 from public.team_activities where team_activities.id = activity_members.activity_id and (team_activities.organizer_id = auth.uid() or exists (select 1 from public.activity_members am2 where am2.activity_id = activity_members.activity_id and am2.user_id = auth.uid())))
  );
create policy "Organizers can manage members" on public.activity_members
  for all using (
    exists (select 1 from public.team_activities where team_activities.id = activity_members.activity_id and team_activities.organizer_id = auth.uid())
  );
