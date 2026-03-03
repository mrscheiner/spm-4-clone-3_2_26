/**
 * MLS Team Logos - ESPN CDN
 * 
 * Uses ESPN's CDN for reliable MLS team logos.
 * ESPN team IDs from https://www.espn.com/soccer/teams/_/league/usa.1
 */

// ESPN team ID to abbreviation mapping (verified from ESPN MLS page)
const ESPN_MLS_TEAM_IDS: Record<string, string> = {
  // Eastern Conference
  'ATL': '18418',   // Atlanta United FC
  'CLT': '21300',   // Charlotte FC
  'CHI': '182',     // Chicago Fire FC
  'CIN': '18267',   // FC Cincinnati
  'CLB': '183',     // Columbus Crew
  'DC': '193',      // D.C. United
  'MIA': '20232',   // Inter Miami CF
  'MTL': '9720',    // CF Montréal
  'NE': '189',      // New England Revolution
  'NYC': '17606',   // New York City FC
  'NYRB': '190',    // New York Red Bulls (Red Bull New York)
  'ORL': '12011',   // Orlando City SC
  'PHI': '10739',   // Philadelphia Union
  'TOR': '7318',    // Toronto FC
  
  // Western Conference
  'ATX': '20906',   // Austin FC
  'COL': '184',     // Colorado Rapids
  'DAL': '185',     // FC Dallas
  'HOU': '6077',    // Houston Dynamo FC
  'LA': '187',      // LA Galaxy
  'LAFC': '18966',  // Los Angeles FC
  'MIN': '17362',   // Minnesota United FC
  'NSH': '18986',   // Nashville SC
  'POR': '9723',    // Portland Timbers
  'RSL': '4771',    // Real Salt Lake
  'SD': '22529',    // San Diego FC
  'SEA': '9726',    // Seattle Sounders FC
  'SJ': '191',      // San Jose Earthquakes
  'SKC': '186',     // Sporting Kansas City
  'STL': '21812',   // St. Louis City SC
  'VAN': '9727',    // Vancouver Whitecaps FC
};

// MLS team abbreviations
export const MLS_TEAM_ABBREVS = [
  'ATL', 'ATX', 'CHI', 'CIN', 'CLB', 'CLT', 'COL', 'DAL', 'DC', 'HOU',
  'LA', 'LAFC', 'MIA', 'MIN', 'MTL', 'NE', 'NSH', 'NYC', 'NYRB', 'ORL',
  'PHI', 'POR', 'RSL', 'SD', 'SEA', 'SJ', 'SKC', 'STL', 'TOR', 'VAN',
] as const;

// Team name to abbreviation mapping for logo lookup
const MLS_NAME_TO_ABBREV: Record<string, string> = {
  'atlanta united': 'ATL',
  'atlanta united fc': 'ATL',
  'charlotte fc': 'CLT',
  'charlotte': 'CLT',
  'chicago fire': 'CHI',
  'chicago fire fc': 'CHI',
  'fc cincinnati': 'CIN',
  'cincinnati': 'CIN',
  'columbus crew': 'CLB',
  'columbus': 'CLB',
  'd.c. united': 'DC',
  'dc united': 'DC',
  'inter miami': 'MIA',
  'inter miami cf': 'MIA',
  'miami': 'MIA',
  'cf montréal': 'MTL',
  'cf montreal': 'MTL',
  'montreal': 'MTL',
  'new england revolution': 'NE',
  'new england': 'NE',
  'revolution': 'NE',
  'new york city fc': 'NYC',
  'nycfc': 'NYC',
  'new york city': 'NYC',
  'nyc fc': 'NYC',
  'nyc': 'NYC',
  'new york red bulls': 'NYRB',
  'red bull new york': 'NYRB',
  'red bulls': 'NYRB',
  'ny red bulls': 'NYRB',
  'nyrb': 'NYRB',
  'rbny': 'NYRB',
  'new york rb': 'NYRB',
  'rb new york': 'NYRB',
  'redbulls': 'NYRB',
  'red bull ny': 'NYRB',
  'orlando city': 'ORL',
  'orlando city sc': 'ORL',
  'orlando': 'ORL',
  'philadelphia union': 'PHI',
  'philadelphia': 'PHI',
  'union': 'PHI',
  'toronto fc': 'TOR',
  'toronto': 'TOR',
  'austin fc': 'ATX',
  'austin': 'ATX',
  'colorado rapids': 'COL',
  'colorado': 'COL',
  'rapids': 'COL',
  'fc dallas': 'DAL',
  'dallas': 'DAL',
  'houston dynamo': 'HOU',
  'houston dynamo fc': 'HOU',
  'houston': 'HOU',
  'dynamo': 'HOU',
  'la galaxy': 'LA',
  'los angeles galaxy': 'LA',
  'galaxy': 'LA',
  'l.a. galaxy': 'LA',
  'los angeles fc': 'LAFC',
  'lafc': 'LAFC',
  'los angeles football club': 'LAFC',
  'minnesota united': 'MIN',
  'minnesota united fc': 'MIN',
  'minnesota': 'MIN',
  'mn united': 'MIN',
  'nashville sc': 'NSH',
  'nashville': 'NSH',
  'portland timbers': 'POR',
  'portland': 'POR',
  'timbers': 'POR',
  'real salt lake': 'RSL',
  'salt lake': 'RSL',
  'rsl': 'RSL',
  'san diego fc': 'SD',
  'san diego': 'SD',
  'seattle sounders': 'SEA',
  'seattle sounders fc': 'SEA',
  'seattle': 'SEA',
  'sounders': 'SEA',
  'sounders fc': 'SEA',
  'san jose earthquakes': 'SJ',
  'san jose': 'SJ',
  'earthquakes': 'SJ',
  'quakes': 'SJ',
  'sporting kansas city': 'SKC',
  'sporting kc': 'SKC',
  'kansas city': 'SKC',
  'sporting': 'SKC',
  'st. louis city': 'STL',
  'st louis city': 'STL',
  'st. louis city sc': 'STL',
  'st louis city sc': 'STL',
  'st louis': 'STL',
  'st. louis': 'STL',
  'stl city': 'STL',
  'vancouver whitecaps': 'VAN',
  'vancouver whitecaps fc': 'VAN',
  'vancouver': 'VAN',
  'whitecaps': 'VAN',
  'whitecaps fc': 'VAN',
};

/**
 * Get MLS team logo URL from ESPN CDN
 */
export function getMlsLogo(teamAbbrevOrName: string): string {
  if (!teamAbbrevOrName) return '';
  
  const input = teamAbbrevOrName.trim();
  const upperInput = input.toUpperCase();
  
  // Check if it's a direct abbreviation
  if (ESPN_MLS_TEAM_IDS[upperInput]) {
    const teamId = ESPN_MLS_TEAM_IDS[upperInput];
    return `https://a.espncdn.com/i/teamlogos/soccer/500/${teamId}.png`;
  }
  
  // Try to find by name
  const lowerInput = input.toLowerCase();
  const abbrev = MLS_NAME_TO_ABBREV[lowerInput];
  if (abbrev && ESPN_MLS_TEAM_IDS[abbrev]) {
    const teamId = ESPN_MLS_TEAM_IDS[abbrev];
    return `https://a.espncdn.com/i/teamlogos/soccer/500/${teamId}.png`;
  }
  
  // Try partial match
  for (const [name, abbr] of Object.entries(MLS_NAME_TO_ABBREV)) {
    if (lowerInput.includes(name) || name.includes(lowerInput)) {
      if (ESPN_MLS_TEAM_IDS[abbr]) {
        const teamId = ESPN_MLS_TEAM_IDS[abbr];
        return `https://a.espncdn.com/i/teamlogos/soccer/500/${teamId}.png`;
      }
    }
  }
  
  return '';
}

/**
 * Get MLS league logo
 */
export function getMlsLeagueLogo(): string {
  return 'https://a.espncdn.com/i/leaguelogos/soccer/500/19.png';
}

/**
 * Check if a team abbreviation is a valid MLS team
 */
export function isValidMlsTeam(teamAbbrev: string): boolean {
  return MLS_TEAM_ABBREVS.includes(teamAbbrev?.toUpperCase() as any);
}

export const MLS_LOGOS = {
  league: {
    name: "Major League Soccer",
    logoUrl: getMlsLeagueLogo(),
  },
  teams: ESPN_MLS_TEAM_IDS,
} as const;
