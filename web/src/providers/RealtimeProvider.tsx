'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';
import type { Submission } from '@/lib/types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'http://localhost:3000';

// Connects once per authenticated session and keeps TanStack Query's cache
// fresh as the backend broadcasts changes — this is what makes the
// submissions feed and conflict review page "live" without polling.
// Invalidating (rather than hand-merging into the cache) is the simpler
// correct choice here: submission events fire rarely enough that an extra
// refetch is cheap, and it can't drift from server truth the way a manual
// merge could.
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const socket: Socket = io(`${WS_BASE_URL}/realtime`, {
      auth: { token: user.token },
      transports: ['websocket'],
    });

    const invalidateSubmissions = (submission: Submission) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', submission.id] });
    };

    socket.on('submission.upsert', invalidateSubmissions);
    socket.on('submission.conflict', invalidateSubmissions);
    socket.on('job.upsert', () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, queryClient]);

  return <>{children}</>;
}
