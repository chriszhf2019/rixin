'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Bell, BellOff, Clock, Trash2 } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { Reminder } from '@/types';

interface TaskRemindersProps {
  taskId: string;
}

export function TaskReminders({ taskId }: TaskRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState('');

  const fetchReminders = async () => {
    const res = await fetch(`/api/reminders?task_id=${taskId}`);
    if (res.ok) setReminders(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchReminders(); }, [taskId]);

  const addReminder = async () => {
    if (!newDate) return;
    setAdding(true);
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, remind_at: new Date(newDate).toISOString() }),
    });
    if (res.ok) {
      toast.success('提醒已设置');
      setNewDate('');
      fetchReminders();
    } else {
      toast.error('设置失败');
    }
    setAdding(false);
  };

  const deleteReminder = async (id: string) => {
    const res = await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('提醒已删除');
      fetchReminders();
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Bell className="h-4 w-4" />
        提醒 ({reminders.length})
      </h4>

      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="flex-1 text-sm"
        />
        <Button size="sm" onClick={addReminder} disabled={adding || !newDate}>
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : reminders.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无提醒</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{formatDate(r.remind_at)} {formatTime(r.remind_at)}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteReminder(r.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
