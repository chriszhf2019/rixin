'use client';

import { useEffect, useState, useCallback } from 'react';
import { TaskCard } from './TaskCard';
import { ProgressRing } from './ProgressRing';
import { createClient } from '@/lib/supabase/client';
import type { Task, Goal } from '@/types';
import { startOfDay } from 'date-fns';
import { Loader2, Target, AlertCircle, TrendingUp, Plus, RefreshCw, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { startOfYesterday, endOfYesterday } from 'date-fns';

export function TodayList({ refreshKey }: { refreshKey: number }) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickInput, setQuickInput] = useState('');
  const [yesterdayTasks, setYesterdayTasks] = useState<Task[]>([]);

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

    // Fetch yesterday's incomplete tasks
    const yesterdayStart = startOfYesterday().toISOString();
    const yesterdayEnd = endOfYesterday().toISOString();
    const { data: yesterdayData } = await supabase
      .from('tasks')
      .select('*, subtasks(*), tags(*), assignee:profiles!assignee_id(id, name, avatar_url)')
      .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .in('status', ['todo', 'in_progress'])
      .lt('due_date', yesterdayEnd)
      .order('priority', { ascending: false });
    
    if (yesterdayData) setYesterdayTasks(yesterdayData as unknown as Task[]);

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

  const handleQuickAdd = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const title = quickInput.trim();
    if (!title) return;
    
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority: 'medium' }),
    });
    
    if (res.ok) {
      toast.success('任务已添加');
      setQuickInput('');
      fetchData();
    } else {
      toast.error('添加失败');
    }
  };

  const handleSyncYesterdayTask = async (taskId: string) => {
    const today = new Date().toISOString();
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: today }),
    });
    if (res.ok) {
      toast.success('任务已同步到今日');
      fetchData();
    } else {
      toast.error('同步失败');
    }
  };

  const handleSyncAllYesterdayTasks = async () => {
    const today = new Date().toISOString();
    for (const task of yesterdayTasks) {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_date: today }),
      });
    }
    toast.success(`已同步 ${yesterdayTasks.length} 个任务到今日`);
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

      {/* Yesterday's Incomplete Tasks */}
      {yesterdayTasks.length > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <CalendarClock className="h-4 w-4" />
              昨日未完成 ({yesterdayTasks.length})
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
            {yesterdayTasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm text-amber-800/80 dark:text-amber-500/80">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">{t.title}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 text-xs opacity-0 hover:opacity-100 transition-opacity"
                  onClick={() => handleSyncYesterdayTask(t.id)}
                  title="同步到今日"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {yesterdayTasks.length > 5 && (
              <p className="text-xs text-amber-600/60 mt-1">还有 {yesterdayTasks.length - 5} 个任务...</p>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            今日待办 ({total - completed})
          </h2>
          <span className="text-xs text-muted-foreground">
            🎯 {tasks.filter(t => t.task_type === 'objective' && t.status !== 'done').length} 目标 · 
            📋 {tasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').length} 琐事
          </span>
        </div>
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

        {/* Objective tasks */}
        {tasks.filter(t => t.task_type === 'objective' && t.status !== 'done').length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">目标推进</h3>
            </div>
            {tasks.filter(t => t.task_type === 'objective' && t.status !== 'done').map((task) => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onUpdate={() => fetchData()} />
            ))}
          </div>
        )}

        {/* Inbox/Routine tasks */}
        {tasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">日常琐事</h3>
            </div>
            {tasks.filter(t => t.task_type !== 'objective' && t.status !== 'done').map((task) => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onUpdate={() => fetchData()} />
            ))}
          </div>
        )}

        {/* Completed tasks */}
        {tasks.filter(t => t.status === 'done').length > 0 && (
          <>
            <h2 className="text-sm font-medium text-muted-foreground pt-4">已完成</h2>
            {tasks.filter(t => t.status === 'done').map((task) => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onUpdate={() => fetchData()} />
            ))}
          </>
        )}

        {tasks.length === 0 && (
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
