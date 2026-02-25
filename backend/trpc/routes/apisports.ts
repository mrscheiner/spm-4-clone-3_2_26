import { Hono } from 'hono';

// You may need to adjust this import based on your backend structure
// import { getGameFormat } from './espn'; // If you have a shared formatter

const router = new Hono();

// Helper to fetch from API-Sports
async function fetchApiSportsSchedule({ leagueId, teamId, teamName, seasonYear, apiKey }: { leagueId: string, teamId?: string, teamName?: string, seasonYear: string, apiKey: string }) {
  // API-Sports endpoint and headers
  const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${seasonYear}&team=${teamId}`;
  const headers = {
    'x-apisports-key': apiKey,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API-Sports error: ${res.status}`);
  const data = await res.json();
  return data;
}

// Simple in-memory cache (replace with KV for production)
const cache: Record<string, { ts: number, data: any }> = {};
const CACHE_TTL = 60 * 60 * 3; // 3 hours

router.get('/schedule', async (c) => {
  const { leagueId, teamId, teamName, seasonYear } = c.req.query();
  if (!leagueId || (!teamId && !teamName) || !seasonYear) {
    return c.json({ error: 'Missing required params' }, 400);
  }
  const cacheKey = `${leagueId}_${teamId || teamName}_${seasonYear}`;
  if (cache[cacheKey] && (Date.now() / 1000 - cache[cacheKey].ts < CACHE_TTL)) {
    return c.json({ events: cache[cacheKey].data, error: null });
  }
  // Cloudflare Workers: c.env is typed as unknown, so cast to Record<string, string>
  const env = c.env as Record<string, string>;
  const apiKey = env.API_SPORTS_KEY;
  if (!apiKey) return c.json({ error: 'API key missing' }, 500);
  try {
    const raw = await fetchApiSportsSchedule({ leagueId, teamId, teamName, seasonYear, apiKey });
    // Normalize to Game[]
    const events = (raw.response || []).map((fixture: any, idx: number) => ({
      id: `apisports_${fixture.fixture.id}`,
      date: fixture.fixture.date.split('T')[0],
      month: '',
      day: '',
      opponent: fixture.teams.away.name,
      opponentLogo: fixture.teams.away.logo,
      venueName: fixture.fixture.venue.name,
      time: fixture.fixture.date.split('T')[1]?.slice(0,5),
      ticketStatus: 'Available',
      isPaid: false,
      gameNumber: idx + 1,
      type: fixture.league.round || 'Regular',
      dateTimeISO: fixture.fixture.date,
    }));
    cache[cacheKey] = { ts: Date.now() / 1000, data: events };
    return c.json({ events, error: null });
  } catch (e: any) {
    return c.json({ events: [], error: e.message || 'API-Sports fetch failed' }, 500);
  }
});

export default router;
