// TEMP DEBUG: Dump the backend response for NBA schedule fetches
import { trpcClient } from '@/lib/trpc';

(async () => {
  const input = {
    leagueId: 'nba',
    teamAbbreviation: 'GS',
  };
  const data = await trpcClient.sportsdata.getLeagueScheduleAllTeams.query(input);
  // Print the full response
  console.log('[NBA SCHEDULE DEBUG] FULL DATA:', JSON.stringify(data, null, 2));
})();
