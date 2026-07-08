'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ completed, total, size = 120, strokeWidth = 8 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const offset = circumference - (percentage / 100) * circumference;
  
  const [animate, setAnimate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (completed > 0 && completed === total) {
      setAnimate(true);
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setAnimate(false);
      }, 1000);
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(confettiTimer);
      };
    } else if (completed > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [completed, total]);

  const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
  const confetti = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random(),
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <div className="relative inline-flex items-center justify-center">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {confetti.map((c) => (
            <div
              key={c.id}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                left: `${c.left}%`,
                top: '50%',
                backgroundColor: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
              }}
            />
          ))}
        </div>
      )}
      
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
          opacity={0.2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-700 ease-out', 
            animate ? 'text-primary scale-105' : 'text-primary',
            percentage === 100 ? 'text-green-500' : '')}
          style={{
            filter: animate ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.6))' : 'none',
          }}
        />
      </svg>
      
      <div className={cn('absolute flex flex-col items-center transition-transform', animate && 'scale-110')}>
        <span className={cn('text-2xl font-bold transition-all', percentage === 100 && 'text-green-500')}>
          {percentage}%
        </span>
        <span className="text-xs text-muted-foreground">
          {percentage === 100 ? '太棒了！全部完成' : '今日进度'}
        </span>
      </div>
    </div>
  );
}
