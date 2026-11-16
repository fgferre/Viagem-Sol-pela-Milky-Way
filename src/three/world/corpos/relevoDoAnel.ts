// ============================================================
// O RELEVO MEDIDO DO ANEL (etapa 1): os picos verticais da borda externa
// do anel B, que a Cassini viu pelas sombras no equinócio de agosto de 2009.
//
// O anel tem ~10 m de espessura; aqui, numa faixa de ~10° de arco junto à
// borda do B, o material sobe até 3,5 km acima do plano (e, pela mesma
// causa, abaixo dele). Atrás de `?relevo=1` nesta etapa: sem o parâmetro
// nada daqui é montado e os shaders do disco saem byte a byte os de antes.
//
// O QUE É MEDIDO (Spitale & Porco 2010, AJ 140, 1747; arXiv:0912.3489):
// o raio da faixa, o arco que ela ocupa, a altura máxima (pelas sombras) e
// a taxa de giro (a orbital local). O QUE É SORTEADO, dentro do que as
// imagens publicadas do equinócio mostram (PIA11668, PIA11677) e
// CONFESSADO: quantos picos, onde, a largura de cada um, a forma e as
// alturas abaixo do teto. A semente é fixa: os picos são sempre os mesmos.
// ============================================================

import * as THREE from 'three';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import type { QualityLevel } from '../../core/engine';

/** `?relevo=1` liga a etapa; fora do navegador (testes em Node) fica desligada. */
export const RELEVO_DO_ANEL: boolean =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('relevo') === '1';

const KM_POR_RAIO = BODY_AXES.saturn[0]!;

/** Raio da linha dos picos, km — Spitale & Porco 2010, §5 (117 547,6 km). */
export const R_DOS_PICOS_KM = 117_547.6;
/** Borda externa do anel B, km (a0 do ajuste de modos) — Spitale & Porco 2010. */
export const BORDA_DO_B_KM = 117_568;
/**
 * O PERFIL DO APP (Jónsson, 36 km por caixa) põe a borda do B em ~117 500 km
 * (α ≈ 0,5 entre as caixas de 117 482 e 117 518 km; a 117 518 já é vão): 68
 * km para dentro do a0 medido, dentro da oscilação de ~100 km da borda que o
 * app não desenha. Os picos vão onde o artigo os viu RELATIVOS À BORDA
 * (20,4 km para dentro dela), na borda que o app desenha: na medida absoluta
 * eles cairiam no vão e não haveria anel para os levar.
 */
export const BORDA_DO_B_NO_PERFIL_KM = 117_500;
/** O raio onde a faixa é DESENHADA, km: a borda do perfil menos os 20,4 km medidos. */
export const R_DA_FAIXA_KM = BORDA_DO_B_NO_PERFIL_KM - (BORDA_DO_B_KM - R_DOS_PICOS_KM);
/** O arco ocupado pelos picos, graus (~20 000 km de arco) — Spitale & Porco 2010. */
export const ARCO_DOS_PICOS_GRAUS = 10;
/**
 * A longitude do centro da faixa, graus, no referencial de anel de sempre
 * da Cassini (a partir do nodo ascendente do equador de Saturno no equador
 * J2000 — o mesmo `x̂` do frame do anel aqui, `orientacaoInercialDoAnelNaCena`)
 * — 95° segundo Spitale & Porco 2010. A ÉPOCA dessa longitude não pude ler
 * no artigo (sem baixar o texto): ancoro-a no equinócio de Saturno,
 * 2009-08-11 00:00 TDB, DATA DECLARADA. A 759°/dia, um erro de uma hora na
 * época já gira a faixa 32°: onde ela está numa data qualquer é confissão,
 * não medida.
 */
export const LON_DOS_PICOS_GRAUS = 95;
/** A época declarada de `LON_DOS_PICOS_GRAUS` (JD TDB) — ver acima. */
export const JD_DA_EPOCA_DOS_PICOS = 2_455_054.5;
/** Taxa de giro da faixa, graus/dia: a orbital local (não a do padrão da ressonância) — Spitale & Porco 2010. */
export const TAXA_DOS_PICOS_GRAUS_POR_DIA = 758.986;
/**
 * Altura máxima, km, medida pelas sombras — Spitale & Porco 2010 (3,5 km).
 * Uma legenda da NASA (PIA11668) diz 2,5 km: 3,5 é o teto do artigo.
 */
export const ALTURA_MAX_DOS_PICOS_KM = 3.5;

// --- o que é SORTEADO pela imagem (confessado) ---------------------------
/** Células ao longo do arco (~641 km cada) — sorteado: nas imagens há
 *  algumas dezenas de sombras distintas ao longo da faixa. */
export const CELULAS_DOS_PICOS = 32;
/** Cada célula tem um pico e um vizinho menor colado: as "cortinas"
 *  irregulares das imagens, nunca um pico isolado e liso — sorteado. */
export const PICOS_POR_CELULA = 2;
export const N_PICOS = CELULAS_DOS_PICOS * PICOS_POR_CELULA;
/** Meia largura radial de cada cortina, km — sorteado (as sombras nascem
 *  de uma faixa estreita junto à borda; cabe dentro dos 20 km até ela). */
export const MEIA_LARGURA_RADIAL_KM = 12;
/** O centro radial de cada pico varia ±4 km em torno de `R_DA_FAIXA_KM` — sorteado. */
const DESVIO_RADIAL_KM = 4;
/** Meia largura ao longo do arco do pico principal, km: 90–240 — sorteado. */
const MEIA_LARGURA_ARCO_KM: readonly [number, number] = [90, 240];
const SEMENTE_DOS_PICOS = 0x5a7c_2009;

/** A sombra mais longa que se desenha, km: com o Sol abaixo de ~0,1° o
 *  alcance seria quase infinito; o teto é declarado, não medido. */
export const ALCANCE_MAX_DA_SOMBRA_KM = 2000;
/** O relevo só entra no desenho quando a feição maior (a sombra ou a
 *  altura) passa de ~1/3000 rad na tela (meio pixel a ~1500 px/rad): nível
 *  de detalhe, a única coisa aqui que olha para a câmera. */
const RAZAO_DE_VISIBILIDADE = 3000;
/** O passo da marcha da sombra, km de caminho, por nível gráfico: no
 *  cinema ~3 passos na meia largura radial; abaixo dele a sombra fica mais
 *  grossa (um pico estreito pode encurtar a dele) para caber no orçamento. */
const PASSO_DA_SOMBRA_KM: Record<QualityLevel, number> = { cinema: 4, alta: 6, performance: 10 };

const ARCO_KM = R_DA_FAIXA_KM * ARCO_DOS_PICOS_GRAUS * (Math.PI / 180);
const CELULA_KM = ARCO_KM / CELULAS_DOS_PICOS;
/** A fita cobre os picos inteiros: meia largura radial e meio arco, km. */
export const MEIA_FITA_RADIAL_KM = DESVIO_RADIAL_KM + 4 + MEIA_LARGURA_RADIAL_KM;
export const MEIA_FITA_ARCO_KM = ARCO_KM / 2 + 1.5 * CELULA_KM;
const MEIO_ARCO_FITA_RAD = MEIA_FITA_ARCO_KM / R_DA_FAIXA_KM;

const glslF = (x: number) => x.toExponential(9);
const MEIO_ARCO_KM = ARCO_KM / 2;

function mulberry32(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A TABELA DOS PICOS, vec4 por pico: (s km ao longo do arco a partir do
 * centro da faixa, ρ km a partir de `R_DA_FAIXA_KM`, meia largura no arco
 * km, altura km). Pico 2c é o principal da célula c, 2c+1 o vizinho dele.
 * Tudo sorteado (semente fixa), dentro do que as imagens mostram:
 * - alturas com cauda: 0,12 + 0,88·u^2,5 do teto (mediana ~1 km, poucos
 *   perto do teto), normalizadas para o mais alto valer 3,5 km exatos;
 * - o vizinho a 0,5–1,1 meia largura do principal, 35–70% da largura e
 *   35–85% da altura dele.
 * Cada pico cabe na sua célula e nas duas vizinhas (o shader só olha três).
 */
export const TABELA_DOS_PICOS: Float32Array = (() => {
  const sorte = mulberry32(SEMENTE_DOS_PICOS);
  const t = new Float64Array(N_PICOS * 4);
  for (let c = 0; c < CELULAS_DOS_PICOS; c++) {
    const meio = -ARCO_KM / 2 + (c + 0.5) * CELULA_KM;
    const s = meio + (sorte() - 0.5) * 0.6 * CELULA_KM;
    const w = MEIA_LARGURA_ARCO_KM[0] + (MEIA_LARGURA_ARCO_KM[1] - MEIA_LARGURA_ARCO_KM[0]) * sorte();
    const rho = (sorte() * 2 - 1) * DESVIO_RADIAL_KM;
    const h = 0.12 + 0.88 * Math.pow(sorte(), 2.5);
    const lado = sorte() < 0.5 ? -1 : 1;
    const s2 = s + lado * (0.5 + 0.6 * sorte()) * w;
    const w2 = w * (0.35 + 0.35 * sorte());
    const rho2 = rho + (sorte() * 2 - 1) * 3;
    const h2 = h * (0.35 + 0.5 * sorte());
    t.set([s, rho, w, h, s2, rho2, w2, h2], c * 8);
  }
  let maior = 0;
  for (let i = 0; i < N_PICOS; i++) maior = Math.max(maior, t[i * 4 + 3]!);
  for (let i = 0; i < N_PICOS; i++) t[i * 4 + 3] = (t[i * 4 + 3]! / maior) * ALTURA_MAX_DOS_PICOS_KM;
  return new Float32Array(t);
})();

/**
 * A ALTURA DOS PICOS, km, em (ρ km a partir de `R_DA_FAIXA_KM`, s km de
 * arco a partir do centro da faixa). Cada pico é uma cortina pontuda: no
 * arco (1 − |x|)^1,5 (cúspide no topo), no raio (1 − y²)²; vizinhos se
 * juntam pelo MAIOR, nunca pela soma, para o teto ser o medido.
 *
 * Escrita UMA vez em GLSL; o teste executa este mesmo texto como JS (o
 * espelho) e o compara com `alturaDosPicosCpu`. Por isso só usa escalares
 * e `uPicos[i].x…w`.
 */
export const GLSL_ALTURA_DOS_PICOS = /* glsl */ `
float alturaDosPicos(float rho, float s) {
  float c = floor((s + ${glslF(MEIO_ARCO_KM)}) / ${glslF(CELULA_KM)});
  float h = 0.0;
  for (int k = -1; k <= 1; k++) {
    float ci = c + float(k);
    if (ci < 0.0 || ci > ${glslF(CELULAS_DOS_PICOS - 1)}) continue;
    for (int j = 0; j < ${PICOS_POR_CELULA}; j++) {
      vec4 p = uPicos[int(ci) * ${PICOS_POR_CELULA} + j];
      float x = abs(s - p.x) / p.z;
      float y = (rho - p.y) / ${glslF(MEIA_LARGURA_RADIAL_KM)};
      if (x < 1.0 && abs(y) < 1.0) {
        float t = 1.0 - x;
        float g = 1.0 - y * y;
        h = max(h, p.w * t * sqrt(t) * g * g);
      }
    }
  }
  return h;
}
`;

/** O espelho em CPU de `GLSL_ALTURA_DOS_PICOS` (mesma conta, em dupla). */
export function alturaDosPicosCpu(rho: number, s: number, picos: ArrayLike<number> = TABELA_DOS_PICOS): number {
  // as constantes como o GLSL as lê (9 casas), para o espelho ser exato
  const c = Math.floor((s + Number(glslF(MEIO_ARCO_KM))) / Number(glslF(CELULA_KM)));
  let h = 0;
  for (let k = -1; k <= 1; k++) {
    const ci = c + k;
    if (ci < 0 || ci > CELULAS_DOS_PICOS - 1) continue;
    for (let j = 0; j < PICOS_POR_CELULA; j++) {
      const o = (ci * PICOS_POR_CELULA + j) * 4;
      const x = Math.abs(s - picos[o]!) / picos[o + 2]!;
      const y = (rho - picos[o + 1]!) / MEIA_LARGURA_RADIAL_KM;
      if (x < 1 && Math.abs(y) < 1) {
        const t = 1 - x;
        const g = 1 - y * y;
        h = Math.max(h, picos[o + 3]! * t * Math.sqrt(t) * g * g);
      }
    }
  }
  return h;
}

/** A longitude do centro da faixa (rad, em [−π, π)) no JD TDB: gira com o relógio do app. */
export function longitudeDosPicos(jd: number): number {
  const graus = LON_DOS_PICOS_GRAUS + TAXA_DOS_PICOS_GRAUS_POR_DIA * (jd - JD_DA_EPOCA_DOS_PICOS);
  const r = ((((graus + 180) % 360) + 360) % 360) - 180;
  return (r * Math.PI) / 180;
}

/**
 * O BLOCO DO DISCO E DA FITA (fragmento). `uRelevo` = (cos λ, sen λ,
 * ligado, passo da marcha km), λ a longitude da faixa; `uSolDosPicos` = (tan da elevação do
 * Sol com piso, alcance da sombra km, rumo do Sol no plano no quadro da
 * faixa). Pede `uSolAngRad` (o raio angular do Sol) do `ANEL_FRAG`.
 */
export const GLSL_RELEVO_DO_ANEL = /* glsl */ `
uniform vec4 uPicos[${N_PICOS}];
uniform vec4 uRelevo;
uniform vec4 uSolDosPicos;
uniform vec4 uCamDaFaixa;
${GLSL_ALTURA_DOS_PICOS}
// o ponto do plano (em raios) no quadro da faixa, em km: o centro dela em +x
vec2 noQuadroDosPicos(vec2 pR) {
  return vec2(dot(pR, uRelevo.xy), dot(pR, vec2(-uRelevo.y, uRelevo.x))) * ${glslF(KM_POR_RAIO)};
}
// A PEGADA DA FITA: ali o disco cede, e só ali a fita desenha (a malha dela
// passa um pouco da pegada). Os dois decidem pela MESMA conta — o ponto
// relativo à câmera (preciso a centímetros) somado à câmera no quadro da
// faixa (\`uCamDaFaixa\`, os mesmos uniformes nos dois) —, e a fronteira sai
// a mesma nos dois: pelo vPos (~15 m de grão a 2 raios) cada malha errava
// para um lado e sobravam pontos sem nenhuma das duas.
bool naFitaPeloRelativo(vec3 rel) {
  if (uRelevo.z <= 0.0) return false;
  vec2 rb = vec2(dot(rel.xy, uRelevo.xy), dot(rel.xy, vec2(-uRelevo.y, uRelevo.x)));
  vec2 e = vec2(cos(uCamDaFaixa.z), sin(uCamDaFaixa.z));
  float x = dot(rb, e);
  float y = dot(rb, vec2(-e.y, e.x));
  float rc = uCamDaFaixa.y;
  float rho = uCamDaFaixa.x + (x * (2.0 * rc + x) + y * y) / (length(vec2(rc + x, y)) + rc);
  float fi = uCamDaFaixa.z + atan(y, rc + x);
  return abs(rho) < ${glslF(MEIA_FITA_RADIAL_KM)} && abs(fi) < ${glslF(MEIO_ARCO_FITA_RAD)};
}
// sem as pedras (\`?pedras=0\`) não há ponto relativo: a pegada sai do vPos
bool naFitaDosPicos(vec2 pR) {
  if (uRelevo.z <= 0.0) return false;
  vec2 q = noQuadroDosPicos(pR);
  return q.x > 0.0 && abs(length(q) - ${glslF(R_DA_FAIXA_KM)}) < ${glslF(MEIA_FITA_RADIAL_KM)}
    && abs(q.y) < q.x * ${glslF(Math.tan(MEIO_ARCO_FITA_RAD))};
}
// A SOMBRA DOS PICOS na luz direta: o raio de luz que chega a (pR, z0 km)
// sobe para o Sol com a tangente da elevação; anda-se por ele só onde ele
// cruza a faixa (círculos interno e externo da pegada), e a fração do disco
// do Sol tapada pelo pico mais alto que ele cruza é a sombra (penumbra
// linear no raio angular do Sol). O relevo é simétrico: a mesma conta vale
// para as duas faces.
float sombraDosPicos(vec2 pR, float z0) {
  if (uRelevo.z <= 0.0) return 1.0;
  vec2 p = noQuadroDosPicos(pR);
  float alcance = uSolDosPicos.y;
  if (p.x <= 0.0 || abs(p.y) > p.x * ${glslF(Math.tan(MEIO_ARCO_FITA_RAD + ALCANCE_MAX_DA_SOMBRA_KM / R_DA_FAIXA_KM))}) return 1.0;
  vec2 u = uSolDosPicos.zw;
  float b = dot(p, u);
  float pp = dot(p, p);
  const float R1 = ${glslF(R_DA_FAIXA_KM + MEIA_FITA_RADIAL_KM)};
  const float R0 = ${glslF(R_DA_FAIXA_KM - MEIA_FITA_RADIAL_KM)};
  float disc1 = b * b - (pp - R1 * R1);
  if (disc1 <= 0.0) return 1.0;
  float q1 = sqrt(disc1);
  float d0 = max(-b - q1, 0.0);
  float d1 = min(-b + q1, alcance);
  if (d1 <= d0) return 1.0;
  // o trecho dentro do círculo interno não tem pico: dois pedaços no máximo
  float e0 = d1;
  float e1 = d1;
  float disc0 = b * b - (pp - R0 * R0);
  if (disc0 > 0.0) {
    float q0 = sqrt(disc0);
    e0 = -b - q0;
    e1 = -b + q0;
  }
  float tanE = uSolDosPicos.x;
  float meiaPenumbra = max(uSolAngRad, 1.0e-4);
  float tapado = 0.0;
  for (int k = 0; k < 2; k++) {
    float a0 = k == 0 ? d0 : max(d0, e1);
    float a1 = k == 0 ? min(d1, e0) : d1;
    if (a1 <= a0 || tapado >= 0.999) continue;
    // um passo a cada uRelevo.w km de caminho (a meia largura radial é 12 km), de 3 a 24
    float n = clamp(ceil((a1 - a0) / uRelevo.w), 3.0, 24.0);
    for (int i = 0; i < 24; i++) {
      if (float(i) >= n || tapado >= 0.999) break;
      float d = mix(a0, a1, (float(i) + 0.5) / n);
      vec2 q = p + u * d;
      float hq = alturaDosPicos(length(q) - ${glslF(R_DA_FAIXA_KM)}, ${glslF(R_DA_FAIXA_KM)} * atan(q.y, q.x));
      float acima = hq - (z0 + d * tanE);
      tapado = max(tapado, clamp(0.5 + acima / (2.0 * max(d, 1.0e-3) * meiaPenumbra), 0.0, 1.0));
    }
  }
  return 1.0 - tapado;
}
`;

/**
 * O VÉRTICE DA FITA: cada vértice traz (ρ, s) em km e a face (+1 em cima,
 * −1 embaixo); a altura sai do campo, a posição gira com a faixa e a normal
 * (convenção do disco: +z para cima, nas duas faces) vem do gradiente.
 * Com as pedras, o ponto relativo à câmera que a cessão e a vista leem.
 */
export function vertDaFita(comPedras: boolean): string {
  return /* glsl */ `
uniform vec4 uPicos[${N_PICOS}];
uniform vec4 uRelevo;
${comPedras ? 'uniform vec3 uCamAltaDasPedras;\nuniform vec3 uCamRestoDasPedras;\nvarying vec3 vRelDasPedras;\n' : ''}attribute vec3 fita;
varying vec3 vPos;
varying vec3 vNormalDaFita;
varying float vAlturaKm;
${GLSL_ALTURA_DOS_PICOS}
void main() {
  float rho = fita.x;
  float s = fita.y;
  float h = alturaDosPicos(rho, s);
  const float E = 0.5;
  float hr = (alturaDosPicos(rho + E, s) - alturaDosPicos(rho - E, s)) / (2.0 * E);
  float hs = (alturaDosPicos(rho, s + E) - alturaDosPicos(rho, s - E)) / (2.0 * E);
  vec2 xy = vec2(position.x * uRelevo.x - position.y * uRelevo.y, position.x * uRelevo.y + position.y * uRelevo.x);
  vec2 er = xy / max(length(xy), 1.0e-6);
  vec2 g = hr * er + hs * vec2(-er.y, er.x);
  vNormalDaFita = vec3(-fita.z * g, 1.0);
  vAlturaKm = h;
  vPos = vec3(xy, fita.z * h / ${glslF(KM_POR_RAIO)});
${comPedras ? `  vRelDasPedras = (vPos - uCamAltaDasPedras) * ${glslF(KM_POR_RAIO)} - uCamRestoDasPedras;\n` : ''}  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}
`;
}

/** Os uniformes do relevo, que o disco e a fita PARTILHAM (o gigante os espalha no material do disco). */
export function uniformesDoRelevo(): Record<string, THREE.IUniform> {
  return {
    uPicos: { value: TABELA_DOS_PICOS },
    uRelevo: { value: new THREE.Vector4(1, 0, 0, PASSO_DA_SOMBRA_KM.cinema) },
    uSolDosPicos: { value: new THREE.Vector4(1, 0, 1, 0) },
    uCamDaFaixa: { value: new THREE.Vector4() },
  };
}

/** A malha passa da pegada por esta folga (km; o relevo ali é zero): quem recorta é a pegada. */
const FOLGA_DA_MALHA_KM = 0.5;
/** Segmentos da malha da fita: ~10 km no arco, ~2,5 km no raio, nas duas faces. */
const SEGMENTOS_NO_ARCO = 2048;
const SEGMENTOS_NO_RAIO = 16;

/**
 * A FITA: a faixa dos picos com geometria de verdade (o disco é um anel de
 * triângulos só e não aceita deslocamento). Duas folhas, em cima e
 * embaixo, cada uma com metade da opacidade da camada (1 − √(1 − α)):
 * onde o relevo é zero as duas se somam exatamente no α do disco que ela
 * substitui.
 */
export class FitaDosPicos {
  readonly malha: THREE.Mesh;
  private readonly geo: THREE.BufferGeometry;
  private readonly u: Record<string, THREE.IUniform>;
  private readonly rumo = new THREE.Vector2();

  constructor(material: THREE.ShaderMaterial) {
    this.u = material.uniforms;
    const nA = SEGMENTOS_NO_ARCO + 1;
    const nR = SEGMENTOS_NO_RAIO + 1;
    const nV = nA * nR * 2;
    const pos = new Float32Array(nV * 3);
    const fita = new Float32Array(nV * 3);
    const idx = new Uint32Array(SEGMENTOS_NO_ARCO * SEGMENTOS_NO_RAIO * 6 * 2);
    let v = 0;
    let t = 0;
    for (const lado of [1, -1]) {
      const base = v;
      for (let i = 0; i < nA; i++) {
        const meioArco = MEIA_FITA_ARCO_KM + 4 * FOLGA_DA_MALHA_KM;
        const s = -meioArco + (2 * meioArco * i) / SEGMENTOS_NO_ARCO;
        const fi = s / R_DA_FAIXA_KM;
        for (let j = 0; j < nR; j++) {
          const meiaRadial = MEIA_FITA_RADIAL_KM + FOLGA_DA_MALHA_KM;
          const rho = -meiaRadial + (2 * meiaRadial * j) / SEGMENTOS_NO_RAIO;
          const r = (R_DA_FAIXA_KM + rho) / KM_POR_RAIO;
          pos.set([r * Math.cos(fi), r * Math.sin(fi), 0], v * 3);
          fita.set([rho, s, lado], v * 3);
          v++;
        }
      }
      for (let i = 0; i < SEGMENTOS_NO_ARCO; i++) {
        for (let j = 0; j < SEGMENTOS_NO_RAIO; j++) {
          const a = base + i * nR + j;
          const b = a + nR;
          idx.set([a, b, a + 1, a + 1, b, b + 1], t);
          t += 6;
        }
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('fita', new THREE.BufferAttribute(fita, 3));
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    // a esfera do recorte gira com a faixa (`atualizar`): o vértice gira no shader
    // (a meia corda, a flecha do arco, a meia largura e a altura, somadas: folga, nunca falta)
    const flecha = R_DA_FAIXA_KM * (1 - Math.cos(MEIO_ARCO_FITA_RAD));
    const raio =
      (MEIA_FITA_ARCO_KM + flecha + MEIA_FITA_RADIAL_KM + 5 * FOLGA_DA_MALHA_KM + ALTURA_MAX_DOS_PICOS_KM) / KM_POR_RAIO;
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), raio);
    this.malha = new THREE.Mesh(this.geo, material);
    this.malha.matrixAutoUpdate = false;
    this.malha.visible = false;
  }

  fixarNoAnel(matriz: THREE.Matrix4) {
    this.malha.matrix.copy(matriz);
  }

  /**
   * O QUADRO: a faixa gira com o relógio (jd TDB), o Sol do quadro da
   * faixa e o nível de detalhe. `dirSolLocal`/`camLocal` no frame do anel
   * (a câmera em raios).
   */
  atualizar(jd: number, dirSolLocal: THREE.Vector3, camLocal: THREE.Vector3, tier: QualityLevel = 'cinema') {
    const lon = longitudeDosPicos(jd);
    const c = Math.cos(lon);
    const s = Math.sin(lon);
    const horiz = Math.hypot(dirSolLocal.x, dirSolLocal.y);
    // o piso da tangente é o teto declarado do alcance (Sol rasante)
    const tanE = Math.max(
      Math.abs(dirSolLocal.z) / Math.max(horiz, 1e-9),
      ALTURA_MAX_DOS_PICOS_KM / ALCANCE_MAX_DA_SOMBRA_KM
    );
    const alcance = ALTURA_MAX_DOS_PICOS_KM / tanE;
    if (horiz > 1e-9) this.rumo.set(dirSolLocal.x / horiz, dirSolLocal.y / horiz);
    else this.rumo.set(1, 0);
    // o rumo do Sol no quadro da faixa (girado de −λ)
    const ux = this.rumo.x * c + this.rumo.y * s;
    const uy = -this.rumo.x * s + this.rumo.y * c;
    const rC = R_DA_FAIXA_KM / KM_POR_RAIO;
    const dx = camLocal.x - rC * c;
    const dy = camLocal.y - rC * s;
    const distKm = Math.max(
      Math.hypot(dx, dy, camLocal.z) * KM_POR_RAIO - MEIA_FITA_ARCO_KM,
      Math.abs(camLocal.z) * KM_POR_RAIO
    );
    const vivo = distKm < Math.max(alcance, ALTURA_MAX_DOS_PICOS_KM) * RAZAO_DE_VISIBILIDADE;
    (this.u.uRelevo!.value as THREE.Vector4).set(c, s, vivo ? 1 : 0, PASSO_DA_SOMBRA_KM[tier]);
    // a câmera no quadro da faixa, em dupla: o raio dela menos o da faixa sai
    // pequeno e preciso; o shader soma a ele o ponto relativo à câmera
    const cx = (camLocal.x * c + camLocal.y * s) * KM_POR_RAIO;
    const cy = (-camLocal.x * s + camLocal.y * c) * KM_POR_RAIO;
    const rc = Math.hypot(cx, cy);
    (this.u.uCamDaFaixa!.value as THREE.Vector4).set(rc - R_DA_FAIXA_KM, rc, Math.atan2(cy, cx), 0);
    (this.u.uSolDosPicos!.value as THREE.Vector4).set(tanE, alcance, ux, uy);
    this.malha.visible = vivo;
    this.geo.boundingSphere!.center.set(rC * c, rC * s, 0);
  }

  dispose() {
    this.geo.dispose();
    (this.malha.material as THREE.Material).dispose();
  }
}
