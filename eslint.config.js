import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scratchpad', 'capturas']),
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
  // A `Camera` BASE DO THREE NÃO DESENHA (PLAN-PROFUNDIDADE.md). Com a
  // profundidade invertida o three chama `updateProjectionMatrix()` em
  // toda câmera que passa por `render`, e a base não tem o método: a
  // passagem morre com um erro no console, e só com a porta ligada —
  // nenhum teste nem a imagem de sempre avisam.
  //
  // Pega `new THREE.Camera()`, `new Camera()` e `class … extends
  // THREE.Camera`/`extends Camera` (declaração e expressão), nos testes
  // também. Isento só `profundidade.ts`, onde mora a `CameraSemLente`, o
  // único herdeiro legítimo. FORA DE ALCANCE, de propósito: o apelido por
  // variável (`const C = THREE.Camera`) e o import renomeado
  // (`import { Camera as C } from 'three'`) — nenhum existe em `src`.
  {
    files: ['src/**/*.{ts,tsx,js}'],
    ignores: ['src/three/core/profundidade.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...[
          "NewExpression[callee.object.name='THREE'][callee.property.name='Camera']",
          "NewExpression[callee.name='Camera']",
          ":matches(ClassDeclaration, ClassExpression)[superClass.object.name='THREE'][superClass.property.name='Camera']",
          ":matches(ClassDeclaration, ClassExpression)[superClass.name='Camera']",
        ].map((selector) => ({
          selector,
          message: 'Câmera sem lente é `CameraSemLente` (src/three/core/profundidade.ts): a `Camera` base quebra o desenho com a profundidade invertida.',
        })),
      ],
    },
  },
])
