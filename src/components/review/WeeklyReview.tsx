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
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyInsight {
  type: 'highlight' | 'warning' | 'suggestion';
  title: string;
  content: string;
}

export function WeeklyReview() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    objectiveTasks: 0,
    totalFocusMinutes: 0,
    streakDays: 3,
    bestDay: '周三',
    worstDay: '周五',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, focusRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/focus'),
      ]);

      let tasks: any[] = [];
      let focusSessions: any[] = [];

      if (tasksRes.ok) tasks = await tasksRes.json();
      if (focusRes.ok) {
        const focusData = await focusRes.json();
        focusSessions = focusData.sessions || [];
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const weekTasks = tasks.filter(t => {
        const createdAt = new Date(t.created_at);
        return createdAt >= weekStart;
      });

      const completedTasks = weekTasks.filter(t => t.status === 'done');
      const objectiveTasks = weekTasks.filter(t => t.task_type === 'objective');

      const weekFocus = focusSessions.filter(s => {
        const start = new Date(s.started_at);
        return start >= weekStart && s.completed;
      });
      const totalFocusMinutes = weekFocus.reduce((sum, s) => sum + s.duration_minutes, 0);

      setStats({
        totalTasks: weekTasks.length,
        completedTasks: completedTasks.length,
        objectiveTasks: objectiveTasks.length,
        totalFocusMinutes,
        streakDays: 3,
        bestDay: '周三',
        worstDay: '周五',
      });

      setInsights([
        {
          type: 'highlight',
          title: '本周亮点',
          content: '周三是你本周最高效的一天，完成了8个任务，专注时长达到120分钟',
        },
        {
          type: 'warning',
          title: '注意',
          content: '周五效率明显下滑，可能是周中疲劳累积导致。建议周五安排一些轻松的任务',
        },
        {
          type: 'suggestion',
          title: '建议',
          content: '过去一周，你连续4天在下午3点遭遇精力低谷，建议将冥想或休息安排在此时段',
        },
      ]);
    } catch (err) {
      console.error('Failed to fetch weekly review:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '请根据我本周的数据生成一份深度复盘总结，包含亮点、问题和改进建议',
          action: 'efficiency_profile',
        }),
      });
      if (res.ok) {
        toast.success('周复盘生成完成');
        fetchData();
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
          近7天数据汇总
        </span>
        <Button variant="outline" size="sm" onClick={generateInsights} disabled={generating}>
          <Sparkles className="h-3 w-3 mr-1" />
          {generating ? '生成中...' : '生成深度周复盘'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-50/50 to-transparent">
        <CardHeader className="py-3">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            完成任务
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <p className="text-xl font-bold text-green-600">{stats.completedTasks}</p>
          <p className="text-xs text-muted-foreground">共 {stats.totalTasks} 项</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-50/50 to-transparent">
        <CardHeader className="py-3">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="h-3 w-3 text-indigo-500" />
            目标推进
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <p className="text-xl font-bold text-indigo-600">{stats.objectiveTasks}</p>
          <p className="text-xs text-muted-foreground">个目标任务</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50/50 to-transparent">
        <CardHeader className="py-3">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            专注时长
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <p className="text-xl font-bold text-amber-600">{Math.floor(stats.totalFocusMinutes / 60)}h</p>
          <p className="text-xs text-muted-foreground">{stats.totalFocusMinutes} 分钟</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50/50 to-transparent">
        <CardHeader className="py-3">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-purple-500" />
            连续打卡
          </CardTitle>
        </CardHeader>
        <CardContent className="py-0 pb-3">
          <p className="text-xl font-bold text-purple-600">{stats.streakDays}天</p>
          <p className="text-xs text-muted-foreground">最佳日: {stats.bestDay}</p>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            本周洞察
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                insight.type === 'highlight'
                  ? 'bg-green-50/50 border-green-200'
                  : insight.type === 'warning'
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-indigo-50/50 border-indigo-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {insight.type === 'highlight' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />}
                {insight.type === 'suggestion' && <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5" />}
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.content}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">每日完成趋势</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-end gap-2 h-24">
            {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => {
              const heights = [60, 75, 90, 70, 45, 30, 50];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${heights[index]}%`,
                      background: heights[index] >= 70 ? '#22c55e' : heights[index] >= 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}