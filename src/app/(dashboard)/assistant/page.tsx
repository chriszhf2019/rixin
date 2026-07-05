'use client';

import { ChatInterface } from '@/components/assistant/ChatInterface';
import { EfficiencyReport } from '@/components/assistant/EfficiencyReport';

export default function AssistantPage() {
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
      <div className="flex-1 min-w-0">
        <div className="p-4 md:p-6 pb-0">
          <h1 className="text-xl font-bold">助手</h1>
          <p className="text-sm text-muted-foreground mb-4">AI 任务助手</p>
        </div>
        <ChatInterface />
      </div>
      <div className="w-full md:w-72 lg:w-80 p-4 border-l">
        <EfficiencyReport />
      </div>
    </div>
  );
}
