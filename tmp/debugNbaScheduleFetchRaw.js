// Minimal debug script to fetch and print NBA schedule for GS using fetch
(async () => {
  const url = 'https://spm-api.nsp-2-repository.workers.dev/api/trpc/sportsdata.getLeagueScheduleAllTeams?input=%7B%22leagueId%22%3A%22nba%22%2C%22teamAbbreviation%22%3A%22GS%22%7D';
  const res = await fetch(url);
  const json = await res.json();
  console.log('[NBA SCHEDULE DEBUG] RAW RESPONSE:', JSON.stringify(json, null, 2));
})();
