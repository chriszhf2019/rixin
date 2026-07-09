'use client';

import { useState } from 'react';
import { AlertTriangle, Lightbulb, Sparkles, Play, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface BlockerDiagnosisProps {
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  blockerReason?: string | null;
  children: React.ReactNode;
}

interface DiagnosisResult {
  analysis: string;
  rootCause: string;
  firstStep: string;
  smallActions: string[];
  motivation: string;
}

export function BlockerDiagnosis({ taskId, taskTitle, taskDescription, blockerReason, children }: BlockerDiagnosisProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const handleDiagnose = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/diagnose-blocker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle, taskDescription, blockerType: blockerReason }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Failed to diagnose blocker:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !result) {
      handleDiagnose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            卡点诊断
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">AI 正在分析卡点原因...</p>
            </div>
            <Progress value={60} className="h-1" />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">核心原因</span>
              </div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{result.rootCause}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400/70 mt-1">{result.analysis}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-900">
              <div className="flex items-center gap-2 mb-3">
                <Play className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">第一步（5分钟启动）</span>
              </div>
              <p className="text-base font-semibold text-indigo-800 dark:text-indigo-200 leading-relaxed">
                {result.firstStep}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">小行动清单</p>
              <ul className="space-y-2">
                {result.smallActions.map((action, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/50"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900">
              <Heart className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <p className="text-sm text-rose-700 dark:text-rose-300 italic">{result.motivation}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDiagnose}
              >
                重新分析
              </Button>
              <Button className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                开始第一步
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
