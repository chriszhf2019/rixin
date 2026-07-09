'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Command, ArrowRight, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['N'], description: '快速添加任务', category: '任务操作' },
  { keys: ['1'], description: '跳转到今日', category: '导航' },
  { keys: ['2'], description: '跳转到规划', category: '导航' },
  { keys: ['3'], description: '跳转到团队', category: '导航' },
  { keys: ['4'], description: '跳转到专注', category: '导航' },
  { keys: ['5'], description: '跳转到复盘', category: '导航' },
  { keys: ['6'], description: '跳转到助手', category: '导航' },
  { keys: ['Ctrl/Cmd', 'T'], description: '跳转到今日', category: '导航' },
  { keys: ['Ctrl/Cmd', 'P'], description: '跳转到规划', category: '导航' },
  { keys: ['Ctrl/Cmd', 'F'], description: '跳转到专注', category: '导航' },
  { keys: ['Ctrl/Cmd', 'R'], description: '跳转到复盘', category: '导航' },
  { keys: ['Ctrl/Cmd', 'A'], description: '跳转到助手', category: '导航' },
  { keys: ['Ctrl/Cmd', 'K'], description: '打开快捷键面板', category: '系统' },
  { keys: ['Tab'], description: '切换标签页', category: '导航' },
  { keys: ['Shift', 'Tab'], description: '切换标签页（反向）', category: '导航' },
];

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(target.tagName);
    const isEditable = target.isContentEditable;

    if (isInputFocused || isEditable) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setShowShortcuts(true);
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'escape':
        setShowShortcuts(false);
        break;
      case 'n':
        e.preventDefault();
        const quickInput = document.querySelector<HTMLInputElement>('#quick-add-input');
        if (quickInput) {
          quickInput.focus();
        } else {
          const plusBtn = document.querySelector<HTMLButtonElement>('[aria-label="Quick Add"], button[onclick*="setOpen(true)"]');
          plusBtn?.click();
        }
        break;
      case 'tab':
        if (e.shiftKey) {
          e.preventDefault();
          const tabsList = document.querySelector('[role="tablist"]');
          if (tabsList) {
            const tabs = Array.from(tabsList.querySelectorAll('[role="tab"]'));
            const activeTab = tabs.find(t => t.getAttribute('aria-selected') === 'true');
            const currentIndex = activeTab ? tabs.indexOf(activeTab) : 0;
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
            (tabs[prevIndex] as HTMLElement).click();
          }
        } else {
          const tabsList = document.querySelector('[role="tablist"]');
          if (tabsList && !e.ctrlKey && !e.metaKey) {
            const tabs = Array.from(tabsList.querySelectorAll('[role="tab"]'));
            const activeTab = tabs.find(t => t.getAttribute('aria-selected') === 'true');
            const currentIndex = activeTab ? tabs.indexOf(activeTab) : 0;
            const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
            (tabs[nextIndex] as HTMLElement).click();
          }
        }
        break;
      case 't':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          router.push('/today');
        }
        break;
      case 'p':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          router.push('/plan');
        }
        break;
      case 'f':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          router.push('/focus');
        }
        break;
      case 'r':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          router.push('/review');
        }
        break;
      case 'a':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          e.preventDefault();
          router.push('/assistant');
        }
        break;
      case '1':
        e.preventDefault();
        router.push('/today');
        break;
      case '2':
        e.preventDefault();
        router.push('/plan');
        break;
      case '3':
        e.preventDefault();
        router.push('/team');
        break;
      case '4':
        e.preventDefault();
        router.push('/focus');
        break;
      case '5':
        e.preventDefault();
        router.push('/review');
        break;
      case '6':
        e.preventDefault();
        router.push('/assistant');
        break;
    }
  }, [router, pathname]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {children}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              快捷键面板
            </DialogTitle>
            <DialogDescription>
              按下以下快捷键快速操作日新
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">{category}</h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />}
                            <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              按 <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded">Esc</kbd> 关闭面板
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}