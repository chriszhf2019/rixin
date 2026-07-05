import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateDailyDigest } from '@/lib/ai/digest';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch today's tasks
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('due_date', todayStart.toISOString())
    .lte('due_date', todayEnd.toISOString())
    .order('created_at');

  // Fetch goals with progress
  const { data: goals } = await supabase
    .from('goals')
    .select('id, title, status')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (!tasks || !goals) {
    return NextResponse.json({ morning: '今天开始记录吧！', evening: '' });
  }

  const completedTasks = tasks.filter(t => t.status === 'done');
  const goalsWithProgress = goals.map(g => ({
    title: g.title,
    progress: 0, // Simplified for V1
  }));

  try {
    const digest = await generateDailyDigest(tasks, completedTasks, goalsWithProgress);
    return NextResponse.json(digest);
  } catch {
    return NextResponse.json({
      morning: `今天有 ${tasks.length} 项待办，已完成 ${completedTasks.length} 项。加油！`,
      evening: completedTasks.length > 0
        ? `今天完成了 ${completedTasks.length} 件事，做的不错！`
        : '今天还没有完成事项，明天继续努力。',
    });
  }
}
