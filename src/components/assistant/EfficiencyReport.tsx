'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Loader2, TrendingUp, Target, Zap } from 'lucide-react';
import { ProgressRing } from '@/components/today/ProgressRing';
export function EfficiencyReport() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, done: 0 });
  const [goals, setGoals] = useState<{ id: string; title: string; progress: number }[]>([]);

  const fetchAnalysis = async () => {
    setLoading(true);
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze' }),
    });
    const data = await res.json();
    setAnalysis(data.reply);
    setLoading(false);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      
      const [tasksRes, goalsRes] = await Promise.all([
        supabase.from('tasks').select('status, weekly_plan_id').eq('user_id', user.id),
        supabase.from('goals').select('id, title, status').eq('user_id', user.id).eq('status', 'active'),
      ]);
      
      if (tasksRes.data) {
        setStats({
          total: tasksRes.data.length,
          done: tasksRes.data.filter(t => t.status === 'done').length,
        });
      }
      
      if (goalsRes.data) {
        const goalsWithProgress = await Promise.all(
          goalsRes.data.map(async (goal) => {
            const monthlyRes = await supabase
              .from('monthly_plans')
              .select('id, status')
              .eq('goal_id', goal.id);
            
            const monthlyPlans = monthlyRes.data || [];
            const completedMonthlies = monthlyPlans.filter(p => p.status === 'completed').length;
            const progress = monthlyPlans.length > 0 ? Math.round((completedMonthlies / monthlyPlans.length) * 100) : 0;
            
            return { ...goal, progress };
          })
        );
        setGoals(goalsWithProgress);
      }
    });
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            效率概览
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center gap-6">
            <ProgressRing completed={stats.done} total={stats.total || 1} size={80} strokeWidth={6} />
            <div>
              <p className="text-sm">总任务: {stats.total}</p>
              <p className="text-sm">已完成: {stats.done}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={fetchAnalysis} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            AI 效率分析
          </Button>
          {analysis && (
            <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted rounded-lg">{analysis}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-indigo-500" />
            目标进度
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              暂无活跃目标，去规划页面创建
            </p>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{goal.title}</span>
                    <span className="text-muted-foreground">{goal.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-amber-500" />
            今日亮点
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">
                {stats.done > 0 ? `已完成 ${stats.done} 个任务` : '开始完成第一个任务吧'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-muted-foreground">
                {goals.length > 0 ? `推进 ${goals.length} 个目标` : '创建目标获得更大动力'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
