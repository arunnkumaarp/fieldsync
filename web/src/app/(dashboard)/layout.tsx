'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { AppShell } from '@/components/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  if (!user) {
    return <div className="flex h-screen items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  return <AppShell>{children}</AppShell>;
}
