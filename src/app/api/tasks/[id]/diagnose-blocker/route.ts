import { NextResponse } from 'next/server';
import { diagnoseBlocker } from '@/lib/ai/analyze';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskTitle, taskDescription, blockerType } = await request.json();

  if (!taskTitle) {
    return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
  }

  try {
    const result = await diagnoseBlocker(taskTitle, taskDescription, blockerType);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Blocker diagnosis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze blocker' },
      { status: 500 }
    );
  }
}
