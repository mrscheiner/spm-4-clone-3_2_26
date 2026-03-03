import { scrapeMlsHomeSchedule } from '../src/utils/mlsSchedule';

(async () => {
  const games = await scrapeMlsHomeSchedule('Inter Miami', '2026');
  console.log('got', games.length);
  console.dir(games.slice(0, 5), { depth: null });
})();
