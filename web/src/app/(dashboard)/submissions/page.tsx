'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, X } from 'lucide-react';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useUsers } from '@/hooks/useUsers';
import { useJobs } from '@/hooks/useJobs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import type { JobStatus } from '@/lib/types';

const JOB_STATUSES: JobStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const ALL = '__all__';

export default function SubmissionsFeedPage() {
  return (
    <Suspense fallback={null}>
      <SubmissionsFeed />
    </Suspense>
  );
}

function SubmissionsFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') ?? undefined;

  const [technicianId, setTechnicianId] = useState<string>(ALL);
  const [jobStatus, setJobStatus] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: users } = useUsers();
  const { data: jobs } = useJobs();
  const { data: submissions, isLoading, isError } = useSubmissions({
    technicianId: technicianId === ALL ? undefined : technicianId,
    jobStatus: jobStatus === ALL ? undefined : jobStatus,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    jobId,
  });

  const technicians = useMemo(() => users?.filter((u) => u.role !== 'ADMIN') ?? [], [users]);
  const jobIdFilterLabel = useMemo(() => jobs?.find((j) => j.id === jobId)?.title, [jobs, jobId]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-xl font-bold text-gray-900">Submissions feed</h1>
      <p className="mt-1 text-sm text-gray-500">Live-updating list of field submissions across your org.</p>

      {jobId ? (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Filtering by job: <span className="font-semibold">{jobIdFilterLabel ?? jobId}</span>
          <button onClick={() => router.push('/submissions')} className="ml-auto text-blue-500 hover:text-blue-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="w-48">
          <Label>Technician</Label>
          <Select value={technicianId} onValueChange={setTechnicianId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All technicians</SelectItem>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Label>Job status</Label>
          <Select value={jobStatus} onValueChange={setJobStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {JOB_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>From</Label>
          <Input type="date" className="mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" className="mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <p className="p-6 text-sm text-gray-400">Loading…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-red-600">Could not load submissions.</p>
        ) : submissions && submissions.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {submissions.map((submission) => (
              <li key={submission.id}>
                <Link
                  href={`/submissions/${submission.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {submission.job?.title ?? 'Unknown job'}
                      </p>
                      {submission.needsReview ? (
                        <Badge variant="amber" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Needs review
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {submission.job?.assignee?.name ?? 'Unassigned'} · updated{' '}
                      {formatDistanceToNow(new Date(submission.lastModified), { addSuffix: true })}
                    </p>
                  </div>
                  {submission.job ? <StatusBadge status={submission.job.status} /> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-gray-400">No submissions match these filters.</p>
        )}
      </div>
    </div>
  );
}
