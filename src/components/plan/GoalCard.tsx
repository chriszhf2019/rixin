'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Target } from 'lucide-react';
import { useState } from 'react';
import { MonthlyPlanCard } from './MonthlyPlanCard';
import type { Goal, MonthlyPlan } from '@/types';

type GoalWithPlans = Goal & {
  monthly_plans?: (MonthlyPlan & {
    weekly_plans?: (WeeklyPlan & { tasks?: Task[] })[];
  })[];
};

interface GoalCardProps {
  goal: GoalWithPlans;
}

export function GoalCard({ goal }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <Card>
      <CardHeader className="cursor-pointer py-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{goal.title}</CardTitle>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{progress}%</span>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pb-4 pt-0 space-y-3">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}
          {goal.monthly_plans?.map((mp) => (
            <MonthlyPlanCard key={mp.id} monthlyPlan={mp} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
