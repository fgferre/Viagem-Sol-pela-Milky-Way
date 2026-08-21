// ============================================================
// O CICLO DE ATIVIDADE PELA DATA — módulo INTERNO da lei da estrela.
//
// Onde ele mora e por quê: `estrela.ts` é a única face PÚBLICA da lei
// (§3), e módulos internos podem existir atrás dela desde que ninguém os
// importe de fora. Este é um deles — quem precisa da fase importa de
// `estrela.ts`, nunca daqui. E ele NÃO fica em `world/`: `world/` é a
// camada que importa three, e a lei tem de continuar auditável em `node`.
//
// O QUE ELE RESOLVE: até 21/08 a fase do ciclo solar era um ACUMULADOR
// (`ctx.cycleTime`, somando delta por quadro) que a dramaturgia do filme
// empurrava para frente por torção — o Sol do Atlas ficava congelado no
// máximo, o mesmo em 2019 e em 2035, e duas entradas no Atlas pelo mesmo
// caminho davam DOIS Sóis (item 5 das pendências). Agora a fase é uma
// FUNÇÃO PURA DA DATA SIMULADA: mesma data, mesmo Sol; data diferente,
// Sol diferente; e andar para trás no calendário é tão barato quanto
// andar para frente, porque não há o que desintegrar.
//
// A ÂNCORA, declarada com procedência:
//  - o mínimo que abriu o ciclo 25 caiu em DEZEMBRO DE 2019 (SILSO/SIDC,
//    o mínimo suavizado de 2019-12);
//  - o máximo do 25 caiu em OUTUBRO DE 2024 — 4,83 anos DEPOIS do
//    mínimo, e não os 5,5 de um ciclo simétrico;
//  - o comprimento médio do ciclo solar é 11,03 anos.
// Daí a assimetria: a SUBIDA leva 4,83 anos e a DESCIDA 6,20. É por isso
// que o mapa data→fase é linear POR TRECHO em vez de uma rampa só —
// um envelope simétrico erraria o pico do ciclo 25 em ~8 meses, e é
// justamente o pico que o visitante vai procurar quando andar no tempo.
//
// A FASE é 0 no mínimo, 0,5 no máximo e 1 no mínimo seguinte, porque é
// essa a convenção que o envelope de atividade do núcleo já usa
// (`sin(π·fase)`, `world/sol/activity.js`). A assimetria mora no mapa,
// não no envelope: assim a calibração de amplitude, a banda de Spörer e
// a reversão polar continuam valendo palavra por palavra.
// ============================================================

/** JD TDB do mínimo que abriu o ciclo 25 — 2019-12-01 (SILSO). */
export const JD_DO_MINIMO_ANCORA = 2458818.5;

/** O número do ciclo que começa na âncora. */
export const CICLO_DA_ANCORA = 25;

/** Anos do mínimo ao máximo (2019-12 → 2024-10). */
export const SUBIDA_DO_CICLO_ANOS = 4.83;

/** Anos do máximo ao mínimo seguinte — o resto do período médio. */
export const DESCIDA_DO_CICLO_ANOS = 6.2;

/** O período médio do ciclo solar, em anos. */
export const PERIODO_DO_CICLO_ANOS = SUBIDA_DO_CICLO_ANOS + DESCIDA_DO_CICLO_ANOS;

/** Dias do ano juliano — a mesma unidade em que o JD conta. */
export const DIAS_DO_ANO_JULIANO = 365.25;

/**
 * A UNIDADE DE TEMPO DO NÚCLEO, preservada. O Sol vendorizado mede o
 * ciclo em 1800 "unidades de tempo simulado" e calibrou TUDO nelas — o
 * período de vida das regiões ativas (150–240), o dos grupos de manchas
 * (90–160), a deriva diferencial. A mudança de 21/08 tira o acumulador,
 * não a régua: `tempoDoCiclo` continua entregando a MESMA unidade, só
 * que DERIVADA da data em vez de somada por quadro.
 *
 * 1 unidade = 11,03 anos / 1800 ≈ 2,24 dias.
 */
export const UNIDADES_POR_CICLO = 1800;

/** A fase do ciclo numa data, e qual ciclo é. */
export interface FaseDoCiclo {
  /** 0 = mínimo, 0,5 = máximo, 1 = mínimo seguinte. */
  readonly fase01: number;
  /** o número do ciclo solar (25 é o da âncora) — a paridade dá Hale. */
  readonly ciclo: number;
}

/**
 * A FASE DO CICLO NA DATA. Pura, sem estado, definida para qualquer JD —
 * inclusive antes da âncora (ciclos 24, 23…), que é o que faz o relógio
 * do Atlas poder andar para trás sem re-integrar nada.
 *
 * Fora da faixa da tabela de efemérides ela continua respondendo: quem
 * grampeia o instante é a máquina do tempo (`tempoDoAtlas.ts`), e a lei
 * não repete o grampo. Data envenenada (NaN) devolve o mínimo da âncora,
 * na direção que não pode cegar o quadro — a mesma doutrina do fallback
 * único do §3.
 */
export function faseDoCiclo(jdTdb: number): FaseDoCiclo {
  if (!Number.isFinite(jdTdb)) return { fase01: 0, ciclo: CICLO_DA_ANCORA };
  const anos = (jdTdb - JD_DO_MINIMO_ANCORA) / DIAS_DO_ANO_JULIANO;
  const n = Math.floor(anos / PERIODO_DO_CICLO_ANOS);
  const u = anos - n * PERIODO_DO_CICLO_ANOS;
  const fase01 =
    u < SUBIDA_DO_CICLO_ANOS
      ? (0.5 * u) / SUBIDA_DO_CICLO_ANOS
      : 0.5 + (0.5 * (u - SUBIDA_DO_CICLO_ANOS)) / DESCIDA_DO_CICLO_ANOS;
  return { fase01, ciclo: CICLO_DA_ANCORA + n };
}

/**
 * O RELÓGIO LENTO, na unidade do núcleo: monotônico na data, contínuo na
 * virada de ciclo, e é dele que sai TODO o estado das regiões ativas e
 * dos grupos de manchas — índice de vida, semente da vida, deriva.
 *
 * Ele é grande de propósito (o ciclo 25 vive perto de 46.000): a conta
 * que o consome é `(T + fase) % período`, e float64 sobra.
 */
export function tempoDoCiclo(f: FaseDoCiclo): number {
  return (f.ciclo + f.fase01) * UNIDADES_POR_CICLO;
}

/**
 * A LEI DE HALE pela paridade do ciclo: a polaridade da região líder
 * inverte a cada ciclo. O sinal ABSOLUTO é convenção — o que a lei
 * promete é que ele alterna, e que ciclos vizinhos discordam.
 */
export function haleDoCiclo(ciclo: number): 1 | -1 {
  return ((ciclo % 2) + 2) % 2 === 0 ? 1 : -1;
}
