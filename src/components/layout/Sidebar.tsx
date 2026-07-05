'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ListChecks, Target, BarChart3, Bot, LogOut, Settings, Users, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { Profile } from '@/types';

const NAV_ITEMS = [
  { href: '/today', label: '今日', icon: ListChecks },
  { href: '/plan', label: '规划', icon: Target },
  { href: '/team', label: '团队', icon: Users },
  { href: '/focus', label: '专注', icon: Timer },
  { href: '/review', label: '复盘', icon: BarChart3 },
  { href: '/assistant', label: '助手', icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    }).catch(() => {
      // ignore auth errors in sidebar
    });
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('已退出登录');
    router.push('/login');
  };

  return (
    <aside className="hidden md:flex md:w-56 lg:w-64 flex-col border-r bg-background min-h-screen">
      <div className="p-4 border-b">
        <Link href="/today" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-amber-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">日</span>
          </div>
          <div>
            <h1 className="font-bold text-base">日新</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">日有所进，日有所新</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {profile?.name?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{profile?.name ?? '用户'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" /> 设置
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> 退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
