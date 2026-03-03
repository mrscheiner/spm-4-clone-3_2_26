import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// tRPC v11 context type
interface CreateContextOptions {
  req: Request & { env?: Record<string, any> };
}

export const createContext = async (opts: CreateContextOptions) => {
  return {
    req: opts.req,
    env: opts.req.env || {},
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
