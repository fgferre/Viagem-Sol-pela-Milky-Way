// ============================================================
// A COMA E AS CAUDAS DOS COMETAS — partículas, nenhuma imagem (pilar 4,
// 12/11/2026). Cada grão, íon e molécula é posto no lugar NO SHADER, a
// partir de três números sorteados (idade, β, direção) e do estado do
// núcleo: não há simulação guardada, e a cauda segue a máquina do tempo
// para a frente e para trás sem memória.
//
// A POEIRA (Finson & Probstein 1968, ApJ 154, 327): um grão solto do
// núcleo há τ dias, com a razão β entre a pressão de radiação e a
// gravidade do Sol, segue Kepler com μ(1 − β) a partir do estado do
// núcleo NAQUELE instante (mais a velocidade de ejeção). β e τ fixam
// onde ele está agora: β constante desenha uma sindina, τ constante uma
// síncrona, e a cauda sai larga, curva e atrasada em relação à órbita.
// O estado de soltura chega por 40 amostras de τ (CPU, dupla precisão)
// interpoladas por Hermite; Kepler em variáveis universais, no shader,
// resolvido pelo método de Laguerre (Conway 1986), que não diverge.
//   β: de 0,003 a 0,6, sorteado em log; a luz por amostra é β^0,5
//   (distribuição de tamanhos n(s) ∝ s^−3,5 e seção ∝ s², com β ∝ 1/s —
//   Burns, Lamy & Soter 1979, Icarus 40, 1; o expoente de memória).
//   Ejeção: 1 km/s · β^0,5 · r^−0,5, puxada para o lado do Sol (o lado
//   que sublima) — de memória, ordem de grandeza dos modelos de Halley.
//   Espalhamento: Henyey–Greenstein com g = 0,4 (a poeira acende em
//   contraluz), normalizado em 90°.
//
// OS ÍONS (CO⁺, azul): nascem no núcleo e o vento solar os arrasta para
// a direção oposta ao Sol CORRIGIDA pela aberração — o vento (400 km/s,
// radial) visto do cometa em movimento: u = v_vento·r̂ − v_cometa. A
// aceleração é ~60× a gravidade solar até a velocidade do vento (as
// medidas de nós em caudas de íons dão 10–100×; de memória), e a
// direção balança alguns graus com a data de soltura — as dobras que
// descem a cauda quando o tempo corre. Raios finos saem do sorteio.
//
// A COMA (C₂, verde): moléculas a 0,85 km/s · r^−0,5 (Delsemme), com
// a densidade de Haser — pai 2,2·10⁴ km, filho 6,6·10⁴ km a 1 UA,
// escalando com r² (A'Hearn et al. 1995; de memória).
//
// A LUZ: a produção em `producaoRelativa` (lib/cometas) no instante de
// soltura de cada partícula, vezes o 1/r² da luz do Sol no lugar dela
// AGORA, vezes a escala do M1 do cometa. O GANHO absoluto (`GANHO`) é
// artístico, um número só para os oito — declarado no cadastro de escala
// e no censo da luz.
//
// O TAMANHO: cada partícula é um borrão de instrumento que representa
// uma multidão — o raio cresce com a distância ao núcleo (o espaço entre
// vizinhas) e a luz se divide pela área, então o brilho de superfície
// não depende da câmera; abaixo de 3 px o fluxo se conserva. Teto de
// 48 px, a lei da casa (POINTS acima de 64 trava o Mac).
// ============================================================
import * as THREE from 'three';
import type { QualityLevel } from '../core/engine';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import {
  COMETAS,
  LIMIAR_DE_ATIVIDADE,
  brilhoRelativo,
  escalaDoBrilho,
  estadoDoCometa,
  type Cometa,
} from '../../lib/cometas';
import { naCena } from './sondas';

/** quantas partículas por tier (5/8 poeira, 2/8 íons, 1/8 gás) */
export const PARTICULAS_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 65536,
  alta: 32768,
  performance: 12288,
};
const MAXIMO = PARTICULAS_POR_TIER.cinema;

/** amostras do estado de soltura — o shader interpola entre elas */
const AMOSTRAS = 40;
/** a idade máxima dos grãos de poeira desenhados (dias) */
const TAU_DA_POEIRA = 60;
/** a idade máxima dos íons (dias) e o tempo em que a luz deles cai a 1/e */
const TAU_DOS_IONS = 8;
const DESBOTA_DOS_IONS = 3;
const BETA_MIN = 0.003;
const BETA_MAX = 0.6;
/** μ do Sol, UA³/dia² */
const MU = 0.01720209895 ** 2;
const KM_S_EM_UA_DIA = 86_400 / AU_KM;
const VENTO_SOLAR = 400 * KM_S_EM_UA_DIA;
/** a aceleração dos íons a 1 UA, em múltiplos da gravidade do Sol */
const ACELERACAO_DOS_IONS = 60;
/** o ganho absoluto — ARTÍSTICO, ver o cabeçalho */
const GANHO = 0.004;
/** o núcleo: albedo medido de Halley e Hale–Bopp (0,04, JPL SBDB) e a
 *  exposição de visita — artística, para o corpo escuro se ler */
const ALBEDO_DO_NUCLEO = 0.04;
const EXPOSICAO_DO_NUCLEO = 6;

const VERT = /* glsl */ `
#define K ${AMOSTRAS}
attribute vec2 aMais;
attribute float aTipo;

uniform vec3 uPos;
uniform vec3 uLibP[K];
uniform vec3 uLibV[K];
uniform float uTauMax;
uniform float uMu;
uniform float uK1;
uniform vec3 uDirIon;
uniform float uTauIon;
uniform float uAcIon;
uniform float uVsw;
uniform vec3 uCam;
uniform float uFoco;
uniform float uAuPc;
uniform float uDose;
uniform float uFase;

varying vec3 vCor;
varying float vI;

const float CORTE1 = ${Math.pow(1 + Math.pow(1 / 2.808, 5.093), -4.6142).toFixed(9)};

float producao(float r) {
  r = max(r, 1e-3);
  float corte = pow(1.0 + pow(r / 2.808, 5.093), -4.6142) / CORTE1;
  return pow(r, 2.0 - uK1 / 2.5) * corte;
}

vec3 unitario(float a, float b) {
  float z = 2.0 * a - 1.0;
  float s = sqrt(max(1.0 - z * z, 0.0));
  float f = 6.2831853 * b;
  return vec3(s * cos(f), s * sin(f), z);
}

vec2 stumpff(float z) {
  if (abs(z) < 1.0) {
    return vec2(
      1.0 / 6.0 - z / 120.0 + z * z / 5040.0 - z * z * z / 362880.0,
      0.5 - z / 24.0 + z * z / 720.0 - z * z * z / 40320.0
    );
  }
  if (z > 0.0) {
    float s = sqrt(z);
    return vec2((s - sin(s)) / (s * z), (1.0 - cos(s)) / z);
  }
  float s = sqrt(-z);
  return vec2((sinh(s) - s) / (s * -z), (cosh(s) - 1.0) / -z);
}

// Kepler em variáveis universais (Curtis 3.3/3.4) por Laguerre (n = 5)
vec3 kepler(vec3 r0v, vec3 v0v, float mu, float dt) {
  float smu = sqrt(mu);
  float r0 = length(r0v);
  float A = dot(r0v, v0v) / smu;
  float alfa = 2.0 / r0 - dot(v0v, v0v) / mu;
  float B = 1.0 - alfa * r0;
  float x = smu * dt / r0;
  for (int i = 0; i < 8; i++) {
    float z = alfa * x * x;
    vec2 sc = stumpff(z);
    float F = A * x * x * sc.y + B * x * x * x * sc.x + r0 * x - smu * dt;
    float dF = A * x * (1.0 - z * sc.x) + B * x * x * sc.y + r0;
    float d2F = A * (1.0 - z * sc.y) + B * x * (1.0 - z * sc.x);
    float disc = sqrt(abs(16.0 * dF * dF - 20.0 * F * d2F));
    float den = dF + (dF >= 0.0 ? disc : -disc);
    x -= 5.0 * F / den;
  }
  float z = alfa * x * x;
  vec2 sc = stumpff(z);
  float f = 1.0 - x * x * sc.y / r0;
  float g = dt - x * x * x * sc.x / smu;
  return f * r0v + g * v0v;
}

// o estado do núcleo há tau dias: Hermite nas amostras (tau = tauMax·(k/(K−1))²)
void soltura(float tau, out vec3 P, out vec3 V) {
  float f = sqrt(clamp(tau / uTauMax, 0.0, 1.0)) * float(K - 1);
  int k = min(int(floor(f)), K - 2);
  float a0 = float(k) / float(K - 1);
  float a1 = float(k + 1) / float(K - 1);
  float t0 = uTauMax * a0 * a0;
  float t1 = uTauMax * a1 * a1;
  float h = t1 - t0;
  float s = clamp((tau - t0) / h, 0.0, 1.0);
  float s2 = s * s;
  float s3 = s2 * s;
  // a derivada em tau é −v: o tempo corre ao contrário da idade
  P = (2.0 * s3 - 3.0 * s2 + 1.0) * uLibP[k] - (s3 - 2.0 * s2 + s) * h * uLibV[k]
    + (-2.0 * s3 + 3.0 * s2) * uLibP[k + 1] - (s3 - s2) * h * uLibV[k + 1];
  V = mix(uLibV[k], uLibV[k + 1], s);
}

void main() {
  vec3 d;
  float w;
  float h;
  if (aTipo < 0.5) {
    // POEIRA
    float u = position.x;
    float tau = uTauMax * u + 0.02;
    vec3 R;
    vec3 V;
    soltura(tau, R, V);
    float rr = length(R);
    float beta = exp(mix(log(${BETA_MIN}), log(${BETA_MAX}), position.y));
    vec3 dirEj = normalize(unitario(position.z, aMais.x) - 0.6 * R / rr);
    float vej = ${(1.0 * KM_S_EM_UA_DIA).toFixed(9)} * sqrt(beta) / sqrt(rr);
    vec3 P = kepler(R, V + dirEj * vej, uMu * (1.0 - beta), tau);
    d = P - uPos;
    float rAgora = length(P);
    vec3 paraCam = normalize(uCam - d);
    float cosT = dot(P / rAgora, paraCam);
    float hg = 0.84 / pow(1.16 - 0.8 * cosT, 1.5) / 0.6672;
    w = producao(rr) * sqrt(beta) * uTauMax * 3.0 * hg / (rAgora * rAgora);
    h = 0.2 * length(d) + 7e-6;
    vCor = vec3(1.0, 0.86, 0.68);
  } else if (aTipo < 1.5) {
    // ÍONS (CO+)
    float tau = uTauIon * position.x * position.x + 0.01;
    float rr = length(uPos);
    float acc = uAcIon / (rr * rr);
    float tAcc = uVsw / acc;
    float s = tau < tAcc ? 0.5 * acc * tau * tau : 0.5 * acc * tAcc * tAcc + uVsw * (tau - tAcc);
    float tr = uFase - tau;
    vec3 e1 = normalize(cross(uDirIon, abs(uDirIon.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
    vec3 e2 = cross(uDirIon, e1);
    float b1 = 0.006 * sin(tr * 2.1 + 1.3) + 0.004 * sin(tr * 5.3 + 0.4) + 0.002 * sin(tr * 11.7);
    float b2 = 0.005 * sin(tr * 1.7 + 2.0) + 0.003 * sin(tr * 4.1) + 0.002 * sin(tr * 9.3 + 1.1);
    float ang = 6.2831853 * position.y;
    float abre = 0.07 * position.z * position.z + 0.006 * aMais.x;
    vec3 dir = normalize(uDirIon + e1 * (b1 + abre * cos(ang)) + e2 * (b2 + abre * sin(ang)));
    d = dir * s;
    w = producao(rr) * exp(-tau / ${DESBOTA_DOS_IONS.toFixed(1)}) * 2.0 * position.x * uTauIon * 2.0 / (rr * rr);
    h = 0.03 * s + 1.5e-5;
    vCor = vec3(0.32, 0.55, 1.0);
  } else {
    // A COMA DE GÁS (C2, Haser)
    float rr = length(uPos);
    float vg = ${(0.85 * KM_S_EM_UA_DIA).toFixed(9)} / sqrt(rr);
    float vgKm = 0.85 / sqrt(rr);
    float tauP = 2.2e4 * rr * rr / vgKm / 86400.0;
    float tauD = 6.6e4 * rr * rr / vgKm / 86400.0;
    float tau = 4.0 * tauD * position.x;
    vec3 dir = normalize(unitario(position.y, position.z) - 0.3 * uPos / rr);
    d = dir * vg * tau;
    w = (exp(-tau / tauD) - exp(-tau / tauP)) * producao(rr) * 4.0 * tauD * 0.3 / (rr * rr);
    h = 0.35 * length(d) + 1e-6;
    vCor = vec3(0.3, 1.0, 0.42);
  }

  vec4 mv = modelViewMatrix * vec4(d, 1.0);
  gl_Position = projectionMatrix * mv;
  float prof = max(-mv.z, 1e-30);
  float px = h * uAuPc * uFoco / prof;
  // abaixo de 3 px o borrão não encolhe mais: o fluxo se espalha pelos
  // 3 px (o grão de amostragem some sem borrar a forma de longe)
  float lado = clamp(px, 3.0, 48.0);
  gl_PointSize = lado;
  float hm = h * 1000.0;
  float i = uDose * w / (hm * hm) * min(px * px / (lado * lado), 1.0);
  // acima de 24 px o borrão desbota em vez de virar disco duro: de perto
  // da coma, onde a câmera entra na nuvem, a amostragem é rala demais
  // para um contínuo — melhor uma névoa fraca que bolas (DECLARADO: aqui
  // o brilho de superfície deixa de ser o físico)
  // e junto ao núcleo (câmera a menos de ~10⁵ km dele) o teto desce a 4 px
  float teto = mix(4.0, 24.0, smoothstep(6.7e-5, 6.7e-4, length(uCam)));
  float corte = min(1.0, teto / px);
  i *= corte * corte;
  // a guarda do NaN (a armadilha da casa: um pixel NaN + bloom = tela
  // branca) e da meia-precisão do alvo HDR: nunca acima de 8 por borrão
  bool ruim = isnan(i) || isinf(i) || any(isnan(d)) || any(isinf(d));
  vI = ruim ? 0.0 : clamp(i, 0.0, 8.0);
  if (ruim || vI <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vCor;
varying float vI;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float k = 1.0 - smoothstep(0.0, 0.5, r);
  gl_FragColor = vec4(vCor * vI * k * k, 0.0);
}
`;

const NUCLEO_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const NUCLEO_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uSol;
uniform float uLuz;
varying vec3 vN;
void main() {
  float l = max(dot(normalize(vN), uSol), 0.0);
  gl_FragColor = vec4(vec3(uLuz * l), 1.0);
}
`;

/** o ruído por índice (o mesmo das plumas): a partícula i tem os mesmos
 *  números em todo tier — subir a qualidade não muda a forma */
function ruido(i: number, k: number): number {
  let t = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  t = Math.imul(t ^ (t >>> 15), 0x2545f491);
  t ^= t >>> 13;
  return (t >>> 0) / 4294967296;
}

function geometriaCompartilhada(): THREE.BufferGeometry {
  const pos = new Float32Array(MAXIMO * 3);
  const mais = new Float32Array(MAXIMO * 2);
  const tipo = new Float32Array(MAXIMO);
  for (let i = 0; i < MAXIMO; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = ruido(i, k);
    mais[i * 2] = ruido(i, 3);
    mais[i * 2 + 1] = ruido(i, 4);
    const m = i % 8;
    tipo[i] = m < 5 ? 0 : m < 7 ? 1 : 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aMais', new THREE.BufferAttribute(mais, 2));
  g.setAttribute('aTipo', new THREE.BufferAttribute(tipo, 1));
  // em UA, no frame local do núcleo: a cauda mais longa cabe em 4 UA
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
  return g;
}

interface CometaNaCena {
  cometa: Cometa;
  grupo: THREE.Group;
  pontos: THREE.Points;
  material: THREE.ShaderMaterial;
  nucleo: THREE.Mesh | null;
  jdEscrito: number;
}

export interface QuadroDasCaudas {
  jd: number;
  camera: THREE.PerspectiveCamera;
  alturaPx: number;
  tier: QualityLevel;
  /** a gaveta (`nocaudas`) */
  ligado: boolean;
  /** só no Atlas */
  noAtlas: boolean;
  /** o cometa em foco: o único com núcleo desenhado */
  foco: string | null;
}

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _v = new THREE.Vector3();
const EX = naCena(1, 0, 0, new THREE.Vector3());
const EY = naCena(0, 1, 0, new THREE.Vector3());
const EZ = naCena(0, 0, 1, new THREE.Vector3());
const AU_PC = EX.length();

/**
 * A CAMADA DAS CAUDAS. Um `Points` por cometa ACESO (a geometria é uma
 * só, compartilhada); cometa apagado não desenha nada.
 */
export class CaudasDosCometas {
  readonly group = new THREE.Group();
  private readonly geometria = geometriaCompartilhada();
  private readonly esfera = new THREE.SphereGeometry(1, 48, 24);
  private readonly vivos = new Map<string, CometaNaCena>();
  /** quantas partículas o último quadro desenhou (a régua do custo) */
  particulasDesenhadas = 0;

  constructor() {
    this.group.name = 'caudas-dos-cometas';
  }

  private criar(c: Cometa): CometaNaCena {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uPos: { value: new THREE.Vector3() },
        uLibP: { value: Array.from({ length: AMOSTRAS }, () => new THREE.Vector3()) },
        uLibV: { value: Array.from({ length: AMOSTRAS }, () => new THREE.Vector3()) },
        uTauMax: { value: TAU_DA_POEIRA },
        uMu: { value: MU },
        uK1: { value: c.brilho.K1 },
        uDirIon: { value: new THREE.Vector3(1, 0, 0) },
        uTauIon: { value: TAU_DOS_IONS },
        uAcIon: { value: ACELERACAO_DOS_IONS * MU },
        uVsw: { value: VENTO_SOLAR },
        uCam: { value: new THREE.Vector3() },
        uFoco: { value: 1 },
        uAuPc: { value: AU_PC },
        uDose: { value: 0 },
        uFase: { value: 0 },
      },
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    const pontos = new THREE.Points(this.geometria, material);
    pontos.renderOrder = 7;
    const grupo = new THREE.Group();
    grupo.matrixAutoUpdate = false;
    grupo.add(pontos);
    let nucleo: THREE.Mesh | null = null;
    if (c.nucleo.km) {
      const raio = c.nucleo.km / 2 / AU_KM;
      nucleo = new THREE.Mesh(
        this.esfera,
        new THREE.ShaderMaterial({
          vertexShader: NUCLEO_VERT,
          fragmentShader: NUCLEO_FRAG,
          uniforms: {
            uSol: { value: new THREE.Vector3(1, 0, 0) },
            uLuz: { value: ALBEDO_DO_NUCLEO * EXPOSICAO_DO_NUCLEO },
          },
        })
      );
      nucleo.scale.setScalar(raio);
      nucleo.visible = false;
      grupo.add(nucleo);
    }
    this.group.add(grupo);
    const novo = { cometa: c, grupo, pontos, material, nucleo, jdEscrito: Number.NaN };
    this.vivos.set(c.id, novo);
    return novo;
  }

  update(q: QuadroDasCaudas) {
    const n = PARTICULAS_POR_TIER[q.tier];
    this.particulasDesenhadas = 0;
    for (const c of COMETAS) {
      const s = q.ligado && q.noAtlas && Number.isFinite(q.jd) ? estadoDoCometa(c.id, q.jd) : null;
      let vivo = this.vivos.get(c.id);
      // ACESO? a coma agora ou a poeira solta nos últimos 60 dias
      const r = s ? Math.hypot(s[0], s[1], s[2]) : Infinity;
      let aceso = s !== null && brilhoRelativo(c, r) > LIMIAR_DE_ATIVIDADE;
      if (s && !aceso && r < 12) {
        const antes = estadoDoCometa(c.id, q.jd - TAU_DA_POEIRA);
        if (antes) aceso = brilhoRelativo(c, Math.hypot(antes[0], antes[1], antes[2])) > LIMIAR_DE_ATIVIDADE;
      }
      const temNucleo = s !== null && q.foco === c.id && vivo?.nucleo !== null;
      if (!s || (!aceso && !temNucleo && q.foco !== c.id)) {
        if (vivo) vivo.grupo.visible = false;
        continue;
      }
      vivo ??= this.criar(c);
      vivo.grupo.visible = true;
      this.escrever(vivo, s, q, aceso ? n : 0);
      if (aceso) this.particulasDesenhadas += n;
    }
  }

  private escrever(v: CometaNaCena, s: number[], q: QuadroDasCaudas, n: number) {
    const u = v.material.uniforms;
    // a matriz: UA eclíptica do núcleo → cena (equatorial, pc)
    naCena(s[0], s[1], s[2], _v);
    _m.makeBasis(EX, EY, EZ).setPosition(_v);
    v.grupo.matrix.copy(_m);
    v.grupo.matrixWorldNeedsUpdate = true;
    if (v.jdEscrito !== q.jd) {
      v.jdEscrito = q.jd;
      (u.uPos.value as THREE.Vector3).set(s[0], s[1], s[2]);
      const P = u.uLibP.value as THREE.Vector3[];
      const V = u.uLibV.value as THREE.Vector3[];
      for (let k = 0; k < AMOSTRAS; k++) {
        const a = k / (AMOSTRAS - 1);
        const e = k === 0 ? s : estadoDoCometa(v.cometa.id, q.jd - TAU_DA_POEIRA * a * a);
        if (!e) continue;
        P[k].set(e[0], e[1], e[2]);
        V[k].set(e[3], e[4], e[5]);
      }
      // a direção da cauda de íons: o vento radial visto do cometa
      const r = Math.hypot(s[0], s[1], s[2]);
      (u.uDirIon.value as THREE.Vector3)
        .set((VENTO_SOLAR * s[0]) / r - s[3], (VENTO_SOLAR * s[1]) / r - s[4], (VENTO_SOLAR * s[2]) / r - s[5])
        .normalize();
      u.uFase.value = (q.jd - 2_451_545) % 3650;
      if (v.nucleo) {
        (v.nucleo.material as THREE.ShaderMaterial).uniforms.uSol.value.set(-s[0] / r, -s[1] / r, -s[2] / r);
      }
    }
    _inv.copy(_m).invert();
    (u.uCam.value as THREE.Vector3).copy(q.camera.position).applyMatrix4(_inv);
    u.uFoco.value = q.alturaPx * q.camera.projectionMatrix.elements[5] * 0.5;
    // GRÃO MAIOR, MENOS GRÃOS não vale aqui (o borrão já é geométrico):
    // a luz total se conserva pelo peso — tier menor, cada um pesa mais
    u.uDose.value = GANHO * escalaDoBrilho(v.cometa.brilho.M1) * (MAXIMO / Math.max(n, 1));
    v.pontos.visible = n > 0;
    // a geometria é uma só: o mesmo tier vale para todos os acesos
    this.geometria.setDrawRange(0, n);
    if (v.nucleo) v.nucleo.visible = q.foco === v.cometa.id;
  }

  /**
   * A SUPERFÍCIE DO NÚCLEO EM FOCO, para o near plane (o molde de
   * `palco.superficieMaisProxima`): sem ela o near seguiria a distância
   * ao Sol (0,4 %, ~360 mil km perto do periélio de Halley) e cortaria o
   * núcleo e a coma de perto. Núcleo sem tamanho medido entra com 1 km —
   * só para o anteparo, nada é desenhado com ele. `null` sem foco.
   */
  superficieDoFoco(camPos: THREE.Vector3, foco: string | null): { dSuperficiePc: number; raioPc: number } | null {
    const v = foco ? this.vivos.get(foco) : undefined;
    if (!v || !v.grupo.visible) return null;
    const raioPc = ((v.cometa.nucleo.km ?? 2) / 2 / AU_KM) * AU_PC;
    _v.setFromMatrixPosition(v.grupo.matrix);
    return { dSuperficiePc: Math.max(_v.distanceTo(camPos) - raioPc, 0), raioPc };
  }

  dispose() {
    this.geometria.dispose();
    this.esfera.dispose();
    for (const v of this.vivos.values()) {
      v.material.dispose();
      (v.nucleo?.material as THREE.Material | undefined)?.dispose();
    }
    this.vivos.clear();
  }
}
