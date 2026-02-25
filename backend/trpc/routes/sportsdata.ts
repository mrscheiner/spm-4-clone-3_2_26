import { Hono } from 'hono';

const sportsdataRouter = new Hono();

// Supported leagues and their Sportsdata.io endpoints
const leagueEndpoints: Record<string, string> = {
  nba: 'https://api.sportsdata.io/v3/nba/scores/json/GamesByTeam',
  nhl: 'https://api.sportsdata.io/v3/nhl/scores/json/GamesByTeam',
  nfl: 'https://api.sportsdata.io/v3/nfl/scores/json/GamesByTeam',
  mlb: 'https://api.sportsdata.io/v3/mlb/scores/json/GamesByTeam',
  mls: 'https://api.sportsdata.io/v3/soccer/scores/json/GamesByTeam',
};

sportsdataRouter.get('/schedule', async (c) => {
  const { leagueId, teamId, season } = c.req.query();
  const apiKey = c.env.SPORTSDATA_API_KEY;
  const endpoint = leagueEndpoints[leagueId];
  if (!endpoint || !apiKey || !teamId || !season) {
    return c.json({ error: 'Missing leagueId, teamId, season, or API key' }, 400);
  }

  // Use the correct endpoint format for schedule
  const url = `${endpoint}/${season}`;
  const resp = await fetch(url, {
    headers: { 'Ocp-Apim-Subscription-Key': apiKey },
  });
  if (!resp.ok) {
    return c.json({ error: 'Failed to fetch schedule' }, 500);
  }
  const games = await resp.json();
  // Filter for home games
  const homeGames = games.filter((game: any) => game.HomeTeamID == teamId);
  return c.json({ homeGames });
});

export default sportsdataRouter;
