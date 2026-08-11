// ============================================================
// Registro orbital — que modelo responde por cada corpo, em que
// janela, com que acurácia MEDIDA. Dado + renasce (PLANO-ATLAS §0):
// as constantes de acurácia e as janelas migram verbatim do doador
// (atlas-orbital/src/lib/orbital/registry.ts:37-125, VALIDITY_RANGES);
// a ESTRUTURA renasce, porque a máquina de providers/fallback do
// doador morreu na travessia (ver adaptação 2 abaixo).
//
// CONSTANTES MEDIDAS HERDADAS (não recalibrar sem fixture novo):
//   - VSOP87D: nível de arcsec em −2000..6000; Pluto-Meeus 1885..2099;
//     ELP/MPP02-trunc −3000..3000.
//   - Satélites 2020–2030 (época 2025-01-01 ±5 anos): piores resíduos
//     por família medidos DOS DOIS LADOS da época — Phobos 3,6°,
//     Europa 1,6°, Mimas 5,2°, Miranda 1,3°; Triton 0,16° e Charon
//     0,01° são unilaterais (sem fixture pré-época). Só 4 das 18
//     mean motions são publicadas (pub: Phobos, Mimas, Tethys, Io);
//     as outras 14 foram ajustadas in-sample — as notas dizem isso.
//   - Asteroides 2000–2050: ~0,01° na época, ~1° extrapolado nas
//     bordas; única âncora distante é ceres@1890 (7,4°).
//
// ADAPTAÇÕES DECLARADAS:
//   1. Janela de TABELA da casa: os planetas, Plutão e a Lua não rodam
//      mais a teoria ao vivo — leem a tabela Hermite de
//      public/data/atlas/efemerides.bin, amostrada em 1950–2050
//      (JANELA_TABELA). A janela da TEORIA (campo `janelaTeoria`) fica
//      registrada porque é ela que regenera a tabela quando a Decisão 2
//      do plano fixar o orçamento de payload. A nota de validade das
//      tabelas soma o erro de interpolação MEDIDO do manifest
//      (erroMedidoAu) — quem compõe é notaDeValidade em efemerides.ts,
//      que tem o manifest em mãos.
//   2. A dualidade provider-analítico vs fallback-Kepler do doador
//      COLAPSOU para os satélites/asteroides: aqui `fonte: 'kepler'`
//      significa posicaoKepler SEMPRE, dentro ou fora da janela — os
//      dois lados do doador eram a MESMA matemática (setup.ts:29-69 de
//      lá; Miranda deitada 104,6° morreu por construção). A janela
//      passou a ser só honestidade: dentro cita a acurácia medida,
//      fora avisa extrapolação.
//   3. `centro` deriva dos blocos de elementosOrbitais.ts (parent) —
//      uma fonte de verdade; ninguém copia parent para cá à mão.
//   4. hygiea entrou na família AsteroidOsculating na Onda 2 (o doador
//      a deixava no Kepler de catálogo); mesma janela e nota da
//      família, pipeline derive-elements-from-fixtures idêntica.
// ============================================================

import {
  ASTEROIDS,
  CATALOG_MOONS,
  CATALOG_TNOS,
  SATELLITES,
} from './elementosOrbitais';

export interface JanelaAnos {
  anoInicio: number;
  anoFim: number;
}

export interface RegistroCorpo {
  /** Nome do modelo, herdado do doador (o rótulo que a UI mostraria). */
  modelo: string;
  /** 'tabela' = efemerides.bin (Hermite); 'kepler' = posicaoKepler. */
  fonte: 'tabela' | 'kepler';
  /** Id do corpo pai (centro do vetor posição). */
  centro: string;
  /**
   * Janela de validade em anos civis, inclusiva. Ausente = INDEFINIDA
   * (luas de catálogo com orientação fabricada — nunca houve medição).
   */
  janela?: JanelaAnos;
  /** Para fonte 'tabela': a janela da TEORIA que gerou a tabela. */
  janelaTeoria?: JanelaAnos;
  /** Nota de acurácia medida, verbatim do doador (inglês). */
  nota: string;
}

/** Adaptação 1: janela amostrada em efemerides.bin (regenerável). */
export const JANELA_TABELA: JanelaAnos = { anoInicio: 1950, anoFim: 2050 };

// Notas por família — VERBATIM de registry.ts do doador (inglês).
const NOTA_VSOP87 = 'VSOP87D truncated series, arcsecond-level 2000 BCE - 6000 CE';
const NOTA_PLUTO = 'Meeus Ch. 37 Pluto theory valid 1885-2099';
const NOTA_ELP = 'ELP/MPP02 truncated (few-arcsecond level over millennia)';
const NOTA_MARTIAN =
  'Two-body Kepler from 2025-01-01 osculating elements; worst 3.6° over epoch ±1 yr measured both sides (Phobos, pub rate; short-period resonant moon two-body cannot hold ±1 yr), unvalidated beyond';
const NOTA_GALILEAN =
  'Two-body Kepler from 2025-01-01 osculating elements; worst 1.6° over epoch ±1 yr measured both sides (Europa), unvalidated beyond';
const NOTA_SATURNIAN =
  'Two-body Kepler from 2025-01-01 osculating elements; worst 5.2° over epoch ±1 yr measured both sides (Mimas, pub rate; short-period resonant moon two-body cannot hold ±1 yr), unvalidated beyond';
const NOTA_URANIAN =
  'Two-body Kepler from 2025-01-01 osculating elements; worst 1.3° over epoch ±1 yr measured both sides (Miranda), unvalidated beyond';
const NOTA_NEPTUNIAN =
  'Two-body Kepler from 2025-01-01 osculating elements; worst 0.16° at epoch +1 yr (one-sided — no pre-epoch fixture), unvalidated beyond';
const NOTA_PLUTOSAT =
  'Two-body Kepler from 2025-01-01 osculating elements; worst 0.01° at epoch +1 yr (one-sided — no pre-epoch fixture), unvalidated beyond';
const NOTA_ASTEROID =
  'Two-body Kepler from 2025-01-01 osculating elements; ~0.01° near epoch, extrapolated to ~1° at the 2000/2050 edges (only far-epoch check: 7.4° at 1890)';

// Janelas por família, verbatim do doador.
const JANELA_SATELITES: JanelaAnos = { anoInicio: 2020, anoFim: 2030 };
const JANELA_ASTEROIDES: JanelaAnos = { anoInicio: 2000, anoFim: 2050 };
const JANELA_VSOP: JanelaAnos = { anoInicio: -2000, anoFim: 6000 };
const JANELA_PLUTO_MEEUS: JanelaAnos = { anoInicio: 1885, anoFim: 2099 };
const JANELA_ELP: JanelaAnos = { anoInicio: -3000, anoFim: 3000 };

// Família de cada satélite analítico deriva do pai (a relação é 1:1 no
// nosso catálogo: todo satélite analítico de um mesmo primário pertence
// à mesma família do doador).
const FAMILIA_POR_PAI: Record<string, { modelo: string; nota: string }> = {
  mars: { modelo: 'MartianSatOsculating2Body', nota: NOTA_MARTIAN },
  jupiter: { modelo: 'GalileanOsculating2Body', nota: NOTA_GALILEAN },
  saturn: { modelo: 'SaturnianOsculating2Body', nota: NOTA_SATURNIAN },
  uranus: { modelo: 'UranianOsculating2Body', nota: NOTA_URANIAN },
  neptune: { modelo: 'NeptunianOsculating2Body', nota: NOTA_NEPTUNIAN },
  pluto: { modelo: 'PlutoSatOsculating2Body', nota: NOTA_PLUTOSAT },
};

function registroTabela(
  modelo: string,
  centro: string,
  janelaTeoria: JanelaAnos,
  nota: string
): RegistroCorpo {
  return {
    modelo,
    fonte: 'tabela',
    centro,
    janela: JANELA_TABELA,
    janelaTeoria,
    nota,
  };
}

export const REGISTRO_ORBITAL: Record<string, RegistroCorpo> = {
  // O Sol é a origem do sistema — não tem modelo nem janela; o motor o
  // trata como bypass (contrato do cache herdado do doador).
  sun: {
    modelo: 'Solar System Barycenter',
    fonte: 'tabela',
    centro: 'sun',
    nota: 'Solar system origin reference',
  },
  mercury: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  venus: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  earth: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  mars: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  jupiter: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  saturn: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  uranus: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  neptune: registroTabela('VSOP87D', 'sun', JANELA_VSOP, NOTA_VSOP87),
  pluto: registroTabela('Pluto-Meeus', 'sun', JANELA_PLUTO_MEEUS, NOTA_PLUTO),
  moon: registroTabela('ELP-MPP02-trunc', 'earth', JANELA_ELP, NOTA_ELP),

  // 22 satélites analíticos (adaptação 3: parent vem do dado migrado).
  ...Object.fromEntries(
    Object.entries(SATELLITES).map(([id, { parent }]) => {
      const familia = FAMILIA_POR_PAI[parent];
      if (!familia) {
        throw new Error(
          `registroOrbital: satélite "${id}" com pai "${parent}" sem família`
        );
      }
      return [
        id,
        {
          modelo: familia.modelo,
          fonte: 'kepler',
          centro: parent,
          janela: JANELA_SATELITES,
          nota: familia.nota,
        } satisfies RegistroCorpo,
      ];
    })
  ),

  // Asteroides analíticos (hygiea incluída — adaptação 4).
  ...Object.fromEntries(
    Object.keys(ASTEROIDS).map((id) => [
      id,
      {
        modelo: 'AsteroidOsculating',
        fonte: 'kepler',
        centro: 'sun',
        janela: JANELA_ASTEROIDES,
        nota: NOTA_ASTEROID,
      } satisfies RegistroCorpo,
    ])
  ),

  // Luas de catálogo E seus pais TNO: sem janela (INDEFINIDA) — Ω/ω/M0
  // fabricados, nunca houve fixture para medir (elementosOrbitais.ts
  // declara). Os pais entraram pela revisão de olhos frescos: a
  // composição heliocêntrica exige fechamento — todo centro citado por
  // um corpo coberto precisa ser ele mesmo coberto.
  ...Object.fromEntries(
    Object.entries({ ...CATALOG_MOONS, ...CATALOG_TNOS }).map(
      ([id, { parent }]) => [
        id,
        {
          modelo: 'Kepler',
          fonte: 'kepler',
          centro: parent,
          nota: 'Catalog Kepler orbit; plane orientation and phase fabricated (Ω/ω/M0 = 0) — draws a plausible orbit, never predicts a position',
        } satisfies RegistroCorpo,
      ]
    )
  ),
};
