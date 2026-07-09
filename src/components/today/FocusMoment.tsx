'use client';

import { Flame, Clock, Target, Sparkles, ArrowRight, Sun, Moon, Coffee, Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { FocusSession } from '@/types';

export function FocusMoment() {
  const supabase = createClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['focusSessions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('focus_sessions')
        .select('started_at, duration_minutes, completed')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('started_at', { ascending: false })
        .limit(60);
      
      return data as unknown as FocusSession[];
    },
  });

  if (isLoading || !sessions || sessions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-50/30 to-indigo-50/30 dark:from-purple-950/10 dark:to-indigo-950/10 border-purple-200 dark:border-purple-800/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
              焦点时刻
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            积累足够的专注数据后，系统将为您推荐最佳工作时段
          </p>
        </CardContent>
      </Card>
    );
  }

  const hourCounts: Record<number, number> = {};
  sessions.forEach(s => {
    const hour = new Date(s.started_at!).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const peakHours = sortedHours.slice(0, 3).map(h => Number(h[0]));
  const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length;

  const now = new Date();
  const currentHour = now.getHours();
  const isPeakTime = peakHours.some(h => Math.abs(h - currentHour) <= 1);

  const getTimeLabel = (hour: number) => {
    if (hour >= 5 && hour < 9) return { label: '早晨', icon: Sun, color: 'text-amber-500' };
    if (hour >= 9 && hour < 12) return { label: '上午', icon: Sun, color: 'text-orange-500' };
    if (hour >= 12 && hour < 14) return { label: '中午', icon: Coffee, color: 'text-amber-600' };
    if (hour >= 14 && hour < 18) return { label: '下午', icon: Brain, color: 'text-blue-500' };
    if (hour >= 18 && hour < 22) return { label: '晚上', icon: Moon, color: 'text-indigo-500' };
    return { label: '深夜', icon: Moon, color: 'text-purple-600' };
  };

  const peakTimeLabel = peakHours.map(h => getTimeLabel(h).label).join('、');
  const currentLabel = getTimeLabel(currentHour);

  return (
    <Card className={`bg-gradient-to-br ${isPeakTime ? 'from-purple-50/50 to-indigo-50/50' : 'from-slate-50/30 to-gray-50/30'} dark:${isPeakTime ? 'from-purple-950/20 to-indigo-950/20' : 'from-slate-950/10 to-gray-950/10'} border-${isPeakTime ? 'purple-200 dark:border-purple-800/50' : 'slate-200 dark:border-slate-800/50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className={`h-4 w-4 ${isPeakTime ? 'text-purple-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${isPeakTime ? 'text-purple-700 dark:text-purple-400' : 'text-muted-foreground'}`}>
              焦点时刻
            </span>
            {isPeakTime && (
              <Badge className="bg-purple-100 text-purple-600 hover:bg-purple-100 text-[10px] animate-pulse">
                当前高效
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            基于 {sessions.length} 次专注数据
          </span>
        </div>

        <div className="space-y-3">
          {isPeakTime ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Flame className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  现在是您的高效时段！
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  根据您的历史数据，{currentLabel.label}是您最专注的时间之一。建议立即开始一个高优先级任务。
                </p>
                <Button asChild size="sm" className="mt-2 h-7 bg-purple-500 hover:bg-purple-600">
                  <a href="/focus">
                    <Sparkles className="h-3 w-3 mr-1" />
                    开始专注
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">当前不是您的高效时段</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  您的黄金时间通常在 {peakTimeLabel}，建议安排需要深度思考的任务在这些时段。
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-muted/50">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">平均专注</span>
                <span className="font-medium">{Math.round(avgDuration)}分钟</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="text-muted-foreground">高峰时段</span>
                <span className="font-medium">
                  {peakHours.map(h => `${h}:00`).join(' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-1 h-10">
            {Array.from({ length: 24 }, (_, h) => {
              const count = hourCounts[h] || 0;
              const maxCount = Math.max(...Object.values(hourCounts));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const isPeak = peakHours.includes(h);
              const isCurrent = h === currentHour;
              
              return (
                <div
                  key={h}
                  className="flex-1 flex flex-col items-center"
                  title={`${h}:00 - ${count}次专注`}
                >
                  <div
                    className={`w-full rounded-t-sm transition-all ${
                      isCurrent ? 'bg-primary' :
                      isPeak ? 'bg-purple-400' :
                      count > 0 ? 'bg-purple-200 dark:bg-purple-800/50' :
                      'bg-muted'
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  {h % 4 === 0 && (
                    <span className="text-[8px] text-muted-foreground mt-1">{h}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}