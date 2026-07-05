import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseTaskText, fallbackParse } from '@/lib/ai/parse';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  try {
    const result = await parseTaskText(text);
    return NextResponse.json({
      title: result.title,
      description: result.description || null,
      priority: result.priority,
      due_date: result.due_date || null,
      subtasks: result.subtasks?.map((s: string) => ({ title: s, done: false })) || [],
    });
  } catch {
    // Fallback to simple parsing if AI fails
    const fallback = fallbackParse(text);
    return NextResponse.json({
      title: fallback.title,
      priority: fallback.priority,
      due_date: fallback.due_date || null,
    });
  }
}
