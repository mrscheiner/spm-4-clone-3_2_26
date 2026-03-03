/**
 * MLS Schedule Router - Fetches schedules directly from MLS team forge APIs.
 * 
 * This is the SINGLE SOURCE OF TRUTH for MLS schedules.
 * No TheSportsDB, no SportsDataIO, no ESPN, no scraping.
 * 
 * Each MLS team has a forge API at: forge-dapi.{team-slug}-prd.deltatre.digital
 * The API returns structured JSON with full match data.
 */

import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

// Static mapping of MLS team abbreviations to their forge API configurations
// This mapping is AUTHORITATIVE and should not be inferred dynamically.
// 
// NOTE: We use slugPrefix to identify home games because clubSportecId is UNRELIABLE.
// Some teams have multiple clubSportecIds, but slug format is always "{home}vs{away}-{date}"
export const MLS_TEAM_CONFIG: Record<string, {
  forgeApiDomain: string;
  slugPrefix: string; // Used to identify home games via slug matching
  teamName: string;
}> = {
  LAFC: {
    forgeApiDomain: "forge-dapi.lafc-prd.deltatre.digital",
    slugPrefix: "lafcvs",
    teamName: "Los Angeles FC",
  },
  MIA: {
    forgeApiDomain: "forge-dapi.mia-prd.deltatre.digital",
    slugPrefix: "miavs",
    teamName: "Inter Miami CF",
  },
  DAL: {
    forgeApiDomain: "forge-dapi.dal-prd.deltatre.digital",
    slugPrefix: "dalvs",
    teamName: "FC Dallas",
  },
  DC: {
    forgeApiDomain: "forge-dapi.dcu-prd.deltatre.digital",
    slugPrefix: "dcvs",
    teamName: "D.C. United",
  },
  NYC: {
    forgeApiDomain: "forge-dapi.nyc-prd.deltatre.digital",
    slugPrefix: "nycvs",
    teamName: "New York City FC",
  },
  NYRB: {
    forgeApiDomain: "forge-dapi.rbny-prd.deltatre.digital",
    slugPrefix: "rbnyvs",
    teamName: "New York Red Bulls",
  },
  TOR: {
    forgeApiDomain: "forge-dapi.tor-prd.deltatre.digital",
    slugPrefix: "torvs",
    teamName: "Toronto FC",
  },
  VAN: {
    forgeApiDomain: "forge-dapi.van-prd.deltatre.digital",
    slugPrefix: "vanvs",
    teamName: "Vancouver Whitecaps FC",
  },
  SEA: {
    forgeApiDomain: "forge-dapi.sea-prd.deltatre.digital",
    slugPrefix: "seavs",
    teamName: "Seattle Sounders FC",
  },
  POR: {
    forgeApiDomain: "forge-dapi.por-prd.deltatre.digital",
    slugPrefix: "porvs",
    teamName: "Portland Timbers",
  },
  LA: {
    forgeApiDomain: "forge-dapi.lag-prd.deltatre.digital",
    slugPrefix: "lavs",
    teamName: "LA Galaxy",
  },
  ATX: {
    forgeApiDomain: "forge-dapi.atx-prd.deltatre.digital",
    slugPrefix: "atxvs",
    teamName: "Austin FC",
  },
  HOU: {
    forgeApiDomain: "forge-dapi.hou-prd.deltatre.digital",
    slugPrefix: "houvs",
    teamName: "Houston Dynamo FC",
  },
  ATL: {
    forgeApiDomain: "forge-dapi.atl-prd.deltatre.digital",
    slugPrefix: "atlvs",
    teamName: "Atlanta United FC",
  },
  CLT: {
    forgeApiDomain: "forge-dapi.clt-prd.deltatre.digital",
    slugPrefix: "cltvs",
    teamName: "Charlotte FC",
  },
  CHI: {
    forgeApiDomain: "forge-dapi.chi-prd.deltatre.digital",
    slugPrefix: "chivs",
    teamName: "Chicago Fire FC",
  },
  CIN: {
    forgeApiDomain: "forge-dapi.cin-prd.deltatre.digital",
    slugPrefix: "cinvs",
    teamName: "FC Cincinnati",
  },
  CLB: {
    forgeApiDomain: "forge-dapi.clb-prd.deltatre.digital",
    slugPrefix: "clbvs",
    teamName: "Columbus Crew",
  },
  COL: {
    forgeApiDomain: "forge-dapi.col-prd.deltatre.digital",
    slugPrefix: "colvs",
    teamName: "Colorado Rapids",
  },
  MIN: {
    forgeApiDomain: "forge-dapi.min-prd.deltatre.digital",
    slugPrefix: "minvs",
    teamName: "Minnesota United FC",
  },
  MTL: {
    forgeApiDomain: "forge-dapi.mtl-prd.deltatre.digital",
    slugPrefix: "mtlvs",
    teamName: "CF Montréal",
  },
  NE: {
    forgeApiDomain: "forge-dapi.ner-prd.deltatre.digital",
    slugPrefix: "nevs",
    teamName: "New England Revolution",
  },
  NSH: {
    forgeApiDomain: "forge-dapi.nsh-prd.deltatre.digital",
    slugPrefix: "nshvs",
    teamName: "Nashville SC",
  },
  ORL: {
    forgeApiDomain: "forge-dapi.orl-prd.deltatre.digital",
    slugPrefix: "orlvs",
    teamName: "Orlando City SC",
  },
  PHI: {
    forgeApiDomain: "forge-dapi.phi-prd.deltatre.digital",
    slugPrefix: "phivs",
    teamName: "Philadelphia Union",
  },
  RSL: {
    forgeApiDomain: "forge-dapi.rsl-prd.deltatre.digital",
    slugPrefix: "rslvs",
    teamName: "Real Salt Lake",
  },
  SJ: {
    forgeApiDomain: "forge-dapi.sje-prd.deltatre.digital",
    slugPrefix: "sjvs",
    teamName: "San Jose Earthquakes",
  },
  SKC: {
    forgeApiDomain: "forge-dapi.skc-prd.deltatre.digital",
    slugPrefix: "skcvs",
    teamName: "Sporting Kansas City",
  },
  STL: {
    forgeApiDomain: "forge-dapi.stl-prd.deltatre.digital",
    slugPrefix: "stlvs",
    teamName: "St. Louis City SC",
  },
  SD: {
    forgeApiDomain: "forge-dapi.sd-prd.deltatre.digital",
    slugPrefix: "sdvs",
    teamName: "San Diego FC",
  },
};

/**
 * Manual game overrides for games miscategorized in upstream MLS API.
 * 
 * Some games are categorized under MLS-COM-000003 (MLS NEXT Pro) instead of
 * MLS-COM-000001 (MLS Regular Season). This configuration allows us to manually
 * inject those missing games to ensure all teams have complete 17-game home schedules.
 * 
 * Format: { [teamAbbr]: { [season]: MlsGame[] } }
 * 
 * To add a missing game:
 * 1. Identify the game from the MLS website or schedule
 * 2. Find the UTC datetime (use MLS-COM-000003 API if needed)
 * 3. Add entry below with all required MlsGame fields
 */
export const MLS_MANUAL_GAME_OVERRIDES: Record<string, Record<number, Omit<MlsGame, 'isHome'>[]>> = {
  // NE's Mar 1, 2026 vs ATL game is in MLS-COM-000003 instead of MLS-COM-000001
  NE: {
    2026: [
      {
        id: 'NE_2026-03-02T01:00:00Z_manual',
        date: 'Mar 1, 2026',
        month: 'Mar',
        day: '1',
        opponent: 'Atlanta United FC',
        opponentLogo: '',
        venueName: '',
        time: '8:00 PM',
        ticketStatus: 'Available',
        isPaid: false,
        type: 'Regular',
        dateTimeISO: '2026-03-02T01:00:00Z',
      },
    ],
  },
  // Add other team overrides here as needed. Example format:
  // LAFC: {
  //   2026: [
  //     {
  //       id: 'LAFC_2026-XX-XXTXX:XX:XXZ_manual',
  //       date: 'Mon D, 2026',
  //       month: 'Mon',
  //       day: 'D',
  //       opponent: 'Opponent Name',
  //       opponentLogo: '',
  //       venueName: '',
  //       time: 'X:XX PM',
  //       ticketStatus: 'Available',
  //       isPaid: false,
  //       type: 'Regular',
  //       dateTimeISO: '2026-XX-XXTXX:XX:XXZ',
  //     },
  //   ],
  // },
};

// Normalized game interface matching the app's existing schema
export interface MlsGame {
  id: string;
  date: string; // "Mar 8, 2026"
  month: string; // "Mar"
  day: string; // "8"
  opponent: string;
  opponentLogo: string;
  venueName: string;
  time: string; // "7:30 PM"
  ticketStatus: string;
  isPaid: boolean;
  type: 'Regular' | 'Preseason';
  dateTimeISO: string;
  isHome: boolean;
  gameNumber?: number;
}

// Cache for MLS schedule responses (24-72 hours as specified)
const scheduleCache: Record<string, { data: MlsGame[]; timestamp: number }> = {};
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchMlsTeamSchedule(
  teamAbbreviation: string,
  season: number
): Promise<{ games: MlsGame[]; error?: string }> {
  const abbr = teamAbbreviation.toUpperCase();
  const config = MLS_TEAM_CONFIG[abbr];
  
  if (!config) {
    console.warn('[MLS] Unknown team abbreviation:', abbr);
    return { games: [], error: 'UNKNOWN_TEAM' };
  }

  const cacheKey = `${abbr}_${season}`;
  const cached = scheduleCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[MLS] Returning cached schedule for', abbr);
    return { games: cached.data };
  }

  try {
    const url = `https://${config.forgeApiDomain}/v2/content/en-us/matches?$limit=100`;
    console.log('[MLS] Fetching schedule from:', url);
    
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!resp.ok) {
      console.warn('[MLS] API request failed:', resp.status);
      return { games: [], error: 'API_ERROR' };
    }

    const data = await resp.json();
    const items: any[] = data?.items || [];
    
    // MLS Regular Season competition ID
    // MLS-COM-000001 = MLS Regular Season (first-team MLS games ONLY)
    // NOTE: MLS-COM-000003 contains a mix of MLS, MLS NEXT Pro, and reserve team games
    // Even filtering by opponent doesn't work because reserve games use first-team abbreviations
    // We ONLY use 000001 for accurate regular season schedules
    const MLS_REGULAR_SEASON_COMPETITION = 'MLS-COM-000001';
    
    // Filter to home games only for this team, correct season, and regular season only
    // Use slug prefix to identify home games (e.g., "dalvs" for Dallas home games)
    // This is more reliable than clubSportecId which can vary
    const homeGames = items.filter((match: any) => {
      const fields = match.fields || {};
      const slug = match.slug || '';
      
      // Must be a home game - check slug starts with team's prefix
      if (!slug.toLowerCase().startsWith(config.slugPrefix)) {
        return false;
      }
      // Filter by season year - match must start in the requested season year
      const matchDate = new Date(fields.matchDateTime || '');
      const matchYear = matchDate.getFullYear();
      if (matchYear !== season) {
        return false;
      }
      // Only include regular season MLS games (MLS-COM-000001 only)
      const competitionId = fields.competitionSportecId || '';
      if (competitionId !== MLS_REGULAR_SEASON_COMPETITION) {
        return false;
      }
      return true;
    });

    // Deduplicate games by opponent + date to handle API duplicates
    // Some games appear twice with different slugs (e.g., "lafcvssj-04-19-2026" and "lafcvssj-04-19-2026-x8026")
    const seenGames = new Set<string>();
    const deduplicatedHomeGames = homeGames.filter((match: any) => {
      const fields = match.fields || {};
      const slug = match.slug || '';
      const matchDate = (fields.matchDateTime || '').split('T')[0]; // Just the date part
      const opponent = slug.split('-')[0]?.split('vs')[1] || '';
      const gameKey = `${opponent}-${matchDate}`;
      
      if (seenGames.has(gameKey)) {
        console.log('[MLS] Filtering duplicate game:', slug, 'key:', gameKey);
        return false;
      }
      seenGames.add(gameKey);
      return true;
    });

    console.log('[MLS] Found', deduplicatedHomeGames.length, 'regular season home games for', abbr, 'in season', season, '(after dedup from', homeGames.length, ')');

    // Convert to normalized game format
    const games: MlsGame[] = deduplicatedHomeGames.map((match: any) => {
      const fields = match.fields || {};
      const matchDateTime = fields.matchDateTime || '';
      const dt = new Date(matchDateTime);
      
      // Determine game type from matchType field
      // MLS matchType values: "Regular", "Cup Short", "Friendly", "Preseason", null
      // Only mark as Preseason if explicitly labeled - null defaults to Regular
      const matchType = (fields.matchType || '').toLowerCase();
      let gameType: 'Regular' | 'Preseason' = 'Regular';
      if (matchType.includes('friendly') || matchType.includes('preseason')) {
        gameType = 'Preseason';
      }
      // "Cup Short", "Regular", and null all count as regular season games

      // Extract opponent from slug (e.g., "lafcvsmin-10-31-2026" -> "MIN")
      const slug = match.slug || '';
      const slugParts = slug.split('-')[0]?.split('vs') || [];
      let opponentAbbr = '';
      if (slugParts.length === 2) {
        // Home team is first, away team is second
        opponentAbbr = slugParts[1]?.toUpperCase() || '';
      }
      
      // Try to find opponent name from our config
      const opponentConfig = Object.entries(MLS_TEAM_CONFIG).find(
        ([key]) => key.toLowerCase() === opponentAbbr.toLowerCase()
      );
      const opponentName = opponentConfig?.[1]?.teamName || opponentAbbr || 'TBD';

      // Convert UTC to US Central Time (most MLS games are evening local time)
      // UTC-6 in winter (CST), UTC-5 in summer (CDT)
      // Since the API gives us UTC times like 01:30Z which is 7:30 PM CT the day before
      // We need to adjust the display date
      const utcDate = new Date(matchDateTime);
      // Check if date is in DST (roughly Mar-Nov for US)
      const month = utcDate.getUTCMonth();
      const isDST = month >= 2 && month <= 10; // Mar (2) through Nov (10)
      const offsetHours = isDST ? -5 : -6;
      const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000);
      
      return {
        id: match._entityId || fields.sportecId || `${abbr}_${matchDateTime}`,
        date: localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
        month: localDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        day: String(localDate.getUTCDate()),
        opponent: opponentName,
        opponentLogo: '', // Forge API doesn't include logos directly
        venueName: '', // Would need additional lookup
        time: fields.isTimeTBD ? 'TBD' : localDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }),
        ticketStatus: 'Available',
        isPaid: false,
        type: gameType,
        dateTimeISO: matchDateTime,
        isHome: true,
      };
    }).sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());

    // Apply manual game overrides for games miscategorized in upstream API
    // This handles cases where games are in MLS-COM-000003 instead of MLS-COM-000001
    const teamOverrides = MLS_MANUAL_GAME_OVERRIDES[abbr]?.[season];
    if (teamOverrides && teamOverrides.length > 0) {
      let gamesAdded = 0;
      for (const override of teamOverrides) {
        // Check if this game already exists (by matching date prefix in ISO string)
        // Use date prefix (YYYY-MM-DD or YYYY-MM-DD+1 for UTC edge cases)
        const datePrefix = override.dateTimeISO.split('T')[0];
        const dateParts = datePrefix.split('-');
        const nextDay = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]) + 1);
        const nextDayPrefix = nextDay.toISOString().split('T')[0];
        
        const gameExists = games.some(g => 
          g.dateTimeISO.startsWith(datePrefix) || 
          g.dateTimeISO.startsWith(nextDayPrefix) ||
          g.id === override.id
        );
        
        if (!gameExists) {
          games.push({
            ...override,
            isHome: true,
          });
          gamesAdded++;
          console.log(`[MLS] Added manual override game: ${abbr} vs ${override.opponent} ${override.date}`);
        }
      }
      
      if (gamesAdded > 0) {
        // Re-sort after adding overrides
        games.sort((a, b) => new Date(a.dateTimeISO).getTime() - new Date(b.dateTimeISO).getTime());
        console.log(`[MLS] Applied ${gamesAdded} manual game override(s) for ${abbr} ${season}`);
      }
    }

    // Assign game numbers after final sort
    games.forEach((game, idx) => {
      game.gameNumber = idx + 1;
    });

    // Validate game count - log warning if not exactly 17 home games
    const expectedHomeGames = 17;
    if (games.length !== expectedHomeGames && games.length > 0) {
      console.warn(`[MLS] WARNING: ${abbr} has ${games.length} home games for ${season}, expected ${expectedHomeGames}. Check for missing games in MLS_MANUAL_GAME_OVERRIDES.`);
    }

    // Cache the result
    scheduleCache[cacheKey] = { data: games, timestamp: Date.now() };
    
    return { games };
  } catch (err) {
    console.warn('[MLS] Schedule fetch error:', err);
    return { games: [], error: 'NETWORK_ERROR' };
  }
}

export const mlsRouter = createTRPCRouter({
  /**
   * Get MLS team schedule.
   * This is the ONLY endpoint for MLS schedules.
   * No retry logic - if games.length === 0, display "Schedule unavailable".
   */
  getTeamSchedule: publicProcedure
    .input(z.any())
    .query(async ({ input, ctx }) => {
      // Robustly parse input from tRPC GET/POST, query string, or JSON
      let parsedInput: any = undefined;
      console.log('[MLS TRPC] getTeamSchedule ENTRY input:', input, 'typeof:', typeof input);
      
      // Try direct object
      if (input && typeof input === 'object' && input.teamAbbreviation) {
        parsedInput = input;
      } else if (typeof input === 'string') {
        // Try to decode URI component if it looks encoded
        let str = input;
        try {
          if (str.startsWith('%7B')) {
            str = decodeURIComponent(str);
          }
          parsedInput = JSON.parse(str);
        } catch (e) {
          console.warn('[MLS TRPC] Failed to parse input string as JSON', str, e);
          return { error: 'INVALID_INPUT_JSON', games: [] };
        }
      } else if (typeof input === 'undefined' || input === null) {
        // Try to extract from query string (for GET)
        if (ctx && ctx.req && typeof ctx.req.url === 'string') {
          try {
            const urlObj = new URL(ctx.req.url, 'http://dummy');
            const inputParam = urlObj.searchParams.get('input');
            if (inputParam) {
              let str = inputParam;
              if (str.startsWith('%7B')) {
                str = decodeURIComponent(str);
              }
              parsedInput = JSON.parse(str);
              console.log('[MLS TRPC] Parsed input from query string:', parsedInput);
            }
          } catch (e) {
            console.warn('[MLS TRPC] Failed to parse input from query string', e);
          }
        }
      }
      
      console.log('[MLS TRPC] FINAL parsedInput:', parsedInput);
      
      if (!parsedInput || typeof parsedInput !== 'object' || !parsedInput.teamAbbreviation) {
        return { error: 'MISSING_TEAM_ABBREVIATION', games: [], fetchStatus: 'failed' };
      }
      
      const teamAbbreviation = String(parsedInput.teamAbbreviation);
      const season = parsedInput.season || new Date().getFullYear();
      
      console.log('[MLS] getTeamSchedule called for:', teamAbbreviation, 'season:', season);
      
      const result = await fetchMlsTeamSchedule(teamAbbreviation, season);
      
      return {
        teamAbbreviation: teamAbbreviation.toUpperCase(),
        season,
        games: result.games,
        error: result.error,
        fetchStatus: result.error ? 'failed' : 'success',
      };
    }),

  /**
   * Get list of supported MLS teams.
   */
  getSupportedTeams: publicProcedure.query(() => {
    return Object.entries(MLS_TEAM_CONFIG).map(([abbr, config]) => ({
      abbreviation: abbr,
      name: config.teamName,
    }));
  }),
});
