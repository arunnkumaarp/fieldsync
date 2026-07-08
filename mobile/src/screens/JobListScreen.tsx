import React, { useLayoutEffect } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useJobs } from '../hooks/useJobs';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { useSync } from '../sync/SyncContext';
import { useAuth } from '../auth/AuthContext';
import type Job from '../db/models/Job';

type Props = NativeStackScreenProps<RootStackParamList, 'JobList'>;

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#9CA3AF',
  IN_PROGRESS: '#2563EB',
  COMPLETED: '#16A34A',
  CANCELLED: '#DC2626',
};

export function JobListScreen({ navigation }: Props) {
  const jobs = useJobs();
  const { isSyncing, syncNow } = useSync();
  const { logout } = useAuth();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <SignOutButton onPress={logout} />,
    });
  }, [navigation, logout]);

  return (
    <View style={styles.screen}>
      <SyncStatusBar />
      <FlatList
        data={jobs}
        keyExtractor={(job) => job.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={syncNow} />}
        renderItem={({ item }) => <JobRow job={item} onPress={() => navigation.navigate('JobDetail', { jobId: item.id })} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No jobs yet</Text>
          </View>
        }
      />
    </View>
  );
}

function SignOutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.headerAction}>Sign out</Text>
    </Pressable>
  );
}

function JobRow({ job, onPress }: { job: Job; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[job.status] ?? '#9CA3AF' }]} />
      <View style={styles.rowContent}>
        <Text style={styles.title}>{job.title}</Text>
        {job.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {job.description}
          </Text>
        ) : null}
      </View>
      <Text style={styles.status}>{job.status.replace('_', ' ')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { paddingVertical: 4 },
  headerAction: { color: '#2563EB', fontWeight: '600', fontSize: 14, marginRight: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  rowContent: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  description: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  status: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF' },
});
