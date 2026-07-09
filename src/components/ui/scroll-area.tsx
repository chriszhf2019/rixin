'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

const ScrollArea = ScrollAreaPrimitive.Root;

const ScrollAreaViewport = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>) => (
  <ScrollAreaPrimitive.Viewport
    className={cn('w-full h-full rounded-[inherit]', className)}
    {...props}
  />
);

const ScrollAreaScrollbar = ({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>) => (
  <ScrollAreaPrimitive.Scrollbar
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' && 'h-full w-2.5',
      orientation === 'horizontal' && 'h-2.5 flex-col',
      className
    )}
    {...props}
  />
);

const ScrollAreaThumb = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Thumb>) => (
  <ScrollAreaPrimitive.Thumb
    className={cn(
      'relative flex-1 rounded-full bg-border',
      'data-[state=hover]:bg-muted',
      'data-[state=active]:bg-muted',
      className
    )}
    {...props}
  />
);

export { ScrollArea, ScrollAreaViewport, ScrollAreaScrollbar, ScrollAreaThumb };