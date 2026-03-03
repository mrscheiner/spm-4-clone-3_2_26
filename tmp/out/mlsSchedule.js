"use strict";
// Utility for retrieving MLS home game schedule using TheSportsDB free API
// Not part of backend; called directly from frontend code when needed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeMlsLeagueSchedule = scrapeMlsLeagueSchedule;
exports.fetchMlsHomeSchedule = fetchMlsHomeSchedule;
exports.fetchMlsLeagueSchedule = fetchMlsLeagueSchedule;
const trpc_1 = require("@/lib/trpc");
// TheSportsDB free API key is currently `123` (use /json/123/).  We
// historically used `/json/1/` which has behaved as an alias for the free key
// but the official docs list 123; switch to a premium key here or via an
// environment variable if desired in the future.
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';
const MLS_LEAGUE_ID = 4346;
// when both the free API and backend fail, attempt to scrape the MLS league
// season page for home‑game rows.  This is brittle but works until the data
// reappears on the official endpoints.
// scrape the league page and return every home game found.  We also
// compute a simplistic `gameType` from the round string (`r01`, `r02`, …)
// treating rounds beginning with 0 as preseason.  Logos are looked up via a
// team badge map fetched in advance.
async function scrapeMlsLeagueSchedule(season) {
    try {
        // map team names to badge URLs so we can attach logos to opponents.
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
        if (!resp.ok) {
            console.warn('[MLS] scrape page fetch failed', resp.status);
            return [];
        }
        const html = await resp.text();
        const results = [];
        const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        const extractName = (cell) => {
            const matches = Array.from(cell.matchAll(/>([^<]+)</g)).map(m => m[1].trim()).filter(Boolean);
            return matches.length ? matches[0] : cell.replace(/<[^>]+>/g, '').trim();
        };
        const parseRound = (cell) => {
            const m = cell.match(/r(\d+)/i);
            return m ? m[1] : '';
        };
        for (const row of rowMatches) {
            const cols = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m => m[1]);
            if (cols.length < 5)
                continue;
            const dateStr = cols[0].replace(/<[^>]+>/g, '').trim();
            const roundStr = parseRound(cols[1]);
            const away = extractName(cols[2]);
            const home = extractName(cols[4]);
            if (!home)
                continue;
            let dt = new Date(dateStr);
            if (isNaN(dt.getTime())) {
                dt = new Date(`${dateStr} ${season.split('-')[0]}`);
            }
            const iso = dt.toISOString();
            const gameType = roundStr && parseInt(roundStr, 10) < 1 ? 'Preseason' : 'Regular';
            results.push({
                id: `${home}_${dateStr}_${roundStr}`,
                dateTimeISO: iso,
                homeTeam: home,
                opponent: { name: away, logo: logoMap[away] || '' },
                gameType,
            });
        }
        return results;
    }
    catch (e) {
        console.warn('[MLS] scraping league schedule error', e);
        return [];
    }
}
/**
 * Fetches the MLS home schedule for a given team and season.
 *
 * @param teamName exact team name as it appears in the event.strHomeTeam field
 * @param season season string as used by TheSportsDB (e.g. "2025-2026" or "2025")
 * @returns array of home games with opponent info and ISO datetime
 */
async function fetchMlsHomeSchedule(teamName, season) {
    // Helper that converts backend schedule payload to our MlsHomeGame shape
    const convertFromBackend = (payload) => {
        return payload.map(g => {
            // payload fields come from getTeamHomeSchedule result
            const date = g.date || '';
            const time = g.startTimeLocal ? new Date(g.startTimeLocal).toISOString().split('T')[1] : '00:00:00';
            return {
                id: g.gameId || `${date}_${teamName}`,
                dateTimeISO: `${date}T${time}`,
                opponent: {
                    name: g.awayTeamName || '',
                    logo: '', // backend does not currently return logo, leave blank
                },
            };
        });
    };
    // try backend first; if API key exists it will return games directly
    try {
        const backendUrl = `/api/schedule?league=mls&teamId=${encodeURIComponent(teamName)}&season=${encodeURIComponent(season)}&type=home`;
        const resp = await fetch(backendUrl);
        if (resp.ok) {
            const json = await resp.json();
            if (json && Array.isArray(json.games)) {
                return convertFromBackend(json.games);
            }
            if (json && json.error === 'API_KEY_MISSING') {
                throw new Error('API_KEY_MISSING');
            }
            // no games but no explicit error; continue to free API
        }
        else {
            console.warn('[MLS] backend fetch status', resp.status);
        }
    }
    catch (err) {
        if (String(err?.message).includes('API_KEY_MISSING')) {
            console.log('[MLS] backend API key missing – will try TheSportsDB');
        }
        else {
            console.warn('[MLS] backend fetch error, will try TheSportsDB', err);
        }
    }
    // attempt TheSportsDB first -- this is the free option the user requested
    let freeResults = [];
    try {
        // load all MLS teams to map names -> logos
        const teamsResp = await fetch(`${BASE_URL}/search_all_teams.php?l=Major+League+Soccer`);
        if (!teamsResp.ok) {
            throw new Error(`teams request failed ${teamsResp.status}`);
        }
        const teamsJson = await teamsResp.json();
        const allTeams = teamsJson?.teams || [];
        const logoMap = {};
        allTeams.forEach(t => {
            // strTeam is canonical name, strTeamBadge is logo
            if (t.strTeam && t.strTeamBadge) {
                logoMap[t.strTeam] = t.strTeamBadge;
            }
        });
        // fetch season events
        const schedResp = await fetch(`${BASE_URL}/eventsseason.php?id=${MLS_LEAGUE_ID}&s=${encodeURIComponent(season)}`);
        if (!schedResp.ok) {
            throw new Error(`schedule request failed ${schedResp.status}`);
        }
        const schedJson = await schedResp.json();
        const events = schedJson?.events || [];
        events.forEach(ev => {
            if (ev.strHomeTeam === teamName) {
                const date = ev.dateEvent || '';
                let time = ev.strTime || '00:00:00';
                // ensure time has seconds
                if (/^\d{1,2}:\d{2}$/.test(time)) {
                    time = time + ':00';
                }
                const dateTimeISO = `${date}T${time}`;
                const oppName = ev.strAwayTeam || '';
                const oppLogo = logoMap[oppName] || '';
                freeResults.push({
                    id: ev.idEvent || `${date}_${teamName}`,
                    dateTimeISO,
                    opponent: {
                        name: oppName,
                        logo: oppLogo,
                    },
                });
            }
        });
    }
    catch (err) {
        console.warn('[MLS] TheSportsDB fetch failed:', err);
        // if the free API is unreachable (404s, no data, etc.) fall back to backend
    }
    // if we got any games from the free API, return them immediately
    if (freeResults.length) {
        return freeResults;
    }
    // nothing from free API – log so we can see when scraping will be used
    console.log('[MLS] no games from free TheSportsDB lookup; will try backend/scrape');
    // otherwise continue to backend fallback and ultimately scraping
    // backend fallback (requires SPORTS­DATA key configured)
    try {
        const backendUrl = `${(0, trpc_1.getBaseUrl)()}/api/schedule?league=mls&teamId=${encodeURIComponent(teamName)}&season=${encodeURIComponent(season)}&type=home`;
        const resp = await fetch(backendUrl);
        if (!resp.ok) {
            // if the proxy returns 404 it's likely no MLS data is available yet
            console.warn('[MLS] backend fallback returned', resp.status, '- treating as no schedule');
        }
        else {
            const json = await resp.json();
            if (json && Array.isArray(json.games)) {
                return convertFromBackend(json.games);
            }
            console.warn('[MLS] backend fallback returned unexpected shape', json);
        }
    }
    catch (err) {
        console.warn('[MLS] backend fallback also failed:', err);
    }
    // final attempt: scrape league page for home games
    const scraped = await scrapeMlsLeagueSchedule(season);
    if (scraped.length) {
        // if a teamName was specified, filter now; otherwise return all
        const filtered = teamName
            ? scraped.filter(g => g.homeTeam?.toLowerCase() === teamName.toLowerCase())
            : scraped;
        console.log('[MLS] scraped', filtered.length, 'home games from HTML (final fallback)');
        return filtered;
    }
    return [];
}
/**
 * Return the entire MLS home schedule for a season (all teams).  Each result
 * carries the `homeTeam` property so callers can filter themselves.  This
 * function uses the same underlying strategy as `fetchMlsHomeSchedule` but
 * never filters the events.
 */
async function fetchMlsLeagueSchedule(season) {
    // primary source: scrape the league page directly.  scraping has proven to
    // be the most reliable way to get every home match (regular + preseason)
    // since the JSON API is heavily truncated for free users.
    const scraped = await scrapeMlsLeagueSchedule(season);
    if (scraped.length) {
        console.log('[MLS] scraped league schedule', scraped.length, 'games');
        return scraped;
    }
    // free API attempt (will almost always be empty).  keep for completeness.
    const results = [];
    try {
        const teamsResp = await fetch(`${BASE_URL}/search_all_teams.php?l=Major+League+Soccer`);
        const teamsJson = await teamsResp.json();
        const logoMap = {};
        (teamsJson?.teams || []).forEach((t) => {
            if (t.strTeam && t.strTeamBadge) {
                logoMap[t.strTeam] = t.strTeamBadge;
            }
        });
        const schedResp = await fetch(`${BASE_URL}/eventsseason.php?id=${MLS_LEAGUE_ID}&s=${encodeURIComponent(season)}`);
        const schedJson = await schedResp.json();
        const events = schedJson?.events || [];
        events.forEach(ev => {
            const date = ev.dateEvent || '';
            let time = ev.strTime || '00:00:00';
            if (/^\d{1,2}:\d{2}$/.test(time))
                time += ':00';
            results.push({
                id: ev.idEvent || `${date}_${ev.strHomeTeam}`,
                dateTimeISO: `${date}T${time}`,
                homeTeam: ev.strHomeTeam,
                opponent: { name: ev.strAwayTeam || '', logo: logoMap[ev.strAwayTeam] || '' },
            });
        });
        if (results.length)
            return results;
    }
    catch (err) {
        console.warn('[MLS] free API league fetch failed', err);
    }
    // backend fallback - request all homes from proxy if available
    try {
        const backendUrl = `${(0, trpc_1.getBaseUrl)()}/api/schedule?league=mls&season=${encodeURIComponent(season)}&type=all`;
        const resp = await fetch(backendUrl);
        if (resp.ok) {
            const json = await resp.json();
            if (json && Array.isArray(json.games)) {
                return json.games.map((g) => ({
                    id: g.gameId || `${g.date}_${g.homeTeam}`,
                    dateTimeISO: `${g.date}T${(g.startTimeLocal || '').split('T')[1] || '00:00:00'}`,
                    homeTeam: g.homeTeam || '',
                    opponent: { name: g.awayTeamName || '', logo: '' },
                }));
            }
        }
    }
    catch (err) {
        console.warn('[MLS] backend league fallback also failed:', err);
    }
    return [];
}
