import { generateText } from 'ai';
import { chatModel } from './model';

export async function analyzeTasks(tasks: { title: string; status: string; priority: string; created_at: string; completed_at?: string | null }[]) {
  const taskList = tasks.map(t => `${t.title} [${t.status}, ${t.priority}]`).join('\n');
  const { text } = await generateText({
    model: chatModel,
    system: `你是"日新"AI 助手，一个个人成长分析师。分析用户的任务数据，给出有价值的洞察和建议。中文回复，简洁（100-150字）。`,
    prompt: `分析以下任务数据，给出：
    1. 完成率趋势
    2. 效率建议
    3. 可能的关联或依赖问题

    任务列表：
    ${taskList}`,
  });

  return text;
}

export async function chatWithAI(message: string, context: string) {
  const { text } = await generateText({
    model: chatModel,
    system: `你是"日新"AI 助手，一个温暖、洞察力强的个人成长教练。你帮助用户提高效率、达成目标。
- 回答要简洁有帮助（100字以内）
- 结合用户的真实任务数据
- 鼓励但不浮夸
- 中文回复

用户的任务数据：
${context}`,
    prompt: message,
  });

  return text;
}
