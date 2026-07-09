'use client';

import { TodayList } from '@/components/today/TodayList';
import { QuickAdd } from '@/components/today/QuickAdd';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListChecks, LayoutGrid } from 'lucide-react';

export default function TodayPage() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-full">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">今日</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <ListChecks className="h-4 w-4 mr-1" /> 列表
          </TabsTrigger>
          <TabsTrigger value="board">
            <LayoutGrid className="h-4 w-4 mr-1" /> 看板
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <TodayList />
        </TabsContent>
        <TabsContent value="board" className="h-[calc(100vh-12rem)]">
          <KanbanBoard />
        </TabsContent>
      </Tabs>

      <QuickAdd />
    </div>
  );
}
