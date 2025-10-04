import { auth } from "../../../auth"; // import your Better Auth instance
import type { APIRoute } from "astro";

export const prerender = false; // Not needed in 'server' mode

export const ALL: APIRoute = async (ctx) => {
  return auth.handler(ctx.request);
};