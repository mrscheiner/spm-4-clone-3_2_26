import { getTeamsByLeague, NHL_TEAMS } from "../../constants/leagues";
import { getMlsLogo } from "../../constants/mlsLogos";

// MLS name to abbreviation mapping for logo lookup
const MLS_NAME_TO_ABBREV: Record<string, string> = {
  // Full team names (lowercase for matching)
  'atlanta united fc': 'ATL',
  'atlanta united': 'ATL',
  'austin fc': 'ATX',
  'charlotte fc': 'CLT',
  'chicago fire fc': 'CHI',
  'chicago fire': 'CHI',
  'fc cincinnati': 'CIN',
  'cincinnati': 'CIN',
  'columbus crew': 'CLB',
  'colorado rapids': 'COL',
  'd.c. united': 'DC',
  'dc united': 'DC',
  'fc dallas': 'DAL',
  'dallas': 'DAL',
  'houston dynamo fc': 'HOU',
  'houston dynamo': 'HOU',
  'inter miami cf': 'MIA',
  'inter miami': 'MIA',
  'la galaxy': 'LA',
  'los angeles galaxy': 'LA',
  'galaxy': 'LA',
  'los angeles fc': 'LAFC',
  'lafc': 'LAFC',
  'minnesota united fc': 'MIN',
  'minnesota united': 'MIN',
  'cf montréal': 'MTL',
  'cf montreal': 'MTL',
  'montreal': 'MTL',
  'nashville sc': 'NSH',
  'nashville': 'NSH',
  'new england revolution': 'NE',
  'revolution': 'NE',
  'new york city fc': 'NYC',
  'nycfc': 'NYC',
  'new york red bulls': 'NYRB',
  'red bull new york': 'NYRB',
  'red bulls': 'NYRB',
  'orlando city sc': 'ORL',
  'orlando city': 'ORL',
  'orlando': 'ORL',
  'philadelphia union': 'PHI',
  'union': 'PHI',
  'portland timbers': 'POR',
  'timbers': 'POR',
  'real salt lake': 'RSL',
  'salt lake': 'RSL',
  'san diego fc': 'SD',
  'san diego': 'SD',
  'san jose earthquakes': 'SJ',
  'earthquakes': 'SJ',
  'seattle sounders fc': 'SEA',
  'seattle sounders': 'SEA',
  'sounders': 'SEA',
  'sporting kansas city': 'SKC',
  'sporting kc': 'SKC',
  'kansas city': 'SKC',
  'st. louis city sc': 'STL',
  'st louis city sc': 'STL',
  'st. louis city': 'STL',
  'st louis city': 'STL',
  'toronto fc': 'TOR',
  'toronto': 'TOR',
  'vancouver whitecaps fc': 'VAN',
  'vancouver whitecaps': 'VAN',
  'whitecaps': 'VAN',
  // Abbreviations (lowercase for matching)
  'rbny': 'NYRB',
  'nyrb': 'NYRB',
  'atl': 'ATL',
  'atx': 'ATX',
  'chi': 'CHI',
  'cin': 'CIN',
  'clb': 'CLB',
  'clt': 'CLT',
  'col': 'COL',
  'dal': 'DAL',
  'dc': 'DC',
  'hou': 'HOU',
  'la': 'LA',
  'mia': 'MIA',
  'min': 'MIN',
  'mtl': 'MTL',
  'ne': 'NE',
  'nsh': 'NSH',
  'nyc': 'NYC',
  'orl': 'ORL',
  'phi': 'PHI',
  'por': 'POR',
  'rsl': 'RSL',
  'sd': 'SD',
  'sea': 'SEA',
  'sj': 'SJ',
  'skc': 'SKC',
  'stl': 'STL',
  'tor': 'TOR',
  'van': 'VAN',
};

// league-specific alias map copied from schedule.tsx; export for reuse
export const LEAGUE_ALIASES: Record<string, Record<string, string>> = {
  nfl: {
    // Full team names (exact match)
    'arizona cardinals': 'ari-nfl',
    'atlanta falcons': 'atl-nfl',
    'baltimore ravens': 'bal',
    'buffalo bills': 'buf-nfl',
    'carolina panthers': 'car-nfl',
    'chicago bears': 'chi-nfl',
    'cincinnati bengals': 'cin',
    'cleveland browns': 'cle-nfl',
    'dallas cowboys': 'dal-nfl',
    'denver broncos': 'den-nfl',
    'detroit lions': 'det-nfl',
    'green bay packers': 'gb',
    'houston texans': 'hou-nfl',
    'indianapolis colts': 'ind-nfl',
    'jacksonville jaguars': 'jax',
    'kansas city chiefs': 'kc',
    'las vegas raiders': 'lv',
    'los angeles chargers': 'lac-nfl',
    'los angeles rams': 'lar',
    'miami dolphins': 'mia-nfl',
    'minnesota vikings': 'min-nfl',
    'new england patriots': 'ne',
    'new orleans saints': 'no',
    'new york giants': 'nyg',
    'new york jets': 'nyj',
    'philadelphia eagles': 'phi-nfl',
    'pittsburgh steelers': 'pit-nfl',
    'san francisco 49ers': 'sf',
    'seattle seahawks': 'sea-nfl',
    'tampa bay buccaneers': 'tb',
    'tennessee titans': 'ten',
    'washington commanders': 'was-nfl',
    // Team nicknames
    cardinals: 'ari-nfl',
    falcons: 'atl-nfl',
    ravens: 'bal',
    bills: 'buf-nfl',
    panthers: 'car-nfl',
    bears: 'chi-nfl',
    bengals: 'cin',
    browns: 'cle-nfl',
    cowboys: 'dal-nfl',
    broncos: 'den-nfl',
    lions: 'det-nfl',
    packers: 'gb',
    texans: 'hou-nfl',
    colts: 'ind-nfl',
    jaguars: 'jax',
    chiefs: 'kc',
    raiders: 'lv',
    chargers: 'lac-nfl',
    rams: 'lar',
    dolphins: 'mia-nfl',
    vikings: 'min-nfl',
    patriots: 'ne',
    pats: 'ne',
    saints: 'no',
    giants: 'nyg',
    jets: 'nyj',
    eagles: 'phi-nfl',
    steelers: 'pit-nfl',
    '49ers': 'sf',
    niners: 'sf',
    seahawks: 'sea-nfl',
    buccaneers: 'tb',
    bucs: 'tb',
    titans: 'ten',
    commanders: 'was-nfl',
    // City names
    arizona: 'ari-nfl',
    atlanta: 'atl-nfl',
    baltimore: 'bal',
    buffalo: 'buf-nfl',
    carolina: 'car-nfl',
    chicago: 'chi-nfl',
    cincinnati: 'cin',
    cleveland: 'cle-nfl',
    dallas: 'dal-nfl',
    denver: 'den-nfl',
    detroit: 'det-nfl',
    'green bay': 'gb',
    houston: 'hou-nfl',
    indianapolis: 'ind-nfl',
    jacksonville: 'jax',
    'kansas city': 'kc',
    'las vegas': 'lv',
    'la chargers': 'lac-nfl',
    'la rams': 'lar',
    miami: 'mia-nfl',
    minnesota: 'min-nfl',
    'new england': 'ne',
    'new orleans': 'no',
    'ny giants': 'nyg',
    'ny jets': 'nyj',
    philadelphia: 'phi-nfl',
    pittsburgh: 'pit-nfl',
    'san francisco': 'sf',
    seattle: 'sea-nfl',
    'tampa bay': 'tb',
    tampa: 'tb',
    tennessee: 'ten',
    washington: 'was-nfl',
    // Abbreviations
    ari: 'ari-nfl',
    atl: 'atl-nfl',
    bal: 'bal',
    buf: 'buf-nfl',
    car: 'car-nfl',
    chi: 'chi-nfl',
    cin: 'cin',
    cle: 'cle-nfl',
    dal: 'dal-nfl',
    den: 'den-nfl',
    det: 'det-nfl',
    gb: 'gb',
    hou: 'hou-nfl',
    ind: 'ind-nfl',
    jax: 'jax',
    kc: 'kc',
    lv: 'lv',
    lac: 'lac-nfl',
    lar: 'lar',
    mia: 'mia-nfl',
    min: 'min-nfl',
    ne: 'ne',
    no: 'no',
    nyg: 'nyg',
    nyj: 'nyj',
    phi: 'phi-nfl',
    pit: 'pit-nfl',
    sf: 'sf',
    sea: 'sea-nfl',
    tb: 'tb',
    ten: 'ten',
    was: 'was-nfl',
    wsh: 'was-nfl',
  },
  nhl: {
    blackhawks: 'chi',
    chicago: 'chi',
    flyers: 'phi',
    philadelphia: 'phi',
    hurricanes: 'car',
    carolina: 'car',
    capitals: 'wsh',
    washington: 'wsh',
    caps: 'wsh',
    lightning: 'tbl',
    tampa: 'tbl',
    'tampa bay': 'tbl',
    kings: 'lak',
    'la kings': 'lak',
    'los angeles': 'lak',
    la: 'lak',
    bruins: 'bos',
    boston: 'bos',
    utah: 'ari',
    mammoth: 'ari',
    'utah mammoth': 'ari',
    'utah hockey club': 'ari',
    panthers: 'fla',
    florida: 'fla',
    'maple leafs': 'tor',
    leafs: 'tor',
    toronto: 'tor',
    rangers: 'nyr',
    islanders: 'nyi',
    devils: 'njd',
    sabres: 'buf',
    buffalo: 'buf',
    senators: 'ott',
    ottawa: 'ott',
    canadiens: 'mtl',
    montreal: 'mtl',
    habs: 'mtl',
    penguins: 'pit',
    pittsburgh: 'pit',
    pens: 'pit',
    'blue jackets': 'cbj',
    columbus: 'cbj',
    'red wings': 'det',
    detroit: 'det',
    predators: 'nsh',
    nashville: 'nsh',
    preds: 'nsh',
    jets: 'wpg',
    winnipeg: 'wpg',
    wild: 'min',
    minnesota: 'min',
    blues: 'stl',
    'st. louis': 'stl',
    'st louis': 'stl',
    stars: 'dal',
    dallas: 'dal',
    avalanche: 'col',
    colorado: 'col',
    avs: 'col',
    coyotes: 'ari',
    arizona: 'ari',
    flames: 'cgy',
    calgary: 'cgy',
    oilers: 'edm',
    edmonton: 'edm',
    canucks: 'van',
    vancouver: 'van',
    'golden knights': 'vgk',
    knights: 'vgk',
    vegas: 'vgk',
    kraken: 'sea',
    seattle: 'sea',
    sharks: 'sjs',
    'san jose': 'sjs',
    ducks: 'ana',
    anaheim: 'ana',
  },
  mls: {
    // Full team names (as returned by MLS API)
    'los angeles fc': 'lafc',
    'inter miami cf': 'inter-mia',
    'fc dallas': 'dal-fc',
    'd.c. united': 'dc-utd',
    'new york city fc': 'nyc-fc',
    'new york red bulls': 'ny-rb',
    'toronto fc': 'tor-fc',
    'vancouver whitecaps fc': 'van-whitecaps',
    'seattle sounders fc': 'sea-sounders',
    'portland timbers': 'por-timbers',
    'la galaxy': 'la-galaxy',
    'austin fc': 'aus-fc',
    'houston dynamo fc': 'hou-dynamo',
    'atlanta united fc': 'atl-utd',
    'charlotte fc': 'cha-fc',
    'chicago fire fc': 'chi-fire',
    'fc cincinnati': 'cin-fc',
    'columbus crew': 'cbus-crew',
    'colorado rapids': 'col-rapids',
    'minnesota united fc': 'min-utd',
    'cf montréal': 'mtl-cf',
    'cf montreal': 'mtl-cf',
    'new england revolution': 'ne-rev',
    'nashville sc': 'nsh-sc',
    'orlando city sc': 'orl-city',
    'philadelphia union': 'phi-union',
    'real salt lake': 'rsl',
    'san jose earthquakes': 'sj-quakes',
    'sporting kansas city': 'skc',
    'st. louis city sc': 'stl-city',
    'san diego fc': 'sd-fc',
    // Abbreviations
    'lafc': 'lafc',
    'mia': 'inter-mia',
    'dal': 'dal-fc',
    'dc': 'dc-utd',
    'nyc': 'nyc-fc',
    'nyrb': 'ny-rb',
    'rbny': 'ny-rb',
    'tor': 'tor-fc',
    'van': 'van-whitecaps',
    'sea': 'sea-sounders',
    'por': 'por-timbers',
    'la': 'la-galaxy',
    'atx': 'aus-fc',
    'hou': 'hou-dynamo',
    'atl': 'atl-utd',
    'clt': 'cha-fc',
    'chi': 'chi-fire',
    'cin': 'cin-fc',
    'clb': 'cbus-crew',
    'col': 'col-rapids',
    'min': 'min-utd',
    'mtl': 'mtl-cf',
    'ne': 'ne-rev',
    'nsh': 'nsh-sc',
    'orl': 'orl-city',
    'phi': 'phi-union',
    'rsl': 'rsl',
    'sj': 'sj-quakes',
    'skc': 'skc',
    'stl': 'stl-city',
    'sd': 'sd-fc',
    // Common nicknames/aliases
    'galaxy': 'la-galaxy',
    'sounders': 'sea-sounders',
    'timbers': 'por-timbers',
    'quakes': 'sj-quakes',
    'earthquakes': 'sj-quakes',
    'dynamo': 'hou-dynamo',
    'fire': 'chi-fire',
    'crew': 'cbus-crew',
    'rapids': 'col-rapids',
    'revolution': 'ne-rev',
    'revs': 'ne-rev',
    'union': 'phi-union',
    'loons': 'min-utd',
    'whitecaps': 'van-whitecaps',
    'red bulls': 'ny-rb',
    'nycfc': 'nyc-fc',
    'city sc': 'stl-city',
    // City names
    'atlanta': 'atl-utd',
    'austin': 'aus-fc',
    'charlotte': 'cha-fc',
    'chicago': 'chi-fire',
    'cincinnati': 'cin-fc',
    'columbus': 'cbus-crew',
    'colorado': 'col-rapids',
    'dallas': 'dal-fc',
    'houston': 'hou-dynamo',
    'los angeles': 'lafc',
    'miami': 'inter-mia',
    'minnesota': 'min-utd',
    'montreal': 'mtl-cf',
    'nashville': 'nsh-sc',
    'new england': 'ne-rev',
    'new york': 'nyc-fc',
    'orlando': 'orl-city',
    'philadelphia': 'phi-union',
    'portland': 'por-timbers',
    'salt lake': 'rsl',
    'san jose': 'sj-quakes',
    'kansas city': 'skc',
    'seattle': 'sea-sounders',
    'st. louis': 'stl-city',
    'st louis': 'stl-city',
    'toronto': 'tor-fc',
    'vancouver': 'van-whitecaps',
    'san diego': 'sd-fc',
  },
};

/**
 * Normalize an opponent string to the full team name when possible.
 * If no match can be found, returns the original string unchanged.
 *
 * @param raw the opponent text (abbreviation, nickname, etc.)
 * @param leagueId optional league ID for context (e.g. 'nhl')
 */
export function normalizeOpponentName(raw: string, leagueId?: string): string {
  if (!raw) return raw;
  const cleanName = raw.replace(/^vs\s+/i, '').trim().toLowerCase();
  
  // Handle NFL BYE weeks
  if (cleanName === 'bye' || cleanName === 'bye week') {
    return 'Bye Week';
  }
  
  const teams = leagueId ? getTeamsByLeague(leagueId) || [] : NHL_TEAMS;
  const aliasMap = leagueId && LEAGUE_ALIASES[leagueId.toLowerCase()]
    ? LEAGUE_ALIASES[leagueId.toLowerCase()]
    : {};

  // look up special aliases first
  if (aliasMap && aliasMap[cleanName]) {
    const team = teams.find(t => t.id === aliasMap[cleanName]);
    if (team && team.name) return team.name;
  }

  // check each word against alias map
  const words = cleanName.split(/\s+/);
  for (const word of words) {
    const id = aliasMap[word];
    if (id) {
      const team = teams.find(t => t.id === id);
      if (team && team.name) return team.name;
    }
  }

  // exact match by full name
  let team = teams.find(t => t.name.toLowerCase() === cleanName);
  if (team) return team.name;

  // match by nickname (last word)
  team = teams.find(t => {
    const nick = t.name.toLowerCase().split(' ').pop() || '';
    return cleanName.includes(nick) || nick.includes(cleanName);
  });
  if (team) return team.name;

  // match by city
  team = teams.find(t => {
    const city = (t.city || '').toLowerCase();
    return cleanName.includes(city) || city.includes(cleanName);
  });
  if (team) return team.name;

  // last attempt: match abbreviation or substring of it
  team = teams.find(t => {
    const abbr = (t.abbreviation || '').toLowerCase();
    return abbr === cleanName || cleanName.includes(abbr) || abbr.includes(cleanName);
  });
  if (team) return team.name;

  return raw;
}

/**
 * Determine a logo URL for an opponent string; preserves the old behaviour
 * from schedule.tsx but centralized here so it can be shared.
 * 
 * For MLS teams: Uses ESPN CDN logos via getMlsLogo().
 */
export function getOpponentLogo(opponentName: string, storedLogo?: string, leagueId?: string): string | undefined {
  if (!opponentName) return storedLogo;
  
  // For all leagues: if we have a stored logo, use it first
  if (storedLogo) return storedLogo;
  
  const cleanName = opponentName.replace(/^vs\s+/i, '').trim();
  const cleanNameLower = cleanName.toLowerCase();
  
  // Handle BYE weeks - return league logo
  if (cleanNameLower === 'bye' || cleanNameLower === 'bye week') {
    if (leagueId?.toLowerCase() === 'nfl') {
      return 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png';
    }
    // Could add other leagues here if needed
    return undefined;
  }
  
  // For MLS, use ESPN CDN logos
  if (leagueId?.toLowerCase() === 'mls') {
    const mlsLogo = getMlsLogo(cleanName);
    if (mlsLogo) return mlsLogo;
    return undefined;
  }
  
  // For other leagues, use the existing logic
  const teams = leagueId ? getTeamsByLeague(leagueId) || [] : NHL_TEAMS || [];
  const aliasMap = leagueId && LEAGUE_ALIASES?.[leagueId.toLowerCase()]
    ? LEAGUE_ALIASES[leagueId.toLowerCase()]
    : {};

  if (aliasMap && aliasMap[cleanNameLower]) {
    const team = teams.find(t => t.id === aliasMap[cleanNameLower]);
    if (team) return team.logoUrl;
  }

  const words = cleanNameLower.split(/\s+/);
  for (const word of words) {
    const wordAliasId = aliasMap[word];
    if (wordAliasId) {
      const team = teams.find(t => t.id === wordAliasId);
      if (team) return team.logoUrl;
    }
  }

  let team = teams.find(t => t.name.toLowerCase() === cleanNameLower);
  if (team) return team.logoUrl;

  team = teams.find(t => {
    const teamNickname = t.name.toLowerCase().split(' ').pop() || '';
    return cleanNameLower.includes(teamNickname) || teamNickname.includes(cleanNameLower);
  });
  if (team) return team.logoUrl;

  team = teams.find(t => {
    const cityLower = (t.city || '').toLowerCase();
    return cleanNameLower.includes(cityLower) || cityLower.includes(cleanNameLower);
  });
  if (team) return team.logoUrl;

  return storedLogo;
}
