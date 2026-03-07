// Minimal test script to fetch GS home games from SportsDataIO
import { loadLeagueScheduleAllTeams } from './sportsdataio-helper';

(async () => {
  const apiKey = '9b42211a91c1440795cd6217baa9e334';
  const log = console.log;
  const result = await loadLeagueScheduleAllTeams('nba', apiKey, log);
  console.log(JSON.stringify(result.homeGamesByTeam['GS'], null, 2));
})();
