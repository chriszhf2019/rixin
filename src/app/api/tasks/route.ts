import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
  task_type: z.enum(['objective', 'inbox', 'routine']).default('inbox'),
  blocker_reason: z.enum(['too_complex', 'time_conflict', 'procrastination']).nullable().optional(),
  due_date: z.string().nullable().optional(),
  weekly_plan_id: z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    sort_order: z.number().int().default(0),
  })).optional(),
});

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
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { subtasks, ...taskData } = parsed.data;

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({ ...taskData, user_id: user.id })
    .select('*, subtasks(*), tags(*)')
    .single();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  if (subtasks && subtasks.length > 0) {
    const { error: subtaskError } = await supabase
      .from('subtasks')
      .insert(
        subtasks.map((st, i) => ({
          task_id: task.id,
          title: st.title,
          sort_order: st.sort_order ?? i,
        }))
      );

    if (subtaskError) {
      return NextResponse.json({ error: subtaskError.message }, { status: 500 });
    }

    const { data: taskWithSubtasks } = await supabase
      .from('tasks')
      .select('*, subtasks(*), tags(*)')
      .eq('id', task.id)
      .single();

    return NextResponse.json(taskWithSubtasks, { status: 201 });
  }

  return NextResponse.json(task, { status: 201 });
}
