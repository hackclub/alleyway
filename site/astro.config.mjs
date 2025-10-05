// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

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
        allowedHosts: [
            "localhost",
            "cd487188fc7d.ngrok-free.app",
            "alley.hackclub.com",
        ],
    },
});
