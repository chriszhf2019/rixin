'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Target, Flame, Calendar, Zap, Award, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { EfficiencyProfile } from '@/types';

export function EfficiencyDashboard() {
  const [profile, setProfile] = useState<EfficiencyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/efficiency-profile');
      const data = await res.json();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch efficiency profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <EfficiencyDashboardSkeleton />;
  }

  if (!profile) return null;

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPeakHoursLabel = (hours: number[]) => {
    if (hours.length === 0) return '暂无数据';
    const sorted = [...hours].sort((a, b) => a - b);
    return sorted.map(h => `${h}:00`).join('、');
  };

  const getCompletionGrade = (rate: number) => {
    if (rate >= 0.9) return { label: 'S', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    if (rate >= 0.75) return { label: 'A', color: 'text-green-500', bg: 'bg-green-500' };
    if (rate >= 0.6) return { label: 'B', color: 'text-blue-500', bg: 'bg-blue-500' };
    if (rate >= 0.4) return { label: 'C', color: 'text-orange-500', bg: 'bg-orange-500' };
    return { label: 'D', color: 'text-gray-500', bg: 'bg-gray-500' };
  };

  const grade = getCompletionGrade(profile.completionRate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          效率画像
        </h2>
        <span className="text-xs text-muted-foreground">近30天数据</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-muted-foreground">完成率</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${grade.color}`}>{grade.label}</span>
              <span className="text-lg font-semibold">{Math.round(profile.completionRate * 100)}%</span>
            </div>
            <Progress value={profile.completionRate * 100} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">连续天数</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-500">{profile.streak}</span>
              <span className="text-sm text-muted-foreground">天</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">最长 {profile.longestStreak} 天</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">专注时长</span>
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatHours(profile.totalFocusMinutes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              平均每次 {Math.round(profile.averageFocusMinutes)} 分钟
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">完成任务</span>
            </div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {profile.completedTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {profile.totalTasks} 个任务
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            效率高峰
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">黄金时段</p>
              <p className="text-sm font-medium">{getPeakHoursLabel(profile.peakHours)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">最高效日</p>
              <p className="text-sm font-medium">{profile.mostProductiveDay}</p>
            </div>
            <div className="h-24 flex items-end justify-between gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
                const isPeak = profile.peakHours.includes(hour);
                const height = isPeak ? 60 + Math.random() * 30 : 20 + Math.random() * 20;
                return (
                  <div
                    key={hour}
                    className={`flex-1 rounded-t transition-all ${
                      isPeak
                        ? 'bg-gradient-to-t from-primary to-primary/60'
                        : 'bg-muted'
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${hour}:00`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>8:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EfficiencyDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-0 bg-muted/30">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-full mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-0">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
