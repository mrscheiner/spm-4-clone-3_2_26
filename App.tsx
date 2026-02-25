// This file exists so that Expo's entry point can resolve the app correctly.
// Expo Router expects the root component to be exported from App.tsx or App.js.

import { ExpoRoot } from 'expo-router';
import { registerRootComponent } from 'expo';

function App() {
  return <ExpoRoot />;
}

export default App;

// registerRootComponent ensures the environment is set up correctly whether
// the app is running in Expo Go, a custom dev client, or a standalone build.
registerRootComponent(App);
