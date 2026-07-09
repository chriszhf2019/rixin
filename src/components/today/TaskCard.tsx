'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PRIORITY_CONFIG } from '@/types';
import type { Task } from '@/types';
import { formatDate } from '@/lib/utils';
import { Calendar, MessageSquare, Bell, Target, AlertCircle, Timer, ChevronRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TaskComments } from './TaskComments';
import { TaskReminders } from './TaskReminders';
import { BlockerDiagnosis } from '@/components/tasks/BlockerDiagnosis';
import { ExperienceCardList } from '@/components/experience/ExperienceCardList';

interface TaskWithHierarchy extends Task {
  weekly_plan?: {
    id: string;
    title: string;
    monthly_plan?: {
      id: string;
      title: string;
      goal?: {
        id: string;
        title: string;
      };
    };
  };
}

interface TaskCardProps {
  task: TaskWithHierarchy;
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
}

export function TaskCard({ task, onToggle, onUpdate }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const isDone = task.status === 'done';
  const isBlocked = !!task.blocker_reason;

  const breadcrumbs: { label: string; type: string }[] = [];
  if (task.weekly_plan?.monthly_plan?.goal) {
    breadcrumbs.push({ label: task.weekly_plan.monthly_plan.goal.title, type: 'goal' });
  }
  if (task.weekly_plan?.monthly_plan) {
    breadcrumbs.push({ label: task.weekly_plan.monthly_plan.title, type: 'monthly' });
  }
  if (task.weekly_plan) {
    breadcrumbs.push({ label: task.weekly_plan.title, type: 'weekly' });
  }

  const blockerLabels: Record<string, string> = {
    too_complex: '太复杂',
    time_conflict: '时间冲突',
    procrastination: '拖延中',
  };

  return (
    <div className={cn('group flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition-all relative', 
      isDone ? 'opacity-60 border-muted bg-card' : isBlocked ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10' : `${priority.border} ${priority.bg}`)}>
      {isBlocked && (
        <div className="absolute -top-2 -right-2">
          <BlockerDiagnosis
            taskId={task.id}
            taskTitle={task.title}
            taskDescription={task.description}
            blockerReason={task.blocker_reason}
          >
            <Badge className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white border-0 text-[10px] px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {blockerLabels[task.blocker_reason!] || '卡点'}
            </Badge>
          </BlockerDiagnosis>
        </div>
      )}
      <Checkbox
        checked={isDone}
        onCheckedChange={(checked) => onToggle(task.id, checked as boolean)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', isDone ? 'line-through text-muted-foreground font-normal' : 'font-semibold')}>
            {task.title}
          </span>
          <Badge className={cn('text-[10px] px-1.5 py-0 font-medium', priority.color, priority.badgeBg, priority.badgeBorder, 'border')}>
            {priority.label}
          </Badge>
        </div>
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground flex-wrap">
            <Target className="h-3 w-3 text-primary" />
            {breadcrumbs.map((crumb, index) => (
              <span key={index}>
                {index > 0 && <ChevronRight className="h-3 w-3 inline mx-0.5" />}
                <span className="hover:text-primary cursor-pointer">{crumb.label}</span>
              </span>
            ))}
          </div>
        )}
        {task.due_date && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </div>
        )}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} 子任务
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {task.reminders && task.reminders.length > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5" title="有提醒">
            <Bell className="h-3 w-3" />
          </span>
        )}
        {task.comments && task.comments.length > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" />
            {task.comments.length}
          </span>
        )}
        {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
          <span className="text-xs text-red-500 flex items-center gap-0.5" title="已过期">
            <AlertCircle className="h-3 w-3" />
          </span>
        )}
        {!isDone && (
          <Link 
            href={`/focus?task=${task.id}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="开始专注"
          >
            <span className="text-xs text-indigo-500 flex items-center gap-0.5">
              <Timer className="h-3 w-3" />
            </span>
          </Link>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <span className="text-xs">···</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{task.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

              {isBlocked && (
                <BlockerDiagnosis
                  taskId={task.id}
                  taskTitle={task.title}
                  taskDescription={task.description}
                  blockerReason={task.blocker_reason}
                >
                  <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    卡点诊断 - 帮我突破
                  </Button>
                </BlockerDiagnosis>
              )}

              {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-md px-3 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>已过期 {formatDate(task.due_date)}</span>
                </div>
              )}

              {task.subtasks && task.subtasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    子任务 ({task.subtasks.filter(s => s.done).length}/{task.subtasks.length})
                  </h4>
                  {task.subtasks.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={sub.done} />
                      <span className={sub.done ? 'line-through text-muted-foreground' : ''}>{sub.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {task.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">负责人:</span>
                  <span>{task.assignee.name}</span>
                </div>
              )}

              <Separator />
              <TaskReminders taskId={task.id} />
              <Separator />
              {isDone && (
                <>
                  <ExperienceCardList taskId={task.id} taskTitle={task.title} compact />
                  <Separator />
                </>
              )}
              <TaskComments taskId={task.id} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
