'use client';

import { useState } from 'react';
import { DailyReview } from '@/components/review/DailyReview';
import { WeeklyReview } from '@/components/review/WeeklyReview';
import { MonthlyReview } from '@/components/review/MonthlyReview';
import { ReviewTimeline } from '@/components/review/ReviewTimeline';
import { EfficiencyDashboard } from '@/components/review/EfficiencyDashboard';
import { BookOpen, BarChart3 } from 'lucide-react';

type PeriodType = 'day' | 'week' | 'month' | 'profile';

export default function ReviewPage() {
  const [period, setPeriod] = useState<PeriodType>('day');

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-500" />
            复盘
          </h1>
          <p className="text-sm text-muted-foreground">日有所进，周有所成，月有所得</p>
        </div>

        <div className="flex gap-2 mb-6 bg-muted/50 rounded-lg p-1 flex-wrap">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              period === 'day'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ☀️ 日复盘
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              period === 'week'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📅 周复盘
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              period === 'month'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🌙 月复盘
          </button>
          <button
            onClick={() => setPeriod('profile')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              period === 'profile'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1" />
            效率画像
          </button>
        </div>

        {period === 'day' && <DailyReview />}
        {period === 'week' && <WeeklyReview />}
        {period === 'month' && <MonthlyReview />}
        {period === 'profile' && <EfficiencyDashboard />}

        {period !== 'profile' && (
          <div className="mt-8">
            <ReviewTimeline />
          </div>
        )}
      </div>
    </div>
  );
}