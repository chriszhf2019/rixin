import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
      { status: 500 }
    );
  }

  const { secret } = await request.json();
  const adminSecret = process.env.ADMIN_SECRET;

  if (adminSecret && secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testUsers = [
    { email: 'test1@rixin.dev', password: 'Test@123456', name: '测试用户一' },
    { email: 'test2@rixin.dev', password: 'Test@123456', name: '测试用户二' },
  ];

  const results = [];

  for (const user of testUsers) {
    try {
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
      const found = existing.users.find((u) => u.email === user.email);

      if (found) {
        results.push({ email: user.email, status: 'exists', id: found.id });
        continue;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.name },
      });

      if (error) {
        results.push({ email: user.email, status: 'error', message: error.message });
        continue;
      }

      const userId = data.user.id;
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, name: user.name });

      results.push({ email: user.email, status: 'created', id: userId });
    } catch (e: any) {
      results.push({ email: user.email, status: 'error', message: e.message });
    }
  }

  return NextResponse.json({ results });
}