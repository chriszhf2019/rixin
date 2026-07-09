'use client';

import { AchievementSystem } from '@/components/achievements/AchievementSystem';
import { Trophy } from 'lucide-react';

export default function AchievementsPage() {
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            成就
          </h1>
          <p className="text-sm text-muted-foreground">每一步成长都值得被看见</p>
        </div>

        <AchievementSystem />
      </div>
    </div>
  );
}
