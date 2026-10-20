import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    // Same-origin in dev (mirrors CloudFront /api/* in prod) → the refresh cookie stays SameSite=Strict.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@fullcalendar')) return 'calendar';
          if (
            id.includes('node_modules/react') ||
            id.includes('react-router') ||
            id.includes('scheduler')
          )
            return 'react';
          if (id.includes('radix-ui') || id.includes('@radix-ui')) return 'radix';
        },
      },
    },
  },
});
