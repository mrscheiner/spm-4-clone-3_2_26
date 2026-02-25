// src/sportsDataio.ts
// Fetch and normalize team home schedules from SportsDataIO

export interface SportsDataioGame {
  GameID: string;
  DateTime: string;
  HomeTeamId: string;
  HomeTeam: string;
  AwayTeamId: string;
  AwayTeam: string;
  Stadium?: string;
  Venue?: string;
}

export interface NormalizedGame {
  gameId: string;
  date: string;
  startTimeLocal: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  venue: string;
}

export async function getSportsDataioSchedule({ league, teamId, season, apiKey }: {
  league: string;
  teamId: string;
  season: string;
  apiKey: string;
}): Promise<NormalizedGame[]> {
  // Season format: 2025REG (regular), 2025POST (playoffs)
  const seasonType = 'REG'; // TODO: handle playoffs if needed
  const seasonParam = `${season}${seasonType}`;
  const url = `https://api.sportsdata.io/v7/${league}/scores/json/Schedules/${seasonParam}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`SportsDataIO ${res.status}: ${await res.text()}`);

  const games: SportsDataioGame[] = await res.json();

  // Filter to home games for this team
  const homeGames = games.filter(g =>
    (g.HomeTeam && g.HomeTeam.toUpperCase().includes(teamId.toUpperCase())) ||
    (g.HomeTeamId && g.HomeTeamId.toUpperCase() === teamId.toUpperCase())
  );

  return homeGames.map(game => ({
    gameId: game.GameID,
    date: game.DateTime ? new Date(game.DateTime).toISOString().split('T')[0] : '',
    startTimeLocal: game.DateTime || '',
    homeTeamId: game.HomeTeamId,
    homeTeamName: game.HomeTeam,
    awayTeamId: game.AwayTeamId,
    awayTeamName: game.AwayTeam,
    venue: game.Stadium || game.Venue || ''
  }));
}
