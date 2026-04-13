import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  define: {
    global: 'globalThis',
    'process.env': {},
  },

  resolve: {
    alias: {
      // Force Vite to bundle 'buffer' instead of externalizing it
      buffer: 'buffer/',
    },
  },

  optimizeDeps: {
    // Pre-bundle so the Buffer class is available in client code
    include: ['buffer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },

  server: {
    proxy: {
      // LI.FI Earn API
      '/earn-api': {
        target: 'https://earn.li.fi',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/earn-api/, ''),
      },
    },
  },
});