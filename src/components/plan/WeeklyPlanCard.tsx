'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_CONFIG } from '@/types';
import type { WeeklyPlan, Task } from '@/types';
import { cn } from '@/lib/utils';

interface WeeklyPlanCardProps {
  weeklyPlan: WeeklyPlan & { tasks?: Task[] };
}

export function WeeklyPlanCard({ weeklyPlan }: WeeklyPlanCardProps) {
  const tasks = weeklyPlan.tasks ?? [];

  return (
    <div className="ml-4 border-l-2 border-muted pl-4 mt-2 space-y-1.5">
      <p className="text-xs text-muted-foreground">{weeklyPlan.title}</p>
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={task.status === 'done'} className="h-3.5 w-3.5" />
          <span className={cn(task.status === 'done' && 'line-through text-muted-foreground')}>
            {task.title}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1 py-0', PRIORITY_CONFIG[task.priority].color)}
          >
            {PRIORITY_CONFIG[task.priority].label}
          </Badge>
        </div>
      ))}
    </div>
  );
}
