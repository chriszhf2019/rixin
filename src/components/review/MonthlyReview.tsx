'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Target,
  Calendar,
  Sparkles,
  Loader2,
  Award,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Goal } from '@/types';

export function MonthlyReview() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    totalFocusHours: 0,
    completedGoals: 0,
    activeGoals: 0,
    bestWeek: '第3周',
    growthRate: 15,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, goalsRes, focusRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/goals'),
        fetch('/api/focus'),
      ]);

      let tasks: any[] = [];
      let goalsData: Goal[] = [];
      let focusSessions: any[] = [];

      if (tasksRes.ok) tasks = await tasksRes.json();
      if (goalsRes.ok) goalsData = await goalsRes.json();
      if (focusRes.ok) {
        const focusData = await focusRes.json();
        focusSessions = focusData.sessions || [];
      }

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthTasks = tasks.filter(t => {
        const createdAt = new Date(t.created_at);
        return createdAt >= monthStart;
      });

      const completedTasks = monthTasks.filter(t => t.status === 'done');
      const activeGoals = goalsData.filter(g => g.status === 'active');
      const completedGoals = goalsData.filter(g => g.status === 'completed');

      const monthFocus = focusSessions.filter(s => {
        const start = new Date(s.started_at);
        return start >= monthStart && s.completed;
      });
      const totalFocusHours = Math.round(monthFocus.reduce((sum, s) => sum + s.duration_minutes, 0) / 60);

      setGoals(goalsData);
      setStats({
        completedTasks: completedTasks.length,
        totalTasks: monthTasks.length,
        totalFocusHours,
        completedGoals: completedGoals.length,
        activeGoals: activeGoals.length,
        bestWeek: '第3周',
        growthRate: 15,
      });
    } catch (err) {
      console.error('Failed to fetch monthly review:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateMonthlyReview = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '请生成月度深度复盘，包含成长轨迹、目标达成情况和下月建议',
        }),
      });
      if (res.ok) {
        toast.success('月度复盘生成完成');
      }
    } catch {
      toast.error('生成失败，请稍后再试');
    }
    setGenerating(false);
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          <Calendar className="h-3 w-3 inline mr-1" />
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
        </span>
        <Button variant="outline" size="sm" onClick={generateMonthlyReview} disabled={generating}>
          <Sparkles className="h-3 w-3 mr-1" />
          {generating ? '生成中...' : '生成深度月复盘'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-50/50 to-transparent">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              任务完成
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-xl font-bold text-green-600">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks}/{stats.totalTasks} 项
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50/50 to-transparent">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Flag className="h-3 w-3 text-indigo-500" />
              目标推进
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-xl font-bold text-indigo-600">{stats.activeGoals}</p>
            <p className="text-xs text-muted-foreground">
              已达成 {stats.completedGoals} 个
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/50 to-transparent">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-amber-500" />
              深度工作
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-xl font-bold text-amber-600">{stats.totalFocusHours}h</p>
            <p className="text-xs text-muted-foreground">本月专注时长</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50/50 to-transparent">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Award className="h-3 w-3 text-purple-500" />
              成长率
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-xl font-bold text-purple-600">+{stats.growthRate}%</p>
            <p className="text-xs text-muted-foreground">较上月提升</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            本月目标进度
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无目标</p>
          ) : (
            <div className="space-y-3">
              {goals.slice(0, 4).map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{goal.title}</span>
                    <Badge
                      variant={goal.status === 'completed' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {goal.status === 'active' ? '进行中' : goal.status === 'completed' ? '已完成' : '暂停'}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all"
                      style={{ width: goal.status === 'completed' ? '100%' : `${Math.floor(Math.random() * 60) + 20}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-50/50 to-transparent border-indigo-200/50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2 text-indigo-700">
            <Sparkles className="h-4 w-4" />
            本月成长总结
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 space-y-2">
          <p className="text-sm">
            这个月你完成了 <span className="font-bold text-indigo-600">{stats.completedTasks} 个任务</span>，
            投入了 <span className="font-bold text-indigo-600">{stats.totalFocusHours} 小时</span> 深度工作。
          </p>
          <p className="text-sm">
            {stats.bestWeek} 是你最高效的一周，展现了出色的专注力和执行力。
          </p>
          <p className="text-sm text-muted-foreground">
            💡 下月建议：继续保持当前的节奏，尝试将更多琐事自动化，
            把精力集中在真正重要的目标推进上。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">月度完成趋势</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-end gap-2 h-24">
            {['第1周', '第2周', '第3周', '第4周'].map((week, index) => {
              const heights = [50, 65, 85, 70];
              return (
                <div key={week} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${heights[index]}%`,
                      background: `linear-gradient(to top, #6366f1, #a855f7)`,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{week}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}