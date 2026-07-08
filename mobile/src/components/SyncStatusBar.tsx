import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { usePendingChangesCount } from '../hooks/usePendingChangesCount';
import { useSync } from '../sync/SyncContext';

function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return 'never';
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(timestamp).toLocaleString();
}

export function SyncStatusBar() {
  const pendingCount = usePendingChangesCount();
  const { isSyncing, lastSyncedAt, lastError, syncNow } = useSync();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={[styles.dot, pendingCount > 0 ? styles.dotPending : styles.dotIdle]} />
        <Text style={styles.text} numberOfLines={1}>
          {lastError ? `Sync failed: ${lastError}` : `Last synced: ${formatLastSynced(lastSyncedAt)} · ${pendingCount} pending`}
        </Text>
      </View>
      <Pressable style={styles.syncButton} onPress={syncNow} disabled={isSyncing}>
        {isSyncing ? <ActivityIndicator size="small" /> : <Text style={styles.syncButtonLabel}>Sync now</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dotIdle: { backgroundColor: '#9CA3AF' },
  dotPending: { backgroundColor: '#F59E0B' },
  text: { fontSize: 12, color: '#6B7280', flexShrink: 1 },
  syncButton: { paddingHorizontal: 10, paddingVertical: 4 },
  syncButtonLabel: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
});
