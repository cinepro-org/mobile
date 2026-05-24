import 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { registerRootComponent } from 'expo';

import App from './src/App';

// Must run before the root view mounts so release builds keep the native splash until we hide it.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

registerRootComponent(App);
