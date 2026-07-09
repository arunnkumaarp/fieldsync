/**
 * @format
 */

// Must be imported before anything that uses `uuid` (react-native lacks
// crypto.getRandomValues() without this polyfill).
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
