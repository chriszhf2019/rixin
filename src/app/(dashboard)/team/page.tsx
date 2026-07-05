'use client';

import { ActivityBoard } from '@/components/team/ActivityBoard';

export default function TeamPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">团队</h1>
        <p className="text-sm text-muted-foreground">团队活动协作</p>
      </div>
      <ActivityBoard />
    </div>
  );
}
