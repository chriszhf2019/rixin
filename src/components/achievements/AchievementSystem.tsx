'use client';

import { useState, useEffect } from 'react';
import { Award, Lock, ChevronRight, Trophy, Flame, Target, Zap, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ACHIEVEMENT_DEFINITIONS, CATEGORY_LABELS } from '@/lib/achievements/definitions';
import type { EfficiencyProfile } from '@/types';

interface AchievementProgress {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  currentProgress: number;
  nextLevelTarget: number;
  unlocked: boolean;
  nextLevelTitle: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  efficiency: <Zap className="h-4 w-4" />,
  consistency: <Flame className="h-4 w-4" />,
  growth: <Target className="h-4 w-4" />,
  collaboration: <Users className="h-4 w-4" />,
};

export function AchievementSystem() {
  const [profile, setProfile] = useState<EfficiencyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/efficiency-profile');
      const data = await res.json();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch efficiency profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAchievements = (): AchievementProgress[] => {
    if (!profile) return [];

    return ACHIEVEMENT_DEFINITIONS.map(def => {
      let progress = 0;
      
      switch (def.key) {
        case 'first_task':
          progress = profile.completedTasks;
          break;
        case 'streak':
          progress = profile.streak;
          break;
        case 'focus_hours':
          progress = profile.totalFocusMinutes;
          break;
        case 'goal_completed':
          progress = Math.floor(profile.completedTasks * 0.4);
          break;
        case 'early_bird':
          progress = Math.floor(profile.completedTasks * 0.15);
          break;
        case 'night_owl':
          progress = Math.floor(profile.completedTasks * 0.1);
          break;
        case 'review_streak':
          progress = Math.floor(profile.streak * 0.7);
          break;
        case 'team_player':
          progress = 0;
          break;
        case 'blocker_breaker':
          progress = Math.floor(profile.completedTasks * 0.1);
          break;
        case 'template_creator':
          progress = 0;
          break;
        default:
          progress = 0;
      }

      let currentLevel = 0;
      let nextLevelTarget = def.levels[0]?.target || 1;
      let currentLevelProgress = 0;

      for (let i = def.levels.length - 1; i >= 0; i--) {
        if (progress >= def.levels[i].target) {
          currentLevel = i + 1;
          if (i < def.levels.length - 1) {
            nextLevelTarget = def.levels[i + 1].target;
          } else {
            nextLevelTarget = def.levels[i].target;
          }
          break;
        }
      }

      if (currentLevel === 0) {
        nextLevelTarget = def.levels[0].target;
        currentLevelProgress = (progress / nextLevelTarget) * 100;
      } else if (currentLevel >= def.levels.length) {
        currentLevelProgress = 100;
      } else {
        const prevTarget = def.levels[currentLevel - 1].target;
        currentLevelProgress = ((progress - prevTarget) / (nextLevelTarget - prevTarget)) * 100;
      }

      const nextLevelTitle = currentLevel < def.levels.length
        ? def.levels[currentLevel].title
        : '已满级';

      return {
        key: def.key,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        currentLevel,
        maxLevel: def.levels.length,
        currentProgress: Math.min(currentLevelProgress, 100),
        nextLevelTarget,
        unlocked: currentLevel > 0,
        nextLevelTitle,
      };
    });
  };

  const achievements = calculateAchievements();
  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalLevels = achievements.reduce((sum, a) => sum + a.currentLevel, 0);

  if (loading) {
    return <AchievementsSkeleton />;
  }

  const categories = ['all', 'efficiency', 'consistency', 'growth', 'collaboration'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          成就系统
        </h2>
        <div className="text-sm text-muted-foreground">
          已解锁 <span className="font-semibold text-foreground">{totalUnlocked}</span> / {achievements.length}
        </div>
      </div>

      <Card className="border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">成就等级</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                Lv.{totalLevels}
              </p>
            </div>
            <div className="text-6xl opacity-50">🏆</div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>距下一等级</span>
              <span>{totalLevels} / {achievements.length * 5}</span>
            </div>
            <Progress value={(totalLevels / (achievements.length * 5)) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="py-2 text-xs">
              {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]?.label || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid gap-3">
              {achievements
                .filter(a => cat === 'all' || a.category === cat)
                .map(achievement => (
                  <AchievementCard key={achievement.key} achievement={achievement} />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementProgress }) {
  const categoryInfo = CATEGORY_LABELS[achievement.category];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      achievement.unlocked
        ? 'bg-card border-border hover:border-primary/50'
        : 'bg-muted/30 border-border/50 opacity-70'
    }`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
        achievement.unlocked
          ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'
          : 'bg-muted'
      }`}>
        {achievement.unlocked ? achievement.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{achievement.title}</span>
          {achievement.currentLevel > 0 && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Lv.{achievement.currentLevel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{achievement.nextLevelTitle}</span>
            <span>{Math.round(achievement.currentProgress)}%</span>
          </div>
          <Progress value={achievement.currentProgress} className="h-1" />
        </div>
      </div>
    </div>
  );
}

function AchievementsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-24" />
      <Card className="border-0">
        <CardContent className="p-5">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
          <Skeleton className="h-2 w-full mt-4" />
        </CardContent>
      </Card>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
