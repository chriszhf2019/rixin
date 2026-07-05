'use client';

import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer';
import { StatsDashboard } from '@/components/stats/StatsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FocusPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">专注</h1>
        <p className="text-sm text-muted-foreground">番茄钟 + 数据看板</p>
      </div>

      <Tabs defaultValue="pomodoro" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pomodoro">番茄钟</TabsTrigger>
          <TabsTrigger value="stats">数据看板</TabsTrigger>
        </TabsList>
        <TabsContent value="pomodoro">
          <PomodoroTimer />
        </TabsContent>
        <TabsContent value="stats">
          <StatsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
