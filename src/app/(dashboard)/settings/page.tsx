'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { LogOut, Sun, Moon, Globe, Zap, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('zh-CN');
  const [peakHours, setPeakHours] = useState<number[]>([9, 10, 11, 14, 15, 16]);
  const [workStart, setWorkStart] = useState(9);
  const [workEnd, setWorkEnd] = useState(18);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          if (data) {
            setName(data.name ?? '');
            const prefs = data.preferences || {};
            setLanguage((prefs as Record<string, string>).language || 'zh-CN');
            setPeakHours((prefs as Record<string, number[]>).peakHours || [9, 10, 11, 14, 15, 16]);
            setWorkStart((prefs as Record<string, number>).workStart || 9);
            setWorkEnd((prefs as Record<string, number>).workEnd || 18);
          }
        });
      }
    });
  }, []);

  const saveProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ name }).eq('id', user.id);
    if (error) toast.error('保存失败');
    else toast.success('已保存');
    setLoading(false);
  };

  const savePreferences = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const preferences = {
      language,
      peakHours,
      workStart,
      workEnd,
    };
    const { error } = await supabase.from('profiles').update({ preferences }).eq('id', user.id);
    if (error) toast.error('保存失败');
    else toast.success('偏好设置已保存');
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const togglePeakHour = (hour: number) => {
    setPeakHours(prev =>
      prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour].sort((a, b) => a - b)
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">设置</h1>

      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>管理你的个人信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>昵称</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入你的昵称" />
          </div>
          <Button onClick={saveProfile} disabled={loading}>保存</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
          <CardDescription>切换应用外观</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> 浅色
            </Button>
            <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> 深色
            </Button>
            <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')}>
              跟随系统
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>语言</CardTitle>
          <CardDescription>选择应用显示语言</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              语言偏好
            </Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="zh-CN">中文（简体）</option>
              <option value="zh-TW">中文（繁体）</option>
              <option value="en-US">English</option>
              <option value="ja-JP">日本語</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>效率偏好</CardTitle>
          <CardDescription>自定义你的效率高峰时段，AI 将据此优化排期</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              效率高峰时段
            </Label>
            <p className="text-xs text-muted-foreground">
              选择你一天中精力最充沛的时段，AI 将优先安排重要任务
            </p>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => togglePeakHour(i)}
                  className={`px-2 py-1.5 text-xs rounded-md border transition-all ${
                    peakHours.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 border-border hover:border-primary/50'
                  }`}
                >
                  {i}:00
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              工作时间
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs">开始时间</Label>
                <select
                  value={workStart}
                  onChange={(e) => setWorkStart(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <Label className="text-xs">结束时间</Label>
                <select
                  value={workEnd}
                  onChange={(e) => setWorkEnd(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Button onClick={savePreferences} disabled={loading}>保存偏好设置</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>账户</CardTitle>
          <CardDescription>退出登录</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> 退出登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
