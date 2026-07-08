'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PRIORITY_CONFIG } from '@/types';
import type { Task } from '@/types';
import { formatDate } from '@/lib/utils';
import { Calendar, MessageSquare, Bell, Target, AlertCircle, Timer } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TaskComments } from './TaskComments';
import { TaskReminders } from './TaskReminders';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
}

interface TaskCardProps {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
}

export function TaskCard({ task, onToggle, onUpdate }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const isDone = task.status === 'done';

  return (
    <div className={cn('group flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition-all', 
      isDone ? 'opacity-60 border-muted bg-card' : `${priority.border} ${priority.bg}`)}>
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
              <TaskComments taskId={task.id} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
