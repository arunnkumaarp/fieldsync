'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Submission } from '@/lib/types';

export interface ResolveConflictInput {
  conflictLogId: string;
  choice: 'local' | 'remote' | 'custom';
  customValue?: unknown;
}

export function useResolveConflict(submissionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveConflictInput) => api.post<Submission>(`/submissions/${submissionId}/resolve`, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['submissions', submissionId], updated);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}
