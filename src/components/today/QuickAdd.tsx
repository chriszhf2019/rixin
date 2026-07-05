'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, Sparkles, Mic, Check, X, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface QuickAddProps {
  onTaskCreated: () => void;
}

interface ParsedResult {
  title: string;
  description?: string | null;
  priority: string;
  due_date?: string | null;
  subtasks?: { title: string; done: boolean }[];
}

export function QuickAdd({ onTaskCreated }: QuickAddProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [editingSubtasks, setEditingSubtasks] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const reset = () => {
    setInput('');
    setParsedResult(null);
    setEditingSubtasks([]);
    setOpen(false);
  };

  const handleParse = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const data = await res.json();
        setParsedResult({
          title: data.title,
          description: data.description,
          priority: data.priority,
          due_date: data.due_date,
          subtasks: data.subtasks || [],
        });
        if (data.subtasks?.length) {
          setEditingSubtasks(data.subtasks.map((s: { title: string }) => s.title));
        } else {
          // No subtasks to edit, auto-confirm
          await confirmCreate(data);
          reset();
        }
      } else {
        await confirmCreate({ title: text });
        reset();
      }
    } catch {
      await confirmCreate({ title: text });
      reset();
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmCreate = async (data: { title: string; description?: string | null; priority?: string; due_date?: string | null }) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.success('任务已创建');
      onTaskCreated();
    } else {
      toast.error('创建失败');
    }
  };

  const confirmTask = async () => {
    if (!parsedResult) return;
    await confirmCreate({
      title: parsedResult.title,
      description: parsedResult.description,
      priority: parsedResult.priority,
      due_date: parsedResult.due_date,
    });
    reset();
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('您的浏览器不支持语音输入');
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleParse(transcript);
      setRecording(false);
    };

    recognition.onerror = () => {
      toast.error('语音识别失败，请重试');
      setRecording(false);
    };

    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  if (!open) {
    return (
      <Button
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>AI 智能解析 · 试试说"明天下午3点买菜"</span>
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="输入任务... 支持自然语言"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleParse(input);
              }
            }}
            className="min-h-[60px] resize-none flex-1"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <Button
              variant={recording ? 'default' : 'outline'}
              size="icon"
              className={`h-9 w-9 ${recording ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : ''}`}
              onClick={recording ? stopVoiceInput : handleVoiceInput}
              title="语音输入"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI 正在解析...</span>
          </div>
        )}

        {parsedResult && !loading && (
          <div className="space-y-3 bg-muted/50 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI 解析结果</span>
            </div>

            <div className="space-y-2">
              <Input
                value={parsedResult.title}
                onChange={(e) => setParsedResult({ ...parsedResult, title: e.target.value })}
                className="text-sm"
              />

              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className={
                  parsedResult.priority === 'urgent' ? 'text-red-600 border-red-300' :
                  parsedResult.priority === 'high' ? 'text-orange-600 border-orange-300' :
                  parsedResult.priority === 'medium' ? 'text-blue-600 border-blue-300' : ''
                }>
                  {{ urgent: '紧急', high: '高', medium: '中', low: '低' }[parsedResult.priority] || '中'}
                </Badge>
                {parsedResult.due_date && (
                  <span className="text-xs text-muted-foreground">
                    截止: {new Date(parsedResult.due_date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </span>
                )}
              </div>

              {editingSubtasks.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>AI 建议拆解为以下子任务（可编辑）</span>
                  </div>
                  {editingSubtasks.map((sub, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={sub}
                        onChange={(e) => {
                          const next = [...editingSubtasks];
                          next[i] = e.target.value;
                          setEditingSubtasks(next);
                        }}
                        className="text-sm h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingSubtasks(editingSubtasks.filter((_, j) => j !== i))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={reset}>取消</Button>
              <Button size="sm" onClick={confirmTask}>
                <Check className="h-4 w-4 mr-1" /> 确认创建
              </Button>
            </div>
          </div>
        )}

        {!parsedResult && !loading && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>取消</Button>
            <Button onClick={() => handleParse(input)} disabled={!input.trim()}>
              <Sparkles className="h-4 w-4 mr-1" /> AI 解析
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
