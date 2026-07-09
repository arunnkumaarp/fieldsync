import { useEffect, useRef, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/react';

const SYNCABLE_TABLES = ['jobs', 'submissions', 'attachments'] as const;

// Counts local rows WatermelonDB hasn't marked `synced` yet (i.e. created,
// updated, or deleted locally since the last successful sync). This is
// purely local bookkeeping — it works even with zero connectivity, which is
// why it's safe to show in phase 2 before `synchronize()` exists at all.
export function usePendingChangesCount(): number {
  const database = useDatabase();
  const [count, setCount] = useState(0);
  const perTableCounts = useRef<number[]>(SYNCABLE_TABLES.map(() => 0));

  useEffect(() => {
    perTableCounts.current = SYNCABLE_TABLES.map(() => 0);

    const subscriptions = SYNCABLE_TABLES.map((table, index) => {
      const query = database.get(table).query(Q.where('_status', Q.notEq('synced')));
      return query.observeCount(false).subscribe((tableCount) => {
        perTableCounts.current[index] = tableCount;
        setCount(perTableCounts.current.reduce((sum, n) => sum + n, 0));
      });
    });

    return () => subscriptions.forEach((s) => s.unsubscribe());
  }, [database]);

  return count;
}
