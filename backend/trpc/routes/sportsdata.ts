
    import * as z from "zod";
    import { createTRPCRouter, publicProcedure } from "../create-context";
    import { loadLeagueScheduleAllTeams, LeagueKey, testHomeFiltering } from "./sportsdataio-helper";
    import { getTeamsByLeague } from "../../../constants/leagues";

export const sportsdataRouter = createTRPCRouter({
  // Returns merged, normalized, home-only schedules for all teams in a league
  getLeagueScheduleAllTeams: publicProcedure
    .input(z.any())
    .query(async ({ input, ctx }) => {
      // Robustly parse input from tRPC GET/POST, query string, or JSON
      let parsedInput: any = undefined;
      console.log('[TRPC] getLeagueScheduleAllTeams ENTRY input:', input, 'typeof:', typeof input);
      // Try direct object
      if (input && typeof input === 'object' && input.leagueId) {
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
          console.warn('[TRPC] Failed to parse input string as JSON', str, e);
          return { error: 'INVALID_INPUT_JSON', events: [] };
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
              console.log('[TRPC] Parsed input from query string:', parsedInput);
            }
          } catch (e) {
            console.warn('[TRPC] Failed to parse input from query string', e);
          }
        }
      }
      console.log('[TRPC] getLeagueScheduleAllTeams FINAL parsedInput:', parsedInput);
      if (!parsedInput || typeof parsedInput !== 'object' || !parsedInput.leagueId) {
        return { error: 'MISSING_LEAGUE_ID', events: [] };
      }
      const leagueKey = parsedInput.leagueId.toLowerCase() as LeagueKey;
      let requestedAbbr = parsedInput.teamAbbreviation ? String(parsedInput.teamAbbreviation).toUpperCase() : undefined;
      // Map common aliases for NBA teams (e.g., GSW -> GS for SportsDataIO)
      if (leagueKey === 'nba' && requestedAbbr === 'GSW') requestedAbbr = 'GS';
      let key: string | undefined;
      // Try SPORTSDATAIO_API_KEY first (wrangler.toml), then SPORTSDATA_API_KEY
      if (ctx?.env && ctx.env.SPORTSDATAIO_API_KEY) {
        key = ctx.env.SPORTSDATAIO_API_KEY as string;
      } else if (ctx?.env && ctx.env.SPORTSDATA_API_KEY) {
        key = ctx.env.SPORTSDATA_API_KEY as string;
      } else if (typeof process !== "undefined" && process.env.SPORTSDATAIO_API_KEY) {
        key = process.env.SPORTSDATAIO_API_KEY;
      } else if (typeof process !== "undefined" && process.env.SPORTSDATA_API_KEY) {
        key = process.env.SPORTSDATA_API_KEY;
      }
      if (!key) {
        console.log('[ERROR] API_KEY_MISSING. env keys:', ctx?.env ? Object.keys(ctx.env) : 'no ctx.env');
        return { error: "API_KEY_MISSING", events: [] };
      }
      console.log('[DEBUG] API key found, length:', key.length);
      
      // MLS is handled by the dedicated mls.getTeamSchedule endpoint.
      // Reject MLS requests to this endpoint to prevent accidental usage.
      if (leagueKey === 'mls') {
        console.log('[SPORTSDATA] MLS not supported here - use mls.getTeamSchedule instead');
        return {
          error: 'MLS_USE_DEDICATED_ENDPOINT',
          message: 'MLS schedules must use the mls.getTeamSchedule endpoint',
          events: [],
        };
      }
      
      const teams = getTeamsByLeague(leagueKey);
      const log = (...args: any[]) => console.log('[SDIO]', ...args);
      const result = await loadLeagueScheduleAllTeams(leagueKey, key, log);
      testHomeFiltering(result); // throws if home filtering fails
      // Count PRE/REG/merged
      let preCount = 0, regCount = 0;
      for (const g of result.gamesAllMerged) {
        if (g.seasonType === 'PRE') preCount++;
        if (g.seasonType === 'REG') regCount++;
      }
      const mergedCount = result.gamesAllMerged.length;
      // Attach team info for each homeGamesByTeam entry
      let homeGamesByTeamWithMeta: Record<string, any> = {};
      for (const t of teams) {
        // For Warriors, allow both GS and GSW as keys
        const abbrs = t.abbreviation === 'GS' ? ['GS', 'GSW'] : [t.abbreviation];
        for (const abbr of abbrs) {
          homeGamesByTeamWithMeta[abbr] = {
            team: t,
            games: result.homeGamesByTeam['GS'] || [],
          };
        }
        if (t.abbreviation !== 'GS') {
          homeGamesByTeamWithMeta[t.abbreviation] = {
            team: t,
            games: result.homeGamesByTeam[t.abbreviation] || [],
          };
        }
      }
      return {
        seasonYearChosen: result.seasonYearChosen,
        preCount,
        regCount,
        mergedCount,
        gamesAllMerged: result.gamesAllMerged,
        homeGamesByTeam: homeGamesByTeamWithMeta,
      };
    }),
});
