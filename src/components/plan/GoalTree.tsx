'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Goal, MonthlyPlan, WeeklyPlan, Task } from '@/types';
import { Loader2, Plus, ChevronDown, ChevronRight, Target, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type GoalWithPlans = Goal & {
  monthly_plans: (MonthlyPlan & {
    weekly_plans: (WeeklyPlan & { tasks: Task[] })[];
  })[];
};

export function GoalTree() {
  const [goals, setGoals] = useState<GoalWithPlans[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [expandedMonthIds, setExpandedMonthIds] = useState<Set<string>>(new Set());

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data as GoalWithPlans[]);
      } else {
        console.error('Failed to fetch goals');
      }
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newGoalTitle,
        description: newGoalDesc || null,
        quarter,
        year: now.getFullYear(),
      }),
    });

    if (res.ok) {
      toast.success('目标已创建');
      setNewGoalTitle('');
      setNewGoalDesc('');
      fetchGoals();
    } else {
      toast.error('创建失败');
    }
  };

  const calculateGoalProgress = (goal: GoalWithPlans) => {
    let totalTasks = 0;
    let doneTasks = 0;
    goal.monthly_plans.forEach(mp => {
      (mp.weekly_plans ?? []).forEach(wp => {
        totalTasks += wp.tasks?.length ?? 0;
        doneTasks += wp.tasks?.filter(t => t.status === 'done').length ?? 0;
      });
    });
    return totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  };

  const toggleMonthExpanded = (monthId: string) => {
    setExpandedMonthIds(prev => {
      const next = new Set(prev);
      if (next.has(monthId)) next.delete(monthId);
      else next.add(monthId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  const totalProgress = goals.length > 0 
    ? Math.round(goals.reduce((sum, g) => sum + calculateGoalProgress(g), 0) / goals.length) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">
            Q{currentQuarter} 季度目标
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {goals.length} 个目标 · 总进度 {totalProgress}%
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> 新建目标
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建季度目标</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="目标标题（如：完成产品上线）"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
              <Input
                placeholder="目标描述（可选，说明为什么重要）"
                value={newGoalDesc}
                onChange={(e) => setNewGoalDesc(e.target.value)}
              />
              <Button onClick={createGoal} disabled={!newGoalTitle.trim()}>
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">还没有季度目标</p>
          <p className="text-sm mt-2">设定本季度最重要的目标，作为一切规划的起点</p>
          <Button className="mt-4" onClick={() => (document.querySelector('[data-dialog-trigger]') as HTMLElement)?.click()}>
            <Plus className="h-4 w-4 mr-2" /> 创建第一个目标
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const progress = calculateGoalProgress(goal);
            const isGoalExpanded = expandedGoalId === goal.id;
            const totalMonthPlans = goal.monthly_plans.length;
            const completedMonthPlans = goal.monthly_plans.filter(mp => mp.status === 'completed').length;

            return (
              <Card key={goal.id} className={cn(isGoalExpanded && 'ring-2 ring-primary/20')}>
                <CardHeader 
                  className="cursor-pointer" 
                  onClick={() => setExpandedGoalId(isGoalExpanded ? null : goal.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        progress >= 80 ? 'bg-green-100 text-green-600' :
                        progress >= 50 ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      )}>
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {goal.title}
                          <Badge variant="outline" className="text-[10px]">
                            Q{goal.quarter}
                          </Badge>
                        </CardTitle>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{goal.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{progress}%</div>
                      <p className="text-xs text-muted-foreground">总进度</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        <Calendar className="h-3 w-3 mr-1 inline" />
                        {completedMonthPlans}/{totalMonthPlans} 月计划
                      </span>
                      {isGoalExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>

                {isGoalExpanded && (
                  <CardContent className="pb-4 pt-0">
                    {goal.monthly_plans.length === 0 ? (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">暂无月计划</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          创建月计划来拆解这个季度目标
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-4">
                        {goal.monthly_plans.map((monthPlan) => {
                          const isMonthExpanded = expandedMonthIds.has(monthPlan.id);
                          let monthTotal = 0;
                          let monthDone = 0;
                          (monthPlan.weekly_plans ?? []).forEach(wp => {
                            monthTotal += wp.tasks?.length ?? 0;
                            monthDone += wp.tasks?.filter(t => t.status === 'done').length ?? 0;
                          });
                          const monthProgress = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;
                          const totalWeekPlans = (monthPlan.weekly_plans ?? []).length;

                          return (
                            <div key={monthPlan.id} className="ml-4 border-l-2 border-muted pl-4">
                              <div 
                                className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-muted/30"
                                onClick={() => toggleMonthExpanded(monthPlan.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">{monthPlan.title}</span>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {monthPlan.month}月
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">
                                    {monthProgress}% · {totalWeekPlans}周计划
                                  </span>
                                  {isMonthExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </div>
                              </div>

                              {isMonthExpanded && (monthPlan.weekly_plans ?? []).length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {(monthPlan.weekly_plans ?? []).map((weekPlan) => {
                                    const weekDone = weekPlan.tasks?.filter(t => t.status === 'done').length ?? 0;
                                    const weekTotal = weekPlan.tasks?.length ?? 0;
                                    return (
                                      <div key={weekPlan.id} className="flex items-center justify-between text-xs p-2 bg-muted/20 rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <Sparkles className="h-3 w-3 text-amber-500" />
                                          <span className="font-medium">{weekPlan.title}</span>
                                          <span className="text-muted-foreground">第{weekPlan.week_number}周</span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">
                                          {weekDone}/{weekTotal}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
