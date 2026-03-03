const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';
const MLS_LEAGUE_ID = 4346;

async function scrapeMlsLeagueSchedule(season) {
  try {
    const teamsResp = await fetch(`${BASE_URL}/search_all_teams.php?l=Major+League+Soccer`);
    const teamsJson = await teamsResp.json();
    const allTeams = teamsJson?.teams || [];
    const logoMap = {};
    allTeams.forEach(t => {
      if (t.strTeam && t.strTeamBadge) {
        logoMap[t.strTeam] = t.strTeamBadge;
      }
    });

    const url = `https://www.thesportsdb.com/season/4346-american-major-league-soccer/${encodeURIComponent(season)}`;
    const resp = await fetch(url);
    const html = await resp.text();
    if (Object.keys(logoMap).length === 0) {
      for (const m of html.matchAll(/<img[^>]+src=['\"]([^'\"]*\/badge\/[^'\"]*)['\"][^>]*>\s*<a[^>]*>\s*([^<]+)\s*</gi)) {
        const logo = m[1];
        const name = m[2].trim();
        if (name) logoMap[name] = logo;
      }
    }
    return logoMap;
  } catch (e) {
    console.warn('err', e);
    return {};
  }
}

(async () => {
  const logos = await scrapeMlsLeagueSchedule('2026');
  console.log('count', Object.keys(logos).length);
  console.log(Object.entries(logos).slice(0, 5));
})();