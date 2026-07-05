'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PRIORITY_CONFIG } from '@/types';
import type { Task } from '@/types';
import { Calendar } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { CSSProperties } from 'react';

interface DraggableTaskCardProps {
  task: Task;
  isDragOverlay?: boolean;
}

export function DraggableTaskCard({ task, isDragOverlay }: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: isDragOverlay });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
        isDragOverlay && 'shadow-xl rotate-3 scale-105',
        task.status === 'done' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={task.status === 'done'}
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          onCheckedChange={() => {}} // Visual only in kanban
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through')}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', priority.color)}>
              {priority.label}
            </Badge>
            {task.due_date && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="h-3 w-3" />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
          {task.subtasks && task.subtasks.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              子任务 {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
