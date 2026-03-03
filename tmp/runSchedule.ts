import { fetchMlsHomeSchedule, fetchMlsLeagueSchedule } from '../src/utils/mlsSchedule';

(async () => {
  console.log('calling home schedule for Inter Miami');
  const g = await fetchMlsHomeSchedule('Inter Miami','2026');
  console.log('home count', g.length);

  console.log('calling league schedule');
  const lg = await fetchMlsLeagueSchedule('2026');
  console.log('league count', lg.length);
})();
