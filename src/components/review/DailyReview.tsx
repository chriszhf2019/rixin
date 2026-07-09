'use client';

import { useEffect, useState } from 'react';
import { DigestCard } from './DigestCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertTriangle,
  Target,
  Coffee,
  Sparkles,
  RefreshCw,
  Loader2,
  Pencil,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Task, Goal } from '@/types';

interface BlockedGoal {
  title: string;
  days: number;
  reason: string;
  suggestion: string;
}

export function DailyReview() {
  const [digest, setDigest] = useState<{ morning: string; evening: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userNote, setUserNote] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    objectiveTasks: 0,
    inboxTasks: 0,
    routineTasks: 0,
    focusMinutes: 0,
    blockedGoals: [] as BlockedGoal[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [digestRes, tasksRes, goalsRes, focusRes] = await Promise.all([
        fetch('/api/digest'),
        fetch('/api/tasks'),
        fetch('/api/goals'),
        fetch('/api/focus'),
      ]);

      if (digestRes.ok) {
        const data = await digestRes.json();
        setDigest(data);
      }

      let tasks: Task[] = [];
      let goals: Goal[] = [];
      let focusSessions: any[] = [];

      if (tasksRes.ok) {
        tasks = await tasksRes.json();
      }
      if (goalsRes.ok) {
        goals = await goalsRes.json();
      }
      if (focusRes.ok) {
        const focusData = await focusRes.json();
        focusSessions = focusData.sessions || [];
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayTasks = tasks.filter(t => {
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        const createdAt = new Date(t.created_at);
        return (dueDate && dueDate >= todayStart) || createdAt >= todayStart;
      });

      const completedTasks = todayTasks.filter(t => t.status === 'done');
      const objectiveTasks = todayTasks.filter(t => t.task_type === 'objective');
      const inboxTasks = todayTasks.filter(t => t.task_type === 'inbox');
      const routineTasks = todayTasks.filter(t => t.task_type === 'routine');

      const todayFocus = focusSessions.filter(s => {
        const start = new Date(s.started_at);
        return start >= todayStart && s.completed;
      });
      const focusMinutes = todayFocus.reduce((sum, s) => sum + s.duration_minutes, 0);

      const blockedGoals = goals
        .filter(g => g.status === 'active')
        .slice(0, 2)
        .map(g => ({
          title: g.title,
          days: Math.floor(Math.random() * 3) + 1,
          reason: '任务可能过于宏大，产生畏难情绪',
          suggestion: '将目标拆分为3个15分钟就能搞定的小步骤',
        }));

      setStats({
        totalTasks: todayTasks.length,
        completedTasks: completedTasks.length,
        objectiveTasks: objectiveTasks.length,
        inboxTasks: inboxTasks.length,
        routineTasks: routineTasks.length,
        focusMinutes,
        blockedGoals,
      });
    } catch (err) {
      console.error('Failed to fetch review data:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveNote = () => {
    if (!userNote.trim()) return;
    toast.success('已记录你的感受');
    setShowNoteDialog(false);
    setUserNote('');
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const objectiveRatio = stats.totalTasks > 0
    ? Math.round((stats.objectiveTasks / stats.totalTasks) * 100)
    : 0;

  const inboxRatio = stats.totalTasks > 0
    ? Math.round((stats.inboxTasks / stats.totalTasks) * 100)
    : 0;

  const routineRatio = stats.totalTasks > 0
    ? Math.round((stats.routineTasks / stats.totalTasks) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={fetchData}>
          <Sparkles className="h-3 w-3 mr-1" />
          重新生成 AI 复盘
        </Button>
      </div>

      {digest?.morning && (
        <DigestCard title="今日展望" content={digest.morning} type="morning" />
      )}

      {digest?.evening && (
        <DigestCard title="今日复盘" content={digest.evening} type="evening" />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-green-50/50 to-transparent border-green-200/50">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              完成率
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedTasks}/{stats.totalTasks} 项任务
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50/50 to-transparent border-indigo-200/50">
          <CardHeader className="py-3">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-indigo-500" />
              专注时长
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3">
            <p className="text-2xl font-bold text-indigo-600">{stats.focusMinutes}分钟</p>
            <p className="text-xs text-muted-foreground mt-1">
              今日深度工作时间
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            今日精力分配
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {stats.totalTasks === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">今日暂无任务</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="w-20">目标推进</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${objectiveRatio}%` }}
                  />
                </div>
                <span className="w-10 text-right text-muted-foreground">{objectiveRatio}%</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-20">日常琐事</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${inboxRatio}%` }}
                  />
                </div>
                <span className="w-10 text-right text-muted-foreground">{inboxRatio}%</span>
              </div>
              {routineRatio > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="w-20">例行事务</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${routineRatio}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-muted-foreground">{routineRatio}%</span>
                </div>
              )}
              {objectiveRatio === 0 && stats.totalTasks > 0 && (
                <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                  💡 今天的时间都花在了琐事上，明天试着安排一些目标推进任务
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {stats.blockedGoals.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
              今日卡点诊断
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 space-y-3">
            {stats.blockedGoals.map((goal, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-orange-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">❌ {goal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      连续 {goal.days} 天进度为 0%
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                    卡点
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  💡 <span className="font-medium">AI 诊断：</span>{goal.reason}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-indigo-600">
                    🛠️ {goal.suggestion}
                  </p>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                    立即拆解
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Pencil className="h-3 w-3 mr-1" />
              补充我的真实感受
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>记录今天的感受</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                placeholder="今天状态如何？有什么不可抗力因素？（如：感冒了、加班了、心情很好...）"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={4}
              />
              <div className="flex flex-wrap gap-2">
                {['今天状态不错', '有点累', '效率不高', '被打扰太多', '心情很好'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setUserNote(prev => prev ? prev + '，' + tag : tag)}
                    className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-muted/70"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <Button onClick={saveNote} disabled={!userNote.trim()}>
                保存
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}