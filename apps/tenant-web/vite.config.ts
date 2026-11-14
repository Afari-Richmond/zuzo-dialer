import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // '/outreach/' for the combined deploy (served off the API's own
  // process); set VITE_BASE_PATH=/ for a standalone deploy (e.g. Vercel),
  // where this app owns its whole origin.
  base: process.env.VITE_BASE_PATH ?? '/outreach/',
  // Distinct from landing's default "assets" dir so the two apps can be
  // proxied under one domain (voice.zuzogp.com) via Vercel rewrites
  // without their bundle filenames colliding.
  build: {
    assetsDir: 'vox-assets',
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
});
