import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const dueDate = searchParams.get('due_date');
  const assigneeId = searchParams.get('assignee_id');
  const weeklyPlanId = searchParams.get('weekly_plan_id');

  let query = supabase
    .from('tasks')
    .select('*, subtasks(*), tags(*), reminders(*), assignee:profiles!assignee_id(id, name, avatar_url)')
    .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (dueDate) query = query.eq('due_date', dueDate);
  if (assigneeId) query = query.eq('assignee_id', assigneeId);
  if (weeklyPlanId) query = query.eq('weekly_plan_id', weeklyPlanId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...body, user_id: user.id })
    .select('*, subtasks(*), tags(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
