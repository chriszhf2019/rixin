'use client';

import { ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { useState } from 'react';
import { WeeklyPlanCard } from './WeeklyPlanCard';
import type { MonthlyPlan, WeeklyPlan, Task } from '@/types';

interface MonthlyPlanCardProps {
  monthlyPlan: MonthlyPlan & { weekly_plans?: (WeeklyPlan & { tasks?: Task[] })[] };
}

export function MonthlyPlanCard({ monthlyPlan }: MonthlyPlanCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ml-4 border-l-2 border-primary/20 pl-4">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{monthlyPlan.title}</span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </div>
      {expanded &&
        monthlyPlan.weekly_plans?.map((wp) => (
          <WeeklyPlanCard key={wp.id} weeklyPlan={wp} />
        ))}
    </div>
  );
}
