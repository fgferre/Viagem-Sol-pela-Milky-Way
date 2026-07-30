import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three é o runtime da primeira cena; adiar esse vendor não reduz
    // o tempo até o primeiro frame. O chunk dedicado fica ~537 kB.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
