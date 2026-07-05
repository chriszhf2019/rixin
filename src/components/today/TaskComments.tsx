'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Comment } from '@/types';

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?task_id=${taskId}`)
      .then(r => r.json())
      .then(setComments)
      .finally(() => setLoading(false));
  }, [taskId]);

  const sendComment = async () => {
    if (!content.trim()) return;
    setSending(true);
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, content }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments(prev => [...prev, newComment]);
      setContent('');
    }
    setSending(false);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">评论 ({comments.length})</h4>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">暂无评论</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">
                  {comment.user?.name?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{comment.user?.name ?? '用户'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="添加评论..."
          className="flex-1 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && sendComment()}
        />
        <Button size="icon" variant="ghost" onClick={sendComment} disabled={sending || !content.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
