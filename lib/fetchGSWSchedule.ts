import fetch from "node-fetch";
import * as cheerio from "cheerio";

export type GSWGame = {
  label: string;
  opponent: string;
  date: string;
  home: true;
};

const PRESEASON_URL = "https://www.espn.com/nba/team/schedule/_/name/gs/seasontype/1";
const REGULAR_URL = "https://www.espn.com/nba/team/schedule/_/name/gs/seasontype/2";

export async function fetchGSWSchedule(): Promise<GSWGame[]> {
  // Helper to fetch and parse games from a given ESPN URL
  async function parseSchedule(url: string, isPreseason: boolean): Promise<GSWGame[]> {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const rows = $("table tbody tr");
    const games: GSWGame[] = [];
    let counter = 1;
    rows.each((_, row) => {
      const tds = $(row).find("td");
      if (tds.length < 2) return;
      const dateText = $(tds[0]).text().trim();
      const opponentCell = $(tds[1]).text().trim();
      if (!opponentCell.startsWith("vs")) return;
      // Parse date (e.g., "Sun, Oct 5" → "2025-10-05")
      const dateMatch = dateText.match(/([A-Za-z]+), ([A-Za-z]+) (\d+)/);
      let dateISO = "";
      if (dateMatch) {
        const month = dateMatch[2];
        const day = dateMatch[3].padStart(2, "0");
        const year = "2025"; // Adjust as needed
        const months: Record<string, string> = {
          Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
          Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
        };
        dateISO = `${year}-${months[month]}-${day}`;
      }
      const opponent = opponentCell.replace(/^vs\s+/, "").replace(/\s+\(.+\)$/, "");
      games.push({
        label: isPreseason ? `PS${counter}` : `${counter}`,
        opponent,
        date: dateISO,
        home: true,
      });
      counter++;
    });
    return games;
  }
  const preseasonGames = await parseSchedule(PRESEASON_URL, true);
  const regularGames = await parseSchedule(REGULAR_URL, false);
  return [...preseasonGames, ...regularGames];
}
