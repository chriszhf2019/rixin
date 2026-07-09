'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Target, Sparkles, ArrowUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WeeklyPlan, Task, MonthlyPlan, Goal } from '@/types';
import { PRIORITY_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

type WeeklyPlanWithDetails = WeeklyPlan & {
  tasks: Task[];
  monthly_plan?: MonthlyPlan;
  goal?: Goal;
};

export function WeeklyFocusView() {
  const [plans, setPlans] = useState<WeeklyPlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [selectedMonthPlanId, setSelectedMonthPlanId] = useState<string | null>(null);
  const [monthPlans, setMonthPlans] = useState<MonthlyPlan[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, monthPlansRes] = await Promise.all([
        fetch('/api/weekly-plans'),
        fetch('/api/monthly-plans'),
      ]);
      if (plansRes.ok && monthPlansRes.ok) {
        const plansData = (await plansRes.json()) as WeeklyPlanWithDetails[];
        const monthPlansData = (await monthPlansRes.json()) as MonthlyPlan[];
        
        const goalsRes = await fetch('/api/goals');
        const goalsData = goalsRes.ok ? (await goalsRes.json()) as Goal[] : [];
        
        const enrichedPlans = plansData.map(plan => {
          const monthPlan = monthPlansData.find(mp => mp.id === plan.monthly_plan_id);
          const goal = monthPlan ? goalsData.find(g => g.id === monthPlan.goal_id) : undefined;
          return { ...plan, monthly_plan: monthPlan, goal };
        });
        
        setPlans(enrichedPlans);
        setMonthPlans(monthPlansData);
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
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);

    const res = await fetch('/api/weekly-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newPlanTitle,
        week_number: weekNumber,
        year: now.getFullYear(),
        monthly_plan_id: selectedMonthPlanId || null,
      }),
    });

    if (res.ok) {
      toast.success('周重点已创建');
      setNewPlanTitle('');
      setSelectedMonthPlanId(null);
      fetchData();
    } else {
      toast.error('创建失败');
    }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const calculateProgress = (plan: WeeklyPlanWithDetails) => {
    const total = plan.tasks.length;
    const done = plan.tasks.filter((t) => t.status === 'done').length;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const today = new Date();
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const currentWeek = Math.ceil(((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(today.getFullYear(), 0, 1).getDay() + 1) / 7);
  const hasUnalignedPlans = plans.some(p => !p.monthly_plan_id);

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
                有 {plans.filter(p => !p.monthly_plan_id).length} 个周计划未关联月计划。建议为每个周计划选择一个关联的月计划，确保与月度目标对齐。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-amber-50/50 to-transparent border-amber-200/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="本周重点（如：完成用户调研）"
                value={newPlanTitle}
                onChange={(e) => setNewPlanTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createPlan()}
              />
            </div>
            <select
              value={selectedMonthPlanId || ''}
              onChange={(e) => setSelectedMonthPlanId(e.target.value || null)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">选择关联月计划（建议必填）</option>
              {monthPlans.map((mp) => (
                <option key={mp.id} value={mp.id}>
                  {mp.title} ({mp.month}月)
                </option>
              ))}
            </select>
            <Button onClick={createPlan} disabled={!newPlanTitle.trim()}>
              <Plus className="h-4 w-4 mr-1" /> 创建
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            本周概览 - 第 {currentWeek} 周
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + i);
              const isToday = date.toDateString() === today.toDateString();

              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 text-center py-2 rounded-lg',
                    isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                  )}
                >
                  <p className={cn('text-xs', isToday && 'opacity-80')}>{dayNames[i]}</p>
                  <p className={cn('text-sm font-medium')}>{date.getDate()}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">还没有周重点</p>
          <p className="text-sm mt-2">确定本周最重要的事，聚焦执行，确保月度目标稳步推进</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const progress = calculateProgress(plan);
            const isCurrentWeek = plan.week_number === currentWeek;
            const hasNoMonthPlan = !plan.monthly_plan_id;

            return (
              <Card key={plan.id} className={cn(isCurrentWeek && 'ring-2 ring-primary/20')}>
                <CardHeader className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        hasNoMonthPlan ? 'bg-amber-100 text-amber-600' :
                        progress >= 80 ? 'bg-green-100 text-green-600' :
                        progress >= 50 ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      )}>
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {plan.title}
                          {isCurrentWeek && (
                            <Badge className="bg-primary text-primary-foreground text-[10px]">
                              当前周
                            </Badge>
                          )}
                          {hasNoMonthPlan && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                              未关联月计划
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          {plan.goal && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {plan.goal.title} (Q{plan.goal.quarter})
                            </span>
                          )}
                          {plan.monthly_plan && (
                            <span className="text-xs text-primary flex items-center gap-1">
                              <ArrowUp className="h-3 w-3" />
                              {plan.monthly_plan.title} ({plan.monthly_plan.month}月)
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            第 {plan.week_number} 周
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{progress}%</div>
                      <p className="text-xs text-muted-foreground">完成率</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {plan.tasks.filter((t) => t.status === 'done').length}/{plan.tasks.length} 任务
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  {plan.tasks.length === 0 ? (
                    <div className="p-4 bg-muted/30 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">暂无任务</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        添加具体任务来执行本周重点
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {plan.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg transition-all',
                            task.status === 'done'
                              ? 'bg-green-50/50'
                              : task.task_type === 'objective'
                              ? 'bg-primary/5'
                              : 'bg-muted/30'
                          )}
                        >
                          <Checkbox
                            checked={task.status === 'done'}
                            onCheckedChange={(checked) =>
                              toggleTask(task.id, task.status)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm',
                              task.status === 'done' && 'line-through text-muted-foreground'
                            )}>
                              {task.title}
                            </p>
                          </div>
                          {task.task_type === 'objective' && (
                            <Badge variant="secondary" className="text-[10px]">
                              🎯 目标关联
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              PRIORITY_CONFIG[task.priority].color
                            )}
                          >
                            {PRIORITY_CONFIG[task.priority].label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
