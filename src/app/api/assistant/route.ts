import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { chatWithAI, analyzeTasks } from '@/lib/ai/analyze';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, action } = await request.json();

  // Fetch user's task data for context
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, priority, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: goals } = await supabase
    .from('goals')
    .select('title, status')
    .eq('user_id', user.id);

  const context = JSON.stringify({
    taskCount: tasks?.length ?? 0,
    goals: goals?.map(g => g.title) ?? [],
    recentTasks: tasks?.slice(0, 10).map(t => `${t.title} (${t.status})`) ?? [],
  });

  if (action === 'analyze') {
    const analysis = await analyzeTasks(tasks ?? []);
    return NextResponse.json({ reply: analysis });
  }

  const reply = await chatWithAI(message, context);
  return NextResponse.json({ reply });
}
