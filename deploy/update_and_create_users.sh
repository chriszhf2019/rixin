#!/bin/bash
set -e

cd /var/www/rixin

# Add environment variables
grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local || echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZXduZmdoend2dXZvenNrZGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzIzNTk4MywiZXhwIjoyMDk4ODExOTgzfQ.lSUKZqvbu9VjaXqo5Zajdp_EzTxch2v_RNUdnEP4M2A" >> .env.local
grep -q "ADMIN_SECRET" .env.local || echo "ADMIN_SECRET=rixin-admin-2026" >> .env.local

mkdir -p src/app/api/admin/create-test-users

cat > src/app/api/admin/create-test-users/route.ts << 'APIEOF'
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
        if (!found.email_confirmed_at) {
          await supabaseAdmin.auth.admin.updateUserById(found.id, { email_confirm: true });
        }
        await supabaseAdmin.from('profiles').upsert({ id: found.id, name: user.name });
        results.push({ email: user.email, status: 'exists_and_updated', id: found.id });
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
      await supabaseAdmin.from('profiles').upsert({ id: userId, name: user.name });

      results.push({ email: user.email, status: 'created', id: userId });
    } catch (e: any) {
      results.push({ email: user.email, status: 'error', message: e.message });
    }
  }

  return NextResponse.json({ results });
}
APIEOF

echo "Files updated. Now building..."