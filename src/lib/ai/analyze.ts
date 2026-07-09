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

export async function generateSmartSchedule(
  tasks: { id: string; title: string; priority: string; status: string; estimatedMinutes?: number }[],
  peakHours: number[] = [9, 10, 11, 14, 15, 16],
  workStartTime: number = 9,
  workEndTime: number = 18
): Promise<{ schedule: { taskId: string; taskTitle: string; startTime: string; endTime: string; reason: string }[]; suggestion: string }> {
  const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  
  if (pendingTasks.length === 0) {
    return { schedule: [], suggestion: '今日任务已全部完成！好好休息吧。' };
  }

  const taskList = pendingTasks.map(t => 
    `${t.id} | ${t.title} | 优先级: ${t.priority} | 预计耗时: ${t.estimatedMinutes || 30}分钟`
  ).join('\n');

  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"智能调度专家。根据用户的待办任务和效率高峰时段，生成今日智能排期。

输出格式必须是纯JSON，格式如下：
{
  "schedule": [
    {"taskId": "任务ID", "taskTitle": "任务标题", "startTime": "09:00", "endTime": "09:30", "reason": "原因说明"}
  ],
  "suggestion": "整体调度建议（50字以内）"
}

调度原则：
1. 高优先级任务安排在效率高峰时段（${peakHours.join(':00, ')}:00）
2. 复杂任务安排在精力最充沛的时段
3. 简单任务穿插在复杂任务之间
4. 合理安排休息时间
5. 工作时间范围：${workStartTime}:00 - ${workEndTime}:00
6. 每个任务至少30分钟
7. 返回10个以内的排期`,
    },
    {
      role: 'user',
      content: `根据以下任务生成今日智能排期：\n${taskList}`,
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

  const fallbackSchedule: { taskId: string; taskTitle: string; startTime: string; endTime: string; reason: string }[] = [];
  let currentHour = workStartTime;
  let currentMinute = 0;
  
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  for (const task of sortedTasks.slice(0, 8)) {
    const duration = task.estimatedMinutes || 30;
    const endHour = currentHour + Math.floor((currentMinute + duration) / 60);
    const endMinute = (currentMinute + duration) % 60;
    
    if (endHour >= workEndTime) break;
    
    fallbackSchedule.push({
      taskId: task.id,
      taskTitle: task.title,
      startTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
      endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      reason: peakHours.includes(currentHour) ? '安排在效率高峰时段' : '按优先级顺序安排',
    });
    
    currentHour = endHour;
    currentMinute = endMinute;
  }

  return {
    schedule: fallbackSchedule,
    suggestion: '已根据优先级生成排期，建议优先处理高优先级任务。',
  };
}

export async function diagnoseBlocker(
  taskTitle: string,
  taskDescription?: string | null,
  blockerType?: string | null
): Promise<{
  analysis: string;
  rootCause: string;
  firstStep: string;
  smallActions: string[];
  motivation: string;
}> {
  const text = await callDeepSeekAPI([
    {
      role: 'system',
      content: `你是"日新"任务卡点诊断专家。你温和、有同理心，擅长帮助用户克服拖延和卡点。

输出格式必须是纯JSON，格式如下：
{
  "analysis": "简短的卡点原因分析（50字以内）",
  "rootCause": "核心原因（20字以内）",
  "firstStep": "第一步最小行动（具体、可执行，5分钟内能完成）",
  "smallActions": ["行动1", "行动2", "行动3"],
  "motivation": "一句温暖的鼓励话"
}

诊断原则：
1. 不要指责用户，要理解和支持
2. 找到真正的心理障碍（完美主义？畏难？缺乏清晰目标？）
3. 给出的"第一步行动"必须非常小，5分钟内能完成，降低启动门槛
4. 小行动要具体，有可操作性
5. 中文回复`,
    },
    {
      role: 'user',
      content: `任务标题：${taskTitle}
任务描述：${taskDescription || '无'}
卡点类型：${blockerType || '未明确'}

请诊断这个任务的卡点，并给出突破建议。`,
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
    analysis: '这个任务可能因为缺乏清晰的第一步而让人望而却步。试着把它拆分成更小的行动吧。',
    rootCause: '任务过大，缺乏切入点',
    firstStep: `打开一个文档，写下关于「${taskTitle}」的3个想法`,
    smallActions: [
      `花5分钟思考这个任务的目标`,
      `列出完成这个任务需要的3个步骤`,
      '从最简单的那个步骤开始',
    ],
    motivation: '每一个伟大的旅程，都始于第一步。你已经很棒了！',
  };
}
