'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, User, Loader2, Sparkles, Check, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  estimatedMinutes: number;
  completed?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  steps?: Step[];
  action?: string;
}

const QUICK_ACTIONS = [
  { icon: '🪄', label: '帮我拆分今日核心任务', action: 'split_tasks' },
  { icon: '📉', label: '分析我昨天的拖延原因', action: 'analyze_procrastination' },
  { icon: '🎯', label: '检查今日任务是否偏离目标', action: 'check_goal_alignment' },
  { icon: '💡', label: '生成今日行动建议', action: 'daily_suggestions' },
  { icon: '📊', label: '查看我的效率画像', action: 'efficiency_profile' },
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好！我是日新助手，可以帮你分析任务、提供建议。有什么我可以帮你的？' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickAction = async (action: string) => {
    const actionConfig = QUICK_ACTIONS.find(a => a.action === action);
    if (!actionConfig) return;

    setMessages(prev => [...prev, { role: 'user', content: actionConfig.label }]);
    setLoading(true);

    try {
      const body: Record<string, string> = { message: actionConfig.label };
      
      if (action === 'analyze_procrastination') {
        body.action = 'procrastination';
      } else if (action === 'efficiency_profile') {
        body.action = 'efficiency_profile';
      }

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我暂时无法回答。请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitTask = async (taskTitle: string) => {
    setMessages(prev => [...prev, { role: 'user', content: `帮我拆分任务：${taskTitle}` }]);
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'split_task', taskTitle }),
      });
      const data = await res.json();
      
      try {
        const parsed = JSON.parse(data.reply);
        if (parsed.steps && Array.isArray(parsed.steps)) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `我帮你将「${taskTitle}」拆分为以下步骤：`,
            steps: parsed.steps.map((s: Step) => ({ ...s, completed: false }))
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        }
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，拆分失败。请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (messageIndex: number, stepIndex: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[messageIndex].steps) {
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          steps: newMessages[messageIndex].steps.map((s, i) => 
            i === stepIndex ? { ...s, completed: !s.completed } : s
          ),
        };
      }
      return newMessages;
    });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我暂时无法回答。请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted rounded-bl-md'
            )}>
              <p>{msg.content}</p>
              {msg.steps && msg.steps.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.steps.map((step, j) => {
                    const isLastCompleted = msg.steps!.slice(0, j).every(s => s.completed);
                    return (
                      <div
                        key={j}
                        onClick={() => toggleStep(i, j)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all',
                          step.completed 
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300' 
                            : isLastCompleted 
                              ? 'bg-primary/5 hover:bg-primary/10' 
                              : 'bg-background/50 opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                          step.completed 
                            ? 'bg-green-500 text-white' 
                            : isLastCompleted 
                              ? 'border-2 border-primary/30 hover:border-primary' 
                              : 'border border-muted-foreground/30'
                        )}>
                          {step.completed && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm', step.completed && 'line-through')}>
                            {j + 1}. {step.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {step.estimatedMinutes}分钟
                        </div>
                        {isLastCompleted && !step.completed && (
                          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>快捷指令</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action.action)}
                className="text-xs rounded-full px-3 py-1.5 hover:bg-primary/5 hover:border-primary/30 transition-all"
              >
                <span className="mr-1">{action.icon}</span>
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t p-4">
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs text-muted-foreground">或尝试：</span>
          <button
            onClick={() => {
              const task = prompt('请输入要拆分的任务名称：');
              if (task) handleSplitTask(task);
            }}
            className="text-xs text-primary hover:text-primary/80 underline underline-offset-2"
          >
            🪄 智能拆分任务
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '发送'}
          </Button>
        </form>
      </div>
    </div>
  );
}
