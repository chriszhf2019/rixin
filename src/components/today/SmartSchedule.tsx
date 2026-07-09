'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Clock, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ScheduleItem {
  taskId: string;
  taskTitle: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface SmartScheduleProps {
  onTaskComplete?: (taskId: string) => void;
}

export function SmartSchedule({ onTaskComplete }: SmartScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        setSchedule(data.schedule || []);
        setSuggestion(data.suggestion || '');
        setHasGenerated(true);
        toast.success('智能排期已生成');
      } else {
        toast.error('生成排期失败');
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      toast.error('生成排期失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return schedule.find(item => 
      currentTime >= item.startTime && currentTime < item.endTime
    );
  };

  const currentTask = getCurrentTimeSlot();

  return (
    <Card className="bg-gradient-to-br from-amber-50/30 to-orange-50/30 border-amber-200/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">智能排期</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={generateSchedule}
            disabled={loading}
            className="gap-1 h-8 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                {hasGenerated ? '重新生成' : '生成排期'}
              </>
            )}
          </Button>
        </div>
        <CardDescription className="text-xs">
          AI 根据你的效率高峰和任务优先级自动安排今日日程
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasGenerated ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">点击上方按钮生成今日智能排期</p>
            <p className="text-xs mt-1">AI 将根据你的效率高峰时段进行优化</p>
          </div>
        ) : schedule.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="text-sm">今日任务已全部完成！</p>
          </div>
        ) : (
          <>
            {currentTask && (
              <div className="bg-amber-100/50 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">当前应做</span>
                </div>
                <p className="font-medium text-sm">{currentTask.taskTitle}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-amber-600">
                  <Clock className="h-3 w-3" />
                  {currentTask.startTime} - {currentTask.endTime}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {schedule.map((item, index) => {
                const isPast = new Date(`2000-01-01T${item.endTime}`) < new Date(`2000-01-01T${new Date().toTimeString().slice(0, 5)}`);
                const isCurrent = item.taskId === currentTask?.taskId;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg transition-all',
                      isCurrent 
                        ? 'bg-amber-50/50' 
                        : isPast 
                          ? 'opacity-50 bg-muted/30' 
                          : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="text-xs font-medium w-16 text-right">
                      {item.startTime}
                    </div>
                    <div className="w-px h-6 bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        isPast && 'line-through text-muted-foreground'
                      )}>
                        {item.taskTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {item.endTime}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {suggestion && (
              <div className="mt-3 p-2 bg-background/50 rounded-md border border-muted">
                <p className="text-xs text-muted-foreground">{suggestion}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
