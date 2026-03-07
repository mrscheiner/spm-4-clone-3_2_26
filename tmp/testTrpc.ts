
import { trpcClient } from '../lib/trpc';

async function run() {
  console.log('calling getSchedule mutate');
  try {
    const result = await trpcClient.sportsdata.getSchedule.mutate({ leagueId: 'nhl', teamId: 'buf' });
    console.log('got', result);
  } catch (e) {
    console.error('error', e);
  }
}

run().catch(console.error);
