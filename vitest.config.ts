// ============================================================
// Primeiro runner de teste do projeto — entrou na Onda 2 da fusão
// do atlas, que migra oráculos numéricos (Horizons, sub-ponto solar,
// física estelar, tempo) grandes demais para o padrão verify-*.mjs.
// Os testes moram ao lado dos módulos, em src/**/*.test.ts.
//
// `scripts/**/*.test.mjs` entrou depois, com a regra do fallback do harness
// de captura: o decisor é puro (`julgarProntidao` em `scripts/visual/
// chrome.mjs`) e o caso que mais importa — dev server com o sinal quebrado —
// não se encena sem editar `src/`. Fora do runner, essa regra só seria
// conferida por inspeção.
// ============================================================
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
});
