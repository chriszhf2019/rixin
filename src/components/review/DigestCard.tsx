'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DigestCardProps {
  title: string;
  content: string;
  type: 'morning' | 'evening';
}

export function DigestCard({ title, content, type }: DigestCardProps) {
  const isMorning = type === 'morning';

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all hover:shadow-md',
        isMorning
          ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50/50 border-amber-200/50'
          : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50/50 border-indigo-200/50'
      )}
    >
      <CardHeader className="py-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {isMorning ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          )}
          <span className={cn(isMorning ? 'text-amber-700' : 'text-indigo-700')}>
            {title}
          </span>
          <Sparkles className={cn('h-3 w-3 ml-auto', isMorning ? 'text-amber-400' : 'text-indigo-400')} />
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <p className={cn('text-sm leading-relaxed', isMorning ? 'text-amber-900/80' : 'text-indigo-900/80')}>
          {content}
        </p>
      </CardContent>
    </Card>
  );
}