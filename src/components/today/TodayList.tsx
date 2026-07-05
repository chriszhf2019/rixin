'use client';

import { useEffect, useState, useCallback } from 'react';
import { TaskCard } from './TaskCard';
import { ProgressRing } from './ProgressRing';
import { createClient } from '@/lib/supabase/client';
import type { Task, Goal } from '@/types';
import { startOfDay } from 'date-fns';
import { Loader2, Target, AlertCircle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TodayList({ refreshKey }: { refreshKey: number }) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch tasks
    const { data: taskData, error } = await supabase
      .from('tasks')
      .select('*, subtasks(*), tags(*), assignee:profiles!assignee_id(id, name, avatar_url)')
      .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .in('status', ['todo', 'in_progress', 'done'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tasks:', error.message);
    } else if (taskData) {
      setTasks(taskData as unknown as Task[]);
    }

    // Fetch active goals for association display
    const { data: goalData } = await supabase
      .from('goals')
      .select('id, title, status, quarter, year')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (goalData) setGoals(goalData as Goal[]);

    setLoading(false);
  }, [refreshKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (id: string, done: boolean) => {
    const newStatus = done ? 'done' : 'todo';
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const completed = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');

  return (
    <div className="space-y-6">
      {/* Progress Ring */}
      <div className="flex justify-center py-4">
        {total > 0 && <ProgressRing completed={completed} total={total} />}
      </div>

      {/* Overdue Warning */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            <AlertCircle className="h-4 w-4" />
            已过期任务 ({overdueTasks.length})
          </div>
          <div className="space-y-1">
            {overdueTasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm text-red-500/80">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">{t.title}</span>
              </div>
            ))}
            {overdueTasks.length > 5 && (
              <p className="text-xs text-red-400 mt-1">还有 {overdueTasks.length - 5} 个过期任务...</p>
            )}
          </div>
        </div>
      )}

      {/* Goal Association */}
      {goals.length > 0 && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2">
            <Target className="h-4 w-4" />
            关联目标
          </div>
          <div className="flex flex-wrap gap-2">
            {goals.map(g => (
              <Badge key={g.id} variant="outline" className="text-xs bg-background">
                Q{g.quarter} · {g.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          今日待办 ({total - completed})
        </h2>
        {tasks.filter(t => t.status !== 'done').map((task) => (
          <TaskCard key={task.id} task={task} onToggle={handleToggle} onUpdate={() => fetchData()} />
        ))}
        {tasks.filter(t => t.status === 'done').length > 0 && (
          <>
            <h2 className="text-sm font-medium text-muted-foreground pt-4">已完成</h2>
            {tasks.filter(t => t.status === 'done').map((task) => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onUpdate={() => fetchData()} />
            ))}
          </>
        )}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>今日暂无待办</p>
            <p className="text-sm mt-1">点击右下角 + 添加任务，开始新的一天</p>
          </div>
        )}
      </div>
    </div>
  );
}
