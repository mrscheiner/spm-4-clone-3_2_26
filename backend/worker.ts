import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";

export default {
	async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname === "/healthz") {
			return new Response("ok", { status: 200 });
		}
		// Guard: prevent empty tRPC path calls
		if (url.pathname === "/api/trpc" || url.pathname === "/api/trpc/") {
			return new Response(
				JSON.stringify({ error: "Missing tRPC procedure path" }),
				{ status: 400, headers: { "Content-Type": "application/json" } }
			);
		}
		return fetchRequestHandler({
			endpoint: "/api/trpc",
			req: request,
			router: appRouter,
			createContext: ({ req }) => ({ env, req }),
		});
	},
};
