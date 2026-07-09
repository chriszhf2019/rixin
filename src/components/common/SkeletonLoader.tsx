'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted rounded-md',
        className
      )}
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
      <div className="w-5 h-5 rounded-md bg-muted" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function CalendarDaySkeleton() {
  return (
    <div className="flex-1 text-center py-2 rounded-lg bg-muted/50 space-y-1">
      <Skeleton className="h-3 w-8 mx-auto" />
      <Skeleton className="h-4 w-6 mx-auto" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}

export function EmptyStateSkeleton() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/50" />
      <Skeleton className="h-5 w-48 mx-auto mb-2" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex justify-center py-12">
      <div className={cn('animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary', sizes[size])} />
    </div>
  );
}
