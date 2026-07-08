'use client';

import { useState } from 'react';
import { GoalTree } from '@/components/plan/GoalTree';
import { MonthlyPlanView } from '@/components/plan/MonthlyPlanView';
import { WeeklyFocusView } from '@/components/plan/WeeklyFocusView';

export default function PlanPage() {
  const [activeTab, setActiveTab] = useState<'goals' | 'monthly' | 'weekly'>('goals');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">规划</h1>
        <p className="text-sm text-muted-foreground">从大局到细节，层层拆解你的目标</p>
      </div>

      <div className="flex gap-2 mb-6 bg-muted/50 rounded-lg p-1 inline-flex">
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'goals'
              ? 'bg-white text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🎯 季度目标
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'monthly'
              ? 'bg-white text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📅 月计划
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'weekly'
              ? 'bg-white text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🎯 周重点
        </button>
      </div>

      {activeTab === 'goals' && <GoalTree />}
      {activeTab === 'monthly' && <MonthlyPlanView />}
      {activeTab === 'weekly' && <WeeklyFocusView />}
    </div>
  );
}