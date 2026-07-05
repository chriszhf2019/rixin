'use client';

import { useEffect, useState } from 'react';
import { DigestCard } from '@/components/review/DigestCard';
import { ReviewTimeline } from '@/components/review/ReviewTimeline';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

export default function ReviewPage() {
  const [digest, setDigest] = useState<{ morning: string; evening: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDigest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/digest');
      const data = await res.json();
      setDigest(data);
    } catch {
      setDigest({ morning: '今天也请继续加油！', evening: '' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchDigest(); }, []);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">复盘</h1>
          <p className="text-sm text-muted-foreground">回顾过去，规划未来</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchDigest} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-3 mb-8">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            {digest?.morning && <DigestCard title="今日展望" content={digest.morning} type="morning" />}
            {digest?.evening && <DigestCard title="今日复盘" content={digest.evening} type="evening" />}
          </>
        )}
      </div>

      <ReviewTimeline />
    </div>
  );
}
