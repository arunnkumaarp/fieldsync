import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface GpsTag {
  lat: number;
  lng: number;
  accuracy: number | null;
  capturedAt: string;
}

async function ensureAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Called at submit time so every submission is tagged with where it was
// actually filled out, not where the job is nominally located (job.location_*
// is the job's fixed address; this is per-submission and lives in data._gps).
export async function captureGpsTag(): Promise<GpsTag | null> {
  const hasPermission = await ensureAndroidPermission();
  if (!hasPermission) return null;

  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          capturedAt: new Date().toISOString(),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}
