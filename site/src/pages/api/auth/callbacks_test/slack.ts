// src/pages/api/auth/callback/slack.ts
import type { APIRoute } from "astro";
import { auth } from "../../../../auth";

export const prerender = false; // Not needed in 'server' mode

// Temporary debugging wrapper
export const ALL: APIRoute = async (ctx) => {
    console.log(
        "Slack callback query:",
        Object.fromEntries(ctx.url.searchParams)
    );
    // Let Better Auth handle the rest
    return auth.handler(ctx.request);
};
