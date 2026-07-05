'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { TeamActivity } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ActivityCardProps {
  activity: TeamActivity;
  onUpdate: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planning: { label: '筹备中', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-700 border-green-200' },
  completed: { label: '已完成', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function ActivityCard({ activity, onUpdate }: ActivityCardProps) {
  const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.planning;
  const memberCount = activity.members?.length ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{activity.title}</CardTitle>
            <Badge variant="outline" className={`text-[10px] ${statusConfig.color}`}>
              {statusConfig.label}
            </Badge>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{activity.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {activity.description && <p>{activity.description}</p>}
                {activity.date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> {formatDate(activity.date)}
                  </div>
                )}
                {activity.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {activity.location}
                  </div>
                )}
                <div>
                  <p className="font-medium mb-2">成员 ({memberCount})</p>
                  <div className="flex flex-wrap gap-2">
                    {activity.members?.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px]">{m.user?.name?.[0] ?? '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{m.user?.name ?? '用户'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-4">
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
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {memberCount}人
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
