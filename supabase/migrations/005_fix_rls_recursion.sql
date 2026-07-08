-- Fix infinite recursion in RLS policies
-- Drop old policies that cause recursion between team_activities and activity_members
drop policy if exists "Members can view members of their activities" on public.activity_members;
drop policy if exists "Organizers can manage members" on public.activity_members;

-- New policy: users can only see their own membership records
-- This avoids recursion with team_activities policy
-- Full member list is retrieved via server API with service role key
create policy "Users can view own activity membership" on public.activity_members
  for select using (auth.uid() = user_id);

-- New policy: users can insert their own membership (join activity)
-- Organizers can add members (enforced at API level using service role key)
create policy "Users can insert own membership" on public.activity_members
  for insert with check (auth.uid() = user_id);

-- New policy: users can update/delete their own membership (leave activity)
-- Organizers can manage members (enforced at API level)
create policy "Users can manage own membership" on public.activity_members
  for update using (auth.uid() = user_id);

create policy "Users can delete own membership" on public.activity_members
  for delete using (auth.uid() = user_id);
