// ============================================================
// Kepler novo — o propagador de dois corpos da casa.
//
// RENASCE (doutrina de travessia, docs/NORTE.md): o runtime do doador
// (satellites.ts / asteroids.ts / coordUtils.ts) não atravessa — ele
// devolvia THREE.Vector3 no frame Y-up da cena, amarrando a física ao
// renderer. Aqui o propagador é PURO: números entram (id + jdTdb),
// números saem ({x,y,z} em UA, eclíptica média J2000, parent-centered).
// Zero import de three; quem quiser o Y-up da cena remapeia na borda.
// O DADO que ele propaga migra verbatim em elementosOrbitais.ts.
//
// CONTRATO (o motor de efemérides importa daqui):
//   posicaoKepler(bodyId, jdTdb) → {x,y,z} UA eclíptica J2000,
//     centrado no pai do corpo (Sol para asteroides).
//   IDS_KEPLER → lista dos ids cobertos.
//
// CICATRIZES HERDADAS (espec do doador; não redescobrir):
//   1. n EXPLÍCITO quando o corpo o tem. O aAU dos satélites é
//      OSCULANTE — invertido de um único vetor de estado sob o J2 do
//      primário, ele oscila em torno do valor médio. Derivar n dele por
//      Kepler III perdeu 165° de fase em Fobos em 6 meses no doador
//      (estava documentado como "auto-consistência"; era bug). Kepler
//      III fica só como fallback para os heliocêntricos via μ, onde o
//      osculante é honesto.
//   2. Épocas em TDB. dt = jdTdb − epochJD com AMBOS em TDB; usar JD UT
//      desloca Fobos ~1° já na própria época (n ≈ 1128°/dia × ~74 s de
//      ΔT+32,184 s). O chamador é responsável por converter UT→TDB
//      antes de chamar (um conversor só no runtime, regra M6).
//   3. Solver de Kepler com guarda de convergência: Newton–Raphson com
//      orçamento de 12 iterações + corte em |Δ| < 1e-12 — a mesma
//      semântica que os oráculos do doador julgaram (confortável até
//      e ≈ 0,99; nossa maior excentricidade embarcada é 0,23).
//
// COINCIDÊNCIA TEXTUAL DECLARADA (achado da revisão de olhos frescos):
// os corpos de resolverKepler, perifocalParaEcliptica e
// elementosParaCartesiano saem quase idênticos aos de coordUtils.ts do
// doador porque são a matemática CANÔNICA (Newton no Kepler,
// Rz(Ω)·Rx(i)·Rz(ω) de Vallado/Curtis) — duas escritas honestas da
// mesma fórmula convergem para o mesmo texto. O que renasceu é o
// contrato (tuplas puras, zero three) e a arquitetura; a fórmula não
// tem autor.
// ============================================================

import type { EclipticElements, SatelliteEntry } from './elementosOrbitais';
import {
  ASTEROIDS,
  CATALOG_MOONS,
  CATALOG_TNOS,
  MU_PARENT,
  SATELLITES,
} from './elementosOrbitais';

/** Posição em UA na eclíptica média J2000, centrada no pai do corpo. */
export interface PosicaoEcliptica {
  x: number;
  y: number;
  z: number;
}

const D2R = Math.PI / 180;
const DOIS_PI = 2 * Math.PI;

/** Normaliza um ângulo para [0, 2π). */
function mod2Pi(x: number): number {
  const r = x % DOIS_PI;
  return r < 0 ? r + DOIS_PI : r;
}

/**
 * Resolve a equação de Kepler M = E − e·sin(E) para a anomalia
 * excêntrica E (radianos). Newton–Raphson com guarda de convergência
 * (cicatriz 3 do cabeçalho).
 */
export function resolverKepler(MRad: number, e: number): number {
  let E = MRad + e * Math.sin(MRad);
  for (let i = 0; i < 12; i++) {
    const delta = (E - e * Math.sin(E) - MRad) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return E;
}

/**
 * Roda um ponto do plano perifocal (x ao longo do periapse, y 90° à
 * frente no plano orbital) para o frame em que Ω, ω e i são expressos —
 * eclíptica J2000 para todos os nossos elementos. Rotação clássica
 * R_z(Ω)·R_x(i)·R_z(ω), expandida.
 */
export function perifocalParaEcliptica(
  xp: number,
  yp: number,
  OmegaRad: number,
  omegaRad: number,
  iRad: number
): PosicaoEcliptica {
  const cosO = Math.cos(OmegaRad);
  const sinO = Math.sin(OmegaRad);
  const cosw = Math.cos(omegaRad);
  const sinw = Math.sin(omegaRad);
  const cosi = Math.cos(iRad);
  const sini = Math.sin(iRad);

  return {
    x:
      xp * (cosw * cosO - sinw * sinO * cosi) -
      yp * (sinw * cosO + cosw * sinO * cosi),
    y:
      xp * (cosw * sinO + sinw * cosO * cosi) +
      yp * (cosw * cosO * cosi - sinw * sinO),
    z: xp * (sinw * sini) + yp * (cosw * sini),
  };
}

/**
 * Elementos clássicos → posição cartesiana pelo caminho da anomalia
 * média (M → E via Kepler → perifocal → eclíptica). Saída na mesma
 * unidade linear de `aAU`, no frame de Ω/ω/i.
 */
export function elementosParaCartesiano(params: {
  aAU: number;
  e: number;
  iRad: number;
  OmegaRad: number;
  omegaRad: number;
  MRad: number;
}): PosicaoEcliptica {
  const { aAU, e, iRad, OmegaRad, omegaRad, MRad } = params;
  const E = resolverKepler(MRad, e);
  const xp = aAU * (Math.cos(E) - e);
  const yp = aAU * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
  return perifocalParaEcliptica(xp, yp, OmegaRad, omegaRad, iRad);
}

// Registro unificado: 20 satélites analíticos + 2 luas de catálogo +
// 2 TNOs de catálogo (os pais das luas — fechamento da composição
// heliocêntrica, achado da revisão) + 4 asteroides (ganham parent
// "sun" aqui — no dado migrado eles são uma tabela achatada, fiel ao
// doador).
const CORPOS: Record<string, SatelliteEntry> = {
  ...SATELLITES,
  ...CATALOG_MOONS,
  ...CATALOG_TNOS,
  ...Object.fromEntries(
    Object.entries(ASTEROIDS).map(([id, elements]) => [
      id,
      { parent: 'sun', elements },
    ])
  ),
};

/** Ids cobertos por `posicaoKepler` — parte do contrato com o motor. */
export const IDS_KEPLER: readonly string[] = Object.keys(CORPOS);

/**
 * Movimento médio em °/dia: explícito quando o corpo o tem (cicatriz 1),
 * senão Kepler III de μ_parent — caminho reservado aos heliocêntricos,
 * cujos elementos osculantes não sofrem o J2 de um primário.
 */
function movimentoMedioDegPorDia(
  elements: EclipticElements,
  parent: string,
  bodyId: string
): number {
  if (elements.nDegPerDay !== undefined) return elements.nDegPerDay;
  const mu = MU_PARENT[parent];
  if (mu === undefined) {
    throw new Error(
      `posicaoKepler: "${bodyId}" não tem nDegPerDay nem μ para o pai "${parent}"`
    );
  }
  const aAU = elements.aAU;
  return (Math.sqrt(mu / (aAU * aAU * aAU)) * 180) / Math.PI;
}

/**
 * Posição Kepler de dois corpos em `jdTdb` (Julian Date, escala TDB —
 * cicatriz 2). Saída {x,y,z} em UA, eclíptica média J2000, centrada no
 * pai do corpo. Lança para id não coberto: silêncio aqui viraria um
 * corpo parado na origem do pai.
 */
export function posicaoKepler(bodyId: string, jdTdb: number): PosicaoEcliptica {
  // NaN atravessa qualquer comparação de janela em silêncio (NaN < x e
  // NaN > x são ambos false) e viraria {NaN,NaN,NaN} cacheável — a
  // classe de bug "corpo some sem erro" que este módulo existe para
  // proibir (achado da revisão de olhos frescos).
  if (!Number.isFinite(jdTdb)) {
    throw new Error(`posicaoKepler: jdTdb não-finito (${jdTdb}) para "${bodyId}"`);
  }
  const corpo = CORPOS[bodyId];
  if (!corpo) {
    throw new Error(
      `posicaoKepler: corpo desconhecido "${bodyId}" (cobertos: ${IDS_KEPLER.join(
        ', '
      )})`
    );
  }
  const { parent, elements } = corpo;
  const n = movimentoMedioDegPorDia(elements, parent, bodyId);
  const dt = jdTdb - elements.epochJD;
  const MRad = mod2Pi((elements.M0Deg + n * dt) * D2R);
  return elementosParaCartesiano({
    aAU: elements.aAU,
    e: elements.e,
    iRad: elements.iDeg * D2R,
    OmegaRad: mod2Pi(elements.OmegaDeg * D2R),
    omegaRad: mod2Pi(elements.omegaDeg * D2R),
    MRad,
  });
}

/**
 * OS ELEMENTOS DE UM CORPO DE KEPLER, com o movimento médio JÁ RESOLVIDO —
 * o acessório de leitura do registro que este módulo monta logo acima.
 *
 * Existe porque a taxa é a única coisa aqui que não é literal de tabela: ela
 * é explícita para os 26 satélites e TNOs (com a procedência `pub`/`fix`
 * anotada entrada a entrada em `elementosOrbitais.ts`) e cai em Kepler III
 * para os quatro asteroides. Quem precisa do período orbital de um corpo —
 * o gerador de `corpos.json`, e por ele a ficha — precisa dessa resolução, e
 * copiá-la seria criar a segunda regra de qual taxa vale.
 *
 * `null` para corpo de tabela (que tem efeméride e não elementos) e para id
 * desconhecido: quem chama decide o que fazer, e a decisão fica visível.
 */
export function elementosDe(bodyId: string): {
  parent: string;
  elements: EclipticElements;
  nDegPerDay: number;
} | null {
  const corpo = CORPOS[bodyId];
  if (!corpo) return null;
  return {
    parent: corpo.parent,
    elements: corpo.elements,
    nDegPerDay: movimentoMedioDegPorDia(corpo.elements, corpo.parent, bodyId),
  };
}
