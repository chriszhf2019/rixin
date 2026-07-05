import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('team_activities')
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url), members:activity_members(*, user:profiles(id, name, avatar_url))')
    .or(`organizer_id.eq.${user.id},members.user_id.eq.${user.id}`)
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

  // Create activity
  const { data: activity, error: actError } = await supabase
    .from('team_activities')
    .insert({ ...activityData, organizer_id: user.id })
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url)')
    .single();

  if (actError) return NextResponse.json({ error: actError.message }, { status: 500 });

  // Add members if provided
  if (members?.length && activity) {
    const memberInserts = members.map((m: { user_id: string; role?: string }) => ({
      activity_id: activity.id,
      user_id: m.user_id,
      role: m.role || 'member',
    }));
    await supabase.from('activity_members').insert(memberInserts);
  }

  return NextResponse.json(activity, { status: 201 });
}
