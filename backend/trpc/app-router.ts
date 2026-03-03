import { createTRPCRouter } from "./create-context";
import { sportsdataRouter } from "./routes/sportsdata";
import { mlsRouter } from "./routes/mls";

export const appRouter = createTRPCRouter({
  sportsdata: sportsdataRouter,
  mls: mlsRouter,
});

export type AppRouter = typeof appRouter;
