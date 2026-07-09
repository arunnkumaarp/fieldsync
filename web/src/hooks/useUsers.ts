'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PublicUser } from '@/lib/types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<PublicUser[]>('/users'),
  });
}
