import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import Constants from 'expo-constants';

import type { AppRouter } from "../backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

// Hardcoded fallback URL for production
const FALLBACK_API_URL = 'https://spm-api.nsp-2-repository.workers.dev';

/**
 * Get the base URL for the API.
 * In production (TestFlight/App Store), we MUST NOT crash if the env var is missing.
 */
export const getBaseUrl = (): string => {
  // First check app.json extra config (most reliable in Expo)
  try {
    if (typeof Constants !== 'undefined' && Constants?.expoConfig?.extra?.EXPO_PUBLIC_RORK_API_BASE_URL) {
      const url = Constants.expoConfig.extra.EXPO_PUBLIC_RORK_API_BASE_URL as string;
      if (url && typeof url === 'string' && url.length > 0) {
        console.log('[trpc] using base URL from app config:', url);
        return url;
      }
    }
  } catch (e) {
    console.warn('[trpc] Failed to read Constants:', e);
  }
  
  // Fallback to environment variable
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.length > 0) {
    console.log('[trpc] using base URL from env:', envUrl);
    return envUrl;
  }
  
  // Use hardcoded fallback
  console.log('[trpc] using hardcoded fallback URL:', FALLBACK_API_URL);
  return FALLBACK_API_URL;
};

/**
 * Create the tRPC client with superjson transformer.
 */
function createTrpcClient(): ReturnType<typeof trpc.createClient> {
  const baseUrl = getBaseUrl();
  return trpc.createClient({
    links: [
      httpLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}

// Lazily create the client on first access
let _trpcClientInstance: ReturnType<typeof trpc.createClient> | null = null;

function getTrpcClient(): ReturnType<typeof trpc.createClient> {
  if (!_trpcClientInstance) {
    _trpcClientInstance = createTrpcClient();
  }
  return _trpcClientInstance;
}

// Export a proxy that lazily initializes the client
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
