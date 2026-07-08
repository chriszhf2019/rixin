'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, UserCheck } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function TeamBrief() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBrief = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [activitiesRes, tasksRes] = await Promise.all([
        supabase.from('team_activities').select('title, status, date'),
        supabase.from('tasks').select('title, status, user_id, created_at'),
      ]);

      const activities = activitiesRes.data || [];
      const tasks = tasksRes.data || [];

      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const totalTasks = tasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const inProgressActivities = activities.filter(a => a.status === 'planning').length;
      const today = new Date().toISOString().split('T')[0];
      const upcomingActivities = activities.filter(a => a.date?.startsWith(today)).length;

      const context = `
团队活动总数: ${activities.length}
进行中活动: ${inProgressActivities}
今日活动: ${upcomingActivities}
总任务数: ${totalTasks}
已完成任务: ${completedTasks}
完成率: ${progress}%
      `;

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `请根据以下团队数据生成一份简短的团队日报摘要：\n${context}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBrief(data.reply);
      }
    } catch (err) {
      console.error('Failed to fetch brief:', err);
      toast.error('获取团队简报失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            团队今日简报
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchBrief} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="py-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : brief ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>{brief}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无团队简报</p>
        )}
      </CardContent>
    </Card>
  );
}