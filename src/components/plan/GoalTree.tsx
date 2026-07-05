'use client';

import { useEffect, useState } from 'react';
import { GoalCard } from './GoalCard';
import { createClient } from '@/lib/supabase/client';
import type { Goal, MonthlyPlan, WeeklyPlan, Task } from '@/types';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type GoalWithPlans = Goal & {
  monthly_plans: (MonthlyPlan & {
    weekly_plans: (WeeklyPlan & { tasks: Task[] })[];
  })[];
};

export function GoalTree() {
  const supabase = createClient();
  const [goals, setGoals] = useState<GoalWithPlans[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('goals')
      .select(
        `
          *,
          monthly_plans(
            *,
            weekly_plans(
              *,
              tasks(*)
            )
          )
        `
      )
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .order('sort_order');

    if (error) {
      console.error('Failed to fetch goals:', error.message);
    } else if (data) {
      setGoals(data as unknown as GoalWithPlans[]);
    }
    setLoading(false);
  };

  const createGoal = async () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newGoalTitle,
        description: newGoalDesc || null,
        quarter,
        year: now.getFullYear(),
      }),
    });

    if (res.ok) {
      toast.success('目标已创建');
      setNewGoalTitle('');
      setNewGoalDesc('');
      fetchGoals();
    } else {
      toast.error('创建失败');
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          我的目标 ({goals.length})
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> 新建目标
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建季度目标</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="目标标题"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
              <Input
                placeholder="目标描述（可选）"
                value={newGoalDesc}
                onChange={(e) => setNewGoalDesc(e.target.value)}
              />
              <Button onClick={createGoal} disabled={!newGoalTitle.trim()}>
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>还没有季度目标</p>
          <p className="text-sm mt-1">创建你的第一个目标，开始规划</p>
        </div>
      ) : (
        goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
      )}
    </div>
  );
}
