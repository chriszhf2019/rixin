'use client';

import { GoalTree } from '@/components/plan/GoalTree';

export default function PlanPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">规划</h1>
        <p className="text-sm text-muted-foreground">季度目标 → 月计划 → 周重点</p>
      </div>
      <GoalTree />
    </div>
  );
}
