'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Lightbulb, Wrench, FileText, Tag, Clock, BarChart3, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ExperienceCard } from '@/types';

const CATEGORY_CONFIG = {
  lesson: { label: '教训', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30' },
  insight: { label: '洞察', icon: BarChart3, color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30' },
  method: { label: '方法', icon: Wrench, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' },
  resource: { label: '资源', icon: FileText, color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30' },
} as const;

interface ExperienceCardListProps {
  taskId?: string;
  taskTitle?: string;
  compact?: boolean;
}

export function ExperienceCardList({ taskId, taskTitle, compact }: ExperienceCardListProps) {
  const [cards, setCards] = useState<ExperienceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/experience-cards');
      const data = await res.json();
      setCards(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const displayCards = compact ? cards.slice(0, 3) : cards;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          经验卡片
          {cards.length > 0 && (
            <span className="text-xs text-muted-foreground">({cards.length})</span>
          )}
        </h3>
        <ExperienceCardEditor
          taskId={taskId}
          taskTitle={taskTitle}
          onSaved={() => {
            fetchCards();
            setShowCreate(false);
          }}
        >
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            记录经验
          </Button>
        </ExperienceCardEditor>
      </div>

      {displayCards.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>还没有经验卡片</p>
          <p className="text-xs mt-1">完成任务后记录经验，构建你的个人知识库</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayCards.map(card => {
            const config = CATEGORY_CONFIG[card.category];
            const Icon = config.icon;
            return (
              <Card key={card.id} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{card.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${config.color} border-0`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{card.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        {card.task_title && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {card.task_title}
                          </span>
                        )}
                        {card.actual_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {card.actual_minutes}分钟
                          </span>
                        )}
                        <span>{new Date(card.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {compact && cards.length > 3 && (
        <p className="text-xs text-center text-muted-foreground">
          查看全部 {cards.length} 张卡片
        </p>
      )}
    </div>
  );
}

export function ExperienceCardEditor({
  taskId,
  taskTitle,
  onSaved,
  children,
}: {
  taskId?: string;
  taskTitle?: string;
  onSaved?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'lesson' | 'insight' | 'method' | 'resource'>('lesson');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [actualMinutes, setActualMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('请填写标题和内容');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/experience-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId || null,
          task_title: taskTitle || null,
          title: title.trim(),
          content: content.trim(),
          category,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          difficulty,
          actual_minutes: actualMinutes ? parseInt(actualMinutes) : null,
        }),
      });

      if (res.ok) {
        toast.success('经验已记录');
        setTitle('');
        setContent('');
        setTags('');
        setActualMinutes('');
        setOpen(false);
        onSaved?.();
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            记录经验
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {taskTitle && (
            <div className="bg-muted/50 rounded-md px-3 py-2 text-xs text-muted-foreground">
              关联任务：{taskTitle}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium">标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="一句话总结这个经验"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">详细内容</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录你的发现、教训、方法或资源..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">类型</label>
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map(key => {
                  const config = CATEGORY_CONFIG[key];
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] border transition-all ${
                        category === key
                          ? `${config.color} border-current`
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">难度</label>
              <div className="grid grid-cols-3 gap-1">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-1.5 rounded-md text-[10px] border transition-all ${
                      difficulty === d
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {d === 'easy' ? '简单' : d === 'medium' ? '中等' : '困难'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">标签（逗号分隔）</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="如：沟通, 技术, 管理"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">实际耗时（分钟）</label>
            <Input
              type="number"
              value={actualMinutes}
              onChange={(e) => setActualMinutes(e.target.value)}
              placeholder="如：45"
              className="h-9"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存经验'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
