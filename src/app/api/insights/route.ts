import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function getInsights(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, task_type, created_at, completed_at, weekly_plan_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  const { data: goals } = await supabase
    .from('goals')
    .select('id, title, description, status, target_date, created_at')
    .eq('user_id', userId);

  const { data: focusSessions } = await supabase
    .from('focus_sessions')
    .select('started_at, duration_minutes, completed, task_id')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(60);

  const { data: weeklyPlans } = await supabase
    .from('weekly_plans')
    .select('id, title, goal_id, status')
    .eq('user_id', userId);

  const now = new Date();
  const currentHour = now.getHours();
  const todayStr = now.toISOString().split('T')[0];

  const todoTasks = tasks?.filter(t => t.status === 'todo') || [];
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || [];
  const doneTasks = tasks?.filter(t => t.status === 'done') || [];
  const overdueTasks = todoTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
  const highPriorityTasks = todoTasks.filter(t => t.priority === 'high' || t.priority === 'urgent');
  const longPendingTasks = todoTasks.filter(t => {
    const created = new Date(t.created_at);
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  });

  const objectiveTasks = tasks?.filter(t => t.task_type === 'objective') || [];
  const inboxTasks = tasks?.filter(t => t.task_type === 'inbox') || [];
  const routineTasks = tasks?.filter(t => t.task_type === 'routine') || [];

  const todayTasks = tasks?.filter(t => t.due_date?.startsWith(todayStr)) || [];
  const todayCompleted = todayTasks.filter(t => t.status === 'done').length;
  const todayTotal = todayTasks.length;
  const todayCompletionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const completedThisWeek = tasks?.filter(t => {
    if (!t.completed_at) return false;
    const completed = new Date(t.completed_at);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return completed >= startOfWeek;
  }).length || 0;

  const totalFocusTime = focusSessions?.filter(s => s.completed)
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;

  const todayFocusSessions = focusSessions?.filter(s => s.started_at?.startsWith(todayStr) && s.completed) || [];
  const todayFocusMinutes = todayFocusSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const activeGoals = goals?.filter(g => g.status !== 'done' && g.status !== 'cancelled') || [];
  const completedGoalCount = goals?.filter(g => g.status === 'done').length || 0;
  const totalGoalCount = goals?.length || 0;

  const goalTasks = tasks?.filter(t => t.task_type === 'objective') || [];
  const completedGoalTasks = goalTasks.filter(t => t.status === 'done').length;
  const goalProgress = goalTasks.length > 0 ? Math.round((completedGoalTasks / goalTasks.length) * 100) : 0;

  const insights: Array<{
    type: 'warning' | 'suggestion' | 'opportunity' | 'alert' | 'focus';
    title: string;
    description: string;
    action?: string;
    relatedTasks?: string[];
    priority?: 'high' | 'medium' | 'low';
  }> = [];

  if (overdueTasks.length > 0) {
    insights.push({
      type: 'alert',
      title: '有任务已过期',
      description: `${overdueTasks.length}个任务已超过截止日期，建议优先处理`,
      action: '查看过期任务',
      relatedTasks: overdueTasks.map(t => t.id),
      priority: 'high',
    });
  }

  if (longPendingTasks.length > 0) {
    insights.push({
      type: 'warning',
      title: '任务拖延预警',
      description: `${longPendingTasks.length}个任务已搁置超过3天，可能存在卡点`,
      action: '诊断卡点',
      relatedTasks: longPendingTasks.map(t => t.id),
      priority: 'high',
    });
  }

  const trivialRatio = inboxTasks.length + routineTasks.length;
  if (trivialRatio > objectiveTasks.length * 2 && objectiveTasks.length > 0) {
    insights.push({
      type: 'warning',
      title: '琐事过多，目标被淹没',
      description: `当前有${trivialRatio}个琐事任务，但只有${objectiveTasks.length}个目标任务。建议优先处理目标相关任务，避免琐事占据太多注意力`,
      action: '查看目标任务',
      priority: 'high',
    });
  }

  if (inboxTasks.length > 3) {
    const inboxOverdue = inboxTasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()).length;
    insights.push({
      type: 'suggestion',
      title: '收件箱堆积',
      description: `${inboxTasks.length}个任务在收件箱中等待处理${inboxOverdue > 0 ? `，其中${inboxOverdue}个已过期` : ''}。建议快速归类或批量处理`,
      action: '整理收件箱',
      priority: 'medium',
    });
  }

  if (highPriorityTasks.length > 3) {
    insights.push({
      type: 'suggestion',
      title: '高优先级任务过多',
      description: `当前有${highPriorityTasks.length}个高优先级任务，建议重新评估优先级或拆分`,
      action: '重新排优先级',
      relatedTasks: highPriorityTasks.map(t => t.id),
      priority: 'medium',
    });
  }

  if (activeGoals.length > 0 && goalTasks.length === 0) {
    insights.push({
      type: 'warning',
      title: '目标缺少行动支撑',
      description: `您有${activeGoals.length}个活跃目标，但没有关联的行动任务。没有行动，目标只是愿望`,
      action: '创建行动任务',
      priority: 'high',
    });
  } else if (activeGoals.length > 0 && goalProgress < 30 && goalTasks.length > 0) {
    insights.push({
      type: 'warning',
      title: '目标推进缓慢',
      description: `目标相关任务完成率仅${goalProgress}%，建议增加行动频率或调整计划`,
      action: '查看目标任务',
      priority: 'medium',
    });
  }

  if (totalGoalCount > 0 && completedGoalCount === 0 && goals) {
    const oldestGoal = goals.reduce((oldest, g) => {
      const oldestDate = new Date(oldest.created_at);
      const currentDate = new Date(g.created_at);
      return currentDate < oldestDate ? g : oldest;
    });
    insights.push({
      type: 'warning',
      title: '目标进度停滞',
      description: `自${oldestGoal.title}创建以来，尚未完成任何目标`,
      action: '查看目标',
      priority: 'medium',
    });
  }

  if (todayCompletionRate > 80 && todayFocusMinutes < 30) {
    insights.push({
      type: 'opportunity',
      title: '效率突破时刻',
      description: `今日任务完成率${todayCompletionRate}%，但专注时间较短。现在正是投入深度工作的好时机`,
      action: '开始专注',
      priority: 'medium',
    });
  } else if (todayCompletionRate < 30 && todayFocusMinutes > 60) {
    insights.push({
      type: 'warning',
      title: '专注与产出失衡',
      description: `已专注${Math.floor(todayFocusMinutes / 60)}小时，但任务完成率仅${todayCompletionRate}%。可能需要调整专注方式或任务优先级`,
      action: '查看效率建议',
      priority: 'medium',
    });
  }

  const focusHours: number[] = [];
  focusSessions?.filter(s => s.completed).forEach(s => {
    const hour = new Date(s.started_at!).getHours();
    focusHours.push(hour);
  });
  const hourCounts: Record<number, number> = {};
  focusHours.forEach(h => {
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (peakHour && Math.abs(Number(peakHour) - currentHour) <= 1 && inProgressTasks.length === 0) {
    insights.push({
      type: 'focus',
      title: '黄金专注时段',
      description: `现在是您的高效时段（${peakHour}:00左右），但当前没有进行中的任务。建议立即开始一个高优先级任务`,
      action: '开始工作',
      priority: 'high',
    });
  } else if (currentHour >= 9 && currentHour <= 12 && objectiveTasks.filter(t => t.status === 'todo').length > 0) {
    insights.push({
      type: 'focus',
      title: '上午黄金时间',
      description: '上午是处理复杂任务的最佳时段，建议优先处理目标相关任务，避免被琐事占据',
      action: '查看目标任务',
      priority: 'medium',
    });
  }

  const routineTasksWithoutDueDate = routineTasks.filter(t => !t.due_date && t.status === 'todo').length;
  if (routineTasksWithoutDueDate > 2) {
    insights.push({
      type: 'suggestion',
      title: '习惯任务未安排',
      description: `${routineTasksWithoutDueDate}个日常习惯任务尚未设置截止日期，建议定期安排以养成习惯`,
      action: '设置提醒',
      priority: 'low',
    });
  }

  const completedTodayCount = doneTasks.filter(t => t.completed_at?.startsWith(todayStr)).length;
  if (completedTodayCount === 0 && currentHour >= 10) {
    insights.push({
      type: 'warning',
      title: '今日尚未完成任何任务',
      description: '时间已过上午，建议立即开始第一个任务，开启高效的一天',
      action: '开始第一个任务',
      priority: 'high',
    });
  }

  if (inProgressTasks.length > 2) {
    insights.push({
      type: 'suggestion',
      title: '进行中任务过多',
      description: `当前有${inProgressTasks.length}个任务同时进行，建议专注完成一个后再开始下一个`,
      action: '聚焦任务',
      priority: 'medium',
    });
  }

  const goalWithoutPlan = activeGoals.filter(g => {
    const hasPlan = weeklyPlans?.some(p => 
      p.goal_id === g.id && p.status === 'active'
    );
    return !hasPlan;
  });
  if (goalWithoutPlan.length > 0) {
    insights.push({
      type: 'warning',
      title: '目标缺少周计划',
      description: `${goalWithoutPlan.length}个目标没有对应的周计划，建议分解为可执行的周任务`,
      action: '创建周计划',
      priority: 'medium',
    });
  }

  if (totalFocusTime < 60 && completedThisWeek < 3 && now.getDay() > 1) {
    insights.push({
      type: 'opportunity',
      title: '效率提升空间',
      description: '本周专注时间和完成任务数偏低，建议调整工作节奏，找到适合自己的高效时段',
      action: '查看效率建议',
      priority: 'low',
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'opportunity',
      title: '状态良好',
      description: '当前任务管理健康，继续保持！',
      priority: 'low',
    });
  }

  insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const typeOrder = { alert: 0, warning: 1, focus: 2, suggestion: 3, opportunity: 4 };
    const aPriority = priorityOrder[a.priority || 'medium'];
    const bPriority = priorityOrder[b.priority || 'medium'];
    if (aPriority !== bPriority) return aPriority - bPriority;
    return typeOrder[a.type] - typeOrder[b.type];
  });

  return { 
    insights: insights.slice(0, 8),
    summary: {
      todayCompletionRate,
      todayFocusMinutes,
      activeGoalCount: activeGoals.length,
      objectiveTaskCount: objectiveTasks.filter(t => t.status !== 'done').length,
      trivialTaskCount: inboxTasks.filter(t => t.status !== 'done').length + routineTasks.filter(t => t.status !== 'done').length,
    }
  };
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const result = await getInsights(user.id);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const result = await getInsights(user.id);
  return NextResponse.json(result);
}
