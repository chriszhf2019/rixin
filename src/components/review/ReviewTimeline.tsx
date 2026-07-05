'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Review } from '@/types';
import { Loader2, FileText } from 'lucide-react';

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

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">复盘记录</h2>
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>暂无复盘记录</p>
          <p className="text-sm mt-1">AI 会自动生成每日复盘</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-muted space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="relative">
              <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
              <Card className="ml-2">
                <CardHeader className="py-2">
                  <CardTitle className="text-xs text-muted-foreground">
                    {typeLabel[review.type]}复盘 · {review.period_start} ~ {review.period_end}
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
