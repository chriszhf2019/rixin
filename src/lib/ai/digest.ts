import { generateText } from 'ai';
import { chatModel } from './model';

export async function generateDailyDigest(
  tasks: { title: string; status: string; priority: string; due_date?: string | null }[],
  completedTasks: { title: string }[],
  goals: { title: string; progress: number }[]
): Promise<{ morning: string; evening: string }> {
  const totalTasks = tasks.length;
  const doneCount = completedTasks.length;
  const pendingCount = totalTasks - doneCount;

  const { text: morning } = await generateText({
    model: chatModel,
    system: `你是一个个人成长助手"日新"。用温暖鼓励的语气生成每日简报。中文回复，简洁（50-100字），突出今日的重点和与长期目标的关联。`,
    prompt: `今天是 ${new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}。
      今日待办共 ${totalTasks} 项，已完成 ${doneCount} 项，剩余 ${pendingCount} 项。
      待办事项：${tasks.map(t => `${t.title}[${t.priority}]`).join('、')}
      长期目标进度：${goals.map(g => `${g.title}: ${g.progress}%`).join('、')}
      请生成今日早间展望（鼓励性）。`,
  });

  const { text: evening } = await generateText({
    model: chatModel,
    system: `你是一个个人成长助手"日新"。用温暖鼓励的语气生成每日复盘。中文回复，简洁（50-100字），包含今日亮点和改进建议。`,
    prompt: `今日完成：${completedTasks.map(t => t.title).join('、')}
      今日未完成：${tasks.filter(t => t.status !== 'done').map(t => t.title).join('、')}
      请生成晚间复盘总结。`,
  });

  return { morning, evening };
}
