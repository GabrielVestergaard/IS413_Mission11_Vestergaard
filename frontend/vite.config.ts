import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server: browser calls `/api/...` on the Vite port (5173); this proxy
 * forwards those requests to the ASP.NET API so fetch('/api/books') works
 * without CORS issues during local development.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
