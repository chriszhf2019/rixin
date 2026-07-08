'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, MoreHorizontal, AlertTriangle, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { TeamActivity } from '@/types';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  activity: TeamActivity;
  onUpdate: () => void;
  onClick: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: '筹备中', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-700 border-green-200' },
  completed: { label: '已完成', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function ActivityCard({ activity, onUpdate, onClick }: ActivityCardProps) {
  const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.planning;
  const memberCount = activity.members?.length ?? 0;
  const taskCount = activity.tasks?.length ?? 0;
  const completedTasks = activity.tasks?.filter(t => t.status === 'done').length ?? 0;
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
  
  const isUrgent = activity.date && new Date(activity.date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const hasBlocker = activity.has_blocker || activity.tasks?.some(t => t.blocker_reason);

  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  const hoveredMemberTasks = hoveredMember 
    ? activity.tasks?.filter(t => t.assignee_id === hoveredMember) 
    : [];

  return (
    <Card 
      className={cn(
        'hover:shadow-md transition-all cursor-pointer',
        hasBlocker && 'border-orange-300 bg-orange-50/30 animate-pulse-slow'
      )}
      onClick={onClick}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{activity.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${
                isUrgent && activity.status !== 'completed' ? 'bg-red-100 text-red-700 border-red-200' : statusConfig.color
              }`}>
                {isUrgent && activity.status !== 'completed' ? '🔴 临近截止' : statusConfig.label}
              </Badge>
              {hasBlocker && (
                <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {activity.blocker_count || 1}个卡点
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-4 space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {activity.date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(activity.date)}
            </div>
          )}
          {activity.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {activity.location}
            </div>
          )}
        </div>

        {taskCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completedTasks}/{taskCount}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{memberCount}人</span>
          </div>
          <div className="flex -space-x-2">
            {activity.members?.slice(0, 4).map(member => (
              <div 
                key={member.user_id}
                className="relative"
                onMouseEnter={() => setHoveredMember(member.user_id)}
                onMouseLeave={() => setHoveredMember(null)}
              >
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-[10px]">
                    {member.user?.name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                {hoveredMember === member.user_id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-background border rounded-lg shadow-lg z-10 p-2 w-48">
                    <p className="text-xs font-medium mb-1">{member.user?.name}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">角色: {member.role}</p>
                    {(hoveredMemberTasks ?? []).length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">负责任务:</p>
                        {(hoveredMemberTasks ?? []).map(task => (
                          <p key={task.id} className="text-xs">{task.title}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">暂无分配任务</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {memberCount > 4 && (
              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px]">
                +{memberCount - 4}
              </div>
            )}
          </div>
        </div>

        {hasBlocker && (
          <div className="text-xs text-orange-600 bg-orange-50/50 rounded px-2 py-1">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            有任务存在卡点，需及时处理
          </div>
        )}
      </CardContent>
    </Card>
  );
}