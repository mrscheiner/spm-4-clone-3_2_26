// src/sportsSchedule.ts
// Fetch and normalize team home schedules for NHL, NFL, NBA, MLS, MLB from Goalserve


export interface Game {
  gameId: string;
  date: string;
  startTimeLocal: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  venue: string;
}

export interface ScheduleResult {
  league: string;
  teamId: string;
  season: string;
  games: Game[];
}

const API_KEY = '9b42211a91c1440795cd6217baa9e334';

export async function getTeamHomeSchedule({ league, teamId, season }: {
  league: string;
  teamId: string;
  season: string;
  apiKey?: string;
}): Promise<ScheduleResult> {
  // Accept API key from argument or globalThis (Cloudflare Worker env)
  const key = typeof arguments[0].apiKey === 'string' && arguments[0].apiKey.length > 0 ? arguments[0].apiKey : (globalThis as any).SPORTSDATAIO_KEY || API_KEY;
  let url = '';
  let seasonCode = '';
  // Use correct endpoint and season code for each league
  switch (league) {
    case 'nba':
      seasonCode = season;
      url = `https://api.sportsdata.io/v3/nba/scores/json/Games/${seasonCode}?key=${key}`;
      break;
    case 'mlb':
      seasonCode = season;
      url = `https://api.sportsdata.io/v3/mlb/scores/json/Games/${seasonCode}?key=${key}`;
      break;
    case 'nhl':
      seasonCode = season;
      url = `https://api.sportsdata.io/v3/nhl/scores/json/Games/${seasonCode}?key=${key}`;
      break;
    case 'nfl':
      seasonCode = `${season}REG`;
      url = `https://api.sportsdata.io/v3/nfl/scores/json/Schedules/${seasonCode}?key=${key}`;
      break;
    case 'mls':
      // MLS schedule fetch is paused
      return {
        league: league,
        teamId,
        season,
        games: [],
        error: "MLS schedule fetch temporarily paused. Contact support for access."
      };
      // break intentionally omitted
    default:
      throw new Error(`Unsupported league: ${league}`);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SportsDataIO ${res.status}: ${await res.text()}`);
  }

  const games: any[] = await res.json();

  // Filter home games for this team (case-insensitive)
  const homeGames = games.filter(game =>
    (game.HomeTeam?.toUpperCase().includes(teamId.toUpperCase()) ||
     game.HomeTeamId === teamId)
  );

  return {
    league: league.toUpperCase(),
    teamId,
    season: seasonCode,
    games: homeGames.map(game => ({
      gameId: game.GameID?.toString() || '',
      date: game.DateTime ? new Date(game.DateTime).toISOString().split('T')[0] : '',
      startTimeLocal: game.DateTime || '',
      homeTeamId: game.HomeTeamId || '',
      homeTeamName: game.HomeTeam || '',
      awayTeamId: game.AwayTeamId || '',
      awayTeamName: game.AwayTeam || '',
      venue: game.Stadium || game.Venue || ''
    }))
  };
}
