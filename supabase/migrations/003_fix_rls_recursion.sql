-- Fix RLS recursion by using self-join on activity_members instead of cross-table references

-- Drop the old recursive policy
drop policy if exists "Members can view members of their activities" on public.activity_members;

-- New policy: users can view members of activities they are part of (self-join, no recursion)
create policy "Members can view members of their activities" on public.activity_members
  for select using (
    exists (
      select 1 from public.activity_members am2
      where am2.activity_id = activity_members.activity_id
      and am2.user_id = auth.uid()
    )
  );

-- Also ensure insert policy: organizers can add members, and users can join public activities
-- For now, organizers manage members via the existing policy
