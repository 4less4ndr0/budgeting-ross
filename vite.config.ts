import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Must match the GitHub repo name exactly: served from https://<user>.github.io/budgeting-ross/
  base: '/budgeting-ross/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Due pagine: la landing statica alla radice (/budgeting-ross/) e l'app React in /app/.
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
      },
    },
  },
});
