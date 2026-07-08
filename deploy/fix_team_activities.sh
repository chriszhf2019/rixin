#!/bin/bash
set -e

cd /var/www/rixin

echo "=== Updating env: adding SUPABASE_SERVICE_ROLE_KEY ==="
# Check if already exists
if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local 2>/dev/null; then
  echo "SUPABASE_SERVICE_ROLE_KEY already exists"
else
  echo "SUPABASE_SERVICE_ROLE_KEY=$1" >> .env.local
  echo "Added SUPABASE_SERVICE_ROLE_KEY"
fi

echo "=== Updating files ==="

# 1. Service role supabase client
mkdir -p src/lib/supabase

cat > src/lib/supabase/service.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

export function createServiceRoleSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
EOF

# 2. Activities API route
mkdir -p src/app/api/activities

cat > src/app/api/activities/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/service';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceSupabase = createServiceRoleSupabaseClient();

  const { data: activityIds, error: idsError } = await serviceSupabase
    .from('team_activities')
    .select('id')
    .or(`organizer_id.eq.${user.id},activity_members.user_id.eq.${user.id}`)
    .order('date', { ascending: false });

  if (idsError) return NextResponse.json({ error: idsError.message }, { status: 500 });

  if (!activityIds?.length) return NextResponse.json([]);

  const ids = activityIds.map(a => a.id);

  const { data, error } = await serviceSupabase
    .from('team_activities')
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url), members:activity_members(*, user:profiles(id, name, avatar_url))')
    .in('id', ids)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { members, ...activityData } = body;

  const serviceSupabase = createServiceRoleSupabaseClient();

  const { data: activity, error: actError } = await serviceSupabase
    .from('team_activities')
    .insert({ ...activityData, organizer_id: user.id })
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url)')
    .single();

  if (actError) return NextResponse.json({ error: actError.message }, { status: 500 });

  const allMembers = [
    { user_id: user.id, role: 'organizer' },
    ...(members?.filter((m: { user_id: string }) => m.user_id !== user.id) || []),
  ];

  if (activity) {
    const memberInserts = allMembers.map((m: { user_id: string; role?: string }) => ({
      activity_id: activity.id,
      user_id: m.user_id,
      role: m.role || 'member',
    }));
    await serviceSupabase.from('activity_members').insert(memberInserts);
  }

  const { data: activityWithMembers, error: fetchError } = await serviceSupabase
    .from('team_activities')
    .select('*, organizer:profiles!organizer_id(id, name, avatar_url), members:activity_members(*, user:profiles(id, name, avatar_url))')
    .eq('id', activity.id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  return NextResponse.json(activityWithMembers, { status: 201 });
}
EOF

# 3. ActivityBoard component (use API instead of direct Supabase)
mkdir -p src/components/team

cat > src/components/team/ActivityBoard.tsx << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { ActivityCard } from './ActivityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { TeamActivity } from '@/types';

export function ActivityBoard() {
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '' });

  const fetchActivities = async () => {
    const res = await fetch('/api/activities');
    if (res.ok) {
      const data = await res.json();
      setActivities(data);
    }
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
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || '创建失败');
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
EOF

echo "=== Build ==="
npm run build 2>&1 | tail -20

echo "=== Restart PM2 ==="
pm2 restart rixin --update-env

echo "=== Wait for server ==="
sleep 8

echo "=== DONE ==="
