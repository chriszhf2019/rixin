#!/bin/bash
set -e

cd /var/www/rixin

echo "=== Pulling latest code ==="
git stash 2>/dev/null || true
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "Git pull skipped (no repo or network issue)"

echo "=== Updating AI files ==="
# Copy the new AI files directly
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

# Remove old model.ts
rm -f src/lib/ai/model.ts

echo "=== Install deps & remove ai sdk ==="
npm uninstall ai @ai-sdk/openai 2>/dev/null || true

echo "=== Build ==="
npm run build 2>&1 | tail -20

echo "=== Restart PM2 ==="
pm2 restart rixin --update-env

echo "=== Wait for server ==="
sleep 8

echo "=== DONE ==="