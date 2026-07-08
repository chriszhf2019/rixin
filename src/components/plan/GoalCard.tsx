'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Target, Sparkles, MessageCircle, Check, Clock } from 'lucide-react';
import { useState } from 'react';
import { MonthlyPlanCard } from './MonthlyPlanCard';
import type { Goal, MonthlyPlan, WeeklyPlan, Task } from '@/types';
import { toast } from 'sonner';
import { splitTask } from '@/lib/ai/analyze';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type GoalWithPlans = Goal & {
  monthly_plans?: (MonthlyPlan & {
    weekly_plans?: (WeeklyPlan & { tasks?: Task[] })[];
  })[];
};

interface GoalCardProps {
  goal: GoalWithPlans;
  onRefresh?: () => void;
}

export function GoalCard({ goal, onRefresh }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splitSteps, setSplitSteps] = useState<{ title: string; estimatedMinutes: number; completed: boolean }[]>([]);

  const totalTasks = goal.monthly_plans?.reduce(
    (sum, mp) => sum + (mp.weekly_plans?.reduce((s, wp) => s + (wp.tasks?.length ?? 0), 0) ?? 0),
    0
  ) ?? 0;
  const doneTasks = goal.monthly_plans?.reduce(
    (sum, mp) =>
      sum +
      (mp.weekly_plans?.reduce(
        (s, wp) => s + (wp.tasks?.filter((t) => t.status === 'done').length ?? 0),
        0
      ) ?? 0),
    0
  ) ?? 0;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalMilestones = splitSteps.length > 0 ? splitSteps.length : goal.monthly_plans?.length ?? 0;
  const doneMilestones = splitSteps.length > 0 
    ? splitSteps.filter(s => s.completed).length 
    : (goal.monthly_plans?.filter(mp => mp.status === 'completed').length ?? 0);

  const handleAISplit = async () => {
    setSplitting(true);
    try {
      const result = await splitTask(goal.title);
      setSplitSteps(result.steps.map((s: { title: string; estimatedMinutes: number }) => ({
        ...s,
        completed: false,
      })));
      toast.success(`已将「${goal.title}」拆分为 ${result.steps.length} 个里程碑`);
    } catch {
      toast.error('拆分失败，请稍后再试');
    } finally {
      setSplitting(false);
    }
  };

  const toggleStep = (index: number) => {
    setSplitSteps(prev => prev.map((s, i) => 
      i === index ? { ...s, completed: !s.completed } : s
    ));
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer py-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{goal.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={`/assistant?goal=${goal.id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button variant="ghost" size="icon" className="h-7 w-7" title="AI 专项聊天室">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </Link>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{progress}%</span>
        </div>
        {totalMilestones > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            已完成 {doneMilestones}/{totalMilestones} 个关键节点
          </div>
        )}
      </CardHeader>
      {expanded && (
        <CardContent className="pb-4 pt-0 space-y-3">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); handleAISplit(); }}
              disabled={splitting}
              className="text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {splitting ? '拆分中...' : 'AI 拆分里程碑'}
            </Button>
            <Link 
              href={`/assistant?goal=${goal.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="sm" className="text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                AI 专项筹备聊天室
              </Button>
            </Link>
          </div>

          {splitSteps.length > 0 && (
            <div className="bg-primary/5 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">AI 拆分的里程碑</p>
              {splitSteps.map((step, index) => (
                <div
                  key={index}
                  onClick={(e) => { e.stopPropagation(); toggleStep(index); }}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all',
                    step.completed 
                      ? 'bg-green-50 dark:bg-green-950/20' 
                      : 'hover:bg-background'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    step.completed ? 'bg-green-500 text-white' : 'border-2 border-muted-foreground/30'
                  )}>
                    {step.completed && <Check className="h-3 w-3" />}
                  </div>
                  <span className={cn(
                    'flex-1 text-sm',
                    step.completed && 'line-through text-muted-foreground'
                  )}>
                    {index + 1}. {step.title}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {step.estimatedMinutes}分钟
                  </div>
                </div>
              ))}
            </div>
          )}

          {goal.monthly_plans?.map((mp) => (
            <MonthlyPlanCard key={mp.id} monthlyPlan={mp} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}