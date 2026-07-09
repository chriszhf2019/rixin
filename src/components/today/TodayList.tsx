'use client';

import { useState, useRef } from 'react';
import { TaskCard } from './TaskCard';
import { ProgressRing } from './ProgressRing';
import { SmartSchedule } from './SmartSchedule';
import { QuickTrivialAction } from './QuickTrivialAction';
import { FocusMoment } from './FocusMoment';
import { useTasks, useGoals } from '@/lib/hooks/useTasks';
import type { Task, Goal, EfficiencyProfile } from '@/types';
import { Loader2, Target, AlertCircle, TrendingUp, Plus, RefreshCw, CalendarClock, Lightbulb, ArrowRight, CheckCircle, ChevronDown, ChevronUp, Edit2, Trash2, CalendarDays, Sparkles, Archive, CheckCheck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfYesterday } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function TodayList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { tasks, isLoading: tasksLoading, updateTask, createTask } = useTasks();
  const { goals, isLoading: goalsLoading } = useGoals();
  const [quickInput, setQuickInput] = useState('');

  // 折叠状态
  const [alertExpanded, setAlertExpanded] = useState(true);
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  const [efficiencyExpanded, setEfficiencyExpanded] = useState(false);

  // 完成动画状态
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<string | null>(null);

  // 批量选择状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // 内联编辑状态
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: yesterdayTasks, refetch: refetchYesterdayTasks } = useQuery({
    queryKey: ['yesterdayTasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const yesterdayEnd = endOfYesterday().toISOString();
      const { data } = await supabase
        .from('tasks')
        .select('*, subtasks(*), tags(*), assignee:profiles!assignee_id(id, name, avatar_url)')
        .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
        .in('status', ['todo', 'in_progress'])
        .lt('due_date', yesterdayEnd);

      return data as unknown as Task[];
    },
  });

  const { data: insightsData } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const res = await fetch('/api/insights');
      if (!res.ok) throw new Error('Failed to fetch insights');
      return res.json() as Promise<{ insights: Array<{ type: string; title: string; description: string; action?: string }>; summary?: Record<string, number> }>;
    },
  });

  const insights = insightsData;
  const loading = tasksLoading || goalsLoading;

  const handleToggle = async (id: string, done: boolean) => {
    const newStatus = done ? 'done' : 'todo';
    const task = tasks.find(t => t.id === id);
    await updateTask.mutate({ id, data: { status: newStatus } });

    if (done && task) {
      setLastCompletedTask(task.title);
      setShowCompletionAnimation(true);
      setTimeout(() => {
        setShowCompletionAnimation(false);
        setLastCompletedTask(null);
      }, 2000);
    }
  };

  // 琐事一键完成并归档
  const handleQuickArchive = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    await updateTask.mutate({ id: taskId, data: { status: 'done', completed_at: new Date().toISOString() } });
    toast.success(`已完成并归档：${task?.title || '任务'}`);
  };

  // 内联编辑
  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveEdit = async (taskId: string) => {
    const title = editingTitle.trim();
    if (!title) {
      toast.error('标题不能为空');
      return;
    }
    await updateTask.mutate({ id: taskId, data: { title } });
    setEditingTaskId(null);
    setEditingTitle('');
    toast.success('已更新');
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTitle('');
  };

  // 批量操作
  const handleToggleBatchSelect = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleBatchComplete = async () => {
    for (const id of selectedTaskIds) {
      await updateTask.mutate({ id, data: { status: 'done' } });
    }
    toast.success(`已完成 ${selectedTaskIds.size} 个任务`);
    setSelectedTaskIds(new Set());
    setBatchMode(false);
  };

  const handleBatchMoveTomorrow = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (const id of selectedTaskIds) {
      await updateTask.mutate({ id, data: { due_date: tomorrow.toISOString() } });
    }
    toast.success(`已移至明天 ${selectedTaskIds.size} 个任务`);
    setSelectedTaskIds(new Set());
    setBatchMode(false);
  };

  const handleBatchDelete = async () => {
    for (const id of selectedTaskIds) {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    }
    toast.success(`已删除 ${selectedTaskIds.size} 个任务`);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setSelectedTaskIds(new Set());
    setBatchMode(false);
  };

  const handleQuickAdd = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const title = quickInput.trim();
    if (!title) return;

    await createTask.mutate({ title, priority: 'medium', due_date: new Date().toISOString() });
    if (createTask.isSuccess) {
      toast.success('任务已添加');
      setQuickInput('');
    }
  };

  const handleSyncYesterdayTask = async (taskId: string) => {
    const today = new Date().toISOString();
    await updateTask.mutate({ id: taskId, data: { due_date: today } });
    if (updateTask.isSuccess) {
      toast.success('任务已同步到今日');
      refetchYesterdayTasks();
    }
  };

  const handleSyncAllYesterdayTasks = async () => {
    const today = new Date().toISOString();
    for (const task of yesterdayTasks || []) {
      await updateTask.mutate({ id: task.id, data: { due_date: today } });
    }
    toast.success(`已同步 ${(yesterdayTasks || []).length} 个任务到今日`);
    refetchYesterdayTasks();
  };

  const handleMoveToTomorrow = async (taskId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await updateTask.mutate({ id: taskId, data: { due_date: tomorrow.toISOString() } });
    toast.success('已移至明天');
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('任务已删除');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } else {
      toast.error('删除失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t =>
    t.status === 'done'
      ? t.completed_at?.startsWith(todayStr) || t.due_date?.startsWith(todayStr)
      : (t.due_date?.startsWith(todayStr) || (!t.due_date && t.status !== 'cancelled'))
  );
  const completed = todayTasks.filter(t => t.status === 'done').length;
  const total = todayTasks.length;
  const overdueTasks = todayTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 信息去重：过滤掉与过期任务重复的AI洞察
  const filteredInsights = insights?.insights?.filter(insight => {
    if (overdueTasks.length > 0 && (insight.type === 'alert' || insight.type === 'warning')) {
      if (insight.title.includes('过期') || insight.title.includes('逾期')) return false;
    }
    return true;
  }) || [];

  const dailyQuotes = [
    { text: '日有所进，日有所新', author: '《周易·系辞上》' },
    { text: '千里之行，始于足下', author: '《老子》' },
    { text: '积跬步以至千里', author: '《荀子·劝学》' },
    { text: '不积小流，无以成江海', author: '《荀子·劝学》' },
    { text: '路漫漫其修远兮，吾将上下而求索', author: '屈原《离骚》' },
    { text: '学而不思则罔，思而不学则殆', author: '《论语·为政》' },
    { text: '知之者不如好之者，好之者不如乐之者', author: '《论语·雍也》' },
    { text: '博学之，审问之，慎思之，明辨之，笃行之', author: '《中庸》' },
    { text: '业精于勤，荒于嬉；行成于思，毁于随', author: '韩愈' },
    { text: '锲而不舍，金石可镂', author: '《荀子·劝学》' },
    { text: '少壮不努力，老大徒伤悲', author: '《长歌行》' },
    { text: '逝者如斯夫，不舍昼夜', author: '《论语·子罕》' },
    { text: '今日事，今日毕', author: '谚语' },
    { text: '一寸光阴一寸金，寸金难买寸光阴', author: '谚语' },
    { text: '有志者，事竟成', author: '《后汉书·耿弇传》' },
    { text: '天生我材必有用', author: '李白《将进酒》' },
    { text: '长风破浪会有时，直挂云帆济沧海', author: '李白《行路难》' },
    { text: '不经一番寒彻骨，怎得梅花扑鼻香', author: '黄蘖禅师' },
    { text: '纸上得来终觉浅，绝知此事要躬行', author: '陆游《冬夜读书示子聿》' },
    { text: '山重水复疑无路，柳暗花明又一村', author: '陆游《游山西村》' },
    { text: '宝剑锋从磨砺出，梅花香自苦寒来', author: '谚语' },
    { text: '千淘万漉虽辛苦，吹尽狂沙始到金', author: '刘禹锡《浪淘沙》' },
    { text: '人生天地间，忽如远行客', author: '《古诗十九首》' },
    { text: '盛年不重来，一日难再晨', author: '陶渊明《杂诗》' },
    { text: '及时当勉励，岁月不待人', author: '陶渊明《杂诗》' },
    { text: '黑发不知勤学早，白首方悔读书迟', author: '颜真卿《劝学诗》' },
    { text: '三更灯火五更鸡，正是男儿读书时', author: '颜真卿《劝学诗》' },
    { text: '读书破万卷，下笔如有神', author: '杜甫《奉赠韦左丞丈二十二韵》' },
    { text: '沉舟侧畔千帆过，病树前头万木春', author: '刘禹锡《酬乐天扬州初逢席上见赠》' },
    { text: '穷且益坚，不坠青云之志', author: '王勃《滕王阁序》' },
  ];

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const quoteIndex = (today.getFullYear() * 365 + dayOfYear) % dailyQuotes.length;
  const todayQuote = dailyQuotes[quoteIndex];

  // 渲染任务卡片（带批量选择和内联编辑）
  const renderTaskItem = (task: Task, isTrivial: boolean) => {
    const isSelected = selectedTaskIds.has(task.id);
    const isEditing = editingTaskId === task.id;

    return (
      <div key={task.id} className="relative group">
        {batchMode && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleToggleBatchSelect(task.id)}
            />
          </div>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Input
              ref={editInputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit(task.id);
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="flex-1"
            />
            <Button size="sm" onClick={() => handleSaveEdit(task.id)}>保存</Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>取消</Button>
          </div>
        ) : (
          <div className={cn(batchMode && 'pl-8')}>
            <TaskCard task={task} onToggle={handleToggle} onUpdate={() => {}} />
          </div>
        )}

        {/* 快速操作按钮（悬停显示，非批量模式） */}
        {!batchMode && !isEditing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {/* 琐事专属：一键完成并归档 */}
            {isTrivial && task.status !== 'done' && (
              <button
                onClick={() => handleQuickArchive(task.id)}
                className="p-1.5 bg-muted hover:bg-green-500/20 rounded text-muted-foreground hover:text-green-500 transition-colors"
                title="完成并归档"
              >
                <Archive className="h-3 w-3" />
              </button>
            )}
            {/* 内联编辑 */}
            <button
              onClick={() => handleStartEdit(task)}
              className="p-1.5 bg-muted hover:bg-blue-500/20 rounded text-muted-foreground hover:text-blue-500 transition-colors"
              title="编辑"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            {/* 移至明天 */}
            <button
              onClick={() => handleMoveToTomorrow(task.id)}
              className="p-1.5 bg-muted hover:bg-muted-foreground/20 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="移至明天"
            >
              <CalendarDays className="h-3 w-3" />
            </button>
            {/* 删除 */}
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="p-1.5 bg-muted hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500 transition-colors"
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 完成动画 */}
      {showCompletionAnimation && lastCompletedTask && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">已完成：{lastCompletedTask}</span>
          </div>
        </div>
      )}

      {/* 今日概览卡片 */}
      <div className="bg-gradient-to-r from-primary/5 to-indigo-50/50 dark:from-primary/10 dark:to-indigo-950/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">今日待办</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {today.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{completed}<span className="text-lg text-muted-foreground">/{total}</span></p>
              <p className="text-xs text-muted-foreground">已完成</p>
            </div>
            <ProgressRing completed={completed} total={total} size={64} />
          </div>
        </div>

        {/* 进度条 */}
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">开始</span>
            <span className="text-xs font-medium text-primary">{completionRate}%</span>
            <span className="text-xs text-muted-foreground">完成</span>
          </div>
        </div>
      </div>

      {/* 今日提醒卡片（合并过期警告、昨日任务、目标关联） */}
      {(overdueTasks.length > 0 || (yesterdayTasks ?? []).length > 0 || goals.length > 0) && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setAlertExpanded(!alertExpanded)}
            className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-sm">今日提醒</span>
              <Badge variant="outline" className="text-xs">
                {overdueTasks.length + (yesterdayTasks?.length || 0)}
              </Badge>
            </div>
            {alertExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {alertExpanded && (
            <div className="divide-y divide-border/50">
              {/* 过期任务 */}
              {overdueTasks.length > 0 && (
                <div className="p-3 bg-red-50/50 dark:bg-red-950/10">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    已过期任务 ({overdueTasks.length})
                  </div>
                  <div className="space-y-1">
                    {overdueTasks.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-sm text-red-500/80">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                        <button
                          onClick={() => handleMoveToTomorrow(t.id)}
                          className="text-xs text-red-400 hover:text-red-500"
                        >
                          <CalendarDays className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {overdueTasks.length > 5 && (
                      <p className="text-xs text-red-400 mt-1">还有 {overdueTasks.length - 5} 个过期任务...</p>
                    )}
                  </div>
                </div>
              )}

              {/* 昨日未完成 */}
              {(yesterdayTasks ?? []).length > 0 && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <CalendarClock className="h-4 w-4" />
                      昨日未完成 ({(yesterdayTasks ?? []).length})
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-amber-600 hover:text-amber-700"
                      onClick={handleSyncAllYesterdayTasks}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> 全部同步
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {(yesterdayTasks ?? []).slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-sm text-amber-800/80 dark:text-amber-500/80">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                        <button
                          onClick={() => handleSyncYesterdayTask(t.id)}
                          className="text-xs text-amber-600 hover:text-amber-700 opacity-70 hover:opacity-100"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(yesterdayTasks ?? []).length > 5 && (
                      <p className="text-xs text-amber-600/60 mt-1">还有 {(yesterdayTasks ?? []).length - 5} 个任务...</p>
                    )}
                  </div>
                </div>
              )}

              {/* 关联目标 */}
              {goals.length > 0 && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10">
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
            </div>
          )}
        </div>
      )}

      {/* AI 洞察（去重后） */}
      {filteredInsights.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setInsightsExpanded(!insightsExpanded)}
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 dark:from-violet-950/20 dark:to-indigo-950/20 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-violet-600" />
              <span className="font-medium text-sm">AI 洞察</span>
            </div>
            {insightsExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {insightsExpanded && (
            <div className="p-4">
              <div className="space-y-3">
                {filteredInsights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                      insight.type === 'alert' ? 'bg-red-100 text-red-600' :
                      insight.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                      insight.type === 'suggestion' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {insight.type === 'alert' ? '!' :
                       insight.type === 'warning' ? '⚠' :
                       insight.type === 'suggestion' ? '💡' : '✨'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{insight.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {filteredInsights.length > 3 && (
                <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs text-violet-600 hover:text-violet-700">
                  查看全部洞察
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 效率工具（可折叠） */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setEfficiencyExpanded(!efficiencyExpanded)}
          className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-sm">效率工具</span>
          </div>
          {efficiencyExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {efficiencyExpanded && (
          <div className="divide-y divide-border/50 p-4 space-y-4">
            <SmartSchedule />
            <QuickTrivialAction tasks={todayTasks} />
            <FocusMoment />
          </div>
        )}
      </div>

      {/* 任务列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            今日待办 ({total - completed})
          </h2>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">
              <Target className="h-3 w-3 mr-1" />
              {todayTasks.filter(t => t.task_type === 'objective' && t.status !== 'done').length} 目标
            </Badge>
            <Badge variant="outline" className="text-xs bg-muted/50">
              <AlertCircle className="h-3 w-3 mr-1" />
              {todayTasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').length} 琐事
            </Badge>
            {/* 批量操作切换 */}
            {!batchMode ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setBatchMode(true)}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                批量操作
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">已选 {selectedTaskIds.size}</span>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setBatchMode(false); setSelectedTaskIds(new Set()); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 批量操作工具栏 */}
        {batchMode && selectedTaskIds.size > 0 && (
          <div className="sticky top-0 z-20 flex items-center gap-2 p-3 bg-card border rounded-lg shadow-md">
            <span className="text-sm font-medium">已选择 {selectedTaskIds.size} 个任务</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={handleBatchComplete}>
              <CheckCircle className="h-3 w-3 mr-1" />
              批量完成
            </Button>
            <Button size="sm" variant="outline" onClick={handleBatchMoveTomorrow}>
              <CalendarDays className="h-3 w-3 mr-1" />
              移至明天
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={handleBatchDelete}>
              <Trash2 className="h-3 w-3 mr-1" />
              删除
            </Button>
          </div>
        )}

        <div className="relative">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="quick-add-input"
            type="text"
            placeholder="输入任务名称，按 Enter 添加..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={handleQuickAdd}
            className="pl-10"
          />
        </div>

        {/* 目标推进 */}
        {todayTasks.filter(t => t.task_type === 'objective' && t.status !== 'done').length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-primary/5 to-indigo-50/50 dark:from-primary/10 dark:to-indigo-950/10 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-primary">目标推进</h3>
              <span className="text-xs text-muted-foreground">
                ({todayTasks.filter(t => t.task_type === 'objective' && t.status !== 'done').length}项)
              </span>
            </div>
            <div className="space-y-2">
              {todayTasks.filter(t => t.task_type === 'objective' && t.status !== 'done').map((task) => renderTaskItem(task, false))}
            </div>
          </div>
        )}

        {/* 日常琐事 */}
        {todayTasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-muted/50 to-gray-50/50 dark:from-slate-800/50 dark:to-gray-900/50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">日常琐事</h3>
              <span className="text-xs text-muted-foreground">
                ({todayTasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').length}项)
              </span>
              <span className="text-xs text-muted-foreground/60 ml-1">悬停可一键归档</span>
            </div>
            <div className="space-y-2">
              {todayTasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').map((task) => renderTaskItem(task, true))}
            </div>
          </div>
        )}

        {/* 已完成 */}
        {todayTasks.filter(t => t.status === 'done').length > 0 && (
          <div className="space-y-3 pt-4 border-t border-muted/30">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h2 className="text-sm font-medium text-muted-foreground">已完成</h2>
              <span className="text-xs text-muted-foreground">
                ({todayTasks.filter(t => t.status === 'done').length}项)
              </span>
            </div>
            <div className="space-y-2 opacity-70">
              {todayTasks.filter(t => t.status === 'done').map((task) => renderTaskItem(task, false))}
            </div>
          </div>
        )}

        {todayTasks.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-amber-100 dark:from-indigo-900/30 dark:to-amber-900/30 flex items-center justify-center">
              <TrendingUp className="h-10 w-10 text-indigo-500" />
            </div>
            <div className="max-w-xs mx-auto mb-4">
              <p className="text-lg font-medium text-foreground mb-1">{todayQuote.text}</p>
              <p className="text-xs text-muted-foreground">{todayQuote.author}</p>
            </div>
            <p className="text-sm">今日暂无待办</p>
            <p className="text-xs mt-1">输入任务名称后按 Enter 快速添加</p>
          </div>
        )}
      </div>
    </div>
  );
}
