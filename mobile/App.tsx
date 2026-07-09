/**
 * FieldSync mobile — offline-first field data collection app.
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { database } from './src/db';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { SyncProvider } from './src/sync/SyncContext';
import { LoginScreen } from './src/screens/LoginScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <DatabaseProvider database={database}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

// Jobs/submissions work fully offline regardless of auth state, but sync
// needs a JWT (the backend scopes every /sync and REST call to the caller's
// org). Gating the whole app behind login is simpler than allowing capture
// pre-login and merging local data across logins; there's no reasonable
// answer to "which org do offline-created jobs belong to" until you know.
// The first sync after login is what populates the job list — phase 2's
// local-only demo seed has been removed now that a real pull exists
// (it would otherwise get pushed to the server as duplicate real jobs).
function AuthGate() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SyncProvider>
      <RootNavigator />
    </SyncProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default App;
