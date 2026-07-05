-- Push subscriptions for web push notifications
create table public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);
alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id);
