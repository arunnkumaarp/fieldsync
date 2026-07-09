'use client';

import Link from 'next/link';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useResolveConflict } from '@/hooks/useResolveConflict';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConflictLog, Submission } from '@/lib/types';

export default function ConflictReviewPage() {
  const { data: submissions, isLoading, isError } = useSubmissions({ needsReview: true });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-xl font-bold text-gray-900">Conflict review</h1>
      <p className="mt-1 text-sm text-gray-500">
        Submissions where an offline edit collided with a newer server version. Each field below shows the
        device&apos;s value next to what&apos;s currently on the server — pick which one should win.
      </p>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-red-600">Could not load conflicts.</p>
        ) : submissions && submissions.length > 0 ? (
          submissions.map((submission) => <ConflictCard key={submission.id} submission={submission} />)
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            No submissions currently need review.
          </p>
        )}
      </div>
    </div>
  );
}

function ConflictCard({ submission }: { submission: Submission }) {
  const unresolved = submission.conflictLogs.filter((log) => !log.resolved);
  const { mutate, isPending, variables } = useResolveConflict(submission.id);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          <Link href={`/submissions/${submission.id}`} className="hover:underline">
            {submission.job?.title ?? 'Unknown job'}
          </Link>
        </CardTitle>
        <span className="text-xs text-gray-400">{submission.job?.assignee?.name ?? 'Unassigned'}</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {unresolved.length === 0 ? (
          <p className="text-sm text-gray-400">All conflicting fields resolved — refreshing…</p>
        ) : (
          unresolved.map((log) => (
            <ConflictFieldRow
              key={log.id}
              log={log}
              isPending={isPending && variables?.conflictLogId === log.id}
              onResolve={(choice) => mutate({ conflictLogId: log.id, choice })}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ConflictFieldRow({
  log,
  isPending,
  onResolve,
}: {
  log: ConflictLog;
  isPending: boolean;
  onResolve: (choice: 'local' | 'remote') => void;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{log.fieldName}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="rounded border border-gray-200 bg-white p-2">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Device (local)</p>
          <p className="mt-1 break-words text-sm text-gray-900">{formatValue(log.localValue)}</p>
          <Button size="sm" variant="outline" className="mt-2 w-full" disabled={isPending} onClick={() => onResolve('local')}>
            Use this value
          </Button>
        </div>
        <div className="rounded border border-gray-200 bg-white p-2">
          <p className="text-[10px] font-semibold uppercase text-gray-400">Server (remote)</p>
          <p className="mt-1 break-words text-sm text-gray-900">{formatValue(log.remoteValue)}</p>
          <Button size="sm" variant="outline" className="mt-2 w-full" disabled={isPending} onClick={() => onResolve('remote')}>
            Use this value
          </Button>
        </div>
      </div>
    </div>
  );
}
