'use client';

import { useState, useEffect } from 'react';
import { Flame, Target, Clock, TrendingUp, Sparkles, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { EfficiencyProfile, Task } from '@/types';

interface GrowthDashboardProps {
  tasks: Task[];
  profile: EfficiencyProfile | null;
}

export function GrowthDashboard({ tasks, profile }: GrowthDashboardProps) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting('夜深了');
    else if (hour < 12) setGreeting('早上好');
    else if (hour < 14) setGreeting('中午好');
    else if (hour < 18) setGreeting('下午好');
    else if (hour < 22) setGreeting('晚上好');
    else setGreeting('夜深了');
  }, []);

  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  const completedToday = todayTasks.filter(t => t.status === 'done').length;
  const totalToday = todayTasks.length;
  const completionRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

  const objectiveTasks = tasks.filter(t => t.task_type === 'objective' && t.status !== 'done');
  const blockedTasks = tasks.filter(t => t.blocker_reason && t.status !== 'done');

  const getMotivationalMessage = () => {
    if (completionRate === 100 && totalToday > 0) return '今日任务全部完成！太棒了 🎉';
    if (completionRate >= 80) return '胜利在望，再加把劲！';
    if (completionRate >= 50) return '进度过半，继续保持！';
    if (completedToday > 0) return '已经起步了，你可以的！';
    return '新的一天，从第一个任务开始吧';
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/80 text-sm">{greeting}</p>
              <h2 className="text-xl font-bold">今天也是成长的一天</h2>
            </div>
            <Sparkles className="h-6 w-6 text-amber-200 animate-pulse" />
          </div>
          
          <p className="text-sm text-white/90 mb-4">{getMotivationalMessage()}</p>
          
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">{completedToday}<span className="text-lg text-white/70">/{totalToday}</span></p>
              <p className="text-xs text-white/70 mt-0.5">今日任务</p>
            </div>
            <div className="text-right">
              {profile && (
                <div className="flex items-center gap-1 text-amber-200">
                  <Flame className="h-4 w-4" />
                  <span className="font-semibold">{profile.streak}天连续</span>
                </div>
              )}
              <p className="text-xs text-white/70 mt-1">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>今日进度</span>
              <span>{Math.round(completionRate)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-muted-foreground">目标推进</span>
          </div>
          <p className="text-lg font-bold">{objectiveTasks.length}<span className="text-xs text-muted-foreground font-normal"> 个待办</span></p>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs text-muted-foreground">专注时长</span>
          </div>
          <p className="text-lg font-bold">
            {profile ? Math.floor(profile.totalFocusMinutes / 60) : 0}
            <span className="text-xs text-muted-foreground font-normal">h</span>
          </p>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">卡点任务</span>
          </div>
          <p className={`text-lg font-bold ${blockedTasks.length > 0 ? 'text-amber-500' : ''}`}>
            {blockedTasks.length}
            <span className="text-xs text-muted-foreground font-normal"> 个</span>
          </p>
        </div>
      </div>
    </div>
  );
}
