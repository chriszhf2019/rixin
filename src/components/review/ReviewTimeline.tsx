'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Review } from '@/types';
import { Loader2, FileText, Sparkles, BookOpen } from 'lucide-react';

export function ReviewTimeline() {
  const supabase = createClient();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .limit(30)
        .then(({ data }) => {
          if (data) setReviews(data as Review[]);
          setLoading(false);
        });
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const typeLabel = { day: '日', week: '周', month: '月', quarter: '季度' } as const;

  const typeColor = {
    day: 'bg-amber-500',
    week: 'bg-indigo-500',
    month: 'bg-purple-500',
    quarter: 'bg-pink-500',
  } as const;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        复盘记录
      </h2>
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-gradient-to-br from-indigo-50/50 to-amber-50/50 rounded-xl border border-dashed border-muted-foreground/20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-amber-100 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-indigo-500" />
          </div>
          <p className="font-medium text-foreground">你的第一份复盘正在生成中</p>
          <p className="text-sm mt-2 max-w-xs mx-auto">
            当你完成一天的专注或打勾任务后，今晚 9 点 AI 将在这里为你呈递第一份效率进化报告。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="text-xs px-2 py-1 bg-white rounded-full border">📊 完成率统计</span>
            <span className="text-xs px-2 py-1 bg-white rounded-full border">🎯 目标进度</span>
            <span className="text-xs px-2 py-1 bg-white rounded-full border">💡 AI 洞察</span>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-muted space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="relative">
              <div className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-background ${typeColor[review.type]}`} />
              <Card className="ml-2 hover:shadow-sm transition-shadow">
                <CardHeader className="py-2">
                  <CardTitle className="text-xs text-muted-foreground">
                    <span className="inline-block w-10">
                      {typeLabel[review.type]}复盘
                    </span>
                    · {review.period_start} ~ {review.period_end}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  {review.ai_summary && (
                    <p className="text-sm">{review.ai_summary}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}