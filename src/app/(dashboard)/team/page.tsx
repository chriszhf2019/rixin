'use client';

import { useState } from 'react';
import { ActivityBoard } from '@/components/team/ActivityBoard';
import { TeamBrief } from '@/components/team/TeamBrief';
import { TeamStats } from '@/components/team/TeamStats';

export default function TeamPage() {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">团队协作舱</h1>
        <p className="text-sm text-muted-foreground">同步目标、发现卡点、高效推进</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityBoard selectedActivity={selectedActivity} onSelectActivity={setSelectedActivity} />
        </div>
        <div className="space-y-4">
          <TeamBrief />
          <TeamStats />
        </div>
      </div>
    </div>
  );
}