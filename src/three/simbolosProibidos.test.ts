// ============================================================
// OS SÍMBOLOS PROIBIDOS — a varredura INVERTIDA da Lei da Estrela.
//
// Regra (ii) de toda migração (`docs/LEI-DA-ESTRELA.md` §4): o commit que
// apaga um símbolo da lei velha inverte a varredura no MESMO diff — "tem de
// conter X" vira "NÃO PODE conter X". Este é o arquivo único dessas
// inversões: cada linha diz o que morreu, onde não pode renascer e em que
// migração morreu (o commit se acha por `git log --grep <migração>`).
//
// Por que existe: varredura textual POSITIVA é o motor do frankenstein —
// torna somar camada mais barato que demolir (§8.6). A negativa faz o
// contrário: torna RESSUSCITAR a cópia mais caro que usar a lei única.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ler = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

interface SimboloProibido {
  /** onde o símbolo NÃO pode existir (caminho a partir da raiz) */
  arquivo: string;
  /** o que não pode voltar */
  padrao: RegExp;
  /** a migração cujo commit o matou */
  migracao: string;
  /** a razão, na língua da casa */
  razao: string;
}

const PROIBIDOS: SimboloProibido[] = [
  // ─── F0 (2026-08-16): PSF e Ballesteros num endereço só ────────────────
  {
    arquivo: 'src/three/core/pupila.ts',
    padrao: /function picoDaPsf/,
    migracao: 'F0',
    razao: 'a lei viva saiu da lápide — o pico da PSF mora em luzDaCasa.ts',
  },
  {
    arquivo: 'src/three/world/planetas/planetas.ts',
    padrao: /function picoDaPsf/,
    migracao: 'F0',
    razao: 'a cópia do ?dbgplan morreu — o readout importa de luzDaCasa.ts',
  },
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao: /function psfPointSizePx/,
    migracao: 'F0',
    razao: 'o espelho de runtime morreu — o tamanho da PSF mora em luzDaCasa.ts',
  },
  {
    arquivo: 'src/three/core/pupila.ts',
    padrao: /6\.2831853/,
    migracao: 'F0',
    razao: 'o 2π do shader só existe em luzDaCasa.ts (DOIS_PI_DO_SHADER)',
  },
  {
    arquivo: 'src/three/world/planetas/planetas.ts',
    padrao: /6\.2831853/,
    migracao: 'F0',
    razao: 'o 2π do shader só existe em luzDaCasa.ts (DOIS_PI_DO_SHADER)',
  },
  {
    arquivo: 'src/three/world/lodStellar.ts',
    padrao: /6\.2831853/,
    migracao: 'F0',
    razao: 'o 2π do shader só existe em luzDaCasa.ts (DOIS_PI_DO_SHADER)',
  },
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /6\.2831853|1080\.0|4600/,
    migracao: 'F0',
    razao:
      'o GLSL é GERADO das constantes (luzDaCasa.ts, stellarPhysics.ts) — ' +
      'redigitar o número aqui recria a cópia que o F0 matou',
  },
  {
    arquivo: 'src/three/core/pupila.test.ts',
    padrao: /toContain\(\s*['"`]float /,
    migracao: 'F0',
    razao:
      'o literal GLSL solto morreu — conformidade de PSF é numérica ' +
      '(luzDaCasa.test.ts), nunca toContain sobre o fonte do shader',
  },
  // ─── L1 (2026-08-16): a peça única nasce; o corpo negro muda de casa ───
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /export function blackbodyLinear/,
    migracao: 'L1',
    razao: 'a face CPU do corpo negro mora em luzDaCasa.ts — common.ts só gera o GLSL',
  },
  {
    arquivo: 'src/three/shaders/common.ts',
    padrao: /0\.640|1\.980/,
    migracao: 'L1',
    razao:
      'os coeficientes do corpo negro são interpolados de luzDaCasa.ts — ' +
      'redigitar um aqui recria a divergência que o L1 matou',
  },
];

describe('os símbolos proibidos não renasceram', () => {
  for (const { arquivo, padrao, migracao, razao } of PROIBIDOS) {
    it(`${arquivo} não contém ${padrao} (${migracao})`, () => {
      expect(ler(arquivo), `${razao}`).not.toMatch(padrao);
    });
  }
});
