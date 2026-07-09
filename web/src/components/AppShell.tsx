'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ClipboardList, LogOut, MapPin } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/submissions', label: 'Submissions', icon: ClipboardList },
  { href: '/conflicts', label: 'Conflict review', icon: AlertTriangle },
  { href: '/map', label: 'Job map', icon: MapPin },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="px-4 py-5">
          <span className="text-lg font-bold text-gray-900">FieldSync</span>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="truncate text-xs text-gray-500">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
