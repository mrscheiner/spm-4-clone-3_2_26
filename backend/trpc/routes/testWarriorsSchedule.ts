import { loadLeagueScheduleAllTeams } from './sportsdataio-helper';

async function main() {
  const leagueKey = 'nba';
  const teamAbbr = 'GS';
  const apiKey = process.env.SPORTSDATAIO_API_KEY || process.env.SPORTSDATA_API_KEY;
  if (!apiKey) {
    console.error('Missing SportsDataIO API key in environment variables.');
    process.exit(1);
  }
  const log = (...args: any[]) => console.log('[SDIO]', ...args);
  const result = await loadLeagueScheduleAllTeams(leagueKey, apiKey, log);
  const gswGames = result.gamesAllMerged.filter(g => g.homeTeam === teamAbbr || g.awayTeam === teamAbbr);
  const pre = gswGames.filter(g => g.seasonType === 'PRE');
  const reg = gswGames.filter(g => g.seasonType === 'REG');
  console.log(`Total GSW games: ${gswGames.length}`);
  console.log(`Preseason: ${pre.length}`);
  console.log(`Regular season: ${reg.length}`);
  console.log('Sample preseason games:', pre.slice(0, 2));
  console.log('Sample regular season games:', reg.slice(0, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
