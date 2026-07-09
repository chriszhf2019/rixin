'use client';

import { Check, Archive, ArrowRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Task } from '@/types';
import { useState } from 'react';

interface QuickTrivialActionProps {
  tasks: Task[];
}

interface QuickActionResult {
  taskId: string;
  action: 'complete' | 'archive' | 'delegate' | 'convert';
}

export function QuickTrivialAction({ tasks }: QuickTrivialActionProps) {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const trivialTasks = tasks.filter(t => 
    (t.task_type === 'inbox' || t.task_type === 'routine') && 
    t.status !== 'done' && 
    t.status !== 'cancelled'
  );

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleAction = async (taskId: string, action: 'complete' | 'archive' | 'delegate' | 'convert') => {
    setSelectedTaskId(taskId);
    setIsProcessing(true);

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      switch (action) {
        case 'complete':
          await updateTask.mutate({ id: taskId, data: { status: 'done' } });
          toast.success(`已完成：${task.title}`);
          break;
        case 'archive':
          await updateTask.mutate({ id: taskId, data: { status: 'cancelled' } });
          toast.success(`已归档：${task.title}`);
          break;
        case 'convert':
          await updateTask.mutate({ id: taskId, data: { task_type: 'objective' } });
          toast.success(`已转为目标任务：${task.title}`);
          break;
        case 'delegate':
          toast.info(`已标记待委托：${task.title}`);
          break;
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setSelectedTaskId(null);
      setIsProcessing(false);
    }
  };

  if (trivialTasks.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-200 dark:border-amber-800/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              琐事快速处理
            </span>
            <Badge variant="outline" className="text-[10px] bg-amber-100/50">
              {trivialTasks.length}项
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">点击图标快速处理</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {trivialTasks.slice(0, 8).map(task => (
            <div 
              key={task.id} 
              className="flex items-center gap-2 p-2 bg-white/50 dark:bg-slate-800/30 rounded-lg hover:bg-white/70 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex-1 text-sm truncate text-muted-foreground">
                {task.title}
              </span>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30"
                  onClick={() => handleAction(task.id, 'complete')}
                  disabled={isProcessing || selectedTaskId === task.id}
                  title="完成"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={() => handleAction(task.id, 'convert')}
                  disabled={isProcessing || selectedTaskId === task.id}
                  title="转为目标任务"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleAction(task.id, 'archive')}
                  disabled={isProcessing || selectedTaskId === task.id}
                  title="归档"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-green-500"
                  onClick={() => handleAction(task.id, 'complete')}
                  disabled={isProcessing || selectedTaskId === task.id}
                  title="完成"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-blue-500"
                  onClick={() => handleAction(task.id, 'convert')}
                  disabled={isProcessing || selectedTaskId === task.id}
                  title="转为目标任务"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500"
                  onClick={() => handleAction(task.id, 'archive')}
                  disabled={isProcessing || selectedTaskId === task.id}
                  title="归档"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {trivialTasks.length > 8 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" className="text-xs text-amber-600">
              查看全部 {trivialTasks.length} 项琐事
              <X className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-muted/50">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" /> 完成
            </span>
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-blue-500" /> 转目标
            </span>
            <span className="flex items-center gap-1">
              <Archive className="h-3 w-3 text-gray-500" /> 归档
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}