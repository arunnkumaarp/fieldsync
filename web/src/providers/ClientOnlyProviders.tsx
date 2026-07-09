'use client';

import dynamic from 'next/dynamic';

// This dashboard is entirely behind auth and has no SEO/SSR value, and its
// auth state lives in localStorage — something a server render can never
// see. Rendering the provider tree with ssr:false means AuthProvider's
// first-ever render happens client-side with nothing to reconcile against,
// so it can read the real stored auth immediately. The alternative (letting
// this tree render during SSR/hydration) forces useSyncExternalStore to
// report "logged out" on that first pass to match the (auth-less) server
// HTML — and a child layout's redirect-on-logged-out effect can fire against
// that transient false value before the corrected value arrives, incorrectly
// bouncing an already-logged-in user back to /login on every hard reload.
// That's exactly what happened when this was SSR'd — confirmed with an
// actual browser test, not just reasoned about.
const Providers = dynamic(() => import('./Providers'), { ssr: false });

export function ClientOnlyProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
