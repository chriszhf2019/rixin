'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, ChevronDown, ChevronRight, Target, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
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

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const hasUnalignedPlans = plans.some(p => !p.goal_id);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      {hasUnalignedPlans && (
        <Card className="bg-amber-50/50 border-amber-200/50">
          <CardContent className="py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">规划一致性提醒</p>
              <p className="text-xs text-amber-700 mt-0.5">
                有 {plans.filter(p => !p.goal_id).length} 个月份计划未关联季度目标。建议为每个月计划选择一个关联目标，确保方向一致。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="月计划标题（如：完成产品设计）"
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
              <option value="">选择关联目标（建议必填）</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} (Q{g.quarter})
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
          <p className="text-lg font-medium">还没有月计划</p>
          <p className="text-sm mt-2">创建月计划来拆解季度目标，将宏大目标转化为月度行动</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const progress = calculateProgress(plan);
            const isExpanded = expandedId === plan.id;
            const isCurrentMonth = plan.month === currentMonth && plan.year === currentYear;
            const totalWeekPlans = plan.weekly_plans.length;
            const completedWeekPlans = plan.weekly_plans.filter(wp => wp.status === 'completed').length;
            const hasNoGoal = !plan.goal_id;

            return (
              <Card key={plan.id} className={cn(isCurrentMonth && 'ring-2 ring-primary/20')}>
                <CardHeader className="cursor-pointer py-4" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        hasNoGoal ? 'bg-amber-100 text-amber-600' :
                        progress >= 80 ? 'bg-green-100 text-green-600' :
                        progress >= 50 ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      )}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {plan.title}
                          {isCurrentMonth && (
                            <Badge className="bg-primary text-primary-foreground text-[10px]">
                              当前月
                            </Badge>
                          )}
                          {hasNoGoal && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                              未关联目标
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-1">
                          {plan.goal && (
                            <span className="text-xs text-primary flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {plan.goal.title}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {plan.year}年{plan.month}月
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{progress}%</div>
                      <p className="text-xs text-muted-foreground">进度</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        <Sparkles className="h-3 w-3 mr-1 inline" />
                        {completedWeekPlans}/{totalWeekPlans} 周计划
                      </span>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pb-4 pt-0 space-y-3">
                    {plan.weekly_plans.length === 0 ? (
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">暂无周计划</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          创建周计划来进一步拆解这个月计划
                        </p>
                      </div>
                    ) : (
                      <div className="ml-4 border-l-2 border-muted pl-4">
                        {plan.weekly_plans.map((wp) => {
                          const weekDone = wp.tasks?.filter(t => t.status === 'done').length ?? 0;
                          const weekTotal = wp.tasks?.length ?? 0;
                          const weekProgress = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

                          return (
                            <div key={wp.id} className="py-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-amber-500" />
                                  <span className="text-sm font-medium">{wp.title}</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    第{wp.week_number}周
                                  </Badge>
                                </div>
                                <Badge variant={weekProgress === 100 ? 'default' : 'outline'} className={cn(
                                  'text-[10px]',
                                  weekProgress === 100 && 'bg-green-100 text-green-700'
                                )}>
                                  {weekDone}/{weekTotal}
                                </Badge>
                              </div>
                              <Progress value={weekProgress} className="h-1.5" />
                              {(wp.tasks ?? []).length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {(wp.tasks ?? []).map((task) => (
                                    <div key={task.id} className="flex items-center gap-2 text-xs p-1.5 rounded">
                                      <div className={cn(
                                        'w-3 h-3 rounded-full',
                                        task.status === 'done' ? 'bg-green-500' : 'bg-muted'
                                      )} />
                                      <span className={cn(task.status === 'done' && 'line-through text-muted-foreground')}>
                                        {task.title}
                                      </span>
                                    </div>
                                  ))}
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
