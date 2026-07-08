// A plain module-level store rather than reading React context, since the
// sync orchestrator (src/sync/runSync.ts) runs outside any component tree —
// WatermelonDB's synchronize() calls our pullChanges/pushChanges callbacks
// directly, with no React involved.
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}
