// ============================================================
// GERADO por scripts/data/atlas/gera-retrato-planetas.mjs.
// NÃO EDITE À MÃO — regenere com `npm run data:planetas`.
//
// O retrato congelado da Onda 4 (D4): posição heliocêntrica dos nove
// corpos de tabela na época FIXA, em UA, eclíptica média J2000 — o
// mesmo frame e as mesmas unidades que `MotorEfemerides` responde.
// A cena consome isto por `eclipticaParaEquatorial(v) × AU_PARA_PC`
// (D1); PROIBIDO qualquer outro escalar de comprimento no caminho.
//
// PROVENIÊNCIA
//   fonte:   public/data/atlas/efemerides.bin (Hermite cúbica sobre
//            VSOP87D + Pluto-Meeus, amostrada por
//            scripts/data/atlas/amostra-efemerides.mjs)
//   sha256:  93d9d19419c097d6dee8f6263232f782bd4e5404547a8ed8fa215368672cb4c3
//   motor:   src/lib/atlas/efemerides.ts — MotorEfemerides
//            .posicaoHeliocentrica(id, jdTdb)
//   época:   2026-01-01T00:00:00Z = JD 2461041.5008692136 TDB
//            (`dateToTDB` de src/lib/atlas/time.ts, conferido na
//            geração e pinado em retrato.test.ts)
//   rUA:     Math.hypot(x, y, z) — o teste recomputa pelo mesmo
//            caminho e cobra Object.is
//
// SEM data de geração de propósito: regenerar com a mesma
// efemerides.bin devolve arquivo BYTE-IDÊNTICO.
// ============================================================

/** 2026-01-01T00:00:00Z, o instante do retrato. */
export const EPOCA_ISO = '2026-01-01T00:00:00Z';

/**
 * A época em Julian Date TDB. Literal congelado, nunca recalculado em
 * runtime (anti-padrão nº 6: nada de relógio na cena) — este arquivo
 * não constrói data nenhuma, e o teste de texto-fonte cobra isso. A
 * igualdade com o conversor da casa aplicado a EPOCA_ISO é pinada em
 * retrato.test.ts.
 */
export const EPOCA_JD_TDB = 2461041.5008692136;

export interface RetratoCorpo {
  /** Heliocêntrico em UA, eclíptica média J2000. */
  readonly vetorUA: readonly [number, number, number];
  /** Distância heliocêntrica em UA — `Math.hypot` do vetor acima. */
  readonly rUA: number;
}

export const RETRATO_2026 = {
  mercury: {
    vetorUA: [-0.21518460712802945, -0.40921711164768654, -0.013705608221171166],
    rUA: 0.46254827132617393,
  },
  venus: {
    vetorUA: [0.088892196649344682, -0.72174775285584725, -0.015044826836012812],
    rUA: 0.72735685065319666,
  },
  earth: {
    vetorUA: [-0.17429691252758497, 0.96775614012048450, -0.000059030471979739833],
    rUA: 0.98332668220797514,
  },
  mars: {
    vetorUA: [0.34059457649345432, -1.3869846184931525, -0.037417492600120714],
    rUA: 1.4286815832178390,
  },
  jupiter: {
    vetorUA: [-1.6940148213128607, 4.9288779273980161, 0.017427435345694475],
    rUA: 5.2118928954384449,
  },
  saturn: {
    vetorUA: [9.5073444809976806, 0.25775245353059067, -0.38293786409431263],
    rUA: 9.5185438390236552,
  },
  uranus: {
    vetorUA: [9.8804186836295766, 16.799986584078063, -0.065722874607484327],
    rUA: 19.490165265724816,
  },
  neptune: {
    vetorUA: [29.872056627504747, 0.51915473103481102, -0.69906046871459937],
    rUA: 29.884744842988464,
  },
  pluto: {
    vetorUA: [19.227928366372705, -29.652244256899376, -2.3875506284866188],
    rUA: 35.421310206382380,
  },
} as const satisfies Record<string, RetratoCorpo>;

/** Os nove corpos do retrato, do Sol para fora. */
export const IDS_RETRATO = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

export type IdRetrato = (typeof IDS_RETRATO)[number];
