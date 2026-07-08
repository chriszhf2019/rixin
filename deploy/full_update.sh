#!/bin/bash
set -e

cd /var/www/rixin

# Step 1: Update environment variables
echo "=== Step 1: Update env vars ==="
grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local || echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZXduZmdoend2dXZvenNrZGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzIzNTk4MywiZXhwIjoyMDk4ODExOTgzfQ.lSUKZqvbu9VjaXqo5Zajdp_EzTxch2v_RNUdnEP4M2A" >> .env.local
grep -q "ADMIN_SECRET" .env.local || echo "ADMIN_SECRET=rixin-admin-2026" >> .env.local
echo "Env vars updated"

# Step 2: Create admin API
echo "=== Step 2: Create admin API ==="
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
echo "Admin API created"

# Step 3: Update login page
echo "=== Step 3: Update login page ==="

cat > src/app/login/page.tsx << 'LOGINEOF'
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<'magiclink' | 'password'>('password');
  const supabase = createClient();
  const router = useRouter();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push('/today');
    router.refresh();
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>检查邮箱</CardTitle>
            <CardDescription>
              我们已经向 {email} 发送了登录链接，请查收。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-amber-500 bg-clip-text text-transparent">
              日新
            </h1>
            <p className="text-sm text-muted-foreground mt-1">日有所进，日有所新</p>
          </div>
          <CardTitle>欢迎</CardTitle>
          <CardDescription>登录以开始你的日新之旅</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'magiclink' ? (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '发送中...' : '发送魔法链接'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <Input
                type="email"
                placeholder="输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          )}
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => setMode(mode === 'magiclink' ? 'password' : 'magiclink')}
          >
            {mode === 'magiclink' ? '使用密码登录' : '使用魔法链接登录'}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">或</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            使用 Google 登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
LOGINEOF
echo "Login page updated"

# Step 4: Build
echo "=== Step 4: Build ==="
npm run build 2>&1 | tail -20

# Step 5: Restart PM2
echo "=== Step 5: Restart PM2 ==="
pm2 restart rixin

echo "=== Waiting for server to start ==="
sleep 8

# Step 6: Create test users via API
echo "=== Step 6: Create test users ==="
curl -s -X POST http://localhost:3000/api/admin/create-test-users \
  -H "Content-Type: application/json" \
  -d '{"secret": "rixin-admin-2026"}' | python3 -m json.tool 2>/dev/null || cat

echo ""
echo "=== DONE ==="