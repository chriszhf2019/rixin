'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableTaskCard } from './DraggableTaskCard';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

interface BoardColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  selectedTasks?: string[];
  onToggle?: (taskId: string, done: boolean) => void;
  avgDays?: number;
  isCongested?: boolean;
  onTaskBlockerClick?: (task: Task) => void;
}

// 计算任务在当前状态的停留天数
function getDaysInStatus(task: Task): number {
  const updated = new Date(task.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// 判断任务是否堵塞
function isTaskBlocked(task: Task): boolean {
  const days = getDaysInStatus(task);
  if (task.status === 'in_progress' && days > 2) return true;
  if (task.status === 'todo' && days > 5) return true;
  return false;
}

export function BoardColumn({
  id,
  title,
  color,
  tasks,
  onTaskClick,
  selectedTasks = [],
  onToggle,
  avgDays,
  isCongested,
  onTaskBlockerClick,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl bg-muted/30 min-h-[200px]',
        isOver && 'ring-2 ring-primary/30'
      )}
      style={{ borderTopWidth: '4px', borderTopColor: color, borderTopStyle: 'solid' }}
    >
      {/* 列头部 */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm flex items-center gap-2">
            {isCongested && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
            {title}
          </h3>
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isCongested ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
            tasks.length > 5 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
            'bg-muted text-muted-foreground'
          )}>
            {tasks.length}
          </span>
        </div>
        
        {/* 平均停留时间 */}
        {avgDays !== undefined && avgDays > 0 && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isCongested ? 'text-red-500' : 'text-muted-foreground'
          )}>
            <Clock className="h-3 w-3" />
            <span>平均停留: {avgDays}天</span>
          </div>
        )}
        
        {/* 拥堵警告 */}
        {isCongested && (
          <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
            ⚠️ 此列任务可能堵塞
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <div className="flex-1 p-2 overflow-y-auto">
        <SortableContext
          items={tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tasks.map(task => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                onToggle={onToggle}
                isBlocked={isTaskBlocked(task)}
                daysInStatus={getDaysInStatus(task)}
                onBlockerClick={() => onTaskBlockerClick?.(task)}
              />
            ))}
          </div>
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            暂无任务
          </div>
        )}
      </div>
    </div>
  );
}