'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(target.tagName);
    const isEditable = target.isContentEditable;

    if (isInputFocused || isEditable) return;

    switch (e.key.toLowerCase()) {
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

  return <>{children}</>;
}