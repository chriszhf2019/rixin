'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableTaskCard } from './DraggableTaskCard';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

export function BoardColumn({ id, title, color, tasks }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-t-4 bg-muted/30 min-h-[200px]',
        color,
        isOver && 'ring-2 ring-primary/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 px-3 pb-3 overflow-y-auto transition-colors min-h-[120px]',
          tasks.length === 0 && 'flex items-center justify-center'
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <DraggableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">拖拽任务到这里</p>
        )}
      </div>
    </div>
  );
}
