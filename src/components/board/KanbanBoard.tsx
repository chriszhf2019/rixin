'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createClient } from '@/lib/supabase/client';
import { BoardColumn } from './BoardColumn';
import { DraggableTaskCard } from './DraggableTaskCard';
import type { Task } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { id: 'todo', title: '待办', color: 'border-t-blue-500' },
  { id: 'in_progress', title: '进行中', color: 'border-t-amber-500' },
  { id: 'done', title: '已完成', color: 'border-t-green-500' },
] as const;

export function KanbanBoard() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select('*, subtasks(*), assignee:profiles!assignee_id(id, name, avatar_url)')
      .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .neq('status', 'cancelled')
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });

    if (data) setTasks(data as unknown as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const getColumnTasks = (status: string) =>
    tasks.filter(t => t.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const overTask = tasks.find(t => t.id === over.id);
    if (!overTask) return;

    const newStatus = overTask.status;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t)
    );

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      toast.error('更新失败');
      fetchTasks(); // Revert
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    if (!activeTask || !overTask) return;
    if (activeTask.status === overTask.status) return;

    // Move task between columns visually during drag
    setTasks(prev =>
      prev.map(t =>
        t.id === activeTask.id ? { ...t, status: overTask.status as Task['status'] } : t
      )
    );
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        {COLUMNS.map(col => (
          <BoardColumn
            key={col.id}
            id={col.id}
            title={col.title}
            color={col.color}
            tasks={getColumnTasks(col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <DraggableTaskCard task={activeTask} isDragOverlay />}
      </DragOverlay>
    </DndContext>
  );
}
