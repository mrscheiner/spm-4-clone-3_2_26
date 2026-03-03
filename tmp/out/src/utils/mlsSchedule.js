"use strict";
// Utility for retrieving MLS home game schedule using TheSportsDB free API
// Not part of backend; called directly from frontend code when needed.
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeMlsHomeSchedule = scrapeMlsHomeSchedule;
exports.fetchMlsHomeSchedule = fetchMlsHomeSchedule;
const trpc_1 = require("@/lib/trpc");
const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/1';
const MLS_LEAGUE_ID = 4346;
// when both the free API and backend fail, attempt to scrape the MLS league
// season page for home‑game rows.  This is brittle but works until the data
// reappears on the official endpoints.
async function scrapeMlsHomeSchedule(teamName, season) {
    try {
        const url = `https://www.thesportsdb.com/season/4346-american-major-league-soccer/${encodeURIComponent(season)}`;
        const resp = await fetch(url);
        if (!resp.ok) {
            console.warn('[MLS] scrape page fetch failed', resp.status);
            return [];
        }
        const html = await resp.text();
        const results = [];
        // split up each table row and then extract individual <td> cells.
        // the page always seems to have five <td> columns:
        // 0: date, 1: round/link info, 2: away team, 3: score, 4: home team
        const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        // helper that pulls the first bit of plain text from a possibly
        // nested set of <a> tags (desktop+mobile anchors duplicate the name).
        const extractName = (cell) => {
            const matches = [...cell.matchAll(/>([^<]+)</g)].map(m => m[1].trim()).filter(Boolean);
            return matches.length ? matches[0] : cell.replace(/<[^>]+>/g, '').trim();
        };
        for (const row of rowMatches) {
            // find all <td>...</td> contents
            const cols = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
            if (cols.length < 5)
                continue; // unexpected structure
            const dateStr = cols[0].replace(/<[^>]+>/g, '').trim();
            const away = extractName(cols[2]);
            const home = extractName(cols[4]);
            if (home.toLowerCase() !== teamName.toLowerCase()) {
                continue; // we only care about home games
            }
            // build ISO date; there is no time information on this page
            let dt = new Date(dateStr);
            if (isNaN(dt.getTime())) {
                // often the date string lacks a year, so append from season
                dt = new Date(`${dateStr} ${season.split('-')[0]}`);
            }
            const iso = dt.toISOString();
            results.push({
                id: `${home}_${dateStr}`,
                dateTimeISO: iso,
                opponent: { name: away, logo: '' },
            });
        }
        return results;
    }
    catch (e) {
        console.warn('[MLS] scraping fallback error', e);
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
        const results = [];
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
                results.push({
                    id: ev.idEvent || `${date}_${teamName}`,
                    dateTimeISO,
                    opponent: {
                        name: oppName,
                        logo: oppLogo,
                    },
                });
            }
        });
        return results;
    }
    catch (err) {
        console.warn('[MLS] TheSportsDB fetch failed:', err);
        // if the free API is unreachable (404s, no data, etc.) fall back to backend
    }
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
    const scraped = await scrapeMlsHomeSchedule(teamName, season);
    if (scraped.length) {
        console.log('[MLS] scraped', scraped.length, 'home games from HTML');
        return scraped;
    }
    return [];
}
