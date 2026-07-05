'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface DigestCardProps {
  title: string;
  content: string;
  type: 'morning' | 'evening';
}

export function DigestCard({ title, content, type }: DigestCardProps) {
  return (
    <Card className={type === 'morning' ? 'border-amber-200 bg-amber-50/50' : 'border-indigo-200 bg-indigo-50/50'}>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className={`h-4 w-4 ${type === 'morning' ? 'text-amber-500' : 'text-indigo-500'}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground">{content}</p>
      </CardContent>
    </Card>
  );
}
