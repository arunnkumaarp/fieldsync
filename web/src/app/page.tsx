'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

export default function RootPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    router.replace(user ? '/submissions' : '/login');
  }, [user, router]);

  return null;
}
