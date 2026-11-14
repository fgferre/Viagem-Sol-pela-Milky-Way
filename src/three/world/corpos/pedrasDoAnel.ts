// ============================================================
// AS PEDRAS DO ANEL EM 3D (`?pedras=3d`, 14/11) — de perto, o anel de
// Saturno se desfaz em pedaços de gelo SÓLIDOS, com forma, tamanho e
// sombra, e o disco liso cede a luz que eles passam a carregar.
//
// O PEDIDO, palavras dele (resumidas): "de perto os anéis parecem um disco
// plano e liso; conforme a câmera se aproxima, milhares de pedaços de gelo
// e rocha em 3D, de tamanhos e formatos variados, orbitando onde estão as
// faixas; a passagem tem de ser imperceptível, nada brotando do nada".
//
// O NOVO ENTRA AO LADO: sem o parâmetro a casa monta a lajota volumétrica
// de sempre (`lajotaDoAnel.ts`, visual aprovado) e o `ANEL_FRAG` sai byte a
// byte o de antes. Com ele, esta peça toma o lugar da lajota.
//
// O DESENHO, em quatro leis:
//
//  1. UMA POPULAÇÃO SÓ, POR OITAVAS. Os tamanhos seguem dN/ds ∝ s⁻³ (a lei
//     dos anéis de verdade: cada oitava de tamanho cobre a MESMA área), de
//     `S_MAX_KM` até `S_MAX_KM / 2^(OITAVAS−1)`. Cada oitava é um ladrilho
//     periódico de `PEDRAS_POR_TIER` pedras, de lado 2·K·s, centrado na
//     câmera: na borda (distância K·s) a pedra mede 1/K rad — poucos pixels
//     — e entra com TAMANHO ZERO, crescendo até o tamanho cheio a 0,55·K·s.
//     Descer acende oitavas cada vez mais finas a partir do sub-pixel; uma
//     pedra que apareceu não some de perto: ela cresce e sai do quadro.
//
//  2. O LADRILHO É POLAR E MORA EM VOLTA DA CÂMERA. As coordenadas são o
//     raio ρ e o arco s = R0·θ (R0 fixo, `R0_KM`), e o período em arco
//     divide a volta inteira (sem costura em θ = ±π). Tudo o que a GPU
//     soma é RELATIVO à câmera — a fração dela no ladrilho sai da CPU em
//     dupla precisão —, então a pedra de 2 m a 30 m da lente não treme: o
//     float32 só vê números pequenos. É o truque do ladrilho ancorado da
//     lajota, levado para perto.
//
//  3. O CISALHAMENTO DE KEPLER, MEDIDO NO RAIO DA CÂMERA. Cada pedra anda
//     no arco com Ω(ρ) − Ω(ρ_câmera): as de dentro ultrapassam, as de fora
//     ficam para trás. As integrais do cisalhamento (G, E) andam com o
//     relógio do app, na CPU, quadro a quadro — relógio parado, pedra
//     parada; mexer a câmera não mexe pedra nenhuma. Com o relógio
//     acelerado, o passo do quadro tem um TETO contínuo (`tanh`) para que
//     nenhuma pedra ande mais que ~1/5 do próprio tamanho por quadro.
//
//  4. A LUZ SE CONSERVA. O disco cede, em cada ponto, a fração da
//     profundidade óptica que as oitavas já resolvidas ali carregam
//     (`cessaoDoDisco`): de longe ele é o de hoje; dentro da lâmina, perto
//     da câmera, sobram só as pedras e o que se vê através delas.
//
// O QUE É EXAGERO está no cadastro de escala (`src/three/escala.ts`, id
// `pedras-do-anel-de-saturno`): as oitavas acima de ~10 m (até 6,4 km), a
// espessura que acompanha essas oitavas e o giro próprio.
//
// O FRAME é o do anel (o mesmo da lajota): plano XY, +Z o polo, unidade =
// raio equatorial; a matriz vem copiada do mesh do anel.
// ============================================================
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import type { QualityLevel } from '../../core/engine';

/** O interruptor: só `?pedras=3d` liga a peça nova. */
export const PEDRAS_3D: boolean =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('pedras') === '3d';

const KM_POR_RAIO = BODY_AXES.saturn[0]!;

/** GM de Saturno, km³/s² (JPL) — só para Ω(ρ) do cisalhamento. */
const GM_SATURNO = 37_931_207;

/**
 * O RAIO DE REFERÊNCIA DO ARCO: s = R0·θ. Fica logo além da borda do A
 * (136 775 km), então o ladrilho só ENCOLHE no arco por ρ/R0 ≤ 1, e o
 * aceite da densidade devolve a diferença (ver `aceitaPedra`).
 */
export const R0_KM = 138_600;

/** quantas oitavas de tamanho — de 3,2 km até 1,56 m */
export const OITAVAS = 12;
/** o DIÂMETRO mínimo da oitava 0; cada oitava sorteia de s a 2s */
export const S_MAX_KM = 3.2;
/**
 * AS OITAVAS DE VERDADE: as três últimas (1,56 a 12,5 m), o tamanho das
 * maiores partículas medidas no anel. As de cima são AGLOMERADOS (a
 * "multidão" que a lajota já confessava): de longe uma pedra, de perto
 * ela se DESFAZ nas partes — ver `presencaDaOitava`.
 */
export const PRIMEIRA_OITAVA_REAL = 9;
/**
 * A JANELA, em oitavas de distância (x = log2(d/s)): a pedra entra em
 * x = 7 (d = 128·s, onde ela mede 1/128 rad, ~6 px na lente de 58° em
 * 800 px) com tamanho ZERO e termina de crescer em x = 6; o aglomerado
 * começa a se desfazer em x = 4 (~50 px) e some em x = 3 (~100 px). Os
 * quatro números são inteiros DE PROPÓSITO: com rampas de uma oitava e
 * janela de quatro, em toda distância há exatamente TRÊS oitavas inteiras
 * presentes (as rampas vizinhas se completam) — é o que deixa a conta da
 * luz fechar sem ondular.
 */
export const X_ENTRA = 7;
export const X_DESFAZ = 3;
export const PRESENTES = X_ENTRA - X_DESFAZ - 1;
/** a janela em tamanhos: 2^7 */
export const K_JANELA = 2 ** X_ENTRA;
/**
 * A MEIA-ESPESSURA da lâmina de cada oitava: 2,5 tamanhos, com piso de
 * 15 m — a lâmina das oitavas pequenas é a do anel de verdade (dezenas
 * de metros); a das grandes acompanha o exagero delas.
 */
const ESPESSURA_EM_TAMANHOS = 2.5;
const ESPESSURA_MINIMA_KM = 0.015;

/**
 * QUANTAS PEDRAS POR OITAVA, por tier. O tier de baixo é um PREFIXO do de
 * cima (a pedra (oitava, i) tem o mesmo sorteio em qualquer tier): menos
 * pedras é um campo mais ralo, não outro campo — a doutrina da lajota.
 */
export const PEDRAS_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 16384,
  alta: 8192,
  performance: 3072,
};

/**
 * A PROFUNDIDADE ÓPTICA QUE O CAMPO CHEIO CARREGA (tier cinema, em R0): as
 * três oitavas presentes × n·σ̄, com n = M/(2K·s)² por ladrilho e σ̄ a
 * seção média de uma pedra — (π/4)s² × E[x²] da lei s⁻³ em [1, 2)
 * (ln2/(3/8)) × 0,58 da forma achatada × 0,92 da rugosidade. Onde o perfil
 * pede mais que isto (o miolo do B), o campo satura: é o TETO declarado.
 */
export const TAU_TETO =
  (PRESENTES * PEDRAS_POR_TIER.cinema * (Math.PI / 4) * (Math.LN2 / 0.375) * 0.58 * 0.92) /
  (4 * K_JANELA * K_JANELA);

export interface Oitava {
  /** diâmetro mínimo, km */
  s: number;
  /** raio da janela, km (= K·s) */
  janela: number;
  /** lado radial do ladrilho, km (= 2·janela) */
  ladoRadial: number;
  /** lado do ladrilho no arco, km — divide 2π·R0 exato */
  ladoNoArco: number;
  /** quantos ladrilhos fecham a volta */
  voltas: number;
  /** meia-espessura da lâmina, km */
  meiaEspessura: number;
}

export const TABELA_DE_OITAVAS: readonly Oitava[] = Array.from({ length: OITAVAS }, (_, o) => {
  const s = S_MAX_KM / 2 ** o;
  const janela = K_JANELA * s;
  const ladoRadial = 2 * janela;
  const voltas = Math.round((2 * Math.PI * R0_KM) / ladoRadial);
  return {
    s,
    janela,
    ladoRadial,
    ladoNoArco: (2 * Math.PI * R0_KM) / voltas,
    voltas,
    meiaEspessura: Math.max(ESPESSURA_MINIMA_KM, ESPESSURA_EM_TAMANHOS * s),
  };
});

const grampo = (x: number) => Math.min(1, Math.max(0, x));

/**
 * A PRESENÇA da oitava `o` a `dKm` da câmera (na régua do ladrilho), em
 * área: entra (0 → 1) de x = 7 a x = 6, e — só nos aglomerados — se
 * desfaz (1 → 0) de x = 4 a x = 3. A pedra cresce com √ disto (a área é
 * que conta a luz) e o aglomerado se esburaca na mesma fração. É a mesma
 * conta do vértice.
 */
export function presencaDaOitava(o: number, dKm: number): number {
  const x = Math.log2(Math.max(dKm, 1e-12) / TABELA_DE_OITAVAS[o]!.s);
  const entra = grampo(X_ENTRA - x);
  const fica = o >= PRIMEIRA_OITAVA_REAL ? 1 : grampo(x - X_DESFAZ);
  return entra * fica;
}

/**
 * QUANTO DO DISCO AS PEDRAS JÁ CARREGAM a `dKm` da câmera: cada oitava
 * presente carrega um terço da profundidade óptica (a lei s⁻³ dá a mesma
 * parte a cada oitava). 0 longe, 1 onde as três estão inteiras.
 */
export function cessaoDoDisco(dKm: number): number {
  let f = 0;
  for (let o = 0; o < OITAVAS; o++) f += presencaDaOitava(o, dKm);
  return Math.min(f / PRESENTES, 1);
}

/**
 * O ALFA DO DISCO DEPOIS DA CESSÃO — conserva a TRANSMISSÃO: o disco fica
 * com τ·(1 − F), e é o resto que as pedras carregam. F = 0 devolve o alfa
 * de hoje, exato.
 */
export function alfaCedido(alfa: number, f: number): number {
  if (f <= 0) return alfa;
  return 1 - Math.max(1 - alfa, 1e-4) ** (1 - Math.min(f, 1));
}

/**
 * O ACEITE DA DENSIDADE: a pedra fica se o sorteio cair abaixo de
 * τ·ρ/(R0·TAU_TETO). O ρ/R0 devolve o encolhimento do ladrilho no arco;
 * τ = 0 (divisão vazia, fora do anel) não aceita pedra nenhuma.
 */
export function aceitaPedra(tau: number, rhoKm: number, sorteio: number): boolean {
  return sorteio * TAU_TETO * R0_KM < tau * rhoKm;
}

/** Ω kepleriano a `rhoKm` do centro, rad/s */
function omega(rhoKm: number): number {
  return Math.sqrt(GM_SATURNO / (rhoKm * rhoKm * rhoKm));
}

/**
 * O TETO DO PASSO DO RELÓGIO (s de app por quadro): a pedra na borda da
 * janela anda no arco 1,5·Ω·R0/ρ · K·s por segundo; um quinto do tamanho
 * por quadro é o limite. É o mesmo número em toda oitava (a janela anda
 * com o tamanho).
 */
export function tetoDoPasso(rhoKm: number): number {
  return 0.2 / (1.5 * omega(rhoKm) * (R0_KM / rhoKm) * K_JANELA);
}

/** o período do giro próprio (s de app) — escolha de cinema, declarada */
const PERIODO_DO_GIRO_S = 6 * 3600;

const glslF = (x: number) => x.toExponential(9);

const VERT_DAS_PEDRAS = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform vec2 uEixo;
uniform float uRhoCamKm;
uniform float uZCamKm;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uNearKm;
uniform int uPorOitava;
uniform float uFr[${OITAVAS}];
uniform float uFs[${OITAVAS}];
uniform float uGi[${OITAVAS}];
uniform float uGf[${OITAVAS}];
uniform float uGiro;

varying vec3 vVista;
varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vCorSol;
varying vec3 vCorGlobo;
varying vec3 vLocal;
varying float vFica;

const float PI = 3.14159265358979;
const float R0 = ${glslF(R0_KM)};
const float K_JANELA = ${glslF(K_JANELA)};
const float S_MAX = ${glslF(S_MAX_KM)};
const float X_ENTRA = ${glslF(X_ENTRA)};
const float X_DESFAZ = ${glslF(X_DESFAZ)};
const int PRIMEIRA_REAL = ${PRIMEIRA_OITAVA_REAL};
const float TAU_TETO = ${glslF(TAU_TETO)};
const float ESP_TAM = ${glslF(ESPESSURA_EM_TAMANHOS)};
const float ESP_MIN = ${glslF(ESPESSURA_MINIMA_KM)};
const float LADO_NO_ARCO[${OITAVAS}] = float[${OITAVAS}](${TABELA_DE_OITAVAS.map((o) => glslF(o.ladoNoArco)).join(', ')});
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA

// o sorteio é INTEIRO (exato em qualquer GPU): a mesma pedra em todo
// fornecedor e em todo tier
uint misturar(uint x) {
  x ^= x >> 16; x *= 0x7feb352du;
  x ^= x >> 15; x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}
float sorteio(uint base, uint k) {
  return float(misturar(base ^ misturar(k * 0x9e3779b9u + 0x632be5abu)) >> 8) / 16777216.0;
}
vec3 girarQ(vec4 q, vec3 v) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void fora() {
  vVista = vec3(0.0); vSol = vec3(0.0); vGlobo = vec3(0.0);
  vCorSol = vec3(0.0); vCorGlobo = vec3(0.0);
  vLocal = vec3(0.0); vFica = 0.0;
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}

void main() {
  // as duas malhas (aglomerados e pedras de verdade) desenham faixas de
  // oitavas diferentes — OITAVA_BASE vem do material
  int k = gl_InstanceID / uPorOitava;
  int i = gl_InstanceID - k * uPorOitava;
  int o = OITAVA_BASE + k;
  uint base = misturar(uint(i) ^ (uint(o) << 24));
  float s = S_MAX * exp2(-float(o));
  float W = K_JANELA * s;
  float lado = 2.0 * W;
  float ladoArco = LADO_NO_ARCO[o];
  float meia = max(ESP_MIN, ESP_TAM * s);

  // O RAIO: a imagem da pedra mais perto da câmera. O sorteio radial é
  // quantizado em 1/65 536 do ladrilho para o cisalhamento fechar em
  // inteiros (ver o arco).
  uint q = misturar(base ^ 0x51ed27u) & 0xffffu;
  float a = float(q) / 65536.0;
  float f = uFr[o];
  float dk = floor(f - a + 0.5);
  float dRho = (dk + a - f) * lado;

  // O ARCO, com o cisalhamento: g·(dk + a) mod 1, com g = gi + gf e a
  // parte inteira de g já reduzida a 65 536 — gi·q em uint é exato.
  float cis = float((uint(uGi[o]) * q) & 0xffffu) / 65536.0 + uGf[o] * (dk + a);
  float dSig = sorteio(base, 2u) + cis + uFs[o];
  dSig -= floor(dSig + 0.5);
  float dS = dSig * ladoArco;

  // a lâmina: triangular, mais densa no plano
  float z = (sorteio(base, 3u) + sorteio(base, 4u) - 1.0) * meia;
  float dz = z - uZCamKm;

  // A PRESENÇA (\`presencaDaOitava\`), na régua do ladrilho (≥ a distância
  // de verdade): zero onde a pedra troca de imagem, e é por isso que
  // nada estala. Entra crescendo do zero; o aglomerado, perto, se desfaz.
  float dT = sqrt(dRho * dRho + dS * dS + dz * dz);
  float xo = log2(max(dT, 1.0e-12) / s);
  float entra = clamp(X_ENTRA - xo, 0.0, 1.0);
  float fica = o >= PRIMEIRA_REAL ? 1.0 : clamp(xo - X_DESFAZ, 0.0, 1.0);
  if (entra * fica <= 0.0) { fora(); return; }
  float cresce = sqrt(entra);

  // A DENSIDADE do perfil medido (o mesmo do disco)
  float rhoKm = uRhoCamKm + dRho;
  float u = ((rhoKm / KM_POR_RAIO - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0) ? vec4(0.0) : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);
  vec3 regiao = regiaoDoAnel(rhoKm);
  float tau = perfil.a < 0.004 ? 0.0 : tauDaOpacidade(perfil.a) * regiao.z;
  if (sorteio(base, 5u) * TAU_TETO * R0 >= tau * rhoKm) { fora(); return; }

  // o lugar, RELATIVO À CÂMERA, sem nenhuma soma de número grande
  // em SÉRIE, não em sin/cos: |θ| < 3e-3 rad, e o sin da GPU (Metal, via
  // ANGLE) devolvia ZERO para ângulo negativo minúsculo — metade do campo
  // empilhava numa parede na linha da câmera (medido na prancha v2)
  float dTh = dS / R0;
  float th2 = dTh * dTh;
  float senTh = dTh * (1.0 - th2 / 6.0);
  float umMenosCos = 0.5 * th2 * (1.0 - th2 / 12.0);
  float x = dRho * (1.0 - umMenosCos) - uRhoCamKm * umMenosCos;
  float y = rhoKm * senTh;
  vec3 er = vec3(uEixo, 0.0);
  vec3 et = vec3(-uEixo.y, uEixo.x, 0.0);
  vec3 off = er * x + et * y + vec3(0.0, 0.0, dz);
  float dist = length(off);

  // o tamanho: s⁻³ dentro da oitava (inversa da acumulada em [1, 2))
  float raioCheio = 0.5 * s / sqrt(1.0 - 0.75 * sorteio(base, 6u));
  // colada na lente a pedra seria cortada pelo NEAR: ela encolhe antes
  float perto = smoothstep(uNearKm, 3.0 * uNearKm, dist - raioCheio);
  float raio = raioCheio * cresce * perto;
  if (raio <= 0.0) { fora(); return; }

  // A FORMA: o icosaedro subdividido com cada vértice puxado ou empurrado
  // (rugosidade por pedra), achatado em três eixos e girado ao acaso
  float rugo = 0.72 + 0.46 * sorteio(misturar(base ^ (uint(gl_VertexID) * 0x27d4eb2du)), 7u);
  vec3 eixos = vec3(1.0, 0.55 + 0.4 * sorteio(base, 8u), 0.35 + 0.4 * sorteio(base, 9u));
  vec3 local = position * rugo * eixos;
  vLocal = local * 2.5 + vec3(sorteio(base, 17u), sorteio(base, 18u), sorteio(base, 19u)) * 37.0;
  vFica = fica;
  float u1 = sorteio(base, 10u);
  float t1 = 2.0 * PI * sorteio(base, 11u);
  float t2 = 2.0 * PI * sorteio(base, 12u);
  vec4 qr = vec4(
    sqrt(1.0 - u1) * sin(t1), sqrt(1.0 - u1) * cos(t1),
    sqrt(u1) * sin(t2), sqrt(u1) * cos(t2)
  );
  local = girarQ(qr, local);
  // o GIRO PRÓPRIO: um eixo por pedra, 1 a 3 voltas por período
  float ze = 2.0 * sorteio(base, 13u) - 1.0;
  float pe = 2.0 * PI * sorteio(base, 14u);
  vec3 eixoGiro = vec3(sqrt(max(1.0 - ze * ze, 0.0)) * vec2(cos(pe), sin(pe)), ze);
  float voltas = floor(sorteio(base, 15u) * 6.0) - 2.5;
  float ang = 2.0 * PI * fract(uGiro * sign(voltas) * (abs(voltas) + 0.5) + sorteio(base, 16u));
  local = local * cos(ang) + cross(eixoGiro, local) * sin(ang)
    + eixoGiro * dot(eixoGiro, local) * (1.0 - cos(ang));
  vec3 pKm = off + local * raio;

  // PARA A TELA: só a parte LINEAR da matriz — a câmera é a origem da
  // vista, e o deslocamento já é relativo a ela. A vista sai em km para o
  // fragmento tirar a normal da faceta sem cair em número desnormal.
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mat3 R = mat3(modelViewMatrix) / raioMundo;
  vVista = R * pKm;
  gl_Position = projectionMatrix * vec4(vVista * (raioMundo / KM_POR_RAIO), 1.0);

  // A LUZ: Sol com a sombra do globo, e o brilho do globo (planetshine) —
  // a irradiância é a mesma conta de \`planetshineNoAnel\`, numa faceta
  vec3 pAbs = uCamLocal + off / KM_POR_RAIO;
  vSol = normalize(R * uDirSolLocal);
  vGlobo = normalize(R * -pAbs);
  vec3 razao = perfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;
  tinta *= regiao.x;
  // 1,5 = 1 / (2/3): o disco de uma esfera de Lambert em oposição tem
  // média 2/3 do brilho de face — assim o campo em retro bate com o I/F
  // âncora do disco que ele substitui
  vec3 base3 = tinta * IF_RETRO * 1.5 * uLuzGanho;
  vCorSol = base3 * sombraDoPlaneta(pAbs);
  float rr = max(length(pAbs.xy), 1.001);
  vec3 pHat = vec3(pAbs.xy, 0.0) / rr;
  float alfaFase = acos(clamp(dot(uDirSolLocal, pHat), -1.0, 1.0));
  float fi = (sin(alfaFase) + (PI - alfaFase) * cos(alfaFase)) / PI;
  vCorGlobo = base3 * (ALBEDO_GEO * fi / (rr * rr));
}
`;

const FRAG_DAS_PEDRAS = /* glsl */ `
precision highp float;
varying vec3 vVista;
varying vec3 vSol;
varying vec3 vGlobo;
varying vec3 vCorSol;
varying vec3 vCorGlobo;
varying vec3 vLocal;
varying float vFica;
CAMADA_DO_ANEL
RUIDO
void main() {
  // o AGLOMERADO se desfaz em grãos: a fração que fica é a presença dele
  if (vFica < 1.0 && ruido(vLocal) >= vFica) discard;
  // a NORMAL DA FACETA, pela derivada da posição (o flatShading da three)
  vec3 vv = -vVista;
  vec3 c = cross(dFdx(vv), dFdy(vv));
  vec3 n = c / max(length(c), 1.0e-30);
  vec3 v = vv / max(length(vv), 1.0e-30);
  float nl = max(dot(n, vSol), 0.0);
  // um pouco de retroespalhamento: a fase do próprio anel (1 em retro)
  float fase = hgDoAnel(clamp(-dot(vSol, v), -1.0, 1.0));
  vec3 cor = vCorSol * nl * fase + vCorGlobo * max(dot(n, vGlobo), 0.0);
  gl_FragColor = vec4(cor, 1.0);
}
`;

/**
 * A CESSÃO DO DISCO EM GLSL — entra no `ANEL_FRAG` só com `?pedras=3d`.
 * `uCamDasPedras` = (ρ da câmera em km, θ dela, altura em km, a fração do
 * campo que o tier desenha — 0 com as pedras fora do desenho). A distância
 * é a da régua do ladrilho, como no vértice das pedras. O disco cede só o
 * que as pedras de fato carregam: onde o perfil pede mais que o teto do
 * campo (o miolo do B) ou o tier desenha menos pedras, o resto fica nele —
 * a transmissão da soma é a de hoje em toda altura.
 */
export const GLSL_CESSAO_DAS_PEDRAS = /* glsl */ `
uniform vec4 uCamDasPedras;
float cederAsPedras(float alfa, vec3 p, float tau) {
  if (uCamDasPedras.w <= 0.0) return alfa;
  float rKm = length(p.xy) * KM_POR_RAIO;
  float dRho = rKm - uCamDasPedras.x;
  // o ângulo envolvido sem sin/cos (ver o vértice das pedras)
  float dTh = atan(p.y, p.x) - uCamDasPedras.y;
  dTh -= 6.28318530718 * floor((dTh + 3.14159265359) / 6.28318530718);
  float dS = dTh * ${glslF(R0_KM)};
  float d = sqrt(dRho * dRho + dS * dS + uCamDasPedras.z * uCamDasPedras.z);
  float f = 0.0;
  for (int o = 0; o < ${OITAVAS}; o++) {
    float x = log2(max(d, 1.0e-12) / (${glslF(S_MAX_KM)} * exp2(-float(o))));
    float fica = o >= ${PRIMEIRA_OITAVA_REAL} ? 1.0 : clamp(x - ${glslF(X_DESFAZ)}, 0.0, 1.0);
    f += clamp(${glslF(X_ENTRA)} - x, 0.0, 1.0) * fica;
  }
  f = min(f / ${glslF(PRESENTES)}, 1.0)
    * min(1.0, ${glslF(TAU_TETO * R0_KM)} / (max(rKm, 1.0) * max(tau, 1.0e-4)))
    * uCamDasPedras.w;
  if (f <= 0.0) return alfa;
  return 1.0 - pow(max(1.0 - alfa, 1.0e-4), 1.0 - f);
}
`;

/** O que o corpo entrega por quadro — o quadro da lajota, mais o relógio. */
export interface QuadroDasPedras {
  dirSolLocal: THREE.Vector3;
  /** a câmera no frame do anel, em raios equatoriais */
  camLocal: THREE.Vector3;
  luzGanho: number;
  solAngRad: number;
  kPolar: number;
  /** o NEAR do quadro em raios equatoriais */
  nearRaios: number;
  tier: QualityLevel;
  /** o relógio do app (dia juliano) — o cisalhamento anda com ele */
  jd: number;
}

export interface OpcoesDasPedras {
  glslSombraDoPlaneta: string;
  /** `GLSL_CONSTANTES_DO_ANEL` */
  glslConstantesDoAnel: string;
  /** `GLSL_REGIAO_DO_ANEL` (traz `KM_POR_RAIO` e `regiaoDoAnel`) */
  glslRegiaoDoAnel: string;
  /** `GLSL_CAMADA_DO_ANEL` (`tauDaOpacidade`, `hgDoAnel`) */
  glslCamadaDoAnel: string;
  /** `GLSL_RUIDO_DE_VALOR` — o ruído que esburaca o aglomerado */
  glslRuido: string;
  rInt: number;
  rExt: number;
}

/** a faixa de raio em que as pedras podem existir (a da lajota, com folga da janela maior) */
const RAIO_MIN_KM = 55_000;
const RAIO_MAX_KM = 160_000;

/**
 * UMA MALHA INSTANCIADA por faixa de oitavas: o molde dela, quantas
 * oitavas tem e a primeira. Os aglomerados nunca passam de ~100 px (eles
 * se desfazem antes), e o icosaedro cru (12 vértices) basta; as pedras de
 * verdade chegam a encher a tela e ganham o subdividido (42).
 */
class Faixa {
  readonly geometria = new THREE.InstancedBufferGeometry();
  readonly malha: THREE.Mesh;
  private readonly molde: THREE.BufferGeometry;
  readonly primeira: number;
  readonly quantas: number;

  constructor(primeira: number, quantas: number, detalhe: number, material: THREE.ShaderMaterial) {
    this.primeira = primeira;
    this.quantas = quantas;
    // os vértices SOLDADOS, para a rugosidade por vértice não rachar a pedra
    const ico = new THREE.IcosahedronGeometry(1, detalhe);
    ico.deleteAttribute('normal');
    ico.deleteAttribute('uv');
    this.molde = mergeVertices(ico);
    ico.dispose();
    this.geometria.index = this.molde.index;
    this.geometria.setAttribute('position', this.molde.getAttribute('position'));
    this.geometria.instanceCount = 0;
    this.malha = new THREE.Mesh(this.geometria, material);
    // o ladrilho segue a câmera: nenhuma esfera envolvente o descreve
    this.malha.frustumCulled = false;
  }

  dispose() {
    this.molde.dispose();
    this.geometria.dispose();
    (this.malha.material as THREE.ShaderMaterial).dispose();
  }
}

export class PedrasDoAnel {
  /** o grupo das duas faixas — a matriz do anel mora nele */
  readonly malha = new THREE.Group();

  private readonly faixas: readonly Faixa[];
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** as integrais do cisalhamento e do giro, em dupla precisão */
  private g = 0;
  private e = 0;
  private giro = 0;
  private jdAntes = Number.NaN;
  private readonly fr = new Float32Array(OITAVAS);
  private readonly fs = new Float32Array(OITAVAS);
  private readonly gi = new Float32Array(OITAVAS);
  private readonly gf = new Float32Array(OITAVAS);
  /** (ρ km, θ, altura km, fração do campo que o tier desenha) — o que o disco lê para ceder */
  readonly cessao = new THREE.Vector4(0, 0, 0, 0);

  constructor(opcoes: OpcoesDasPedras) {
    const vert = VERT_DAS_PEDRAS.replace(
      'CONSTANTES_DO_ANEL',
      `${opcoes.glslConstantesDoAnel}
${opcoes.glslRegiaoDoAnel}
${opcoes.glslCamadaDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`
    ).replace('SOMBRA_DO_PLANETA', opcoes.glslSombraDoPlaneta);
    const frag = FRAG_DAS_PEDRAS.replace('CAMADA_DO_ANEL', opcoes.glslCamadaDoAnel).replace(
      'RUIDO',
      opcoes.glslRuido
    );

    // UM objeto de uniformes, dividido pelas duas faixas
    this.uniforms = {
      uMapaAnel: { value: null },
      uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
      uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
      uEixo: { value: new THREE.Vector2(1, 0) },
      uRhoCamKm: { value: 0 },
      uZCamKm: { value: 0 },
      uLuzGanho: { value: 1 },
      uKPolar: { value: 1 },
      uSolAngRad: { value: 0 },
      uNearKm: { value: 0 },
      uPorOitava: { value: PEDRAS_POR_TIER.cinema },
      uFr: { value: this.fr },
      uFs: { value: this.fs },
      uGi: { value: this.gi },
      uGf: { value: this.gf },
      uGiro: { value: 0 },
    };
    const material = (base: number) =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        defines: { OITAVA_BASE: base },
        uniforms: this.uniforms,
        transparent: false,
        depthWrite: true,
        depthTest: true,
      });
    this.faixas = [
      new Faixa(0, PRIMEIRA_OITAVA_REAL, 0, material(0)),
      new Faixa(
        PRIMEIRA_OITAVA_REAL,
        OITAVAS - PRIMEIRA_OITAVA_REAL,
        1,
        material(PRIMEIRA_OITAVA_REAL)
      ),
    ];
    for (const f of this.faixas) this.malha.add(f.malha);
    this.malha.matrixAutoUpdate = false;
    this.malha.visible = false;
  }

  ligarPerfil(textura: THREE.DataTexture) {
    this.uniforms.uMapaAnel!.value = textura;
  }

  fixarNoAnel(matriz: THREE.Matrix4) {
    this.malha.matrix.copy(matriz);
  }

  /** quantas oitavas a câmera alcança: as maiores primeiro, um prefixo */
  static oitavasAtivas(alturaKm: number): number {
    let n = 0;
    for (const o of TABELA_DE_OITAVAS) {
      if (o.janela > Math.abs(alturaKm) - o.meiaEspessura) n++;
      else break;
    }
    return n;
  }

  atualizar(q: QuadroDasPedras) {
    const c = q.camLocal;
    const rhoKm = Math.hypot(c.x, c.y) * KM_POR_RAIO;
    const zKm = c.z * KM_POR_RAIO;
    const ativas =
      rhoKm > RAIO_MIN_KM && rhoKm < RAIO_MAX_KM ? PedrasDoAnel.oitavasAtivas(zKm) : 0;
    this.malha.visible = ativas > 0;
    this.cessao.w = ativas > 0 ? 1 : 0;

    // O RELÓGIO: o passo do quadro, com teto contínuo. Fora do desenho o
    // relógio é só lembrado — ninguém vê a pedra andar.
    const dtBruto = Number.isFinite(q.jd) && Number.isFinite(this.jdAntes)
      ? (q.jd - this.jdAntes) * 86400
      : 0;
    this.jdAntes = q.jd;
    if (!this.malha.visible) return;

    const teto = tetoDoPasso(rhoKm);
    const dt = teto * Math.tanh(dtBruto / teto);
    const om = omega(rhoKm);
    // R0·Ω'(ρc) = −1,5·Ω·R0/ρc
    const taxa = -1.5 * om * (R0_KM / rhoKm);
    this.g += taxa * dt;
    this.e += taxa * rhoKm * dt;
    this.giro = (this.giro + dt / PERIODO_DO_GIRO_S) % 1;

    let theta = Math.atan2(c.y, c.x);
    if (theta < 0) theta += 2 * Math.PI;
    for (let o = 0; o < OITAVAS; o++) {
      const t = TABELA_DE_OITAVAS[o]!;
      const kc = Math.floor(rhoKm / t.ladoRadial);
      this.fr[o] = rhoKm / t.ladoRadial - kc;
      const g = this.g * (t.ladoRadial / t.ladoNoArco);
      const sigma = (theta / (2 * Math.PI)) * t.voltas;
      const fase = g * kc - this.e / t.ladoNoArco - sigma;
      this.fs[o] = fase - Math.floor(fase);
      const gInt = Math.floor(g);
      this.gi[o] = ((gInt % 65536) + 65536) % 65536;
      this.gf[o] = g - gInt;
    }

    const porOitava = PEDRAS_POR_TIER[q.tier];
    for (const f of this.faixas) {
      const n = Math.min(Math.max(ativas - f.primeira, 0), f.quantas);
      f.geometria.instanceCount = n * porOitava;
      f.malha.visible = n > 0;
    }
    const u = this.uniforms;
    (u.uDirSolLocal!.value as THREE.Vector3).copy(q.dirSolLocal);
    (u.uCamLocal!.value as THREE.Vector3).copy(c);
    (u.uEixo!.value as THREE.Vector2).set(Math.cos(theta), Math.sin(theta));
    u.uRhoCamKm!.value = rhoKm;
    u.uZCamKm!.value = zKm;
    u.uLuzGanho!.value = q.luzGanho;
    u.uKPolar!.value = q.kPolar;
    u.uSolAngRad!.value = q.solAngRad;
    u.uNearKm!.value = q.nearRaios * KM_POR_RAIO;
    u.uPorOitava!.value = porOitava;
    u.uGiro!.value = this.giro;
    this.cessao.set(rhoKm, theta, zKm, porOitava / PEDRAS_POR_TIER.cinema);
  }

  dispose() {
    for (const f of this.faixas) f.dispose();
  }
}
