'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ActivityCard } from './ActivityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { TeamActivity } from '@/types';

export function ActivityBoard() {
  const supabase = createClient();
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '' });

  const fetchActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('team_activities')
      .select('*, organizer:profiles!organizer_id(id, name, avatar_url), members:activity_members(*, user:profiles(id, name, avatar_url))')
      .or(`organizer_id.eq.${user.id},members.user_id.eq.${user.id}`)
      .order('date', { ascending: false });

    if (data) setActivities(data as unknown as TeamActivity[]);
    setLoading(false);
  };

  useEffect(() => { fetchActivities(); }, []);

  const createActivity = async () => {
    if (!form.title.trim()) return;
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        date: form.date ? new Date(form.date).toISOString() : null,
        location: form.location || null,
      }),
    });
    if (res.ok) {
      toast.success('活动已创建');
      setForm({ title: '', description: '', date: '', location: '' });
      setOpen(false);
      fetchActivities();
    } else {
      toast.error('创建失败');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">团队活动 ({activities.length})</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> 新建活动</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>新建团队活动</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="活动标题" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="活动描述（可选）" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Input type="datetime-local" placeholder="时间" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <Input placeholder="地点（可选）" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <Button onClick={createActivity} disabled={!form.title.trim()}>创建</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>暂无团队活动</p>
          <p className="text-sm mt-1">创建第一个团队活动吧</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {activities.map(a => (
            <ActivityCard key={a.id} activity={a} onUpdate={fetchActivities} />
          ))}
        </div>
      )}
    </div>
  );
}
