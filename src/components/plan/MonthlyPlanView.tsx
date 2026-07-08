'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Calendar, Plus, ChevronDown, ChevronRight, Target } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MonthlyPlan, WeeklyPlan, Task, Goal } from '@/types';
import { cn } from '@/lib/utils';

type MonthlyPlanWithDetails = MonthlyPlan & {
  weekly_plans: (WeeklyPlan & { tasks: Task[] })[];
  goal?: Goal;
};

export function MonthlyPlanView() {
  const [plans, setPlans] = useState<MonthlyPlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, goalsRes] = await Promise.all([
        fetch('/api/monthly-plans'),
        fetch('/api/goals'),
      ]);
      if (plansRes.ok && goalsRes.ok) {
        setPlans((await plansRes.json()) as MonthlyPlanWithDetails[]);
        setGoals((await goalsRes.json()) as Goal[]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createPlan = async () => {
    const now = new Date();
    const res = await fetch('/api/monthly-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newPlanTitle,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        goal_id: selectedGoalId || null,
      }),
    });

    if (res.ok) {
      toast.success('月计划已创建');
      setNewPlanTitle('');
      setSelectedGoalId(null);
      fetchData();
    } else {
      toast.error('创建失败');
    }
  };

  const calculateProgress = (plan: MonthlyPlanWithDetails) => {
    const total = plan.weekly_plans.reduce(
      (sum, wp) => sum + (wp.tasks?.length ?? 0),
      0
    );
    const done = plan.weekly_plans.reduce(
      (sum, wp) => sum + (wp.tasks?.filter((t) => t.status === 'done').length ?? 0),
      0
    );
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="月计划标题"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createPlan()}
              />
            </div>
            <select
              value={selectedGoalId || ''}
              onChange={(e) => setSelectedGoalId(e.target.value || null)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">选择关联目标（可选）</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            <Button onClick={createPlan} disabled={!newPlanTitle.trim()}>
              <Plus className="h-4 w-4 mr-1" /> 创建
            </Button>
          </div>
        </CardContent>
      </Card>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>还没有月计划</p>
          <p className="text-sm mt-1">创建一个月计划，开始拆解季度目标</p>
        </div>
      ) : (
        plans.map((plan) => {
          const progress = calculateProgress(plan);
          const isExpanded = expandedId === plan.id;

          return (
            <Card key={plan.id}>
              <CardHeader className="cursor-pointer py-4" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{plan.title}</CardTitle>
                      {plan.goal && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          关联目标: {plan.goal.title}
                        </p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{progress}%</span>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pb-4 pt-0 space-y-3">
                  {plan.weekly_plans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无周计划</p>
                  ) : (
                    plan.weekly_plans.map((wp) => (
                      <div key={wp.id} className="ml-4 border-l-2 border-muted pl-4 mt-2">
                        <p className="text-sm font-medium">{wp.title}</p>
                        {(wp.tasks ?? []).map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm mt-1">
                            <div className={cn(
                              'w-4 h-4 rounded border-2 flex items-center justify-center',
                              task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-muted-foreground/30'
                            )}>
                              {task.status === 'done' && <Plus className="h-3 w-3 text-white rotate-45" />}
                            </div>
                            <span className={cn(task.status === 'done' && 'line-through text-muted-foreground')}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}