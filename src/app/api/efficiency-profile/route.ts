import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, created_at, completed_at, priority, task_type')
    .eq('user_id', user.id)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { data: focusSessions } = await supabase
    .from('focus_sessions')
    .select('id, started_at, duration_minutes, completed')
    .eq('user_id', user.id)
    .eq('type', 'focus')
    .eq('completed', true)
    .gte('started_at', thirtyDaysAgo.toISOString());

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const totalFocusMinutes = focusSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
  const averageFocusMinutes = focusSessions && focusSessions.length > 0 ? totalFocusMinutes / focusSessions.length : 0;

  const hourCounts: Record<number, number> = {};
  focusSessions?.forEach(session => {
    const hour = new Date(session.started_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hour]) => parseInt(hour));

  const dayCounts: Record<string, number> = {};
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  focusSessions?.forEach(session => {
    const day = new Date(session.started_at).getDay();
    const dayName = dayNames[day];
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
  });

  const mostProductiveDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '周一';

  const completedWithTime = tasks?.filter(t => t.status === 'done' && t.completed_at && t.created_at);
  let avgCompletionTime = 0;
  if (completedWithTime && completedWithTime.length > 0) {
    const totalMs = completedWithTime.reduce((sum, t) => {
      return sum + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime());
    }, 0);
    avgCompletionTime = Math.round(totalMs / completedWithTime.length / 60000);
  }

  const completedDates = new Set(
    tasks?.filter(t => t.status === 'done' && t.completed_at)
      .map(t => new Date(t.completed_at!).toDateString())
  );

  let streak = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    
    if (completedDates.has(dateStr)) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
      if (i === 0 || (i === 1 && completedDates.has(new Date(today).toDateString()))) {
        streak = currentStreak;
      }
    } else {
      if (i <= 1) {
        streak = currentStreak;
      }
      currentStreak = 0;
    }
  }

  const profile = {
    totalTasks,
    completedTasks,
    completionRate,
    totalFocusMinutes,
    averageFocusMinutes,
    peakHours: sortedHours,
    mostProductiveDay,
    avgCompletionTime,
    streak,
    longestStreak,
  };

  return NextResponse.json(profile);
}
