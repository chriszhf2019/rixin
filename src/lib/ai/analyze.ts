import { callDeepSeekAPI } from './deepseek';

export async function splitTask(taskTitle: string): Promise<{ steps: { title: string; estimatedMinutes: number }[] }> {
  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"任务拆分专家。将复杂任务拆分为可执行的线性步骤。
输出格式必须是纯JSON，格式如下：
{"steps": [{"title": "步骤1描述", "estimatedMinutes": 20}, {"title": "步骤2描述", "estimatedMinutes": 15}]}
- 步骤数控制在3-5个
- 每个步骤都要有明确的行动动词开头
- estimatedMinutes是预计分钟数`,
    },
    {
      role: 'user',
      content: `将以下任务拆分为可执行的线性步骤：${taskTitle}`,
    },
  ]);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return {
    steps: [
      { title: `分析任务：${taskTitle}`, estimatedMinutes: 10 },
      { title: '制定执行计划', estimatedMinutes: 15 },
      { title: '执行核心步骤', estimatedMinutes: 30 },
      { title: '检查与完善', estimatedMinutes: 10 },
    ],
  };
}

export async function analyzeProcrastination(tasks: { title: string; status: string; created_at: string; due_date?: string | null }[]) {
  const overdueTasks = tasks.filter(t => 
    t.status !== 'done' && 
    t.due_date && 
    new Date(t.due_date) < new Date()
  );

  if (overdueTasks.length === 0) {
    return '目前没有延期任务。保持良好的节奏！';
  }

  const taskList = overdueTasks.map(t => 
    `${t.title} (创建于: ${new Date(t.created_at).toLocaleDateString()}, 截止: ${new Date(t.due_date!).toLocaleDateString()})`
  ).join('\n');

  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"拖延分析专家。分析用户延期任务，给出温和的建议而不是指责。
回答要点：
1. 识别可能的拖延原因（任务太大、缺乏信心、优先级不清等）
2. 给出具体的改进建议
3. 鼓励用户采取行动
中文回复，语气温暖，100-150字。`,
    },
    {
      role: 'user',
      content: `分析以下延期任务，找出可能的拖延原因并给出建议：\n${taskList}`,
    },
  ]);

  return text;
}

export async function getEfficiencyProfile(tasks: { title: string; status: string; created_at: string; completed_at?: string | null }[], sessions: { started_at: string; duration_minutes: number; completed: boolean }[]) {
  const completedTasks = tasks.filter(t => t.status === 'done' && t.completed_at);
  const totalFocusMinutes = sessions.filter(s => s.completed).reduce((sum, s) => sum + s.duration_minutes, 0);
  
  const hourDistribution: Record<number, number> = {};
  sessions.forEach(s => {
    const hour = new Date(s.started_at).getHours();
    hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourDistribution).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  
  const context = `
完成任务数: ${completedTasks.length}
总专注时长: ${totalFocusMinutes}分钟
最活跃时段: ${peakHour}:00 - ${parseInt(peakHour) + 1}:00
任务列表: ${completedTasks.map(t => t.title).join(', ')}
`;

  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"效率分析师。根据用户数据生成个人效率画像。
回答要点：
1. 用户的效率高峰时段
2. 任务完成模式
3. 个性化建议（如何利用高峰时段）
4. 鼓励性总结
中文回复，温暖有洞察力，100-150字。`,
    },
    {
      role: 'user',
      content: `生成我的效率画像：\n${context}`,
    },
  ]);

  return text;
}

export async function analyzeTasks(tasks: { title: string; status: string; priority: string; created_at: string; completed_at?: string | null }[]) {
  const taskList = tasks.map(t => `${t.title} [${t.status}, ${t.priority}]`).join('\n');

  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"AI 助手，一个个人成长分析师。分析用户的任务数据，给出有价值的洞察和建议。中文回复，简洁（100-150字）。`,
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
