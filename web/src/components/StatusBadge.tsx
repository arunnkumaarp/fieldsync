import { Badge } from '@/components/ui/badge';
import type { JobStatus } from '@/lib/types';

const STATUS_VARIANT: Record<JobStatus, 'default' | 'blue' | 'green' | 'red'> = {
  PENDING: 'default',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status.replace('_', ' ')}</Badge>;
}
