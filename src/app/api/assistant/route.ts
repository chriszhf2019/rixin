import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { chatWithAI, analyzeTasks, splitTask, analyzeProcrastination, getEfficiencyProfile, generateSmartSchedule } from '@/lib/ai/analyze';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, action, taskTitle } = await request.json();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, created_at, completed_at, due_date, task_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: goals } = await supabase
    .from('goals')
    .select('title, status');

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

  if (action === 'prioritize') {
    const todoTasks = (tasks ?? []).filter(t => t.status === 'todo' || t.status === 'in_progress');
    const reply = await chatWithAI(
      `帮我对以下任务按紧急重要原则排序，给出优先级建议：\n${todoTasks.map(t => `${t.title} - 优先级: ${t.priority} - 截止日期: ${t.due_date || '无'}`).join('\n')}`,
      context
    );
    return NextResponse.json({ reply });
  }

  if (action === 'should_split') {
    const pendingTasks = (tasks ?? []).filter(t => t.status !== 'done' && t.status !== 'cancelled');
    const reply = await chatWithAI(
      `分析以下任务，判断哪些需要拆分，并给出拆分建议：\n${pendingTasks.map(t => t.title).join('\n')}`,
      context
    );
    return NextResponse.json({ reply });
  }

  if (action === 'schedule') {
    const todoTasks = (tasks ?? []).filter(t => t.status === 'todo');
    if (todoTasks.length === 0) {
      return NextResponse.json({ reply: '当前没有待办任务，不需要排期。' });
    }
    const schedule = await generateSmartSchedule(
      todoTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, status: t.status }))
    );
    return NextResponse.json({ reply: schedule.suggestion + '\n\n排期建议：\n' + schedule.schedule.map(s => `${s.startTime} - ${s.endTime}: ${s.taskTitle}`).join('\n') });
  }

  const reply = await chatWithAI(message, context);
  return NextResponse.json({ reply });
}
