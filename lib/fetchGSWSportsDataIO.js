// Node.js script to fetch LAL home games for 2024-26 from SportsDataIO
// Usage: node fetchLALSportsDataIO.js
// Requires: node-fetch (npm install node-fetch@2)

const fetch = require('node-fetch');
const API_KEY = '9b42211a91c1440795cd6217baa9e334';
const SEASON = '2024'; // Use '2025' for 2025-26 season
const TEAM_ABBR = 'LAL';
const ENDPOINT = `https://api.sportsdata.io/v3/nba/scores/json/Games/${SEASON}`;

(async () => {
  try {
    const res = await fetch(ENDPOINT, {
      headers: { 'Ocp-Apim-Subscription-Key': API_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const games = await res.json();
    // Filter for LAL home games
    const gswHomeGames = games.filter(g => g.HomeTeam === TEAM_ABBR);
    // Map to a simple format
    const formatted = gswHomeGames.map((g, i) => ({
      homeGameNumber: i + 1,
      date: g.Day,
      opponent: g.AwayTeam,
      venue: g.StadiumDetails ? g.StadiumDetails.Name : g.StadiumID,
      seasonType: g.SeasonType,
      gameId: g.GameID
    }));
    console.log(JSON.stringify(formatted, null, 2));
  } catch (e) {
    console.error('Error fetching schedule:', e);
  }
})();
