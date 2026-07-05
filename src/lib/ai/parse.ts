import { generateObject } from 'ai';
import { chatModel } from './model';
import { z } from 'zod';

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
  const { object } = await generateObject({
    model: chatModel,
    schema: TaskParseSchema,
    system: `你是一个智能待办解析助手。用户会用自然语言输入任务，你需要提取结构化信息。
      规则：
      - 时间表述："明天"、"后天"、"下周一"等相对时间，基于当前日期 ${new Date().toISOString().split('T')[0]} 转为具体日期
      - 优先级：紧急事件用"urgent"，重要用"high"，普通用"medium"，小事用"low"
      - 如果有多个事项，创建主任务并将其他事项作为子任务
      - 标签从内容中推断（如"工作"、"个人"、"购物"、"学习"等）
      - 如果内容明显包含团队协作（"跟XX一起"、"团队"、"开会"），在标签中包含"协作"`,
    prompt: text,
  });

  return object;
}

// Fallback parser for when AI is unavailable
export function fallbackParse(text: string): ParsedTask {
  // Simple keyword-based parsing
  const now = new Date();
  let dueDate: string | undefined;
  const title = text;

  // Very basic date detection
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
