export interface FieldDiff {
  fieldName: string;
  localValue: unknown;
  remoteValue: unknown;
}

// Shared by sync.service.ts (server-detected push-time conflicts) and
// SubmissionsService.reportConflict (client-detected conflicts reported by
// the mobile app — see backend/README.md#sync-protocol for why both exist).
export function diffSubmissionFields(
  localData: Record<string, unknown>,
  remoteData: Record<string, unknown>,
): FieldDiff[] {
  const fieldNames = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);
  const diffs: FieldDiff[] = [];
  for (const fieldName of fieldNames) {
    const localValue = localData[fieldName] ?? null;
    const remoteValue = remoteData[fieldName] ?? null;
    if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      diffs.push({ fieldName, localValue, remoteValue });
    }
  }
  return diffs;
}
