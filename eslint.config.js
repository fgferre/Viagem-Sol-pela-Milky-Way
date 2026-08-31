import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scratchpad']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // OS SCRIPTS ENTRAM NO LINT (Onda 4, fase 0). Sem esta regra o
  // `scripts/` inteiro era terra sem alarme, e foi por isso que
  // `rodada.mjs` passou três meses morto: uma meia-migração deixou
  // `GPU_FLAGS` e `matarPerfil` usados SEM import — `no-undef` puro — e
  // um `import { spawn }` que virou morto. Nada disso aparece em teste:
  // o script só quebra quando alguém tenta medir uma rodada.
  //
  // ESCOPO CHEIO (`scripts/**/*.mjs`), medido antes de escolher: os 23
  // arquivos acenderam DOIS erros ao todo, os dois `no-unused-vars` em
  // `scripts/visual` (`saida` no diff-pixel, `existsSync` no
  // gpu-profile), consertados junto. O plano previa cair para
  // `scripts/visual` se acendesse demais — não precisou.
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2023, WebSocket: 'readonly' },
    },
  },
])
