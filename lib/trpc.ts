import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { Platform } from "react-native";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Detect if running on Mac Catalyst (iOS app running on macOS).
 * This environment has known issues with Hermes and superjson.
 */
const isMacCatalyst = (): boolean => {
  try {
    // On Mac Catalyst, Platform.OS is 'ios' but we can detect it via other means
    // The crash happens before we can even check this in some cases
    return Platform.OS === 'ios' && (Platform as any).isPad === false && 
           typeof navigator !== 'undefined' && 
           navigator.userAgent?.includes('Mac');
  } catch {
    return false;
  }
};

/**
 * Get the base URL for the API.
 * In production (TestFlight/App Store), we MUST NOT crash if the env var is missing.
 * Instead, we return a placeholder that will cause network calls to fail gracefully.
 */
const getBaseUrl = (): string => {
  try {
    const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

    if (url && typeof url === 'string' && url.length > 0) {
      return url;
    }

    // In development, log a warning
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(
        '[trpc] EXPO_PUBLIC_RORK_API_BASE_URL is not set — using fallback http://localhost:8787 (dev only)'
      );
      return 'http://localhost:8787';
    }

    // In production, return a safe fallback URL that won't crash the app
    // Network calls will fail gracefully, but the app won't crash on startup
    console.error('[trpc] EXPO_PUBLIC_RORK_API_BASE_URL is not set in production');
    return 'https://api.rork.com'; // Safe fallback - requests will fail but app won't crash
  } catch (e) {
    console.error('[trpc] Error getting base URL:', e);
    return 'https://api.rork.com';
  }
};

/**
 * Lazily load superjson to avoid Hermes crashes during module initialization.
 * superjson uses Object.getOwnPropertyDescriptor which can cause EXC_BAD_ACCESS
 * on Mac Catalyst with Hermes.
 */
let _superjsonModule: typeof import('superjson') | null = null;

function getSuperjsonSafe() {
  if (_superjsonModule) return _superjsonModule;
  try {
    // Dynamic require to defer loading
    _superjsonModule = require('superjson');
    return _superjsonModule;
  } catch (e) {
    console.error('[trpc] Failed to load superjson:', e);
    return null;
  }
}

/**
 * Safely create the tRPC client with error handling for Hermes engine.
 * This is wrapped in extensive try-catch to prevent crashes during module initialization.
 * On Mac Catalyst, we skip superjson entirely due to known Hermes crashes.
 */
function createTrpcClientSafe(): ReturnType<typeof trpc.createClient> {
  const baseUrl = getBaseUrl();
  
  // On Mac Catalyst or if we detect potential issues, skip superjson
  const shouldSkipSuperjson = isMacCatalyst();
  
  try {
    if (!shouldSkipSuperjson) {
      const superjson = getSuperjsonSafe();
      if (superjson?.default) {
        return trpc.createClient({
          links: [
            httpLink({
              url: `${baseUrl}/api/trpc`,
              transformer: superjson.default,
            }),
          ],
        });
      }
    }
  } catch (e) {
    console.error('[trpc] Failed to create client with superjson:', e);
  }
  
  // Fallback: create client without transformer
  try {
    return trpc.createClient({
      links: [
        httpLink({
          url: `${baseUrl}/api/trpc`,
        }),
      ],
    });
  } catch (e2) {
    console.error('[trpc] Failed to create fallback client:', e2);
    // Last resort: return a minimal client that won't crash
    return trpc.createClient({
      links: [
        httpLink({
          url: `${baseUrl}/api/trpc`,
        }),
      ],
    });
  }
}

// Lazily create the client on first access to avoid crashes during module initialization
let _trpcClientInstance: ReturnType<typeof trpc.createClient> | null = null;

function getTrpcClient(): ReturnType<typeof trpc.createClient> {
  if (!_trpcClientInstance) {
    _trpcClientInstance = createTrpcClientSafe();
  }
  return _trpcClientInstance;
}

// Export a proxy that lazily initializes the client
// This prevents crashes during module import on Mac Catalyst
export const trpcClient = new Proxy({} as ReturnType<typeof trpc.createClient>, {
  get(_target, prop) {
    const client = getTrpcClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
