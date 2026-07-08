import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service role client to bypass RLS and get full member lists
  const serviceSupabase = createServiceRoleSupabaseClient();

  // Get activity IDs where user is organizer
  const { data: organizedActivities, error: orgError } = await serviceSupabase
    .from('team_activities')
    .select('id')
    .eq('organizer_id', user.id);

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 });

  // Get activity IDs where user is a member
  const { data: memberActivities, error: memError } = await serviceSupabase
    .from('activity_members')
    .select('activity_id')
    .eq('user_id', user.id);

  if (memError) return NextResponse.json({ error: memError.message }, { status: 500 });

  // Combine and deduplicate
  const ids = Array.from(new Set([
    ...(organizedActivities?.map(a => a.id) || []),
    ...(memberActivities?.map(m => m.activity_id) || []),
  ]));

  if (!ids.length) return NextResponse.json([]);

  // Get full activities with all members using service role
  const { data, error } = await serviceSupabase
    .from('team_activities')
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url), members:activity_members(*, user:profiles(id, name, avatar_url))')
    .in('id', ids)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { members, ...activityData } = body;

  // Use service role client for insert to avoid RLS recursion on .select()
  const serviceSupabase = createServiceRoleSupabaseClient();

  // Create activity
  const { data: activity, error: actError } = await serviceSupabase
    .from('team_activities')
    .insert({ ...activityData, organizer_id: user.id })
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url)')
    .single();

  if (actError) return NextResponse.json({ error: actError.message }, { status: 500 });

  // Add organizer as a member with organizer role
  const allMembers = [
    { user_id: user.id, role: 'organizer' },
    ...(members?.filter((m: { user_id: string }) => m.user_id !== user.id) || []),
  ];

  if (activity) {
    const memberInserts = allMembers.map((m: { user_id: string; role?: string }) => ({
      activity_id: activity.id,
      user_id: m.user_id,
      role: m.role || 'member',
    }));
    await serviceSupabase.from('activity_members').insert(memberInserts);
  }

  // Return with full member list
  const { data: activityWithMembers, error: fetchError } = await serviceSupabase
    .from('team_activities')
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url), members:activity_members(*, user:profiles(id, name, avatar_url))')
    .eq('id', activity.id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  return NextResponse.json(activityWithMembers, { status: 201 });
}
