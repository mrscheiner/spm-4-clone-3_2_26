import apisportsRouter from './trpc/routes/apisports';
import sportsdataRouter from './trpc/routes/sportsdata';
// Move route mounting after app declaration
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();
// Unified schedule endpoint for SportsDataIO
app.get("/api/schedule", async (c) => {
  try {
    const league = c.req.query("league");
    const teamId = c.req.query("teamId");
    const season = c.req.query("season");
    const type = c.req.query("type") || "home";
    // Validate input
    const validLeagues = ["nhl", "nfl", "nba", "mls", "mlb"];
    if (!league || !teamId || !season) {
      return c.json({ error: "Missing league, teamId, or season" }, 400);
    }
    if (!validLeagues.includes(league)) {
      return c.json({ error: "Invalid league" }, 400);
    }
    // Only home supported for now
    if (type !== "home") {
      return c.json({ error: "Only type=home supported" }, 400);
    }
    // Import schedule fetcher
    const { getTeamHomeSchedule } = await import("./src/sportsSchedule");
    let result;
    try {
      // Pass API key from Cloudflare Worker env if available
      result = await getTeamHomeSchedule({ league, teamId, season, apiKey: (c.env && (c.env as any).SPORTSDATAIO_KEY) });
    } catch (err: any) {
      // Log full error details
      console.error('[SportsDataIO Error]', err);
      return c.json({ error: "SportsDataIO error", details: err?.message || err }, 502);
    }
    return c.json(result, 200);
  } catch (err: any) {
    return c.json({ error: "Internal error", details: err?.message || err }, 500);
  }
});
// Mount Sportsdata.io schedule endpoint after app declaration
app.route("/api/sportsdata", sportsdataRouter);

// Note: Console logs removed for Cloudflare Workers compatibility
// process.env is not available in Workers - use c.env instead if needed

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));


app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

// Custom REST endpoint for ESPN schedule fetch
app.get("/api/espn/schedule", async (c) => {
  try {
    const params = c.req.query();
    // Accept both query and JSON body
    let input = params.input;
    if (!input && c.req.header("content-type") === "application/json") {
      input = (await c.req.json()).input;
    }
    let parsed;
    try {
      parsed = typeof input === "string" ? JSON.parse(input) : input;
    } catch (e) {
      return c.json({ error: "Invalid input format", details: e?.message }, 400);
    }
    // Log input for debugging
    console.log("[REST ESPN schedule] input:", parsed);
    // Import ESPN fetch logic
    const { getFullScheduleREST } = await import("./trpc/routes/espn-rest");
    const result = await getFullScheduleREST(parsed);
    return c.json({ result });
  } catch (err) {
    return c.json({ error: "REST ESPN schedule error", details: err?.message || err }, 500);
  }
});

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

export default app;
