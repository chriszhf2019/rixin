'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, Goal } from '@/types';

export function useTasks() {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return res.json() as Promise<Task[]>;
    },
  });

  const createTask = useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) {
        throw new Error('Failed to create task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error('Failed to update task');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete task');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    tasks: tasks || [],
    isLoading,
    refetch,
    createTask,
    updateTask,
    deleteTask,
  };
}

export function useGoals() {
  const queryClient = useQueryClient();

  const { data: goals, isLoading, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await fetch('/api/goals');
      if (!res.ok) {
        throw new Error('Failed to fetch goals');
      }
      return res.json() as Promise<Goal[]>;
    },
  });

  const createGoal = useMutation({
    mutationFn: async (goalData: { title: string; description?: string; quarter: number; year: number }) => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      if (!res.ok) {
        throw new Error('Failed to create goal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  return {
    goals: goals || [],
    isLoading,
    refetch,
    createGoal,
  };
}

export function useWeeklyPlans() {
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['weeklyPlans'],
    queryFn: async () => {
      const res = await fetch('/api/weekly-plans');
      if (!res.ok) {
        throw new Error('Failed to fetch weekly plans');
      }
      return res.json();
    },
  });

  return {
    plans: plans || [],
    isLoading,
    refetch,
  };
}

export function useMonthlyPlans() {
  const { data: plans, isLoading, refetch } = useQuery({
    queryKey: ['monthlyPlans'],
    queryFn: async () => {
      const res = await fetch('/api/monthly-plans');
      if (!res.ok) {
        throw new Error('Failed to fetch monthly plans');
      }
      return res.json();
    },
  });

  return {
    plans: plans || [],
    isLoading,
    refetch,
  };
}
