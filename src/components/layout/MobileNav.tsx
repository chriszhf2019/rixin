'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, Target, BarChart3, Bot, Users, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/today', label: '今日', icon: ListChecks },
  { href: '/plan', label: '规划', icon: Target },
  { href: '/team', label: '团队', icon: Users },
  { href: '/focus', label: '专注', icon: Timer },
  { href: '/review', label: '复盘', icon: BarChart3 },
  { href: '/assistant', label: '助手', icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1.5 py-1 text-[10px] transition-colors min-w-0',
                active
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] mb-0.5" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
