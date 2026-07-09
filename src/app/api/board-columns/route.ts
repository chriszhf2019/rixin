import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('board_columns')
    .select('id, title, status_key, color, sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    const defaults = [
      { id: 'default-1', title: '待办', status_key: 'todo', color: '#3b82f6', sort_order: 0 },
      { id: 'default-2', title: '进行中', status_key: 'in_progress', color: '#f59e0b', sort_order: 1 },
      { id: 'default-3', title: '已完成', status_key: 'done', color: '#10b981', sort_order: 2 },
    ];
    return NextResponse.json(defaults);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, color } = await request.json();

  if (!title) {
    return NextResponse.json({ error: '列标题不能为空' }, { status: 400 });
  }

  const { data: columns } = await supabase
    .from('board_columns')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sortOrder = columns && columns.length > 0 ? columns[0].sort_order + 1 : 0;
  const statusKey = `custom_${Date.now()}`;

  const { data, error } = await supabase
    .from('board_columns')
    .insert([{
      title,
      color: color || '#6366f1',
      status_key: statusKey,
      sort_order: sortOrder,
      user_id: user.id,
    }])
    .select('id, title, status_key, color, sort_order')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, title, color, sort_order } = await request.json();

  if (!id) {
    return NextResponse.json({ error: '列ID不能为空' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (color !== undefined) updates.color = color;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('board_columns')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title, status_key, color, sort_order')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: '列不存在' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: '列ID不能为空' }, { status: 400 });
  }

  const { data: column } = await supabase
    .from('board_columns')
    .select('status_key')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!column) {
    return NextResponse.json({ error: '列不存在' }, { status: 404 });
  }

  if (column.status_key === 'todo' || column.status_key === 'in_progress' || column.status_key === 'done') {
    return NextResponse.json({ error: '默认列不能删除' }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from('board_columns')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: '删除成功' }, { status: 200 });
}
