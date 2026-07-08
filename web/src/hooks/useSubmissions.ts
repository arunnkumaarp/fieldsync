'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Submission } from '@/lib/types';

export interface SubmissionFilters {
  needsReview?: boolean;
  technicianId?: string;
  jobStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  jobId?: string;
}

function buildQueryString(filters: SubmissionFilters): string {
  const params = new URLSearchParams();
  if (filters.needsReview !== undefined) params.set('needsReview', String(filters.needsReview));
  if (filters.technicianId) params.set('technicianId', filters.technicianId);
  if (filters.jobStatus) params.set('jobStatus', filters.jobStatus);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.jobId) params.set('jobId', filters.jobId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useSubmissions(filters: SubmissionFilters) {
  return useQuery({
    queryKey: ['submissions', filters],
    queryFn: () => api.get<Submission[]>(`/submissions${buildQueryString(filters)}`),
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: ['submissions', id],
    queryFn: () => api.get<Submission>(`/submissions/${id}`),
    enabled: Boolean(id),
  });
}
