/**
 * MLS Schedule Utilities
 * 
 * This module fetches MLS schedules from the dedicated backend endpoint.
 * The backend uses MLS team forge APIs (deltatre.digital) as the SINGLE SOURCE OF TRUTH.
 * 
 * ❌ NO TheSportsDB
 * ❌ NO SportsDataIO
 * ❌ NO ESPN scraping
 * ❌ NO HTML scraping
 * ❌ NO retry on empty results
 * 
 * ✅ One-shot fetch from mls.getTeamSchedule endpoint
 * ✅ If empty, display "Schedule unavailable" - do NOT retry
 * ✅ Logos resolved via getOpponentLogo() using ESPN CDN
 */

import { getBaseUrl } from '../../lib/trpc';

export interface MlsHomeGame {
  id: string;
  dateTimeISO: string;
  homeTeam?: string;
  opponent: {
    name: string;
    logo: string;
  };
  gameType?: 'Regular' | 'Preseason';
}

// Supported MLS team abbreviations
export const MLS_TEAMS = [
  'LAFC', 'MIA', 'DAL', 'DC', 'NYC', 'NYRB', 'TOR', 'VAN', 'SEA', 'POR',
  'LA', 'ATX', 'HOU', 'ATL', 'CLT', 'CHI', 'CIN', 'CLB', 'COL', 'MIN',
  'MTL', 'NE', 'NSH', 'ORL', 'PHI', 'RSL', 'SJ', 'SKC', 'STL', 'SD',
] as const;

export type MlsTeamAbbreviation = typeof MLS_TEAMS[number];

/**
 * Fetches the MLS home schedule for a given team.
 * Uses the dedicated mls.getTeamSchedule backend endpoint.
 * 
 * ONE-SHOT: No retry on empty results. If no games, return empty array.
 * 
 * @param teamAbbreviation MLS team abbreviation (e.g., "LAFC", "MIA", "DAL")
 * @param _season Season year (optional, defaults to current year)
 * @returns Array of home games
 */
export async function fetchMlsHomeSchedule(
  teamAbbreviation: string,
  _season: string
): Promise<MlsHomeGame[]> {
  if (!teamAbbreviation) {
    console.warn('[MLS] No team abbreviation provided');
    return [];
  }

  const abbr = teamAbbreviation.toUpperCase();
  const season = parseInt(_season) || new Date().getFullYear();
  
  console.log('[MLS] Fetching schedule for', abbr, 'season:', season);

  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/trpc/mls.getTeamSchedule?input=${encodeURIComponent(
      JSON.stringify({ teamAbbreviation: abbr, season })
    )}`;
    
    console.log('[MLS] Calling backend:', url);
    
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!resp.ok) {
      console.warn('[MLS] Backend request failed:', resp.status);
      return [];
    }

    const json = await resp.json();
    
    // tRPC wraps the result in .result.data.json (superjson format)
    const data = json?.result?.data?.json || json?.result?.data;
    
    if (!data) {
      console.warn('[MLS] Invalid response structure:', JSON.stringify(json).slice(0, 200));
      return [];
    }

    if (data.error) {
      console.warn('[MLS] Backend returned error:', data.error);
      return [];
    }

    const games: any[] = data.games || [];
    console.log('[MLS] Backend returned', games.length, 'home games for', abbr);

    // Convert backend format to MlsHomeGame format
    // Logos provided via drop method - not fetched
    return games.map(g => {
      const opponentName = g.opponent || 'TBD';
      
      return {
        id: g.id,
        dateTimeISO: g.dateTimeISO,
        homeTeam: abbr,
        opponent: {
          name: opponentName,
          logo: '', // Logos provided via drop method
        },
        gameType: g.type as 'Regular' | 'Preseason',
      };
    });
  } catch (err) {
    console.warn('[MLS] Fetch error:', err);
    return [];
  }
}

/**
 * Check if a team abbreviation is a valid MLS team.
 */
export function isMlsTeam(abbreviation: string): boolean {
  return MLS_TEAMS.includes(abbreviation.toUpperCase() as MlsTeamAbbreviation);
}


