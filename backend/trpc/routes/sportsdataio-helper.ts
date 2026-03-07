// SportsDataIO HTTP helper for all leagues

import fetch from 'node-fetch';

export type LeagueKey = 'nfl' | 'nba' | 'nhl' | 'mlb' | 'mls';

export interface SportsDataIOOptions {
  league: LeagueKey;
  endpoint: string;
  params?: Record<string, string>;
  apiKey: string;
  method?: 'GET' | 'POST';
  version?: 'v3' | 'v4';
}

export async function sportsdataioFetch<T = any>({ league, endpoint, params = {}, apiKey, method = 'GET', version = 'v3' }: SportsDataIOOptions): Promise<T> {
  let baseUrl = `https://api.sportsdata.io/${version}/${league}/scores/json/${endpoint}`;
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': apiKey,
  };
  const res = await fetch(url.toString(), { method, headers });
  if (!res.ok) throw new Error(`SportsDataIO ${league} ${endpoint} HTTP ${res.status}`);
  return res.json();
}

// --- Main schedule loader for all leagues ---
export interface NormalizedGame {
  league: LeagueKey;
  seasonYear: number;
  seasonType: 'PRE' | 'REG';
  gameId: string;
  dateTime: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  week?: number;
}

export interface LeagueScheduleResult {
  seasonYearChosen: number;
  gamesAllMerged: NormalizedGame[];
  homeGamesByTeam: Record<string, NormalizedGame[]>;
}

const CURRENT_SEASON_ENDPOINT: Record<LeagueKey, string | null> = {
  nfl: null,
  nba: null,
  nhl: 'CurrentSeason',
  mlb: null,
  mls: null,
};

// Helper to get default season year (probes up to 3 years)
export async function getDefaultSeasonYear(league: LeagueKey, apiKey: string): Promise<number> {
  const now = new Date();
  let baseYear = now.getFullYear();
  if (CURRENT_SEASON_ENDPOINT[league]) {
    try {
      const endpoint = CURRENT_SEASON_ENDPOINT[league]!;
      const version = league === 'nhl' ? 'v3' : 'v3';
      const res = await sportsdataioFetch({ league, endpoint, apiKey, version });
      if (typeof res === 'number') return res;
      if (res && res.ApiSeason) return parseInt(res.ApiSeason, 10);
      if (res && res.Season) return parseInt(res.Season, 10);
    } catch (e) {
      // fallback to year below
    }
  }
  return baseYear;
}

// Main loader: fetches PRE+REG, merges, normalizes, builds homeGamesByTeam
export async function loadLeagueScheduleAllTeams(
  league: LeagueKey,
  apiKey: string,
  log: (...args: any[]) => void = () => {}
): Promise<LeagueScheduleResult> {
  // Probe up to ~5 years for any games, checking previous when necessary.
  // MLS is special: always use the current calendar year and do not iterate
  // offsets, because "season" in MLS == current year and the API returns
  // nothing otherwise (the +1/+2 logic previously caused 2029, etc).
  let seasonYear: number;
  let gamesPRE: any[] = [], gamesREG: any[] = [];

  if (league === 'mls') {
    // MLS FIX: Always use current calendar year. No offsets. No overrides.
    seasonYear = new Date().getFullYear();
    console.log('[MLS FIX] seasonYearChosen forced to', seasonYear);
    try {
      const endpoint = `Schedule/8/${seasonYear}`;
      gamesREG = await sportsdataioFetch({ league, endpoint, apiKey, version: 'v4' });
    } catch (e) {
      log(`[SDIO] MLS fetch error for ${seasonYear}`, e);
      // No retry, no fallback - return empty
      gamesREG = [];
    }
    log(`[SDIO] MLS seasonYearChosen: ${seasonYear}, REG count: ${gamesREG?.length || 0}`);
    // No TheSportsDB fallback. No scraping. Return empty if no games.
  } else {
    const baseYear = await getDefaultSeasonYear(league, apiKey);
    seasonYear = baseYear;
    let found = false;
    // offsets to try: current, previous, next, two years previous, two years next
    const offsets = [0, -1, 1, -2, 2];
    for (let offsetIndex = 0; offsetIndex < offsets.length && !found; ++offsetIndex) {
      seasonYear = baseYear + offsets[offsetIndex];
      const preStr = `${seasonYear}PRE`;
      const regStr = `${seasonYear}REG`;
      try {
        // NFL, NBA, NHL, MLB: use Schedules or Games endpoint
        let endpoint = '';
        let version: 'v3' | 'v4' = 'v3';
        // Only assign v4 for mls, but this code path is not for mls
        if (league === 'nfl') endpoint = `Schedules/${preStr}`;
        else if (league === 'nba') endpoint = `SchedulesBasic/${preStr}`;
        else if (league === 'nhl') endpoint = `Games/${preStr}`;
        else if (league === 'mlb') endpoint = `Games/${preStr}`;
        gamesPRE = await sportsdataioFetch({ league, endpoint, apiKey, version });
        log(`[SDIO][DEBUG] Raw gamesPRE for ${league} ${seasonYear}:`, Array.isArray(gamesPRE) ? gamesPRE.length : typeof gamesPRE, gamesPRE && gamesPRE.length > 0 ? gamesPRE.slice(0, 2) : gamesPRE);
        if (league === 'nfl') endpoint = `Schedules/${regStr}`;
        else if (league === 'nba') endpoint = `SchedulesBasic/${regStr}`;
        else if (league === 'nhl') endpoint = `Games/${regStr}`;
        else if (league === 'mlb') endpoint = `Games/${regStr}`;
        gamesREG = await sportsdataioFetch({ league, endpoint, apiKey, version });
        if ((gamesPRE && gamesPRE.length) || (gamesREG && gamesREG.length)) {
          found = true;
          break;
        }
      } catch (e) {
        // try next year
      }
      seasonYear++;
    }
  }
  log(`[SDIO] ${league} seasonYear chosen: ${seasonYear}, PRE: ${gamesPRE.length}, REG: ${gamesREG.length}`);
  // Normalize and merge
  const allGames: NormalizedGame[] = [];
  // For NHL, if gamesPRE has games but they are not labeled as preseason, force seasonType to 'PRE'
  const addGames = (arr: any[], seasonType: 'PRE' | 'REG') => {
    if (!Array.isArray(arr) || arr.length === 0) {
      log(`[SDIO][WARN] No games found for ${league} ${seasonType}`);
      return;
    }
    for (const g of arr) {
      let homeTeam = g.HomeTeam || g.homeTeam || g.HomeTeamId || g.home_team_id;
      let awayTeam = g.AwayTeam || g.awayTeam || g.AwayTeamId || g.away_team_id;
      if (league === 'mls') {
        homeTeam = g.HomeTeamId;
        awayTeam = g.AwayTeamId;
      }
      let normalizedSeasonType = seasonType;
      if (league === 'nhl' && seasonType === 'PRE') {
        normalizedSeasonType = 'PRE';
      }
      const gameId = g.GameID?.toString() || g.GameId?.toString() || g.Id?.toString() || g.id?.toString() || '';
      const dateTime = g.DateTime || g.Day || g.Date || g.date;
      // Validation: skip if required fields are missing
      if (!gameId || !dateTime || !homeTeam || !awayTeam) {
        log(`[SDIO][SKIP] Skipping game with missing fields:`, { gameId, dateTime, homeTeam, awayTeam, raw: g });
        continue;
      }
      allGames.push({
        league,
        seasonYear,
        seasonType: normalizedSeasonType,
        gameId,
        dateTime,
        homeTeam,
        awayTeam,
        venue: g.Stadium || g.Venue || g.venue,
        week: g.Week || g.week,
      });
    }
  };
  addGames(gamesPRE, 'PRE');
  addGames(gamesREG, 'REG');
  allGames.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  // Build homeGamesByTeam
  const homeGamesByTeam: Record<string, NormalizedGame[]> = {};
  for (const g of allGames) {
    if (!g.homeTeam) continue;
    if (!homeGamesByTeam[g.homeTeam]) homeGamesByTeam[g.homeTeam] = [];
    homeGamesByTeam[g.homeTeam].push(g);
  }
  log(`[SDIO] ${league} merged: ${allGames.length} games, teams with home games: ${Object.keys(homeGamesByTeam).length}`);
  return { seasonYearChosen: seasonYear, gamesAllMerged: allGames, homeGamesByTeam };
}

// Simple sanity check for home filtering
export function testHomeFiltering(result: LeagueScheduleResult) {
  for (const [team, games] of Object.entries(result.homeGamesByTeam)) {
    for (const g of games) {
      if (g.homeTeam !== team) throw new Error(`Home filtering failed for team ${team}`);
    }
  }
  return true;
}
