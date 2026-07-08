import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { chatWithAI, analyzeTasks, splitTask, analyzeProcrastination, getEfficiencyProfile } from '@/lib/ai/analyze';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, action, taskTitle } = await request.json();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, priority, created_at, completed_at, due_date')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: goals } = await supabase
    .from('goals')
    .select('title, status')
    .eq('user_id', user.id);

  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes, completed')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(30);

  const context = JSON.stringify({
    taskCount: tasks?.length ?? 0,
    goals: goals?.map(g => g.title) ?? [],
    recentTasks: tasks?.slice(0, 10).map(t => `${t.title} (${t.status})`) ?? [],
  });

  if (action === 'analyze') {
    const analysis = await analyzeTasks(tasks ?? []);
    return NextResponse.json({ reply: analysis });
  }

  if (action === 'split_task') {
    const result = await splitTask(taskTitle || message);
    return NextResponse.json({ reply: JSON.stringify(result) });
  }

  if (action === 'procrastination') {
    const result = await analyzeProcrastination(tasks ?? []);
    return NextResponse.json({ reply: result });
  }

  if (action === 'efficiency_profile') {
    const result = await getEfficiencyProfile(tasks ?? [], sessions ?? []);
    return NextResponse.json({ reply: result });
  }

  const reply = await chatWithAI(message, context);
  return NextResponse.json({ reply });
}
