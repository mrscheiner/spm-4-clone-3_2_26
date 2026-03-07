// Force log the tRPC base URL at app startup for network debugging (require-based to avoid import issues)
console.log('[trpc][startup] App.tsx loaded');
try {
  const { getBaseUrl } = require('./lib/trpc');
  console.log('[trpc][startup] BASE URL:', getBaseUrl());
} catch (e) {
  console.log('[trpc][startup] ERROR loading getBaseUrl:', e);
}
// Force log the tRPC base URL at app startup for network debugging
import { getBaseUrl } from './lib/trpc';
console.log('[trpc][startup] BASE URL:', getBaseUrl());
import { ExpoRoot } from 'expo-router';

// This is the entry point used by Expo's Metro bundler. It forwards to the
// router, which picks up files from the `app/` directory.
export default function App() {
  return <ExpoRoot />;
}
