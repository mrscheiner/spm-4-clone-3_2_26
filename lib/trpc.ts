
import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import Constants from 'expo-constants';
import type { AppRouter } from "../backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const FALLBACK_API_URL = 'https://spm-api.nsp-2-repository.workers.dev';

export const getBaseUrl = (): string => {
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
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.length > 0) {
    console.log('[trpc] using base URL from env:', envUrl);
    return envUrl;
  }
  console.log('[trpc] using hardcoded fallback URL:', FALLBACK_API_URL);
  return FALLBACK_API_URL;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
