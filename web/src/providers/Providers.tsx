'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { RealtimeProvider } from './RealtimeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <RealtimeProvider>{children}</RealtimeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
