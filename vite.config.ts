import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  // O worker da carga (cargaEmWorker) usa import DINÂMICO — é o que
  // deixa o `window` falso valer antes da avaliação da cadeia (os
  // knobs ?tune/?warpamp da página). Import dinâmico dentro de worker
  // exige bundle ES; o alvo da casa (era WebGL2, es2022) suporta module
  // worker em todos os navegadores que abrem o app.
  worker: { format: 'es' },
  server: {
    host: '127.0.0.1',
    // PORT vem do harness de preview quando a 5173 está ocupada por outra
    // sessão; sem a variável, o default segue 5173.
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
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
