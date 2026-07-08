'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, AlertTriangle, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { TeamActivity, Task } from '@/types';
import { PRIORITY_CONFIG } from '@/types';
import { cn } from '@/lib/utils';
import { splitTask } from '@/lib/ai/analyze';

interface ActivityKanbanProps {
  activity: TeamActivity;
  onUpdate: () => void;
  onClose: () => void;
}

const BLOCKER_CONFIG: Record<string, { label: string; color: string }> = {
  too_complex: { label: '💡 无从下手', color: 'bg-purple-100 text-purple-700' },
  time_conflict: { label: '⏰ 时间冲突', color: 'bg-amber-100 text-amber-700' },
  procrastination: { label: '🦥 拖延', color: 'bg-red-100 text-red-700' },
};

export function ActivityKanban({ activity, onUpdate, onClose }: ActivityKanbanProps) {
  const [tasks, setTasks] = useState<Task[]>(activity.tasks || []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [showBlockerMenu, setShowBlockerMenu] = useState<string | null>(null);
  const [splitting, setSplitting] = useState(false);

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTaskTitle,
        activity_id: activity.id,
        assignee_id: selectedAssignee || null,
        status: 'todo',
        task_type: 'objective',
      }),
    });

    if (res.ok) {
      toast.success('任务已添加');
      setNewTaskTitle('');
      setSelectedAssignee(null);
      onUpdate();
    } else {
      toast.error('添加失败');
    }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onUpdate();
  };

  const markBlocker = async (taskId: string, reason: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocker_reason: reason }),
    });
    setShowBlockerMenu(null);
    onUpdate();
    toast.success('已标记卡点，团队成员将收到提醒');
  };

  const clearBlocker = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocker_reason: null }),
    });
    onUpdate();
  };

  const handleAISplit = async () => {
    setSplitting(true);
    try {
      const result = await splitTask(activity.title);
      
      await Promise.all(
        result.steps.map(async (step: { title: string }, index: number) => {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: step.title,
              activity_id: activity.id,
              status: 'todo',
              task_type: 'objective',
              sort_order: index,
            }),
          });
        })
      );

      toast.success(`已将「${activity.title}」拆分为 ${result.steps.length} 个任务`);
      onUpdate();
    } catch {
      toast.error('拆分失败，请稍后再试');
    } finally {
      setSplitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{activity.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{activity.description || '暂无描述'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAISplit} disabled={splitting}>
              <Sparkles className="h-3 w-3 mr-1" />
              {splitting ? '拆分中...' : 'AI 拆分任务'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 gap-0 border-b">
          <div className="p-4 border-r border-muted">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">待办</span>
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {todoTasks.map(task => (
                <div key={task.id} className={cn(
                  'p-2 rounded-lg border transition-all',
                  task.blocker_reason ? 'border-orange-300 bg-orange-50/50' : 'border-muted/50 hover:border-muted'
                )}>
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      checked={task.status === 'done'}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{task.title}</p>
                      {task.assignee && (
                        <div className="flex items-center gap-1 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">{task.assignee.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                        </div>
                      )}
                    </div>
                    {task.blocker_reason && (
                      <Badge className={`text-[10px] ${BLOCKER_CONFIG[task.blocker_reason].color}`}>
                        {BLOCKER_CONFIG[task.blocker_reason].label}
                      </Badge>
                    )}
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setShowBlockerMenu(showBlockerMenu === task.id ? null : task.id)}
                      >
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      {showBlockerMenu === task.id && (
                        <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-10 p-2 w-48">
                          <p className="text-xs text-muted-foreground mb-2">标记卡点原因</p>
                          {Object.entries(BLOCKER_CONFIG).map(([key, value]) => (
                            <button
                              key={key}
                              onClick={() => markBlocker(task.id, key)}
                              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted"
                            >
                              {value.label}
                            </button>
                          ))}
                          {task.blocker_reason && (
                            <button
                              onClick={() => clearBlocker(task.id)}
                              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted text-green-600"
                            >
                              ✅ 已解决
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-r border-muted">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">进行中</span>
              <Badge variant="secondary">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {inProgressTasks.map(task => (
                <div key={task.id} className={cn(
                  'p-2 rounded-lg border transition-all',
                  task.blocker_reason ? 'border-orange-300 bg-orange-50/50' : 'border-muted/50 hover:border-muted'
                )}>
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      checked={task.status === 'done'}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{task.title}</p>
                      {task.assignee && (
                        <div className="flex items-center gap-1 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">{task.assignee.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                        </div>
                      )}
                    </div>
                    {task.blocker_reason && (
                      <Badge className={`text-[10px] ${BLOCKER_CONFIG[task.blocker_reason].color}`}>
                        {BLOCKER_CONFIG[task.blocker_reason].label}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">已完成</span>
              <Badge variant="secondary">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {doneTasks.map(task => (
                <div key={task.id} className="p-2 rounded-lg border border-green-200/50 bg-green-50/30">
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      checked={task.status === 'done'}
                      onCheckedChange={() => toggleTask(task.id, task.status)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-through text-muted-foreground">{task.title}</p>
                      {task.assignee && (
                        <div className="flex items-center gap-1 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">{task.assignee.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-muted bg-muted/30">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="添加任务..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                className="pl-10"
              />
            </div>
            <select
              value={selectedAssignee || ''}
              onChange={(e) => setSelectedAssignee(e.target.value || null)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">分配给...</option>
              {activity.members?.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user?.name}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={addTask} disabled={!newTaskTitle.trim()}>添加</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}