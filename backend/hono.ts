import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

// Note: Console logs removed for Cloudflare Workers compatibility
// process.env is not available in Workers - use c.env instead if needed

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// temporary debug route to inspect query parameters
app.get("/__debug", async (c) => {
  try {
    // c.req.query() returns an object, so just use it directly
    const q = c.req.query();
    return c.json({ url: (c.req as any).url, query: q });
  } catch (e) {
    return c.json({ error: typeof e === 'object' && e !== null && 'message' in e ? (e as any).message : String(e) });
  }
});


app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);


app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

export default app;
