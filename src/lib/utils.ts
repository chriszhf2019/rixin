import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = 'zh-CN'): string {
  return new Date(date).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
