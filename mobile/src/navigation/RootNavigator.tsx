import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { JobListScreen } from '../screens/JobListScreen';
import { JobDetailScreen } from '../screens/JobDetailScreen';

export type RootStackParamList = {
  JobList: undefined;
  JobDetail: { jobId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="JobList">
        <Stack.Screen name="JobList" component={JobListScreen} options={{ title: 'Jobs' }} />
        <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job detail' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
