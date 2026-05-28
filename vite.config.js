import { defineConfig } from 'vite';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // Cloudflare Pages (Wrangler) requires a plugins array to patch the config for deploy.
  plugins: [cloudflare()],
});