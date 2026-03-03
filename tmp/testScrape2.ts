// standalone tester for the revised MLS schedule helpers

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';
const MLS_LEAGUE_ID = 4346;

interface MlsHomeGame {
  id: string;
  dateTimeISO: string;
  homeTeam?: string;
  opponent: { name: string; logo: string };
  gameType?: 'Regular' | 'Preseason';
}

async function scrapeMlsLeagueSchedule(season: string): Promise<MlsHomeGame[]> {
  try {
    const teamsResp = await fetch(`${BASE_URL}/search_all_teams.php?l=Major+League+Soccer`);
    const teamsJson = await teamsResp.json();
    const allTeams: any[] = teamsJson?.teams || [];
    const logoMap: Record<string, string> = {};
    allTeams.forEach(t => {
      if (t.strTeam && t.strTeamBadge) {
        logoMap[t.strTeam] = t.strTeamBadge;
      }
    });

    const url = `https://www.thesportsdb.com/season/4346-american-major-league-soccer/${encodeURIComponent(season)}`;
    const resp = await fetch(url);
    const html = await resp.text();

    // if the teams API gave us nothing (free key often returns null),
    // fallback to scraping badges from the sidebar
    if (Object.keys(logoMap).length === 0) {
      const regex = /<img[^>]+src=['"]([^'"]*\/badge\/[^'"]*)['"]*[^>]*>\s*<a[^>]*>\s*([^<]+)\s*</gi;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(html)) !== null) {
        const logo = m[1];
        const name = m[2].trim();
        if (name) logoMap[name] = logo;
      }
    }

    const results: MlsHomeGame[] = [];

    const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    const extractName = (cell: string) => {
      const matches = Array.from(cell.matchAll(/>([^<]+)</g)).map(m => m[1].trim()).filter(Boolean);
      return matches.length ? matches[0] : cell.replace(/<[^>]+>/g, '').trim();
    };
    const parseRound = (cell: string) => {
      const m = cell.match(/r(\d+)/i);
      return m ? m[1] : '';
    };

    for (const row of rowMatches) {
      const cols = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m => m[1]);
      if (cols.length < 5) continue;
      const dateStr = cols[0].replace(/<[^>]+>/g, '').trim();
      const roundStr = parseRound(cols[1]);
      const away = extractName(cols[2]);
      const home = extractName(cols[4]);
      if (!home) continue;
      let dt = new Date(dateStr);
      if (isNaN(dt.getTime())) {
        dt = new Date(`${dateStr} ${season.split('-')[0]}`);
      }
      const iso = dt.toISOString();
      const gameType: 'Regular' | 'Preseason' =
        roundStr && parseInt(roundStr, 10) < 1 ? 'Preseason' : 'Regular';
      results.push({
        id: `${home}_${dateStr}_${roundStr}`,
        dateTimeISO: iso,
        homeTeam: home,
        opponent: { name: away, logo: logoMap[away] || '' },
        gameType,
      });
    }
    return results;
  } catch (e) {
    console.warn('scrape error', e);
    return [];
  }
}

async function fetchMlsLeagueSchedule(season: string): Promise<MlsHomeGame[]> {
  const scraped = await scrapeMlsLeagueSchedule(season);
  if (scraped.length) return scraped;
  return [];
}

(async () => {
  console.log('testing league schedule');
  const league = await fetchMlsLeagueSchedule('2026');
  console.log('league count', league.length);
  console.log(league.slice(0,5).map(g=>({home:g.homeTeam, opp:g.opponent.name, logo:g.opponent.logo, type:g.gameType})));
})();
