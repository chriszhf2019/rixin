'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';
import { ProgressRing } from '@/components/today/ProgressRing';

export function EfficiencyReport() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, done: 0 });

  const fetchAnalysis = async () => {
    setLoading(true);
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze' }),
    });
    const data = await res.json();
    setAnalysis(data.reply);
    setLoading(false);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('tasks').select('status').eq('user_id', user.id).then(({ data }) => {
        if (data) {
          setStats({
            total: data.length,
            done: data.filter(t => t.status === 'done').length,
          });
        }
      });
    });
  }, []);

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-primary" />
          效率概览
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-6">
          <ProgressRing completed={stats.done} total={stats.total || 1} size={80} strokeWidth={6} />
          <div>
            <p className="text-sm">总任务: {stats.total}</p>
            <p className="text-sm">已完成: {stats.done}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={fetchAnalysis} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          AI 效率分析
        </Button>
        {analysis && (
          <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted rounded-lg">{analysis}</p>
        )}
      </CardContent>
    </Card>
  );
}
