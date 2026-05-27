import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // Cloudflare Pages (Wrangler) requires a plugins array to patch the config for deploy.
  plugins: [],
});
