#!/bin/bash
set -e

cd /var/www/rixin

echo "=== Updating files ==="

# 1. Update AI module files
mkdir -p src/lib/ai

cat > src/lib/ai/deepseek.ts << 'EOF'
export async function callDeepSeekAPI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `DeepSeek API error: ${response.status} ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}
EOF

cat > src/lib/ai/analyze.ts << 'EOF'
import { callDeepSeekAPI } from './deepseek';

export async function analyzeTasks(tasks: { title: string; status: string; priority: string; created_at: string; completed_at?: string | null }[]) {
  const taskList = tasks.map(t => `${t.title} [${t.status}, ${t.priority}]`).join('\n');

  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: '你是"日新"AI 助手，一个个人成长分析师。分析用户的任务数据，给出有价值的洞察和建议。中文回复，简洁（100-150字）。',
    },
    {
      role: 'user',
      content: `分析以下任务数据，给出：
    1. 完成率趋势
    2. 效率建议
    3. 可能的关联或依赖问题

    任务列表：
    ${taskList}`,
    },
  ]);

  return text;
}

export async function chatWithAI(message: string, context: string) {
  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"AI 助手，一个温暖、洞察力强的个人成长教练。你帮助用户提高效率、达成目标。
- 回答要简洁有帮助（100字以内）
- 结合用户的真实任务数据
- 鼓励但不浮夸
- 中文回复

用户的任务数据：
${context}`,
    },
    { role: 'user', content: message },
  ]);

  return text;
}
EOF

cat > src/lib/ai/digest.ts << 'EOF'
import { callDeepSeekAPI } from './deepseek';

export async function generateDailyDigest(
  tasks: { title: string; status: string; priority: string; due_date?: string | null }[],
  completedTasks: { title: string }[],
  goals: { title: string; progress: number }[]
): Promise<{ morning: string; evening: string }> {
  const totalTasks = tasks.length;
  const doneCount = completedTasks.length;
  const pendingCount = totalTasks - doneCount;

  const morning = await callDeepSeekAPI(
    [
      {
        role: 'system',
        content: '你是一个个人成长助手"日新"。用温暖鼓励的语气生成每日简报。中文回复，简洁（50-100字），突出今日的重点和与长期目标的关联。',
      },
      {
        role: 'user',
        content: `今天是 ${new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}。
      今日待办共 ${totalTasks} 项，已完成 ${doneCount} 项，剩余 ${pendingCount} 项。
      待办事项：${tasks.map(t => `${t.title}[${t.priority}]`).join('、')}
      长期目标进度：${goals.map(g => `${g.title}: ${g.progress}%`).join('、')}
      请生成今日早间展望（鼓励性）。`,
      },
    ],
    { maxTokens: 300 }
  );

  const evening = await callDeepSeekAPI(
    [
      {
        role: 'system',
        content: '你是一个个人成长助手"日新"。用温暖鼓励的语气生成每日复盘。中文回复，简洁（50-100字），包含今日亮点和改进建议。',
      },
      {
        role: 'user',
        content: `今日完成：${completedTasks.map(t => t.title).join('、')}
      今日未完成：${tasks.filter(t => t.status !== 'done').map(t => t.title).join('、')}
      请生成晚间复盘总结。`,
      },
    ],
    { maxTokens: 300 }
  );

  return { morning, evening };
}
EOF

cat > src/lib/ai/parse.ts << 'EOF'
import { z } from 'zod';
import { callDeepSeekAPI } from './deepseek';

const TaskParseSchema = z.object({
  title: z.string().describe('任务标题'),
  description: z.string().optional().describe('任务描述'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('优先级'),
  due_date: z.string().optional().describe('ISO 8601 截止日期，如果有明确时间'),
  tags: z.array(z.string()).optional().describe('建议的标签'),
  subtasks: z.array(z.string()).optional().describe('建议拆解的子任务列表'),
  estimated_minutes: z.number().optional().describe('预计完成时间（分钟）'),
});

export type ParsedTask = z.infer<typeof TaskParseSchema>;

export async function parseTaskText(text: string): Promise<ParsedTask> {
  const systemPrompt = `你是一个智能待办解析助手。用户会用自然语言输入任务，你需要提取结构化信息。
      规则：
      - 时间表述："明天"、"后天"、"下周一"等相对时间，基于当前日期 ${new Date().toISOString().split('T')[0]} 转为具体日期
      - 优先级：紧急事件用"urgent"，重要用"high"，普通用"medium"，小事用"low"
      - 如果有多个事项，创建主任务并将其他事项作为子任务
      - 标签从内容中推断（如"工作"、"个人"、"购物"、"学习"等）
      - 如果内容明显包含团队协作（"跟XX一起"、"团队"、"开会"），在标签中包含"协作"
      
      请直接返回 JSON 对象，不要包含任何额外文字或 markdown 格式。`;

  try {
    const result = await callDeepSeekAPI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      { temperature: 0.3, maxTokens: 800 }
    );

    const jsonStr = result.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    return TaskParseSchema.parse(parsed);
  } catch (e) {
    return fallbackParse(text);
  }
}

export function fallbackParse(text: string): ParsedTask {
  const now = new Date();
  let dueDate: string | undefined;
  const title = text;

  const relativeDays: Record<string, number> = {
    '今天': 0, '今天内': 0, '今晚': 0,
    '明天': 1, '明天内': 1, '明晚': 1,
    '后天': 2, '大后天': 3,
  };

  for (const [keyword, days] of Object.entries(relativeDays)) {
    if (text.includes(keyword)) {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      dueDate = d.toISOString();
      break;
    }
  }

  return { title, due_date: dueDate, priority: 'medium' };
}
EOF

rm -f src/lib/ai/model.ts

# 2. Update dialog component
mkdir -p src/components/ui

cat > src/components/ui/dialog.tsx << 'EOF'
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger
};
EOF

# 3. Fix tasks API schema
mkdir -p src/app/api/tasks/\[id\]

cat > src/app/api/tasks/\[id\]/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  due_date: z.string().nullable().optional(),
  weekly_plan_id: z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
  completed_at: z.string().nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('tasks')
    .select('user_id, assignee_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (existing.user_id !== user.id && existing.assignee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === 'done') {
    updateData.completed_at = parsed.data.completed_at ?? new Date().toISOString();
  } else if (parsed.data.status) {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select('*, subtasks(*), tags(*), reminders(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
EOF

echo "=== Uninstall old AI SDK ==="
npm uninstall ai @ai-sdk/openai 2>/dev/null || true

echo "=== Build ==="
npm run build 2>&1 | tail -20

echo "=== Restart PM2 ==="
pm2 restart rixin --update-env

echo "=== Wait for server ==="
sleep 8

echo "=== DONE ==="