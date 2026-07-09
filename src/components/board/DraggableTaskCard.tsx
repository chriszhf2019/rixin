'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PRIORITY_CONFIG } from '@/types';
import { AlertTriangle, Clock } from 'lucide-react';

interface DraggableTaskCardProps {
  task: Task;
  isDragOverlay?: boolean;
  onToggle?: (taskId: string, done: boolean) => void;
  isBlocked?: boolean;
  daysInStatus?: number;
  onBlockerClick?: () => void;
}

export function DraggableTaskCard({
  task,
  isDragOverlay,
  onToggle,
  isBlocked,
  daysInStatus,
  onBlockerClick,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative p-3 bg-card border rounded-lg transition-all cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg',
        isDragOverlay && 'shadow-lg rotate-2',
        isDone && 'opacity-60',
        isBlocked && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
      )}
    >
      {/* 堵塞指示器 */}
      {isBlocked && !isDragOverlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBlockerClick?.();
          }}
          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
        >
          <AlertTriangle className="h-3 w-3" />
        </button>
      )}

      <div className="flex items-start gap-2">
        <Checkbox
          checked={task.status === 'done'}
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          onCheckedChange={(checked) => {
            if (onToggle) onToggle(task.id, checked as boolean);
          }}
        />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium leading-tight',
            isDone && 'text-muted-foreground line-through'
          )}>
            {task.title}
          </p>
          
          {/* 堵塞状态下的停留时间 */}
          {isBlocked && daysInStatus !== undefined && daysInStatus > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
              <Clock className="h-3 w-3" />
              <span>{daysInStatus}天</span>
            </div>
          )}
          
          {/* 优先级标签 */}
          {!isBlocked && (
            <div className="flex items-center gap-1 mt-1">
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded border',
                priorityConfig.bg, priorityConfig.color, priorityConfig.border
              )}>
                {priorityConfig.label}
              </span>
              {task.task_type === 'objective' && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  目标
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}