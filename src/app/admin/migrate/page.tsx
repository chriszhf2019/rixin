'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, CheckCircle, AlertCircle, Loader2, Key } from 'lucide-react';

export default function MigratePage() {
  const [password, setPassword] = useState('');
  const [authType, setAuthType] = useState<'password' | 'service_role'>('service_role');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleMigrate = async () => {
    if (!password) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, authType }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error || '迁移失败' });
      }
    } catch {
      setResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-amber-50 dark:from-indigo-950/30 dark:to-amber-950/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            数据库迁移
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            创建经验卡片和SOP模板所需的数据表
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>认证方式</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAuthType('service_role')}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  authType === 'service_role'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Key className="h-4 w-4" />
                Service Role
              </button>
              <button
                onClick={() => setAuthType('password')}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  authType === 'password'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <Database className="h-4 w-4" />
                数据库密码
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{authType === 'service_role' ? 'Service Role Key' : '数据库密码'}</Label>
            <Input
              type={authType === 'password' ? 'password' : 'text'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authType === 'service_role' ? 'Supabase Service Role Key' : '创建 Supabase 项目时设置的密码'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && !loading) {
                  handleMigrate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {authType === 'service_role' 
                ? '在 Supabase Dashboard → Settings → API → Service Role Key 获取'
                : '可在 Supabase Dashboard → Settings → Database 中查看或重置'}
            </p>
          </div>

          {result && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span className="whitespace-pre-line">{result.message}</span>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleMigrate}
            disabled={!password || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                正在执行迁移...
              </>
            ) : (
              '开始迁移'
            )}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium">将创建以下内容：</p>
            <p>• experience_cards 表（经验卡片）</p>
            <p>• task_templates 表（SOP模板）</p>
            <p>• tasks 表补充字段（task_type, blocker_reason）</p>
            <p>• RLS 安全策略</p>
            <p>• 索引和触发器</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
