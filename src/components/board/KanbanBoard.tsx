'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { BoardColumn } from './BoardColumn';
import { DraggableTaskCard } from './DraggableTaskCard';
import type { Task, Tag } from '@/types';
import { Loader2, Plus, Filter, CheckSquare, Activity, AlertTriangle, Zap, Clock, TrendingUp, X, Sparkles, Split, CalendarClock, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BoardColumnConfig {
  id: string;
  title: string;
  status_key: string;
  color: string;
  sort_order: number;
}

const DEFAULT_COLUMNS: BoardColumnConfig[] = [
  { id: 'default-1', title: '待办', status_key: 'todo', color: '#3b82f6', sort_order: 0 },
  { id: 'default-2', title: '进行中', status_key: 'in_progress', color: '#f59e0b', sort_order: 1 },
  { id: 'default-3', title: '已完成', status_key: 'done', color: '#10b981', sort_order: 2 },
];

// 阻塞原因类型
type BlockerReason = 'too_complex' | 'time_conflict' | 'procrastination' | 'waiting_others' | 'unclear';

const BLOCKER_OPTIONS: { value: BlockerReason; label: string; icon: React.ReactNode; solution: string }[] = [
  { value: 'too_complex', label: '任务太复杂', icon: <Split className="h-4 w-4" />, solution: 'AI 可以帮你拆分成小任务' },
  { value: 'time_conflict', label: '时间冲突', icon: <CalendarClock className="h-4 w-4" />, solution: '建议调整截止日期或重新排期' },
  { value: 'procrastination', label: '拖延不想做', icon: <Zap className="h-4 w-4" />, solution: '试试5分钟专注突破法' },
  { value: 'waiting_others', label: '等别人/资源', icon: <Clock className="h-4 w-4" />, solution: '创建提醒，标记委托状态' },
  { value: 'unclear', label: '目标不清晰', icon: <AlertTriangle className="h-4 w-4" />, solution: 'AI 帮你明确下一步行动' },
];

// 计算任务在当前状态的停留天数（使用 updated_at 作为近似）
function getDaysInStatus(task: Task): number {
  const updated = new Date(task.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// 判断任务是否堵塞（在某个状态停留过久）
function isTaskBlocked(task: Task): boolean {
  const days = getDaysInStatus(task);
  // 进行中超过2天，待办超过5天，视为堵塞
  if (task.status === 'in_progress' && days > 2) return true;
  if (task.status === 'todo' && days > 5) return true;
  return false;
}

export function KanbanBoard() {
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showColumnDialog, setShowColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366f1');
  
  // 阻塞任务处理弹窗状态
  const [blockerDialogTask, setBlockerDialogTask] = useState<Task | null>(null);
  const [selectedBlockerReason, setSelectedBlockerReason] = useState<BlockerReason | null>(null);
  const [isProcessingBlocker, setIsProcessingBlocker] = useState(false);

  const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#d946ef', '#ec4899', '#64748b', '#000000',
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // 用 React Query 共享 tasks 缓存（与列表视图同步）
  const { data: tasksData } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // 看板列配置——如果 API 不可用（表不存在等），降级到默认列
  const { data: columns = DEFAULT_COLUMNS } = useQuery<BoardColumnConfig[]>({
    queryKey: ['board-columns'],
    queryFn: async () => {
      const res = await fetch('/api/board-columns');
      if (!res.ok) return DEFAULT_COLUMNS;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_COLUMNS;
    },
  });

  // 标签
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // 只显示活跃任务（排除已取消），看板聚焦工作流
  const activeTasks = (tasksData || []).filter(t => t.status !== 'cancelled');

  // 同步到本地 state（用于拖拽时的乐观更新）
  useEffect(() => {
    if (activeTasks.length > 0 || tasksData) {
      setTasks(activeTasks);
      setLoading(false);
    }
  }, [tasksData]);

  // 监听 tasks 缓存失效，确保列表和看板同步
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryKey[0] === 'tasks' && event.type === 'updated') {
        const data = event.query.state.data;
        if (Array.isArray(data)) {
          setTasks(data.filter((t: Task) => t.status !== 'cancelled'));
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedTags.length > 0) {
      const taskTagIds = (task.tags || []).map(t => t.id);
      return selectedTags.some(tagId => taskTagIds.includes(tagId));
    }
    return true;
  });

  const getColumnTasks = (statusKey: string) =>
    filteredTasks.filter(t => t.status === statusKey);

  // ===== 创新功能：堵塞检测和瓶颈可视化 =====
  
  // 计算每列的统计数据
  const columnStats = useMemo(() => {
    const stats: Record<string, { count: number; avgDays: number; blockedCount: number; congestion: 'low' | 'medium' | 'high' }> = {};
    
    for (const col of columns) {
      const colTasks = filteredTasks.filter(t => t.status === col.status_key);
      const blockedTasks = colTasks.filter(isTaskBlocked);
      
      // 计算平均停留天数
      const totalDays = colTasks.reduce((sum, t) => sum + getDaysInStatus(t), 0);
      const avgDays = colTasks.length > 0 ? totalDays / colTasks.length : 0;
      
      // 计算拥堵程度
      let congestion: 'low' | 'medium' | 'high' = 'low';
      if (col.status_key === 'in_progress') {
        if (avgDays > 2 || blockedTasks.length > 2) congestion = 'high';
        else if (avgDays > 1 || blockedTasks.length > 0) congestion = 'medium';
      } else if (col.status_key === 'todo') {
        if (colTasks.length > 10 || blockedTasks.length > 3) congestion = 'high';
        else if (colTasks.length > 5 || blockedTasks.length > 0) congestion = 'medium';
      }
      
      stats[col.status_key] = {
        count: colTasks.length,
        avgDays: Math.round(avgDays * 10) / 10,
        blockedCount: blockedTasks.length,
        congestion,
      };
    }
    
    return stats;
  }, [filteredTasks, columns]);

  // 计算流动健康度评分
  const flowHealthScore = useMemo(() => {
    let score = 100;
    
    // 进行中堵塞扣分
    const inProgressStats = columnStats['in_progress'];
    if (inProgressStats) {
      if (inProgressStats.congestion === 'high') score -= 30;
      else if (inProgressStats.congestion === 'medium') score -= 15;
      score -= inProgressStats.blockedCount * 5;
    }
    
    // 待办堆积扣分
    const todoStats = columnStats['todo'];
    if (todoStats) {
      if (todoStats.count > 15) score -= 20;
      else if (todoStats.count > 10) score -= 10;
    }
    
    // 没有已完成任务扣分
    const doneStats = columnStats['done'];
    if (!doneStats || doneStats.count === 0) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }, [columnStats]);

  // 获取所有堵塞任务
  const blockedTasks = useMemo(() => {
    return filteredTasks.filter(isTaskBlocked);
  }, [filteredTasks]);

  // 处理阻塞任务
  const handleResolveBlocker = async () => {
    if (!blockerDialogTask || !selectedBlockerReason) return;
    
    setIsProcessingBlocker(true);
    
    try {
      switch (selectedBlockerReason) {
        case 'too_complex':
          // 调用 AI 拆分任务
          const res = await fetch('/api/tasks/' + blockerDialogTask.id + '/diagnose-blocker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'too_complex' }),
          });
          if (res.ok) {
            toast.success('已生成拆分建议，请查看任务详情');
          }
          break;
          
        case 'time_conflict':
          // 调整截止日期到明天
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await fetch(`/api/tasks/${blockerDialogTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ due_date: tomorrow.toISOString() }),
          });
          toast.success('已将截止日期调整到明天');
          break;
          
        case 'procrastination':
          // 标记为进行中，鼓励开始
          await fetch(`/api/tasks/${blockerDialogTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' }),
          });
          toast.success('已移至"进行中"，试试5分钟专注法');
          break;
          
        case 'waiting_others':
          // 创建提醒
          const remindDate = new Date();
          remindDate.setDate(remindDate.getDate() + 1);
          await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: blockerDialogTask.id,
              remind_at: remindDate.toISOString(),
              type: 'time',
            }),
          });
          toast.success('已创建明日提醒');
          break;
          
        case 'unclear':
          // 更新任务描述，标记需要明确
          await fetch(`/api/tasks/${blockerDialogTask.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocker_reason: 'too_complex' }),
          });
          toast.success('已标记为需要明确，建议添加更多细节');
          break;
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setBlockerDialogTask(null);
      setSelectedBlockerReason(null);
    } catch (error) {
      toast.error('处理失败，请重试');
    } finally {
      setIsProcessingBlocker(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const computeNewSortOrder = (
    allTasks: Task[],
    taskId: string,
    targetStatus: string,
    overTaskId: string | null
  ): number => {
    const columnTasks = allTasks
      .filter(t => t.status === targetStatus && t.id !== taskId)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (!overTaskId) {
      return columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].sort_order + 1 : 0;
    }

    const overIndex = columnTasks.findIndex(t => t.id === overTaskId);
    if (overIndex === -1) {
      return columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].sort_order + 1 : 0;
    }

    if (overIndex === 0) {
      return columnTasks[0].sort_order - 1;
    }

    const prev = columnTasks[overIndex - 1];
    const next = columnTasks[overIndex];
    return (prev.sort_order + next.sort_order) / 2;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const overTask = tasks.find(t => t.id === over.id);
    const newStatus = overTask ? overTask.status : task.status;

    // 只有状态枚举内的值才允许（防止自定义列导致无效状态）
    if (!['todo', 'in_progress', 'done', 'cancelled'].includes(newStatus)) return;
    if (newStatus === task.status) return;

    const newSortOrder = computeNewSortOrder(tasks, taskId, newStatus, overTask?.id ?? null);

    const prevTasks = [...tasks];
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus as Task['status'], sort_order: newSortOrder }
          : t
      )
    );

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        sort_order: newSortOrder,
      }),
    });

    if (!res.ok) {
      toast.error('更新失败');
      setTasks(prevTasks);
    } else {
      // 通知列表视图同步更新
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    if (!activeTask || !overTask) return;
    if (activeTask.status === overTask.status) return;

    setTasks(prev =>
      prev.map(t =>
        t.id === activeTask.id ? { ...t, status: overTask.status as Task['status'] } : t
      )
    );
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error('列标题不能为空');
      return;
    }

    const res = await fetch('/api/board-columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnName.trim(), color: newColumnColor }),
    });

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ['board-columns'] });
      setNewColumnName('');
      setShowColumnDialog(false);
      toast.success('列创建成功');
    } else {
      toast.error('创建失败');
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleToggleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBatchUpdate = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;
    if (!['todo', 'in_progress', 'done', 'cancelled'].includes(newStatus)) return;

    const promises = selectedTasks.map(taskId =>
      fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    );

    await Promise.all(promises);
    setSelectedTasks([]);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success(`已更新 ${selectedTasks.length} 个任务`);
  };

  const handleDeleteSelected = async () => {
    if (selectedTasks.length === 0) return;

    const promises = selectedTasks.map(taskId =>
      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    );

    await Promise.all(promises);
    setSelectedTasks([]);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success(`已删除 ${selectedTasks.length} 个任务`);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const handleToggleTask = async (taskId: string, done: boolean) => {
    const newStatus = done ? 'done' : 'todo';
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
    ));
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      toast.error('更新失败');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  };

  // 健康度颜色
  const healthColor = flowHealthScore >= 80 ? 'text-green-500' : flowHealthScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const healthBg = flowHealthScore >= 80 ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' : 
                   flowHealthScore >= 50 ? 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20' : 
                   'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20';

  return (
    <div className="h-full flex flex-col">
      {/* 流动健康度面板 */}
      <div className={`bg-gradient-to-r ${healthBg} border rounded-lg p-3 mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className={`h-5 w-5 ${healthColor}`} />
              <span className="text-sm font-medium">流动健康度</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${healthColor}`}>{flowHealthScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 瓶颈提示 */}
            {blockedTasks.length > 0 && (
              <button
                onClick={() => setBlockerDialogTask(blockedTasks[0])}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                {blockedTasks.length} 个堵塞任务
              </button>
            )}
            
            {/* 列统计 */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              {columns.slice(0, 3).map(col => {
                const stats = columnStats[col.status_key];
                if (!stats) return null;
                const congestionColor = stats.congestion === 'high' ? 'text-red-500' : 
                                        stats.congestion === 'medium' ? 'text-amber-500' : 'text-green-500';
                return (
                  <div key={col.status_key} className="flex items-center gap-1">
                    <span>{col.title}:</span>
                    <span className={congestionColor}>{stats.count}</span>
                    {stats.avgDays > 0 && col.status_key !== 'done' && (
                      <span className="text-muted-foreground/60">({stats.avgDays}天)</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* 堵塞任务快速访问 */}
        {blockedTasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">需要关注</span>
            </div>
            <ScrollArea className="max-h-20">
              <div className="flex flex-wrap gap-2">
                {blockedTasks.slice(0, 5).map(task => (
                  <button
                    key={task.id}
                    onClick={() => setBlockerDialogTask(task)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded text-xs hover:border-red-400 transition-colors"
                  >
                    <Clock className="h-3 w-3 text-red-500" />
                    <span className="truncate max-w-[120px]">{task.title}</span>
                    <span className="text-red-500">{getDaysInStatus(task)}天</span>
                  </button>
                ))}
                {blockedTasks.length > 5 && (
                  <span className="text-xs text-muted-foreground self-center">+{blockedTasks.length - 5}个</span>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
              style={{ backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined, color: selectedTags.includes(tag.id) ? '#fff' : undefined }}
              onClick={() => handleToggleTag(tag.id)}
              className="cursor-pointer hover:opacity-80"
            >
              {tag.name}
            </Badge>
          ))}
        </div>

        {selectedTasks.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedTasks.length} 个任务
            </span>
            {columns.map(col => (
              <Button
                key={col.id}
                variant="outline"
                size="sm"
                onClick={() => handleBatchUpdate(col.status_key)}
              >
                {col.title}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              删除
            </Button>
          </div>
        )}

        <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              添加列
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建看板列</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">列标题</label>
                <Input
                  value={newColumnName}
                  onChange={e => setNewColumnName(e.target.value)}
                  placeholder="输入列名称"
                  onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewColumnColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${newColumnColor === color ? 'border-black dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleAddColumn} className="w-full">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 看板区域 */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 flex-1 overflow-x-auto pb-4">
          {columns.map(col => {
            const stats = columnStats[col.status_key];
            const isCongested = stats?.congestion === 'high';
            return (
              <BoardColumn
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={getColumnTasks(col.status_key)}
                onTaskClick={handleToggleTaskSelect}
                selectedTasks={selectedTasks}
                onToggle={handleToggleTask}
                avgDays={stats?.avgDays}
                isCongested={isCongested}
                onTaskBlockerClick={(task) => setBlockerDialogTask(task)}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTask && <DraggableTaskCard task={activeTask} isDragOverlay />}
        </DragOverlay>
      </DndContext>

      {selectedTasks.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 flex items-center gap-4">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span className="text-sm">已选择 {selectedTasks.length} 个任务</span>
          <div className="flex gap-2">
            {columns.slice(0, 3).map(col => (
              <Button key={col.id} size="sm" onClick={() => handleBatchUpdate(col.status_key)}>
                {col.title}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 阻塞任务处理弹窗 */}
      <Dialog open={!!blockerDialogTask} onOpenChange={() => { setBlockerDialogTask(null); setSelectedBlockerReason(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              这个任务遇到困难了吗？
            </DialogTitle>
          </DialogHeader>
          
          {blockerDialogTask && (
            <div className="space-y-4">
              {/* 任务信息 */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{blockerDialogTask.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  在当前状态已停留 {getDaysInStatus(blockerDialogTask)} 天
                </p>
              </div>
              
              {/* 问题选择 */}
              <div className="space-y-2">
                <p className="text-sm font-medium">遇到了什么问题？</p>
                <div className="grid gap-2">
                  {BLOCKER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedBlockerReason(option.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        selectedBlockerReason === option.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${selectedBlockerReason === option.value ? 'bg-primary/10' : 'bg-muted'}`}>
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.solution}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setBlockerDialogTask(null); setSelectedBlockerReason(null); }}>
                  取消
                </Button>
                <Button 
                  onClick={handleResolveBlocker} 
                  disabled={!selectedBlockerReason || isProcessingBlocker}
                  className="flex-1"
                >
                  {isProcessingBlocker ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI 帮我解决
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}