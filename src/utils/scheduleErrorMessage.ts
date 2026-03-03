// Centralized mapping of schedule error codes to user-facing messages
// Usage: import { getScheduleErrorMessage } from './scheduleErrorMessage';

export function getScheduleErrorMessage(error: string | undefined | null, opts?: { preCount?: number; regCount?: number; mergedCount?: number; }): string | null {
  if (!error) return null;
  switch (error) {
    case 'PRESEASON_NOT_PUBLISHED':
      return 'Preseason not published yet for this season.';
    case 'NO_SCHEDULE':
      // Only show this if both pre and reg are 0
      if (opts && (opts.preCount || 0) === 0 && (opts.regCount || 0) === 0) {
        return 'No schedule available from the data source.';
      }
      return null;
    case 'NETWORK':
      return 'Backend unreachable. Schedule will load when available.';
    case 'API_KEY_MISSING':
      return 'API key not configured in backend.';
    case 'CORS':
      return 'Request blocked. Try on mobile device.';
    case 'API_UNAVAILABLE':
      return 'MLS data temporarily unavailable. Please try again later.';
    default:
      return 'Could not fetch schedule. Tap Resync in Settings to retry.';
  }
}