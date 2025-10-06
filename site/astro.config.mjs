// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

dotenv.config();

console.log("PUBLIC_BETTER_AUTH_URL:", process.env.PUBLIC_BETTER_AUTH_URL);
console.log("PUBLIC_PROD_URL:", process.env.PUBLIC_PROD_URL);

// https://astro.build/config
export default defineConfig({
    integrations: [mdx()],
    vite: {
        plugins: [tailwindcss()],
    },
    adapter: node({
        mode: "standalone",
    }),
    server: {
        // One-liner: localhost + hostnames derived from public base URLs
        allowedHosts: [
            "localhost",
            ...(process.env.PUBLIC_BETTER_AUTH_URL
                ? [new URL(process.env.PUBLIC_BETTER_AUTH_URL).hostname]
                : []),
            ...(process.env.PUBLIC_PROD_URL
                ? [new URL(process.env.PUBLIC_PROD_URL).hostname]
                : []),
        ],
    },
});
