// Node.js script to fetch GSW home games for 2025-26 from ESPN
// Usage: node fetchGSWSchedule.js
// Requires: node-fetch@2, cheerio (npm install node-fetch@2 cheerio)

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const PRE_URL = 'https://www.espn.com/nba/team/schedule/_/name/gs/seasontype/1'; // Preseason
const REG_URL = 'https://www.espn.com/nba/team/schedule/_/name/gs/seasontype/2'; // Regular season


async function fetchHomeGames(url, type, labelPrefix) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const games = [];
  let num = 1;
  $('table tbody tr').each((_, row) => {
    const tds = $(row).find('td');
    if (tds.length < 4) return;
    const opponentCell = $(tds[1]).text();
    const isHome = !opponentCell.includes('@');
    if (!isHome) return;
    const date = $(tds[0]).text();
    const opponent = opponentCell.replace('vs', '').trim();
    if (type === 'preseason') {
      games.push({
        label: `${labelPrefix}${num++}`,
        date,
        opponent,
        type
      });
    } else {
      games.push({
        homeGameNumber: num++,
        date,
        opponent,
        type
      });
    }
  });
  return games;
}

(async () => {
  try {
    const preseason = await fetchHomeGames(PRE_URL, 'preseason', 'PS');
    const regular = await fetchHomeGames(REG_URL, 'regular', '');
    const games = [...preseason, ...regular];
    console.log(JSON.stringify(games, null, 2));
  } catch (e) {
    console.error('Error fetching schedule:', e);
  }
})();
