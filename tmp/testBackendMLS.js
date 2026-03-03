const helper = require('../backend/trpc/routes/sportsdataio-helper');

// monkey patch sportsdataioFetch to return empty arrays and log calls
helper.sportsdataioFetch = async ({ league, endpoint }) => {
  console.log('stub fetch called', league, endpoint);
  return [];
};

(async () => {
  const res = await helper.loadLeagueScheduleAllTeams('mls', 'FAKEKEY', console.log);
  console.log('result', res);
})();
