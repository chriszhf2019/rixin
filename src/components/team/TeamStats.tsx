'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export function TeamStats() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeActivities: 0,
    completedTasks: 0,
    totalTasks: 0,
    blockerCount: 0,
    efficiencyTrend: [65, 72, 68, 75, 80, 78, 82],
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [activitiesRes, tasksRes, membersRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/tasks'),
        fetch('/api/profiles'),
      ]);

      if (activitiesRes.ok) {
        const activities = await activitiesRes.json();
        setStats(prev => ({ ...prev, activeActivities: activities.filter((a: any) => a.status === 'planning').length }));
      }

      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        setStats(prev => ({ 
          ...prev, 
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t: any) => t.status === 'done').length,
          blockerCount: tasks.filter((t: any) => t.blocker_reason).length,
        }));
      }

      if (membersRes.ok) {
        const members = await membersRes.json();
        setStats(prev => ({ ...prev, totalMembers: members.length }));
      }
    };

    fetchStats();
  }, []);

  const progress = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const trendChange = stats.efficiencyTrend[stats.efficiencyTrend.length - 1] - stats.efficiencyTrend[stats.efficiencyTrend.length - 2];

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          团队效率概览
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">团队成员</span>
            </div>
            <p className="text-xl font-bold">{stats.totalMembers}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">进行中活动</span>
            </div>
            <p className="text-xl font-bold">{stats.activeActivities}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">任务完成率</span>
            </div>
            <p className="text-xl font-bold">{progress}%</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">卡点数量</span>
            </div>
            <p className={`text-xl font-bold ${stats.blockerCount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {stats.blockerCount}
            </p>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">近7日效率趋势</span>
            <Badge variant="secondary" className="text-[10px]">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trendChange > 0 ? `+${trendChange}%` : `${trendChange}%`}
            </Badge>
          </div>
          <div className="flex items-end gap-1 h-16">
            {stats.efficiencyTrend.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t transition-all"
                style={{
                  height: `${value}%`,
                  backgroundColor: value >= 75 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#ef4444',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {['一', '二', '三', '四', '五', '六', '日'].map((day, index) => (
              <span key={index} className="text-[8px] text-muted-foreground">{day}</span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}