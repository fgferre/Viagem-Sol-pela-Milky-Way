// ============================================================
// Registro orbital — que modelo responde por cada corpo, em que
// janela, com que acurácia MEDIDA. Dado + renasce (doutrina de travessia, docs/NORTE.md):
// as constantes de acurácia e as janelas migram verbatim do doador
// (atlas-orbital/src/lib/orbital/registry.ts:37-125, VALIDITY_RANGES);
// a ESTRUTURA renasce, porque a máquina de providers/fallback do
// doador morreu na travessia (ver adaptação 2 abaixo).
//
// ADAPTAÇÃO 5 (2026-08-22): A REDAÇÃO DAS NOTAS FALA PORTUGUÊS. Enquanto
// `notaDeValidade` não tinha leitor na tela, o inglês do doador era só
// procedência guardada; desde a ficha do objeto (item 74) ela é IMPRESSA
// inteira, ao lado do editorial em pt-BR. O que mudou foi a frase; os
// NÚMEROS — 3.6°, 5.2°, 7.4°, as janelas — seguem verbatim, ponto decimal
// incluído, porque são a medição e não a redação.
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
  /**
   * Nota de acurácia MEDIDA, na língua da casa.
   *
   * O NÚMERO É VERBATIM do doador e não se toca: `3.6°`, `5.2°`, `7.4°`,
   * `1885-2099` são a MEDIÇÃO, e reescrevê-los (nem que fosse só a vírgula
   * decimal) seria mexer no dado para arrumar a redação. A PROSA em volta
   * deles passou para pt-BR em 22/08, quando a ficha do objeto começou a
   * imprimir esta nota inteira na tela ao lado do editorial traduzido — meia
   * língua num painel só era a coisa que o item 74 existe para não fazer.
   * O inglês original mora no doador (`registry.ts`) e no git.
   */
  nota: string;
}

/** Adaptação 1: janela amostrada em efemerides.bin (regenerável). */
export const JANELA_TABELA: JanelaAnos = { anoInicio: 1950, anoFim: 2050 };

// Notas por família — a medição do doador, a redação em pt-BR (22/08).
// O PREFIXO REPETIDO das seis famílias de satélite e dos asteroides sai de
// uma constante só: ele é a mesma frase seis vezes, e seis cópias de uma
// frase é como um número acaba divergindo de si mesmo.
const KEPLER_2025 = 'Kepler de dois corpos a partir dos elementos osculantes de 2025-01-01';
const RESSONANTE =
  'taxa publicada; lua ressonante de período curto não se sustenta em dois corpos por ±1 ano';
const SEM_VALIDACAO = 'sem validação fora dessa faixa';
const NOTA_VSOP87 =
  'série VSOP87D truncada, nível de arcsegundo entre 2000 a.C. e 6000 d.C.';
const NOTA_PLUTO = 'teoria de Plutão do Meeus (cap. 37), válida de 1885 a 2099';
const NOTA_ELP =
  'ELP/MPP02 truncada (nível de poucos arcsegundos ao longo de milênios)';
const NOTA_MARTIAN =
  `${KEPLER_2025}; pior caso 3.6° em ±1 ano da época, medido dos DOIS lados (Fobos, ${RESSONANTE}), ${SEM_VALIDACAO}`;
const NOTA_GALILEAN =
  `${KEPLER_2025}; pior caso 1.6° em ±1 ano da época, medido dos DOIS lados (Europa), ${SEM_VALIDACAO}`;
const NOTA_SATURNIAN =
  `${KEPLER_2025}; pior caso 5.2° em ±1 ano da época, medido dos DOIS lados (Mimas, ${RESSONANTE}), ${SEM_VALIDACAO}`;
const NOTA_URANIAN =
  `${KEPLER_2025}; pior caso 1.3° em ±1 ano da época, medido dos DOIS lados (Miranda), ${SEM_VALIDACAO}`;
const NOTA_NEPTUNIAN =
  `${KEPLER_2025}; pior caso 0.16° em +1 ano da época (um lado só — não há fixture antes da época), ${SEM_VALIDACAO}`;
const NOTA_PLUTOSAT =
  `${KEPLER_2025}; pior caso 0.01° em +1 ano da época (um lado só — não há fixture antes da época), ${SEM_VALIDACAO}`;
const NOTA_ASTEROID =
  `${KEPLER_2025}; ~0.01° perto da época, extrapolado a ~1° nas bordas de 2000/2050 (única conferência longe da época: 7.4° em 1890)`;

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
    nota: 'referência de origem do sistema solar',
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
          nota:
            'órbita de catálogo por Kepler; orientação do plano e fase FABRICADAS ' +
            '(Ω/ω/M0 = 0) — desenha uma órbita plausível, nunca prevê uma posição',
        } satisfies RegistroCorpo,
      ]
    )
  ),
};
