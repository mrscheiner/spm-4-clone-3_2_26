import { createTRPCRouter } from "./create-context";
import { espnRouter } from "./routes/espn";
import { ticketmasterRouter } from "./routes/ticketmaster";
import { sportsdataRouter } from "./routes/sportsdata";

export const appRouter = createTRPCRouter({
  espn: espnRouter,
  ticketmaster: ticketmasterRouter,
  sportsdata: sportsdataRouter,
});

export type AppRouter = typeof appRouter;
