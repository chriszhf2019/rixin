'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Play, Clock, Repeat, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { TaskTemplate } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  work: '工作',
  study: '学习',
  life: '生活',
  health: '健康',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  work: 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  study: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
  life: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  health: 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
};

export function TaskTemplateList() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/task-templates');
      const data = await res.json();
      setTemplates(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUse = async (templateId: string) => {
    try {
      const res = await fetch(`/api/task-templates/${templateId}/use`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('已从模板创建任务');
        fetchTemplates();
      } else {
        toast.error('创建失败');
      }
    } catch {
      toast.error('创建失败');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            SOP 模板库
          </h2>
          <p className="text-sm text-muted-foreground mt-1">将重复性任务沉淀为模板，一键复用</p>
        </div>
        <TemplateEditor onSaved={fetchTemplates}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新建模板
          </Button>
        </TemplateEditor>
      </div>

      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-medium">还没有模板</p>
            <p className="text-xs text-muted-foreground mt-1">
              将重复性任务保存为模板，下次一键创建，省去重复输入
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <Card key={template.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
                    onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  >
                    {expandedId === template.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{template.title}</span>
                      <Badge variant="outline" className={`text-[10px] border-0 ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.general}`}>
                        {CATEGORY_LABELS[template.category] || template.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      {template.estimated_minutes > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {template.estimated_minutes}分钟
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Repeat className="h-3 w-3" />
                        使用 {template.use_count} 次
                      </span>
                      {template.subtasks && template.subtasks.length > 0 && (
                        <span>{template.subtasks.length} 个子任务</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleUse(template.id)}>
                    <Play className="h-3.5 w-3.5 mr-1" />
                    使用
                  </Button>
                </div>

                {expandedId === template.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {template.description && (
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    )}
                    {template.subtasks && template.subtasks.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">子任务清单：</p>
                        {template.subtasks
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((st, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs pl-2">
                              <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[8px]">
                                {idx + 1}
                              </span>
                              {st.title}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  onSaved,
  children,
}: {
  onSaved?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [estimatedMinutes, setEstimatedMinutes] = useState('30');
  const [subtasks, setSubtasks] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请输入模板标题');
      return;
    }

    const validSubtasks = subtasks
      .filter(s => s.trim())
      .map((s, i) => ({ title: s.trim(), sort_order: i }));

    setSaving(true);
    try {
      const res = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          estimated_minutes: parseInt(estimatedMinutes) || 30,
          subtasks: validSubtasks,
        }),
      });

      if (res.ok) {
        toast.success('模板已创建');
        setTitle('');
        setDescription('');
        setSubtasks(['']);
        setEstimatedMinutes('30');
        setCategory('general');
        setOpen(false);
        onSaved?.();
      } else {
        toast.error('创建失败');
      }
    } catch {
      toast.error('创建失败');
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
            <ClipboardList className="h-5 w-5 text-primary" />
            新建模板
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">模板标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：周报撰写流程"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">描述（可选）</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="模板的适用场景或注意事项..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm h-9"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">预计耗时（分钟）</label>
              <Input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">子任务步骤</label>
            <div className="space-y-2">
              {subtasks.map((st, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <Input
                    value={st}
                    onChange={(e) => {
                      const newSubtasks = [...subtasks];
                      newSubtasks[idx] = e.target.value;
                      setSubtasks(newSubtasks);
                    }}
                    placeholder={`步骤 ${idx + 1}`}
                    className="h-8"
                  />
                  {subtasks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => setSubtasks(subtasks.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full border border-dashed"
                onClick={() => setSubtasks([...subtasks, ''])}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                添加步骤
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '创建模板'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
