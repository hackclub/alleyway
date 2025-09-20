// @ts-check
import { defineConfig } from 'astro/config';

import auth from 'auth-astro';
import mdx from '@astrojs/mdx';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [auth(), mdx()],

  vite: {
    plugins: [tailwindcss()]
  }
});