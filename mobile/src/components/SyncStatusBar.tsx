import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePendingChangesCount } from '../hooks/usePendingChangesCount';

// Phase 2 has no sync loop yet, so "last synced" has no real value to show —
// phase 3 replaces the hardcoded label with a persisted last-successful-pull
// timestamp once synchronize() exists. The pending count is real today: it's
// a live count of local WatermelonDB rows not yet marked `synced`.
export function SyncStatusBar() {
  const pendingCount = usePendingChangesCount();

  return (
    <View style={styles.container}>
      <View style={[styles.dot, pendingCount > 0 ? styles.dotPending : styles.dotIdle]} />
      <Text style={styles.text}>
        Last synced: never · {pendingCount} pending change{pendingCount === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dotIdle: { backgroundColor: '#9CA3AF' },
  dotPending: { backgroundColor: '#F59E0B' },
  text: { fontSize: 12, color: '#6B7280' },
});
