import { trpcClient } from '../lib/trpc';

async function run() {
  console.log('calling getSchedule mutate');
  try {
    const result = await trpcClient.sportsdata.getSchedule.mutate({ leagueId: 'nhl', teamId: 'buf' });
    console.log('result events length', result.events?.length, 'error', result.error);
  } catch (e) {
    console.error('error', e);
  }
}

run();
