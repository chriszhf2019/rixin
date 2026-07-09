'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, BellOff, CheckCircle2, AlertTriangle, TrendingUp, Gift, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  type: 'reminder' | 'blocker' | 'progress' | 'achievement';
  title: string;
  message: string;
  icon: 'bell' | 'alert' | 'progress' | 'gift';
  timestamp: string;
  read: boolean;
  data?: Record<string, unknown>;
}

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const notificationList: NotificationItem[] = [];

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*, task:tasks(id, title)')
      .eq('notified', false)
      .gte('remind_at', oneDayAgo);

    reminders?.forEach(r => {
      notificationList.push({
        id: `reminder-${r.id}`,
        type: 'reminder',
        title: '任务提醒',
        message: r.task?.title || '有任务需要处理',
        icon: 'bell',
        timestamp: r.remind_at,
        read: false,
        data: { taskId: r.task?.id },
      });
    });

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, blocker_reason, status, updated_at')
      .eq('user_id', user.id)
      .neq('blocker_reason', null)
      .in('status', ['todo', 'in_progress'])
      .gte('updated_at', oneDayAgo);

    tasks?.forEach(t => {
      const blockerLabels: Record<string, string> = {
        too_complex: '任务过于复杂',
        time_conflict: '时间冲突',
        procrastination: '拖延倾向',
      };
      notificationList.push({
        id: `blocker-${t.id}`,
        type: 'blocker',
        title: '任务卡点',
        message: `${t.title} - ${blockerLabels[t.blocker_reason || ''] || '遇到困难'}`,
        icon: 'alert',
        timestamp: t.updated_at,
        read: false,
        data: { taskId: t.id },
      });
    });

    const { data: completedToday } = await supabase
      .from('tasks')
      .select('id, title, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .gte('completed_at', now.toISOString().split('T')[0] + 'T00:00:00');

    if (completedToday?.length === 1) {
      notificationList.push({
        id: 'progress-first',
        type: 'progress',
        title: '进度更新',
        message: '今日首个任务完成！继续加油！',
        icon: 'progress',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    if (completedToday?.length === 5) {
      notificationList.push({
        id: 'achievement-5',
        type: 'achievement',
        title: '🎉 成就解锁',
        message: '完成5个任务！获得「高效达人」称号',
        icon: 'gift',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    if (completedToday?.length === 10) {
      notificationList.push({
        id: 'achievement-10',
        type: 'achievement',
        title: '🎉 成就解锁',
        message: '完成10个任务！获得「任务猎手」称号',
        icon: 'gift',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    return notificationList.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  useEffect(() => {
    if (showDropdown) {
      fetchNotifications().then(setNotifications);
    }
  }, [showDropdown, fetchNotifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('所有通知已标记为已读');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'bell':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'progress':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'gift':
        return <Gift className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'reminder':
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      case 'blocker':
        return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      case 'progress':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'achievement':
        return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-muted border-border';
    }
  };

  return (
    <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-sm font-medium">通知中心</h3>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllAsRead}>
            全部已读
          </Button>
        </div>

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无通知</p>
            <p className="text-xs mt-1">开启通知后，将在这里收到任务提醒</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-3 rounded-lg border transition-all cursor-pointer',
                  getTypeStyles(notification.type),
                  notification.read ? 'opacity-60' : 'opacity-100'
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {getIcon(notification.icon)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notification.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border my-2" />
        <div className="text-xs text-muted-foreground text-center py-2">日新通知服务</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
