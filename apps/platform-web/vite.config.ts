import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // '/super-admin/' for the combined deploy (served off the API's own
  // process); set VITE_BASE_PATH=/ for a standalone deploy (e.g. Vercel),
  // where this app owns its whole origin.
  base: process.env.VITE_BASE_PATH ?? '/super-admin/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
});
