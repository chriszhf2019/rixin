'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Coffee, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types';

const FOCUS_TIME = 25;
const BREAK_TIME = 5;

export function PomodoroTimer() {
  const supabase = createClient();
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME * 60);
  const [running, setRunning] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [todayFocus, setTodayFocus] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Fetch today's tasks and focus stats
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', user.id)
        .in('status', ['todo', 'in_progress'])
        .order('priority', { ascending: false })
        .limit(10);

      if (taskData) setTasks(taskData as Task[]);

      // Today's focus minutes
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('type', 'focus')
        .eq('completed', true)
        .gte('started_at', todayStart.toISOString());

      if (sessions) {
        setTodayFocus(sessions.reduce((s, x) => s + x.duration_minutes, 0));
      }
    };
    init();
  }, []);

  const totalSeconds = mode === 'focus' ? FOCUS_TIME * 60 : BREAK_TIME * 60;
  const progress = 1 - timeLeft / totalSeconds;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const endSession = useCallback(async (completed: boolean) => {
    if (!sessionId) return;
    await fetch('/api/focus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        ended_at: new Date().toISOString(),
        completed,
      }),
    });
    if (completed && mode === 'focus') {
      setTodayFocus(p => p + FOCUS_TIME);
    }
    setSessionId(null);
  }, [sessionId, mode]);

  const startTimer = async () => {
    // Create session
    const res = await fetch('/api/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: selectedTaskId || null,
        duration_minutes: mode === 'focus' ? FOCUS_TIME : BREAK_TIME,
        type: mode,
        started_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) { toast.error('启动失败'); return; }
    const session = await res.json();
    setSessionId(session.id);
    startTimeRef.current = new Date();
    setRunning(true);
  };

  const pauseTimer = () => {
    clearTimer();
    setRunning(false);
  };

  const resumeTimer = () => {
    setRunning(true);
  };

  // Timer tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          // Session completed
          setSessionId(null);
          if (mode === 'focus') {
            setTodayFocus(p => p + FOCUS_TIME);
            toast.success('专注时间到！休息一下吧');
            setMode('break');
            setTimeLeft(BREAK_TIME * 60);
          } else {
            toast.success('休息结束，开始新的专注');
            setMode('focus');
            setTimeLeft(FOCUS_TIME * 60);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, mode]);

  const skipBreak = () => {
    clearTimer();
    setRunning(false);
    setMode('focus');
    setTimeLeft(FOCUS_TIME * 60);
  };

  const resetTimer = () => {
    clearTimer();
    setRunning(false);
    if (sessionId) endSession(false);
    setTimeLeft(mode === 'focus' ? FOCUS_TIME * 60 : BREAK_TIME * 60);
  };

  const circumference = 2 * Math.PI * 54;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Progress Ring */}
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                className="text-muted opacity-20" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
                className={cn('transition-all duration-500', mode === 'focus' ? 'text-primary' : 'text-green-500')} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {mode === 'focus' ? '专注中' : '休息中'}
              </span>
            </div>
          </div>

          {/* Task selector */}
          {!running && mode === 'focus' && (
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full max-w-xs text-sm border rounded-md px-3 py-1.5 bg-background"
            >
              <option value="">无关联任务（自由专注）</option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!running ? (
              <Button size="lg" className="h-12 w-12 rounded-full" onClick={startTimer}>
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={pauseTimer}>
                  <Pause className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={resetTimer}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Mode toggle (only when idle) */}
          {!running && (
            <div className="flex gap-2">
              <Button
                variant={mode === 'focus' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('focus'); setTimeLeft(FOCUS_TIME * 60); }}
              >
                <Brain className="h-3 w-3 mr-1" /> 专注 {FOCUS_TIME}分
              </Button>
              <Button
                variant={mode === 'break' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('break'); setTimeLeft(BREAK_TIME * 60); }}
              >
                <Coffee className="h-3 w-3 mr-1" /> 休息 {BREAK_TIME}分
              </Button>
            </div>
          )}

          {/* Running mode indicator */}
          {running && mode === 'break' && (
            <Button variant="ghost" size="sm" onClick={skipBreak}>
              跳过休息
            </Button>
          )}

          {/* Today's focus time */}
          <div className="text-xs text-muted-foreground">
            今日专注: <span className="font-medium text-foreground">{todayFocus}</span> 分钟
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
