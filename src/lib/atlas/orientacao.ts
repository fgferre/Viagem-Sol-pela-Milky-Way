// ============================================================
// Orientação de corpo — o avaliador IAU/WGCCRE da casa: polo (α, δ),
// meridiano-primo W e o sub-ponto solar que o oráculo Horizons julga.
//
// RENASCE (doutrina de travessia, docs/NORTE.md): o bodyOrientation.ts
// do doador devolvia THREE.Quaternion na base Y-up da cena — física
// amarrada ao renderer. Aqui tudo é número puro em EQUATORIAL J2000,
// o frame em que as tabelas IAU são publicadas: zero three, zero cena;
// a Onda 6 remapeia na borda. Os nomes resolveIauOrientation,
// computeSpinAngleRad e subSolarPoint ficam OS MESMOS do doador pela
// rastreabilidade dos oráculos que migram junto.
//
// MODELO (unidades EXATAS do kernel pck00011 — dados em
// iauOrientation.ts):
//   α = α₀ + α̇·T + Σ A·sin θ        δ = δ₀ + δ̇·T + Σ A·cos θ
//   W = W₀ + Ẇ·d + Ẅ·d² + Σ A·sin θ  com  θ = fase + taxa·T (+ taxa₂·T²)
// T em SÉCULOS julianos TDB para o polo, d em DIAS TDB para o spin.
// A quebra de unidade é do próprio kernel; confundir as escalas move
// um corpo por fator 36.525 — orientacao.test.ts pina as duas com um
// registro sintético.
//
// CICATRIZES HERDADAS (espec do doador; não redescobrir):
//  1. α e W somam A·sin θ; δ soma A·cos θ. Trocar a convenção desloca
//     o polo de Marte 3,1° (e o de Netuno 1,0°) — o teste reproduz os
//     valores históricos do catálogo do doador e o controle negativo
//     aplica a troca de propósito.
//  2. W DESENROLADO, sem % 360. Consumidor multiplica o ângulo (nuvens
//     da Terra a spin×1,03 no doador); num ângulo enrolado o multiply
//     injeta descontinuidade de (fator−1)·360° a cada volta — o snap
//     diário de ~10,7° que o doador removeu. Float64 segura o valor
//     desenrolado com folga métrica em toda a janela da casa.
//  3. Base do corpo EXPLÍCITA (nodoQ, lesteDeQ, polo) com guarda de
//     determinante +1. O antecessor no doador usava
//     setFromUnitVectors(up, polo): a rotação MÍNIMA que leva up ao
//     polo, com azimute ARBITRÁRIO em torno do eixo — colar um W
//     medido num azimute arbitrário mata o significado do W (o corpo
//     gira na taxa certa pelas longitudes erradas). Q é o nó ascendente
//     do equador do corpo sobre o equador ICRF, em RA α₀+90°, Dec 0 —
//     ortogonal ao polo POR CONSTRUÇÃO (o produto interno é
//     identicamente zero), então a base é ortonormal, o determinante é
//     +1 e o W medido "a leste de Q" tem onde morar.
//  4. spinAccelDegPerDay2 entra no W: os 9,5e-9°/dia² de Fobos parecem
//     ruído de arredondamento e são 12,7° de meridiano por século — a
//     aceleração secular de maré de uma lua espiralando para Marte.
//  5. Sub-ponto solar: tempo-luz MODELADO, nunca corrigido em ângulo —
//     o chamador avalia em t − lightTimeSeconds (a Terra gira 2,08°
//     nos ~499 s de luz Sol→Terra). Latitude PLANETODÉTICA convertida
//     com BODY_AXES do mesmo kernel: em Fobos (13×11,4×9,1 km) ela
//     difere ~20° da planetocêntrica — o doador quase leu essa
//     diferença como polo mistranscrito.
// ============================================================

import type { MotorEfemerides } from './efemerides';
import type { Vec3 } from './frameGalactico';
import { eclipticaParaEquatorial } from './frameGalactico';
import type { IauNutPrecTerm, IauOrientation } from './iauOrientation';
import { BODY_AXES, IAU_ORIENTATIONS } from './iauOrientation';
import { DAYS_PER_JULIAN_CENTURY, J2000_JD } from './time';

const DEG_PARA_RAD = Math.PI / 180;
const RAD_PARA_DEG = 180 / Math.PI;

/** O modelo IAU avaliado num instante: polo em ICRF e W desenrolado. */
export interface OrientacaoResolvida {
  /** α do polo, graus (equatorial J2000/ICRF). */
  raDeg: number;
  /** δ do polo, graus. */
  decDeg: number;
  /** W em graus, DESENROLADO (cicatriz 2 do cabeçalho). */
  wDeg: number;
}

/** θ de um termo periódico, em radianos, com T em séculos TDB. */
function nutPrecArgumentRad(term: IauNutPrecTerm, T: number): number {
  let deg = term.phaseDeg + term.rateDegPerCentury * T;
  // Só o sistema de Marte publica taxa quadrática, e só Fobos a consome
  // com amplitude visível (−1,143° no W) — cicatriz 4.
  if (term.rateDegPerCentury2) deg += term.rateDegPerCentury2 * T * T;
  return deg * DEG_PARA_RAD;
}

/**
 * W em graus, desenrolado. Compartilhado por resolveIauOrientation e
 * computeSpinAngleRad para o caminho de render (Onda 6) poder pedir só
 * o spin sem avaliar o polo.
 */
function avaliarSpinDeg(o: IauOrientation, jdTdb: number): number {
  const d = jdTdb - J2000_JD; // DIAS TDB — a escala do spin no kernel
  let spinDeg = o.primeMeridianDeg + o.spinRateDegPerDay * d;
  if (o.spinAccelDegPerDay2) {
    spinDeg += o.spinAccelDegPerDay2 * d * d;
  }
  if (o.nutPrec) {
    const T = d / DAYS_PER_JULIAN_CENTURY;
    for (const term of o.nutPrec) {
      if (!term.pmAmpDeg) continue;
      // Convenção IAU: termos de meridiano entram como A·sin θ.
      spinDeg += term.pmAmpDeg * Math.sin(nutPrecArgumentRad(term, T));
    }
  }
  return spinDeg;
}

/**
 * Avalia o modelo IAU completo num instante TDB.
 *
 * @param jdTdb Julian Date em **TDB** (conversão via time.ts, regra
 *   M6), nunca UT: as expressões IAU são grandezas TDB, e alimentar um
 *   dia UT desloca o spin da Terra ~ΔT ≈ 0,3° em 2026 — exatamente o
 *   que o gate GMST de orientacao.test.ts e o controle negativo de
 *   72 s de subSolarPoint.test.ts existem para pegar.
 */
export function resolveIauOrientation(
  o: IauOrientation,
  jdTdb: number
): OrientacaoResolvida {
  const d = jdTdb - J2000_JD;
  const T = d / DAYS_PER_JULIAN_CENTURY; // SÉCULOS TDB — escala do polo

  let raDeg = o.poleRaDeg + (o.poleRaRateDegPerCentury ?? 0) * T;
  let decDeg = o.poleDecDeg + (o.poleDecRateDegPerCentury ?? 0) * T;

  if (o.nutPrec) {
    for (const term of o.nutPrec) {
      const theta = nutPrecArgumentRad(term, T);
      // Cicatriz 1: α soma A·sin θ, δ soma A·cos θ — trocar desloca o
      // polo de Marte 3,1°.
      if (term.raAmpDeg) raDeg += term.raAmpDeg * Math.sin(theta);
      if (term.decAmpDeg) decDeg += term.decAmpDeg * Math.cos(theta);
    }
  }

  return { raDeg, decDeg, wDeg: avaliarSpinDeg(o, jdTdb) };
}

/**
 * O ângulo de spin W em radianos, DESENROLADO — cresce sem limite com
 * o tempo simulado, de propósito (cicatriz 2). Nome preservado do
 * doador (bodyOrientation.ts) pela rastreabilidade do oráculo.
 */
export function computeSpinAngleRad(o: IauOrientation, jdTdb: number): number {
  return avaliarSpinDeg(o, jdTdb) * DEG_PARA_RAD;
}

/** Versor equatorial J2000 a partir de (α, δ) em graus. */
function versorEquatorial(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG_PARA_RAD;
  const dec = decDeg * DEG_PARA_RAD;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

function cruz(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function escalar(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * A base do corpo em equatorial J2000, num instante.
 *
 * Tríade dextrógira EXPLÍCITA (cicatriz 3): x̂ = nodoQ (origem das
 * longitudes — W é medido a leste daqui), ẑ = polo (eixo de spin),
 * ŷ = lesteDeQ = polo × nodoQ (90° a leste de Q no equador do corpo).
 * setFromUnitVectors seria errado aqui: entrega UMA rotação que leva
 * up ao polo com azimute arbitrário, e o W medido perde o referencial.
 */
export interface BaseCorpoEquatorial {
  nodoQ: Vec3;
  lesteDeQ: Vec3;
  polo: Vec3;
  /** O W avaliado no mesmo instante — desenrolado. */
  wDeg: number;
}

export function baseCorpoEquatorial(
  o: IauOrientation,
  jdTdb: number
): BaseCorpoEquatorial {
  const { raDeg, decDeg, wDeg } = resolveIauOrientation(o, jdTdb);
  const polo = versorEquatorial(raDeg, decDeg);
  // Nó ascendente do equador do corpo sobre o equador ICRF: RA α₀+90°,
  // Dec 0 — ortogonal ao polo por construção.
  const nodoQ = versorEquatorial(raDeg + 90, 0);
  const lesteDeQ = cruz(polo, nodoQ);

  // Guarda de determinante: det[x̂ ŷ ẑ] = nodoQ·(lesteDeQ × polo) = +1
  // para a tríade ortonormal dextrógira. Só colapsa se o registro for
  // malformado (α₀ NaN, amplitude corrompida) — e esse defeito
  // renderizaria como um corpo numa atitude arbitrária plausível, não
  // como erro. Pega-se onde o dado está errado, não na tela.
  const det = escalar(nodoQ, cruz(lesteDeQ, polo));
  if (!(Math.abs(det - 1) < 1e-9)) {
    throw new Error(
      `orientacao: base degenerada (det=${det}) — registro IauOrientation malformado`
    );
  }

  return { nodoQ, lesteDeQ, polo, wDeg };
}

/**
 * Direção do meridiano-primo em equatorial J2000: x̂(W) = nodoQ·cos W +
 * lesteDeQ·sin W (leste a partir de Q, em torno do polo).
 *
 * Exportada porque é O caminho completo base+spin — o gate GMST de
 * orientacao.test.ts lê o meridiano DAQUI, como o doador lia da
 * orientação renderizada: um erro de sinal ou de permutação em
 * qualquer elo aparece no gate em vez de se esconder atrás do W cru.
 */
export function direcaoMeridianoPrimo(
  o: IauOrientation,
  jdTdb: number
): Vec3 {
  const { nodoQ, lesteDeQ, wDeg } = baseCorpoEquatorial(o, jdTdb);
  const w = wDeg * DEG_PARA_RAD;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  return [
    nodoQ[0] * cw + lesteDeQ[0] * sw,
    nodoQ[1] * cw + lesteDeQ[1] * sw,
    nodoQ[2] * cw + lesteDeQ[2] * sw,
  ];
}

/** Normaliza graus para [0, 360). */
function grau360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Planetocêntrica → planetodética no esferoide do próprio corpo
 * (BODY_AXES, mesmo kernel dos polos). Corpo sem eixos registrados é
 * esférico a 1e-4 — as duas latitudes coincidem. O que a conversão de
 * esferoide NÃO captura é triaxialidade (equador elíptico de Deimos);
 * esse resíduo é limitado por corpo no oráculo, com os mesmos eixos.
 */
function latitudePlanetodeticaDeg(
  bodyId: string,
  latCentricaDeg: number
): number {
  const eixos = BODY_AXES[bodyId];
  if (!eixos) return latCentricaDeg;
  const achatamento = (eixos[2] / eixos[0]) ** 2;
  return (
    Math.atan(Math.tan(latCentricaDeg * DEG_PARA_RAD) / achatamento) *
    RAD_PARA_DEG
  );
}

export interface PontoSubSolar {
  /** Longitude LESTE do sub-ponto solar a partir do meridiano-primo. */
  lonEastDeg: number;
  latPlanetocentricaDeg: number;
  /** A latitude que o Horizons reporta (conversão via BODY_AXES). */
  latPlanetodeticaDeg: number;
}

/**
 * Onde o Sol está a pino num corpo, no instante RETARDADO.
 *
 * @param jdTdbRetardado t − lightTimeSeconds já aplicado pelo chamador
 *   (cicatriz 5: tempo-luz é modelado no INSTANTE, nunca "corrigido"
 *   somando ângulo — o dado do Horizons é o ponto como era quando a
 *   luz partiu).
 * @param motor Fonte das posições heliocêntricas (eclíptica J2000, UA).
 *   A direção corpo→Sol é −posicaoHeliocentrica normalizada — o Sol é
 *   a origem do motor, e direção dispensa escala.
 */
export function subSolarPoint(
  bodyId: string,
  jdTdbRetardado: number,
  motor: MotorEfemerides
): PontoSubSolar {
  const o = IAU_ORIENTATIONS[bodyId];
  if (!o) {
    throw new Error(
      `subSolarPoint: "${bodyId}" sem solução de rotação IAU embarcada ` +
        `(iauOrientation.ts) — sem polo medido não há sub-ponto honesto`
    );
  }

  const p = motor.posicaoHeliocentrica(bodyId, jdTdbRetardado);
  const norma = Math.hypot(p.x, p.y, p.z);
  if (!(norma > 0)) {
    throw new Error(
      `subSolarPoint: "${bodyId}" na origem heliocêntrica — o Sol não tem sub-ponto solar`
    );
  }
  // Eclíptica → equatorial J2000 pela ponte única da casa
  // (frameGalactico); a base do corpo vive em equatorial.
  const dir = eclipticaParaEquatorial([
    -p.x / norma,
    -p.y / norma,
    -p.z / norma,
  ]);

  const { nodoQ, lesteDeQ, polo, wDeg } = baseCorpoEquatorial(
    o,
    jdTdbRetardado
  );
  const a = escalar(dir, nodoQ);
  const b = escalar(dir, lesteDeQ);
  const c = escalar(dir, polo);

  // Longitude leste a partir do meridiano-primo: o ângulo do Sol a
  // leste de Q, menos o W (posição do meridiano a leste de Q). O wrap
  // acontece SÓ aqui, na leitura — o W em si segue desenrolado.
  const lonDesdeQDeg = Math.atan2(b, a) * RAD_PARA_DEG;
  const lonEastDeg = grau360(lonDesdeQDeg - wDeg);

  const latPlanetocentricaDeg =
    Math.asin(Math.max(-1, Math.min(1, c))) * RAD_PARA_DEG;

  return {
    lonEastDeg,
    latPlanetocentricaDeg,
    latPlanetodeticaDeg: latitudePlanetodeticaDeg(
      bodyId,
      latPlanetocentricaDeg
    ),
  };
}
