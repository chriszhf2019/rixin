import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const CreateMonthlyPlanSchema = z.object({
  title: z.string().min(1).max(200),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  goal_id: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  sort_order: z.number().int().default(0),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('monthly_plans')
    .select(`
      *,
      weekly_plans(
        *,
        tasks(*)
      ),
      goal:goals!goal_id(id, title)
    `)
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = CreateMonthlyPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('monthly_plans')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}