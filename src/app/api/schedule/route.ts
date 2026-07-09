import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateSmartSchedule } from '@/lib/ai/analyze';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, priority, status')
      .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: false });

    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('started_at, duration_minutes, completed')
      .eq('user_id', user.id)
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();

    let peakHours: number[] = [9, 10, 11, 14, 15, 16];
    let workStartTime = 9;
    let workEndTime = 18;

    if (profile?.preferences) {
      try {
        const prefs = typeof profile.preferences === 'string' ? JSON.parse(profile.preferences) : profile.preferences;
        peakHours = prefs.peakHours || peakHours;
        workStartTime = prefs.workStart ?? workStartTime;
        workEndTime = prefs.workEnd ?? workEndTime;
      } catch {
        // Use defaults if preferences are invalid
      }
    }

    if (peakHours.length === 0) {
      const hourDistribution: Record<number, number> = {};
      focusSessions?.forEach(s => {
        const hour = new Date(s.started_at).getHours();
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
      });

      const calculatedPeakHours = Object.entries(hourDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));

      if (calculatedPeakHours.length > 0) {
        peakHours = calculatedPeakHours;
      }
    }

    const schedule = await generateSmartSchedule(
      tasks || [],
      peakHours,
      workStartTime,
      workEndTime
    );

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Failed to generate schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
