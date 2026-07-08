'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutsOptions {
  onNewTask?: () => void;
}

export function useKeyboardShortcuts({ onNewTask }: KeyboardShortcutsOptions = {}) {
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isInputFocused = ['INPUT', 'TEXTAREA'].includes(e.target instanceof HTMLElement ? e.target.tagName : '');
    const isEditable = e.target instanceof HTMLElement && e.target.isContentEditable;

    if (isInputFocused || isEditable) return;

    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        onNewTask?.();
        break;
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          router.push('/today');
        }
        break;
      case 'p':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          router.push('/plan');
        }
        break;
      case 'f':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          router.push('/focus');
        }
        break;
      case 'r':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          router.push('/review');
        }
        break;
      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          router.push('/assistant');
        }
        break;
    }
  }, [onNewTask, router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}