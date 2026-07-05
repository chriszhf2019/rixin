'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, DonutChart } from './Charts';
import { PRIORITY_CONFIG } from '@/types';
import { Loader2, CheckCircle2, ListTodo, TrendingUp, Brain } from 'lucide-react';

export function StatsDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0, done: 0, focusMinutes: 0, streak: 0,
  });
  const [weeklyData, setWeeklyData] = useState<{ label: string; value: number; max: number }[]>([]);
  const [priorityDist, setPriorityDist] = useState<{ label: string; value: number; color: string }[]>([]);
  const [goalStats, setGoalStats] = useState<{ title: string; done: number; total: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Task counts
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, priority')
        .eq('user_id', user.id);

      if (tasks) {
        setStats(prev => ({
          ...prev,
          total: tasks.length,
          done: tasks.filter(t => t.status === 'done').length,
        }));

        // Priority distribution
        const counts: Record<string, number> = {};
        tasks.forEach(t => { counts[t.priority] = (counts[t.priority] || 0) + 1; });
        const colorMap = { urgent: '#dc2626', high: '#ea580c', medium: '#4f46e5', low: '#6b7280' };
        setPriorityDist(Object.entries(counts).map(([k, v]) => ({
          label: PRIORITY_CONFIG[k as keyof typeof PRIORITY_CONFIG]?.label || k,
          value: v,
          color: colorMap[k as keyof typeof colorMap] || '#6b7280',
        })));
      }

      // Focus minutes today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, started_at')
        .eq('user_id', user.id)
        .eq('type', 'focus')
        .eq('completed', true);
      if (sessions) {
        const today = sessions
          .filter(s => new Date(s.started_at) >= todayStart)
          .reduce((s, x) => s + x.duration_minutes, 0);
        setStats(prev => ({ ...prev, focusMinutes: today }));

        // Weekly chart
        const days: { label: string; value: number; max: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
          const dayMinutes = sessions
            .filter(s => new Date(s.started_at) >= dayStart && new Date(s.started_at) <= dayEnd)
            .reduce((s, x) => s + x.duration_minutes, 0);
          const label = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
          days.push({ label, value: dayMinutes, max: 0 });
        }
        const max = Math.max(...days.map(d => d.value), 1);
        setWeeklyData(days.map(d => ({ ...d, max })));
      }

      // Goals with progress
      const { data: goals } = await supabase
        .from('goals')
        .select('title, monthly_plans(weekly_plans(tasks(status)))')
        .eq('user_id', user.id);
      if (goals) {
        setGoalStats(goals.map((g: any) => {
          const allTasks = g.monthly_plans?.flatMap((mp: any) =>
            mp.weekly_plans?.flatMap((wp: any) => wp.tasks ?? []) ?? []) ?? [];
          return {
            title: g.title,
            done: allTasks.filter((t: any) => t.status === 'done').length,
            total: allTasks.length,
          };
        }));
      }

      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ListTodo className="h-4 w-4" /> 总任务
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> 已完成
            </div>
            <p className="text-2xl font-bold mt-1">{stats.done}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-indigo-600">
              <Brain className="h-4 w-4" /> 今日专注
            </div>
            <p className="text-2xl font-bold mt-1">{stats.focusMinutes} <span className="text-sm font-normal text-muted-foreground">分</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <TrendingUp className="h-4 w-4" /> 完成率
            </div>
            <p className="text-2xl font-bold mt-1">{completionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">本周专注趋势</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <BarChart data={weeklyData} height={140} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">优先级分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex justify-center">
            <DonutChart data={priorityDist} size={140} />
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress */}
      {goalStats.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">目标进度</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {goalStats.map((g, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate">{g.title}</span>
                  <span className="text-muted-foreground text-xs">{g.done}/{g.total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${g.total > 0 ? (g.done / g.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.total === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>暂无数据</p>
          <p className="text-sm mt-1">开始使用后，这里会展示你的数据统计</p>
        </div>
      )}
    </div>
  );
}
