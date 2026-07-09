import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 获取模板
  const { data: template, error: templateError } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  // 创建任务
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: template.title,
      description: template.description,
      priority: 'medium',
      status: 'todo',
      task_type: 'routine',
      due_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  // 创建子任务
  if (template.subtasks && Array.isArray(template.subtasks) && template.subtasks.length > 0) {
    const subtaskData = template.subtasks.map((st: { title: string; sort_order: number }) => ({
      task_id: task.id,
      title: st.title,
      sort_order: st.sort_order,
    }));

    await supabase.from('subtasks').insert(subtaskData);
  }

  // 更新模板使用次数
  await supabase
    .from('task_templates')
    .update({
      use_count: (template.use_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({ task, template });
}
