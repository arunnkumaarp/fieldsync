import type { Metadata } from 'next';
import './globals.css';
import { ClientOnlyProviders } from '@/providers/ClientOnlyProviders';

export const metadata: Metadata = {
  title: 'FieldSync Dashboard',
  description: 'Live submissions feed, conflict review, and job map for FieldSync',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientOnlyProviders>{children}</ClientOnlyProviders>
      </body>
    </html>
  );
}
