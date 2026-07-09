import { Platform } from 'react-native';

// The Android emulator's loopback interface doesn't reach the host
// machine's localhost directly — 10.0.2.2 is the emulator's documented
// alias for it. iOS simulators share the host's network namespace, so
// localhost works as-is. Real devices need a LAN IP or tunnel; override via
// setApiBaseUrl for that case rather than editing this default.
const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

let apiBaseUrl = DEFAULT_BASE_URL;

export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}
