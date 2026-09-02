// ============================================================
// OS JATOS DE ENCÉLADO (item 134/S4) — as plumas do polo sul, portadas
// do projeto Saturn do dono (`src/effects/plumes.ts`, lá em TSL/WebGPU).
//
// O QUE ATRAVESSA É A MATEMÁTICA, NÃO O CÓDIGO. Lá cada grão é integrado
// por um passe de COMPUTE a cada quadro; a casa é WebGL2/GLSL e não tem
// passe de compute. Aqui a nuvem é ASSADA UMA VEZ na CPU no estado
// ESTACIONÁRIO: cada grão nasce numa das oito fissuras, voa na gravidade
// 1/r² dele e é amostrado num instante ALEATÓRIO do próprio voo. Jato
// contínuo em regime é estacionário — o retrato sai o mesmo em qualquer
// instante; o que se perde é o movimento dos grãos, e o que se ganha é
// zero custo de CPU por quadro e captura reprodutível (a identidade A/B
// da casa não sobrevive a um relógio de parede dentro de uma camada).
//
// A LEI DA ESTRELA: aditivo, sem escrever profundidade — por isso o
// sprite é INSTRUMENTO no cadastro de escala (`src/three/escala.ts`,
// id `plumas-de-encelado`): o grão real tem mícrons, o sprite é o borrão
// de óptica que representa muitos.
//
// O FRAME é o LOCAL do corpo, o mesmo do mesh de superfície (a base IAU
// de `orientacaoNaCena.ts` com a escala do elipsoide): as fissuras ficam
// grudadas nas listras de tigre e o polo sul é o −Y local.
// ============================================================
import * as THREE from 'three';
import { elementosDe } from '../../../lib/atlas/kepler';
import type { QualityLevel } from '../../core/engine';

/**
 * A gravidade local em raios/s², COPIADA dele (`GRAVITY = 0.16`). Não é
 * a de Encélado no SI: o tempo dele é acelerado ~600× (velocidade de
 * escape 0,566 raio/s contra os 239 m/s reais). O que importa para a
 * FORMA da nuvem é a razão v₀/v_escape, e ela é a mesma.
 */
const GRAVIDADE = 0.16;

/** As oito bocas — quatro listras de tigre, dois pés cada (o `jet % 8`). */
const JATOS = 8;

/** dt do integrador. Medido: 1,8 % de erro de distribuição contra dt=0,01. */
const PASSO_S = 0.08;

/**
 * QUANTOS GRÃOS POR TIER — METADE dos dele em cada degrau (`high` 262144,
 * `med` 65536, `low` 16384), e é decisão de custo declarada: o assar é
 * CPU na thread principal e é linear (medido: ~130 ms nos 131072 do
 * cinema, ~32 ms nos 32768), e o preenchimento aditivo a 4 raios já
 * custa +3,2 ms/quadro. A LUZ NÃO MUDA com o tier — quem a conserva é a
 * engorda do grão (ver `atualizar`); `cinema` é só a referência dela.
 */
export const PLUMAS_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 131072,
  alta: 32768,
  performance: 8192,
};

const PLUMAS_MAX = PLUMAS_POR_TIER.cinema;

/** O alfa por grão no tier de referência — o `0.055` dele. */
const DOSE_BASE = 0.055;

/**
 * O RUÍDO POR ÍNDICE (nunca sequencial): o grão `i` tem os mesmos sete
 * números em qualquer tier, então assar um prefixo maior depois é
 * incremental e a nuvem não muda de forma quando a qualidade sobe.
 */
function ruido(i: number, k: number): number {
  let t = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  t = Math.imul(t ^ (t >>> 15), 0x2545f491);
  t ^= t >>> 13;
  return (t >>> 0) / 4294967296;
}

/**
 * A ATIVIDADE DAS MARÉS (a `plumeActivityUniform` dele): o brilho oscila
 * 4:1 no ciclo diurno, mínimo no periastro e máximo no apoastro, quando
 * as listras são abertas pela flexão. A anomalia média sai dos elementos
 * da casa (Kepler; e = 0,0047 é degenerado em r/a, por isso é M e não r).
 * O atraso do pico em relação ao apoastro (Hedman 2013) NÃO entra — ele
 * mesmo o marca como não verificado.
 */
export function atividadeDasMares(jdTdb: number): number {
  const el = elementosDe('enceladus');
  if (!el || !Number.isFinite(jdTdb)) return 1;
  const grausM = el.elements.M0Deg + el.nDegPerDay * (jdTdb - el.elements.epochJD);
  return 0.625 - 0.375 * Math.cos(grausM * (Math.PI / 180));
}

const PLUMA_VERT = /* glsl */ `
attribute float aSemente;

uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uAlturaPx;
uniform float uDose;
uniform float uGrao;

varying float vAlfa;
varying vec3 vCor;

void main() {
  float alt = max(length(position) - 1.0, 0.0);
  vec3 paraCam = normalize(uCamLocal - position);
  // ESPALHAMENTO PARA A FRENTE do gelo (o fwd dele): o grão acende
  // contra a luz — 2,58 em contraluz total contra 0,18 de frente, os
  // 14× que fazem a foto PIA11688 existir e a de fase baixa não.
  float frente = pow(clamp(dot(paraCam, -uDirSolLocal), 0.0, 1.0), 3.0) * 2.4 + 0.18;
  vAlfa = exp(-alt / 1.4) * frente * uDose;
  vCor = mix(vec3(0.80, 0.90, 1.0), vec3(0.95, 0.97, 1.0), clamp(alt / 3.0, 0.0, 1.0));

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // a escala do modelo (o raio a em pc) sai da própria coluna X — sem
  // uniform novo e sem chance de divergir da matriz que o corpo escreve
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  float tam = clamp(alt * 0.05 + 0.015, 0.012, 0.16) * (aSemente * 0.7 + 0.65) * uGrao;
  float px = tam * raioMundo * uAlturaPx * projectionMatrix[1][1] * 0.5 / max(-mv.z, 1e-30);
  // teto de 48 px: POINTS grande trava o Mac a partir de 64 (lei da casa)
  gl_PointSize = clamp(px, 1.0, 48.0);
}
`;

const PLUMA_FRAG = /* glsl */ `
precision highp float;

varying float vAlfa;
varying vec3 vCor;

void main() {
  // O DISCO DELE, verbatim (smoothstep 0,5 -> 0,06 no raio): cheio até 6 % do
  // raio e apagado na borda. A gaussiana da poeira da casa (dust.ts)
  // deposita 2,6× mais luz por grão — seria a pluma dele mais forte.
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  float i = 1.0 - smoothstep(0.06, 0.5, r);
  // aditivo (srcAlpha, um): a contribuição é cor·i·alfa, UM fator de
  // disco — o quadrado da poeira da casa apagaria o grão dele
  gl_FragColor = vec4(vCor, i * vAlfa);
}
`;

/** O que o corpo entrega por quadro — tudo já no frame local dele. */
export interface QuadroDasPlumas {
  dirSolLocal: THREE.Vector3;
  camLocal: THREE.Vector3;
  /** o `ganhoDoGlobo` do corpo — a pluma segue a exposição da visita */
  luzGanho: number;
  atividade: number;
  alturaPx: number;
  tier: QualityLevel;
}

export class PlumasDeEncelado {
  readonly pontos: THREE.Points;

  private readonly geometria = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly posicoes = new Float32Array(PLUMAS_MAX * 3);
  private readonly sementes = new Float32Array(PLUMAS_MAX);
  private assados = 0;

  constructor() {
    const pos = new THREE.BufferAttribute(this.posicoes, 3);
    const sem = new THREE.BufferAttribute(this.sementes, 1);
    pos.setUsage(THREE.DynamicDrawUsage);
    sem.setUsage(THREE.DynamicDrawUsage);
    this.geometria.setAttribute('position', pos);
    this.geometria.setAttribute('aSemente', sem);
    // o raio 6 é o do descarte dele (grão além disso renasce)
    this.geometria.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    this.geometria.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      vertexShader: PLUMA_VERT,
      fragmentShader: PLUMA_FRAG,
      uniforms: {
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uAlturaPx: { value: 1080 },
        uDose: { value: 0 },
        uGrao: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });

    this.pontos = new THREE.Points(this.geometria, this.material);
    this.pontos.matrixAutoUpdate = false;
  }

  atualizar(q: QuadroDasPlumas) {
    const alvo = PLUMAS_POR_TIER[q.tier];
    if (alvo > this.assados) this.assar(alvo);
    this.geometria.setDrawRange(0, alvo);

    // GRÃO MAIOR, MENOS GRÃOS: a luz total é conservada exatamente
    // (n · dose · tam² = constante) com um número só — sem ele o tier
    // performance seria uma pluma 16× mais fraca, dois universos.
    const grao = Math.cbrt(PLUMAS_MAX / alvo);
    const u = this.material.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).copy(q.dirSolLocal);
    (u.uCamLocal.value as THREE.Vector3).copy(q.camLocal);
    u.uAlturaPx.value = q.alturaPx;
    u.uGrao.value = grao;
    u.uDose.value = DOSE_BASE * grao * q.atividade * q.luzGanho;
  }

  /** A NUVEM EM REGIME, dos `assados` até `n` — ver o cabeçalho. */
  private assar(n: number) {
    for (let i = this.assados; i < n; i++) {
      const jato = i % JATOS;
      const lon = (jato / JATOS) * Math.PI * 2 + ruido(i, 0) * 0.6;
      const lat = -Math.PI / 2 + 0.1 + ruido(i, 1) * 0.14;
      const cl = Math.cos(lat);
      const ox = cl * Math.cos(lon);
      const oy = Math.sin(lat);
      const oz = cl * Math.sin(lon);
      // o −0,30 em Y é dele: inclina o jato para o eixo do polo
      let dx = ox + (ruido(i, 2) - 0.5) * 0.45;
      let dy = oy - 0.3;
      let dz = oz + (ruido(i, 3) - 0.5) * 0.45;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx *= inv;
      dy *= inv;
      dz *= inv;
      // 0,32..0,58 contra a escape 0,566: quase todos voltam, os mais
      // rápidos escapam — são eles que alimentam o anel E (fase S5)
      const v0 = ruido(i, 4) * 0.26 + 0.32;
      const vida = ruido(i, 5) * 5 + 5;
      const fase = ruido(i, 6) * vida;
      const bx = ox * 1.002;
      const by = oy * 1.002;
      const bz = oz * 1.002;
      const wx = dx * v0;
      const wy = dy * v0;
      const wz = dz * v0;
      let px = bx;
      let py = by;
      let pz = bz;
      let vx = wx;
      let vy = wy;
      let vz = wz;
      const passos = Math.max(1, Math.ceil(fase / PASSO_S));
      const dt = fase / passos;
      for (let k = 0; k < passos; k++) {
        px += vx * dt;
        py += vy * dt;
        pz += vz * dt;
        const r2 = px * px + py * py + pz * pz;
        // caiu de volta ou escapou: o grão RENASCE na mesma boca — é o
        // respawn dele, e é o que mantém o regime estacionário
        if (r2 < 0.990025 || r2 > 36) {
          px = bx; py = by; pz = bz;
          vx = wx; vy = wy; vz = wz;
          continue;
        }
        const g = (GRAVIDADE * dt) / (r2 * Math.sqrt(r2));
        vx -= px * g;
        vy -= py * g;
        vz -= pz * g;
      }
      this.posicoes[i * 3] = px;
      this.posicoes[i * 3 + 1] = py;
      this.posicoes[i * 3 + 2] = pz;
      this.sementes[i] = ruido(i, 7);
    }
    this.assados = n;
    this.geometria.attributes.position.needsUpdate = true;
    this.geometria.attributes.aSemente.needsUpdate = true;
  }

  dispose() {
    this.geometria.dispose();
    this.material.dispose();
  }
}
