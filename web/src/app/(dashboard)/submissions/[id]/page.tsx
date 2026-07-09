'use client';

import { use } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Camera, PenTool } from 'lucide-react';
import { useSubmission } from '@/hooks/useSubmissions';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: submission, isLoading, isError } = useSubmission(id);

  if (isLoading) return <p className="p-8 text-sm text-gray-400">Loading…</p>;
  if (isError || !submission) return <p className="p-8 text-sm text-red-600">Submission not found.</p>;

  const formFields = Object.entries(submission.data).filter(([key]) => key !== '_meta');
  const meta = submission.data._meta as { submittedAt?: string; gps?: { lat: number; lng: number } } | undefined;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/submissions" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{submission.job?.title ?? 'Unknown job'}</h1>
          <p className="mt-1 text-sm text-gray-500">{submission.job?.assignee?.name ?? 'Unassigned'}</p>
        </div>
        <div className="flex items-center gap-2">
          {submission.needsReview ? <Badge variant="amber">Needs review</Badge> : null}
          {submission.job ? <StatusBadge status={submission.job.status} /> : null}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Form data</CardTitle>
        </CardHeader>
        <CardContent>
          {formFields.length === 0 ? (
            <p className="text-sm text-gray-400">No fields captured.</p>
          ) : (
            <dl className="divide-y divide-gray-100">
              {formFields.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 py-2 text-sm">
                  <dt className="text-gray-500">{key}</dt>
                  <dd className="text-right font-medium text-gray-900">{formatFieldValue(value)}</dd>
                </div>
              ))}
            </dl>
          )}
          {meta?.gps ? (
            <p className="mt-3 text-xs text-gray-400">
              Captured at {meta.gps.lat.toFixed(5)}, {meta.gps.lng.toFixed(5)}
              {meta.submittedAt ? ` on ${format(new Date(meta.submittedAt), 'PPpp')}` : ''}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attachments ({submission.attachments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {submission.attachments.length === 0 ? (
            <p className="text-sm text-gray-400">No attachments.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {submission.attachments.map((attachment) => (
                <div key={attachment.id} className="overflow-hidden rounded-md border border-gray-200">
                  {attachment.remoteUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={attachment.remoteUrl} alt={attachment.type} className="h-32 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 flex-col items-center justify-center gap-1 bg-gray-50 text-gray-400">
                      {attachment.type === 'signature' ? <PenTool className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                      <span className="text-[10px]">Not yet uploaded</span>
                    </div>
                  )}
                  <p className="border-t border-gray-100 px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400">
                    {attachment.type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sync &amp; audit history</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between text-gray-500">
              <span>Created on server</span>
              <span className="text-gray-900">{format(new Date(submission.serverCreatedAt), 'PPpp')}</span>
            </li>
            <li className="flex justify-between text-gray-500">
              <span>Last modified</span>
              <span className="text-gray-900">{format(new Date(submission.lastModified), 'PPpp')}</span>
            </li>
          </ul>

          {submission.conflictLogs.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Conflict history</p>
              <ul className="mt-2 space-y-2">
                {submission.conflictLogs.map((log) => (
                  <li key={log.id} className="rounded-md bg-gray-50 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">{log.fieldName}</span>
                      <Badge variant={log.resolved ? 'green' : 'amber'}>{log.resolved ? 'Resolved' : 'Unresolved'}</Badge>
                    </div>
                    <p className="mt-1 text-gray-500">
                      local: {formatFieldValue(log.localValue)} · remote: {formatFieldValue(log.remoteValue)}
                      {log.resolved ? ` · resolved to: ${formatFieldValue(log.resolvedValue)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
