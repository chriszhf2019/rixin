'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, AlertCircle, Lightbulb, Target, CheckCircle, Clock, Zap, Calendar, TrendingUp, ArrowRight, Sparkles, Inbox, Flame, Play, Pause, SkipForward, Heart, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Insight {
  type: 'warning' | 'suggestion' | 'opportunity' | 'alert' | 'focus';
  title: string;
  description: string;
  action?: string;
  relatedTasks?: string[];
  priority?: 'high' | 'medium' | 'low';
}

interface MomentStatus {
  currentTime: string;
  currentHour: number;
  currentMinute: number;
  greeting: string;
  remainingHours: number;
  remainingMinutes: number;
  todayStats: {
    totalTasks: number;
    completedTasks: number;
    focusMinutes: number;
  };
  nextTask: {
    id: string;
    title: string;
    dueTime?: string;
    priority: string;
    task_type: string;
  } | null;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    targetDate?: string;
  }>;
  insights: Insight[];
  summary: {
    todayCompletionRate: number;
    todayFocusMinutes: number;
    activeGoalCount: number;
    objectiveTaskCount: number;
    trivialTaskCount: number;
  };
  flowState: 'deep' | 'light' | 'none';
  flowMinutes: number;
  recentScores: Array<{ hour: string; score: number }>;
}

const INSIGHT_ICONS = {
  alert: AlertCircle,
  warning: AlertTriangle,
  suggestion: Lightbulb,
  opportunity: TrendingUp,
  focus: Flame,
};

const INSIGHT_COLORS = {
  alert: 'border-red-500 bg-red-50 text-red-700',
  warning: 'border-amber-500 bg-amber-50 text-amber-700',
  suggestion: 'border-blue-500 bg-blue-50 text-blue-700',
  opportunity: 'border-green-500 bg-green-50 text-green-700',
  focus: 'border-purple-500 bg-purple-50 text-purple-700',
};

const INSIGHT_PRIORITY_BADGES = {
  high: <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-[10px]">紧急</Badge>,
  medium: <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-100 text-[10px]">重要</Badge>,
  low: <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-[10px]">一般</Badge>,
};

export function MomentReminder() {
  const [status, setStatus] = useState<MomentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusSeconds, setFocusSeconds] = useState(0);

  const fetchStatus = useCallback(async () => {
    setLoading(true);

    try {
      const [insightsRes, tasksRes, goalsRes, sessionsRes] = await Promise.all([
        fetch('/api/insights'),
        fetch('/api/tasks'),
        fetch('/api/goals'),
        fetch('/api/focus'),
      ]);

      const [insightsData, tasksData, goalsData, sessionsData] = await Promise.all([
        insightsRes.ok ? insightsRes.json() : Promise.resolve({ insights: [], summary: {} }),
        tasksRes.ok ? tasksRes.json() : Promise.resolve([]),
        goalsRes.ok ? goalsRes.json() : Promise.resolve([]),
        sessionsRes.ok ? sessionsRes.json() : Promise.resolve([]),
      ]);

      const safeTasksData = Array.isArray(tasksData) ? tasksData : [];
      const safeGoalsData = Array.isArray(goalsData) ? goalsData : [];
      const safeSessionsData = Array.isArray(sessionsData) ? sessionsData : [];

      const now = new Date();
      const hours = now.getHours();
      let greeting = '';
      if (hours < 6) greeting = '夜深了';
      else if (hours < 9) greeting = '早安';
      else if (hours < 12) greeting = '上午好';
      else if (hours < 14) greeting = '中午好';
      else if (hours < 18) greeting = '下午好';
      else if (hours < 22) greeting = '晚上好';
      else greeting = '夜深了';

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diffMs = endOfDay.getTime() - now.getTime();
      const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      const todayStr = now.toISOString().split('T')[0];
      const todayTasks = safeTasksData.filter((t: { due_date?: string }) => 
        t.due_date?.startsWith(todayStr)
      );
      const completedToday = todayTasks.filter((t: { status: string }) => t.status === 'done').length;
      const totalToday = todayTasks.length;

      const todaySessions = safeSessionsData.filter((s: { started_at?: string }) =>
        s.started_at?.startsWith(todayStr)
      );
      const focusMinutes = todaySessions.reduce((sum: number, s: { duration_minutes?: number }) => 
        sum + (s.duration_minutes || 0), 0
      );

      const incompleteTasks = todayTasks.filter((t: { status: string }) => 
        t.status !== 'done' && t.status !== 'cancelled'
      );
      const nextTask = incompleteTasks.length > 0 ? incompleteTasks[0] : null;

      const goalProgressList = safeGoalsData.map((g: { id: string; title: string; status: string; target_date?: string }) => {
        const goalTasks = safeTasksData.filter((t: { task_type: string; status: string }) => {
          if (t.task_type !== 'objective') return false;
          return true;
        });
        const completedGoalTasks = goalTasks.filter((t: { status: string }) => t.status === 'done').length;
        const progress = goalTasks.length > 0 ? Math.round((completedGoalTasks / goalTasks.length) * 100) : 0;
        return {
          id: g.id,
          title: g.title,
          progress,
          targetDate: g.target_date,
        };
      });

      const summary = insightsData.summary || {
        todayCompletionRate: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
        todayFocusMinutes: focusMinutes,
        activeGoalCount: safeGoalsData.filter((g: { status: string }) => g.status === 'active').length,
        objectiveTaskCount: safeTasksData.filter((t: { task_type: string; status: string }) => t.task_type === 'objective' && t.status !== 'done').length,
        trivialTaskCount: safeTasksData.filter((t: { task_type: string; status: string }) => (t.task_type === 'inbox' || t.task_type === 'routine') && t.status !== 'done').length,
      };

      const flowMinutes = safeSessionsData.length > 0 
        ? (safeSessionsData[safeSessionsData.length - 1] as { duration_minutes?: number }).duration_minutes || 0
        : 0;
      let flowState: 'deep' | 'light' | 'none' = 'none';
      if (flowMinutes >= 60) flowState = 'deep';
      else if (flowMinutes >= 25) flowState = 'light';

      const recentScores: Array<{ hour: string; score: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const h = hours - i;
        if (h >= 0) {
          const hourStr = h.toString().padStart(2, '0');
          const hourSessions = safeSessionsData.filter((s: { started_at?: string }) => 
            s.started_at?.startsWith(todayStr) && s.started_at?.substring(11, 13) === hourStr
          );
          const hourFocus = hourSessions.reduce((sum: number, s: { duration_minutes?: number }) => 
            sum + (s.duration_minutes || 0), 0
          );
          const hourTasks = todayTasks.filter((t: { completed_at?: string }) => 
            t.completed_at?.startsWith(todayStr) && t.completed_at?.substring(11, 13) === hourStr
          );
          let hourScore = 0;
          if (hourFocus >= 45) hourScore += 40;
          else if (hourFocus >= 20) hourScore += 20;
          if (hourTasks.length >= 3) hourScore += 30;
          else if (hourTasks.length >= 1) hourScore += 15;
          if (h === hours) hourScore += 30;
          recentScores.push({ hour: `${h}:00`, score: Math.min(100, hourScore) });
        }
      }

      setStatus({
        currentTime: now.toLocaleString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }),
        currentHour: now.getHours(),
        currentMinute: now.getMinutes(),
        greeting,
        remainingHours,
        remainingMinutes,
        todayStats: {
          totalTasks: totalToday,
          completedTasks: completedToday,
          focusMinutes,
        },
        nextTask: nextTask ? {
          id: nextTask.id,
          title: nextTask.title,
          priority: nextTask.priority,
          task_type: nextTask.task_type,
        } : null,
        goals: goalProgressList.slice(0, 3),
        insights: insightsData.insights || [],
        summary,
        flowState,
        flowMinutes,
        recentScores,
      });
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!isFocusing) return;
    const timer = setInterval(() => {
      setFocusSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isFocusing]);

  const handleStartFocus = () => {
    setIsFocusing(true);
    setFocusSeconds(0);
    toast.success('开始专注');
  };

  const handlePauseFocus = () => {
    setIsFocusing(false);
    const minutes = Math.floor(focusSeconds / 60);
    toast.info(`已暂停专注，本次专注 ${minutes} 分钟`);
  };

  const handleCompleteNextTask = async () => {
    if (!status?.nextTask) return;
    const res = await fetch(`/api/tasks/${status.nextTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    if (res.ok) {
      toast.success(`已完成：${status.nextTask.title}`);
      fetchStatus();
    }
  };

  const handlePostponeNextTask = async () => {
    if (!status?.nextTask) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const res = await fetch(`/api/tasks/${status.nextTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: tomorrow.toISOString() }),
    });
    if (res.ok) {
      toast.success(`已移至明天：${status.nextTask.title}`);
      fetchStatus();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Zap className="h-8 w-8 text-primary mx-auto animate-pulse" />
          <p className="mt-2 text-muted-foreground">正在获取当前状况...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">无法获取当前状况</p>
      </div>
    );
  }

  const completionRate = status.summary.todayCompletionRate;
  const focusHours = Math.floor(status.summary.todayFocusMinutes / 60);
  const focusMins = status.summary.todayFocusMinutes % 60;

  const getStatusScore = () => {
    let score = 0;
    if (completionRate >= 80) score += 30;
    else if (completionRate >= 50) score += 20;
    else score += 10;
    
    if (status.summary.todayFocusMinutes >= 60) score += 25;
    else if (status.summary.todayFocusMinutes >= 30) score += 15;
    else score += 5;
    
    if (status.summary.activeGoalCount > 0 && status.summary.objectiveTaskCount > 0) score += 25;
    else if (status.summary.activeGoalCount > 0) score += 15;
    
    if (status.insights.filter(i => i.type === 'alert' || i.type === 'warning').length === 0) score += 20;
    else score += 5;
    
    return Math.min(100, score);
  };

  const statusScore = getStatusScore();
  const statusColor = statusScore >= 80 ? 'text-green-500' : statusScore >= 50 ? 'text-amber-500' : 'text-red-500';
  const statusLabel = statusScore >= 80 ? '状态良好' : statusScore >= 50 ? '正常推进' : '需要关注';

  const criticalInsights = status.insights.filter(i => i.priority === 'high');
  const normalInsights = status.insights.filter(i => i.priority !== 'high');

  const flowStateConfig = {
    deep: { label: '深度心流', icon: Heart, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    light: { label: '轻度专注', icon: Wind, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    none: { label: '未进入状态', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
  };
  const flowConfig = flowStateConfig[status.flowState];
  const FlowIcon = flowConfig.icon;

  const focusDisplayMinutes = Math.floor(focusSeconds / 60);
  const focusDisplaySeconds = focusSeconds % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl font-bold tracking-tight">
              {status.currentHour.toString().padStart(2, '0')}:{status.currentMinute.toString().padStart(2, '0')}
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">{status.currentTime}</p>
          <h1 className="text-xl md:text-2xl font-bold mt-1">{status.greeting}</h1>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-violet-50/50 dark:from-primary/20 dark:to-violet-900/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${statusScore >= 80 ? 'bg-green-100 dark:bg-green-900/30' : statusScore >= 50 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <span className={`text-2xl font-bold ${statusColor}`}>{statusScore}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 flex items-center justify-center">
                    <Sparkles className={`h-3 w-3 ${statusColor}`} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">当前状态评分</p>
                  <p className={`font-semibold ${statusColor}`}>{statusLabel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">今日剩余时间</p>
                <p className="text-xl font-bold text-primary">
                  {status.remainingHours}h {status.remainingMinutes}m
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px bg-muted">
            <div className="bg-card p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">完成任务</p>
              <p className="font-bold text-lg">{status.todayStats.completedTasks}/{status.todayStats.totalTasks}</p>
            </div>
            <div className="bg-card p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xs text-muted-foreground">专注时间</p>
              <p className="font-bold text-lg">{focusHours > 0 ? `${focusHours}h` : ''}{focusMins}m</p>
            </div>
            <div className="bg-card p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <Target className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground">活跃目标</p>
              <p className="font-bold text-lg">{status.summary.activeGoalCount}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FlowIcon className={`h-4 w-4 ${flowConfig.color}`} />
                  <span className="text-sm font-medium">心流状态</span>
                </div>
                <Badge className={`${flowConfig.bg} ${flowConfig.color} hover:opacity-80`}>
                  {flowConfig.label}
                </Badge>
              </div>
              
              {isFocusing ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${flowConfig.bg} flex items-center justify-center animate-pulse`}>
                      <Zap className={`h-6 w-6 ${flowConfig.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">当前专注中</p>
                      <p className="text-2xl font-bold">
                        {focusDisplayMinutes.toString().padStart(2, '0')}:{focusDisplaySeconds.toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handlePauseFocus} className="bg-amber-500 hover:bg-amber-600">
                    <Pause className="h-4 w-4 mr-2" />
                    暂停
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button onClick={handleStartFocus} className="flex-1 bg-primary hover:bg-primary/90">
                    <Play className="h-4 w-4 mr-2" />
                    开始专注
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <SkipForward className="h-4 w-4 mr-2" />
                    快速开始 (25min)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">近期状态</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {status.recentScores.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-t-sm transition-all ${
                        index === status.recentScores.length - 1 ? 'bg-primary' :
                        item.score >= 60 ? 'bg-green-400' :
                        item.score >= 30 ? 'bg-amber-400' :
                        'bg-red-400'
                      }`}
                      style={{ height: `${item.score}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground mt-1">{item.hour.split(':')[0]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {criticalInsights.length > 0 && (
          <Card className="mb-4 border-l-4 border-red-500 bg-red-50/30 dark:bg-red-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                重点提醒
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-32">
                <div className="space-y-2">
                  {criticalInsights.map((insight, index) => {
                    const Icon = INSIGHT_ICONS[insight.type];
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50"
                      >
                        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            {INSIGHT_PRIORITY_BADGES[insight.priority || 'medium']}
                          </div>
                          <p className="text-xs mt-1 text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {status.nextTask && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-indigo-50/50 dark:from-primary/10 dark:to-indigo-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                下一步行动
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {status.nextTask.task_type === 'objective' && (
                      <Target className="h-4 w-4 text-primary shrink-0" />
                    )}
                    {status.nextTask.task_type === 'inbox' && (
                      <Inbox className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    {status.nextTask.task_type === 'routine' && (
                      <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <p className="font-medium">{status.nextTask.title}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {{ urgent: '紧急', high: '高优先级', medium: '中优先级', low: '低优先级' }[status.nextTask.priority] || '中优先级'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button size="sm" onClick={handleCompleteNextTask} className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    完成
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePostponeNextTask}>
                    <SkipForward className="h-3 w-3 mr-1" />
                    推迟
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {normalInsights.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                智能洞察
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-40">
                <div className="space-y-2">
                  {normalInsights.slice(0, 4).map((insight, index) => {
                    const Icon = INSIGHT_ICONS[insight.type];
                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${INSIGHT_COLORS[insight.type]} bg-opacity-50`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <p className="text-xs mt-1 opacity-80">{insight.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">目标任务</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-primary">{status.summary.objectiveTaskCount}</span>
                <span className="text-xs text-muted-foreground mb-1">待完成</span>
              </div>
              <Progress 
                value={status.summary.objectiveTaskCount > 0 ? 
                  Math.round((1 - status.summary.objectiveTaskCount / (status.summary.objectiveTaskCount + status.summary.trivialTaskCount)) * 100) : 0} 
                className="mt-3 h-1.5" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">日常琐事</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-muted-foreground">{status.summary.trivialTaskCount}</span>
                <span className="text-xs text-muted-foreground mb-1">待处理</span>
              </div>
              <Progress 
                value={status.summary.trivialTaskCount > 0 ? 
                  Math.round((1 - status.summary.trivialTaskCount / (status.summary.objectiveTaskCount + status.summary.trivialTaskCount)) * 100) : 0} 
                className="mt-3 h-1.5 bg-muted" 
              />
            </CardContent>
          </Card>
        </div>

        {status.goals.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                目标进度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {status.goals.map(goal => (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate flex-1 mr-2">{goal.title}</p>
                      <p className="text-xs text-muted-foreground shrink-0">{goal.progress}%</p>
                    </div>
                    <Progress value={goal.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={fetchStatus} variant="outline" size="sm">
            刷新状态
          </Button>
          <Button asChild size="sm">
            <a href="/today">查看今日任务</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
