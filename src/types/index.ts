export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  quarter: number;
  year: number;
  status: 'active' | 'completed' | 'cancelled';
  sort_order: number;
  created_at: string;
  updated_at: string;
  monthly_plans?: MonthlyPlan[];
}

export interface MonthlyPlan {
  id: string;
  goal_id: string;
  title: string;
  month: number;
  year: number;
  status: 'active' | 'completed' | 'cancelled';
  sort_order: number;
  created_at: string;
  updated_at: string;
  weekly_plans?: WeeklyPlan[];
}

export interface WeeklyPlan {
  id: string;
  monthly_plan_id: string;
  title: string;
  week_number: number;
  year: number;
  status: 'active' | 'completed' | 'cancelled';
  sort_order: number;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  user_id: string;
  weekly_plan_id: string | null;
  activity_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  task_type: 'objective' | 'inbox' | 'routine';
  blocker_reason: 'too_complex' | 'time_conflict' | 'procrastination' | null;
  assignee_id: string | null;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
  tags?: Tag[];
  comments?: Comment[];
  reminders?: Reminder[];
  assignee?: Profile;
  goal_title?: string;
  monthly_plan_title?: string;
  weekly_plan_title?: string;
  repeat_rule?: RepeatRule;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

export interface RepeatRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  weekdays?: number[];
  day_of_month?: number;
  end_date?: string;
  occurrences?: number;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface Reminder {
  id: string;
  task_id: string;
  remind_at: string;
  type: 'time' | 'smart';
  notified: boolean;
  created_at: string;
}

export interface TeamActivity {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  organizer_id: string;
  status: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  members?: ActivityMember[];
  organizer?: Profile;
  tasks?: Task[];
  has_blocker: boolean;
  blocker_count: number;
}

export interface ActivityMember {
  id: string;
  activity_id: string;
  user_id: string;
  role: string;
  user?: Profile;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  type: 'focus' | 'break';
  completed: boolean;
  task?: Task;
}

export interface Review {
  id: string;
  user_id: string;
  type: 'day' | 'week' | 'month' | 'quarter';
  period_start: string;
  period_end: string;
  content: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperienceCard {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  content: string;
  category: 'lesson' | 'insight' | 'method' | 'resource';
  tags: string[];
  task_title?: string;
  actual_minutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  title: string;
  description: string;
  icon: string;
  category: 'efficiency' | 'consistency' | 'growth' | 'collaboration';
  level: number;
  progress: number;
  target: number;
  unlocked: boolean;
  unlocked_at: string | null;
  created_at: string;
}

export interface EfficiencyProfile {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalFocusMinutes: number;
  averageFocusMinutes: number;
  peakHours: number[];
  mostProductiveDay: string;
  avgCompletionTime: number;
  streak: number;
  longestStreak: number;
}

export interface TaskTemplate {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  use_count: number;
  subtasks: { title: string; sort_order: number }[];
  estimated_minutes: number;
  created_at: string;
  last_used_at: string | null;
}

// Shared constants
export const PRIORITY_CONFIG = {
  urgent: { label: '紧急', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200 dark:border-red-800', badgeBg: 'bg-red-100 dark:bg-red-900/30', badgeBorder: 'border-red-300 dark:border-red-700' },
  high: { label: '高', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200 dark:border-orange-800', badgeBg: 'bg-orange-100 dark:bg-orange-900/30', badgeBorder: 'border-orange-300 dark:border-orange-700' },
  medium: { label: '中', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200 dark:border-blue-800', badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeBorder: 'border-blue-300 dark:border-blue-700' },
  low: { label: '低', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200 dark:border-gray-700', badgeBg: 'bg-gray-100 dark:bg-gray-800', badgeBorder: 'border-gray-300 dark:border-gray-600' },
} as const;

export const STATUS_CONFIG = {
  todo: { label: '待办' },
  in_progress: { label: '进行中' },
  done: { label: '已完成' },
  cancelled: { label: '已取消' },
} as const;
