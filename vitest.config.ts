// ============================================================
// Primeiro runner de teste do projeto — entrou na Onda 2 da fusão
// do atlas, que migra oráculos numéricos (Horizons, sub-ponto solar,
// física estelar, tempo) grandes demais para o padrão verify-*.mjs.
// Os testes moram ao lado dos módulos, em src/**/*.test.ts.
// ============================================================
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
