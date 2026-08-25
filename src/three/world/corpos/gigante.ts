// ============================================================
// OS GIGANTES RESOLVIDOS (Onda 6, F4) — Júpiter, Saturno, Urano
// e Netuno sob a MESMA lei da Terra e dos rochosos: Lambert +
// flattening por BODY_AXES + retrato de fallback + cessão suave
// do ponto (D5). Saturno traz o anel.
//
// PROVENIÊNCIA: implementação NOVA. O doador entra como ESPEC
// (esfera Lambert estática, raios 1,110–2,326 do anel — cicatriz
// W5-B —, ocultador elipsoide com squash no polo do frame do anel
// e `a = dot(d',d')` no discriminante). Nenhuma linha dele
// atravessou.
//
// ADVECÇÃO ZONAL DE JÚPITER: ESTÁTICA nesta fase. Pendência
// nomeada (ordem de corte P-E12 do desenho): o perfil de ventos
// publicado com citação honesta ainda não foi transcrito — sem
// essa tabela, qualquer deslocamento por banda seria número
// inventado, e cisalhar o oval da Mancha é o modo de falha que
// a emenda T-E6 pede para NÃO ter. O relógio do Director (jd)
// já está no tick; o wrap REPEAT em U já está no mapa. Quando
// a tabela entrar, o deslocamento é UNIFORME POR BANDA.
//
// URUANO/NETUNO: textura REAL incumbente (SSS 2k). Sem bandas
// procedurais nesta fase (regra do dono, 2026-08-12).
//
// ANEL DE SATURNO (D6):
//   - raios contra o raio EQUATORIAL: 1,110–2,326
//     (D-ring 66 900 km / 60 268; F-ring 140 180 km / 60 268 —
//     cicatriz W5-B, celestialBodies.ts do doador)
//   - placa alpha (canal `ring` do manifest)
//   - scattering frente/trás no lugar do 0,34 fixo
//   - sombra planeta→anel: ocultador ELIPSOIDE; squash no eixo
//     POLAR do frame do anel (.z após RingGeometry + Rx(−π/2);
//     o comentário W5-B do doador); direção NÃO-unitária depois
//     do squash (`a = dot(d',d')` no discriminante)
//   - sombra anel→planeta: interseção analítica do plano y=0
//   - fade de terminador (smoothstep 0…0,05)
//   - Saturno NÃO é receptor de eclipse (CORPOS_COM_ANEL)
// ============================================================
import * as THREE from 'three';
import { CAMADA_DOS_OCULTADORES } from '../../core/post';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import { ganhoDoGlobo } from '../../../lib/atlas/luzDaVisita';
import {
  CORPOS_COM_ANEL,
  GLSL_SOMBRA_ECLIPSE,
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { FonteDeEfemerides } from '../planetas/planetas';
import type { CalibracaoDaCasa } from '../../estrela';
import {
  A_MAG_BASE_PC,
  DESLOCAMENTO_UA_PARA_PC,
  faseDoVertice,
  magDoVertice,
} from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, stepRampToward } from '../lodStellar';
import { psfPointSizePx } from '../../luzDaCasa';
import { diametroAparentePx } from './corpos';
import { cessaoAlvo, gateBinario } from './terra';
import { CANAL_MAP, carregarCanaisDoCorpo, estadoAposFalha } from './texturas';
import type { CanalPedido, EstadoDasTexturas, OpcoesDeTextura } from './texturas';
import {
  orientacaoDoCorpoNaCena,
  orientacaoInercialDoAnelNaCena,
} from './orientacaoNaCena';
import {
  escreverSombraDeEclipse,
  uniformsDeEclipseNeutros,
} from './eclipseNoMaterial';

/** Os quatro gigantes da F4, Sol → fora. A lista é o DADO VIVO
 *  que o Director percorre — a mesma disciplina dos rochosos. */
export const GIGANTES: readonly { readonly id: string }[] = [
  { id: 'jupiter' },
  { id: 'saturn' },
  { id: 'uranus' },
  { id: 'neptune' },
];

/**
 * Raios do anel de Saturno em unidades do raio EQUATORIAL
 * (BODY_AXES.saturn[0] = 60 268 km). D-ring interno 66 900 / 60 268
 * = 1,110; F-ring externo 140 180 / 60 268 = 2,326. Cicatriz W5-B.
 */
export const ANEL_SATURNO = { rInt: 1.11, rExt: 2.326 } as const;

/**
 * Anéis U/N/Q — raios CITADOS de DADOS-ANEIS-F6.md, em unidades do
 * raio equatorial BODY_AXES. Urano: anel 6 → ε (French24 / PDS-U).
 * Netuno: Le Verrier → Adams (dePater18). Quaoar: Q2R → Q1R (Pereira23).
 */
export const ANEIS_CITADOS: Record<string, { rInt: number; rExt: number }> = {
  saturn: ANEL_SATURNO,
  uranus: { rInt: 41837.09 / 25559, rExt: 51149.07 / 25559 },
  neptune: { rInt: 53200 / 24764, rExt: 62933 / 24764 },
  // km publicados [Pereira23] sobre o raio EQUATORIAL da malha
  // (BODY_AXES.quaoar[0] = 543×1,18). Dividir pelo raio equivalente
  // 543 km esticava o anel 18% — a malha já está no elipsoide.
  quaoar: {
    rInt: 2520 / BODY_AXES.quaoar[0],
    rExt: 4057 / BODY_AXES.quaoar[0],
  },
};

/** Raios do corpo em pc — BODY_AXES pelos conversores únicos. */
export function raiosDoGigantePc(id: string): { a: number; c: number; b: number } {
  const [aKm, bKm, cKm] = BODY_AXES[id];
  return {
    a: (aKm / AU_KM) * AU_PARA_PC,
    c: (cKm / AU_KM) * AU_PARA_PC,
    b: (bKm / AU_KM) * AU_PARA_PC,
  };
}

/** Posição heliocêntrica em UA: efeméride viva, senão RETRATO. */
export function posicaoDoGiganteUA(
  id: string,
  jdTdb: number,
  fonte: FonteDeEfemerides | null
): { x: number; y: number; z: number } | null {
  if (fonte && Number.isFinite(jdTdb)) {
    return fonte.posicaoHeliocentrica(id, jdTdb);
  }
  const v = (RETRATO_2026 as Record<string, { vetorUA: readonly number[] }>)[id];
  return v ? { x: v.vetorUA[0], y: v.vetorUA[1], z: v.vetorUA[2] } : null;
}

// ------------------------------------------------------------
// GLSL
// ------------------------------------------------------------

const GIGANTE_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLSL_NORMAL_ELIPSOIDE = /* glsl */ `
// gradiente exato do elipsoide (x/a², y/c², z/b²) em unidades de a
vec3 normalDoCorpo(vec3 p, vec3 esc) { return normSeguro(p * esc); }
`;

/**
 * Sombra anel→planeta: interseção analítica com o plano equatorial
 * (y=0 no frame local: +Y é o polo, a convenção da SphereGeometry).
 * Densidade lida da placa alpha — não o 0,34 fixo do doador.
 */
const GLSL_SOMBRA_ANEL_NO_PLANETA = /* glsl */ `
float sombraDoAnel(vec3 p, float ndotl) {
  if (uAnelAtivo < 0.5) return 1.0;
  float fade = smoothstep(0.0, 0.05, ndotl);
  if (fade <= 0.0) return 1.0;
  if (abs(uDirSolLocal.y) < 1.0e-6) return 1.0;
  float t = -p.y / uDirSolLocal.y;
  if (t <= 0.0) return 1.0;
  vec3 hit = p + uDirSolLocal * t;
  float r = length(hit.xz);
  if (r <= uAnelRaios.x || r >= uAnelRaios.y) return 1.0;
  float u = (r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  float a = texture2D(uMapaAnel, vec2(u, 0.5)).a;
  return 1.0 - a * 0.9 * fade;
}
`;

/** Lambert dos quatro; Saturno liga a sombra do anel pelo flag. */
export const GIGANTE_LAMBERT_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
uniform float uAnelAtivo;
uniform vec2 uAnelRaios;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
${GLSL_SOMBRA_ANEL_NO_PLANETA}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotl = max(dot(n, uDirSolLocal), 0.0);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 direta =
    (albedo * ndotl) * uLuzGanho
    * fatorDeEclipse(pElip, n, dot(n, uDirSolLocal))
    * sombraDoAnel(pElip, ndotl);
  gl_FragColor = vec4(direta, 1.0);
}
`;

export const ANEL_VERT = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Anel: placa alpha + scattering frente/trás + sombra do planeta
 * elipsoide. vPos está no frame da RingGeometry (plano XY); o mesh
 * aplica Rx(−π/2), então +Z deste frame é o POLO (W5-B). O squash
 * do ocultador é em .z; depois dele d' NÃO é unitário.
 */
export const ANEL_FRAG = /* glsl */ `
uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform vec2 uAnelRaios;
varying vec3 vPos;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
float sombraDoPlaneta(vec3 p) {
  vec3 dir = uDirSolLocal;
  float k = max(uKPolar, 1.0e-4);
  vec3 o = vec3(p.x, p.y, p.z / k);
  vec3 d = vec3(dir.x, dir.y, dir.z / k);
  float a = dot(d, d);
  float b = 2.0 * dot(o, d);
  float c = dot(o, o) - 1.0;
  float delta = b * b - 4.0 * a * c;
  bool hit = delta >= 0.0 && b < 0.0;
  return hit ? 0.22 : 1.0;
}
void main() {
  float r = length(vPos.xy);
  float u = (r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  vec4 placa = texture2D(uMapaAnel, vec2(clamp(u, 0.0, 1.0), 0.5));
  float alpha = placa.a;
  if (alpha < 0.004) discard;
  vec3 n = vec3(0.0, 0.0, 1.0);
  vec3 view = normSeguro(uCamLocal - vPos);
  float nDotL = dot(n, uDirSolLocal);
  float nDotV = dot(n, view);
  float phase = max(dot(-uDirSolLocal, view), 0.0);
  float mesmoLado = nDotL * nDotV;
  float frente = pow(phase, 6.0);
  float lambert = max(abs(nDotL), 0.12);
  float brilho = mesmoLado > 0.0 ? lambert : (0.18 + 1.6 * frente);
  vec3 albedo = placa.rgb;
  if (dot(albedo, albedo) < 1.0e-6) albedo = vec3(0.72, 0.68, 0.58);
  vec3 direta = albedo * (brilho * uLuzGanho) * sombraDoPlaneta(vPos);
  gl_FragColor = vec4(direta, alpha);
}
`;

/**
 * ANEL PROCEDURAL (F6) — Urano/Netuno/Quaoar. Sem placa de missão.
 * Dosagem honesta: partículas de carvão (albedo ~0,05); Urano ε
 * assimétrico (peri 19,7 → apo 96,4 km); Netuno só arcos
 * Fraternité+Égalité; o resto é traço/véu.
 */
export const ANEL_PROC_FRAG = /* glsl */ `
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform vec2 uAnelRaios;
uniform float uModo; // 0=Urano 1=Netuno 2=Quaoar
varying vec3 vPos;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
float sombraDoPlaneta(vec3 p) {
  vec3 dir = uDirSolLocal;
  float k = max(uKPolar, 1.0e-4);
  vec3 o = vec3(p.x, p.y, p.z / k);
  vec3 d = vec3(dir.x, dir.y, dir.z / k);
  float a = dot(d, d);
  float b = 2.0 * dot(o, d);
  float c = dot(o, o) - 1.0;
  float delta = b * b - 4.0 * a * c;
  bool hit = delta >= 0.0 && b < 0.0;
  return hit ? 0.22 : 1.0;
}
void main() {
  float r = length(vPos.xy);
  float u = (r - uAnelRaios.x) / max(uAnelRaios.y - uAnelRaios.x, 1.0e-6);
  if (u < 0.0 || u > 1.0) discard;
  float lon = atan(vPos.y, vPos.x);
  float alpha = 0.04;
  if (uModo < 0.5) {
    // Urano: ε domina (u→1), largura cresce no apoapse (lon≈0)
    float eps = smoothstep(0.82, 0.92, u);
    float assim = 0.35 + 0.65 * (0.5 + 0.5 * cos(lon));
    alpha = mix(0.03, 0.22 * assim, eps);
  } else if (uModo < 1.5) {
    // Netuno: traço + arcos Fraternité (0–10°) e Égalité (~11–14°)
    float deg = degrees(lon);
    if (deg < 0.0) deg += 360.0;
    float arco = 0.0;
    if (deg < 10.0) arco = 1.0;
    else if (deg > 10.5 && deg < 14.0) arco = 0.7;
    alpha = mix(0.02, 0.28, arco) * smoothstep(0.85, 1.0, u);
  } else {
    // Quaoar: Q1R (u→1) didático; um setor denso
    float deg = degrees(lon);
    if (deg < 0.0) deg += 360.0;
    float setor = deg < 22.0 ? 1.0 : 0.0;
    // didático a 42 UA: o τ real some; um anel fino + arco denso.
    float faixa = smoothstep(0.72, 0.84, u) * (1.0 - smoothstep(0.96, 1.0, u));
    alpha = mix(0.35, 0.9, setor) * faixa;
  }
  if (alpha < 0.004) discard;
  vec3 n = vec3(0.0, 0.0, 1.0);
  vec3 view = normSeguro(uCamLocal - vPos);
  float nDotL = dot(n, uDirSolLocal);
  float nDotV = dot(n, view);
  float phase = max(dot(-uDirSolLocal, view), 0.0);
  float mesmoLado = nDotL * nDotV;
  float frente = pow(phase, 6.0);
  float lambert = max(abs(nDotL), 0.12);
  float brilho = mesmoLado > 0.0 ? lambert : (0.18 + 1.6 * frente);
  vec3 albedo = uModo > 1.5 ? vec3(0.42, 0.34, 0.26) : vec3(0.06, 0.055, 0.05);
  vec3 direta = albedo * (brilho * uLuzGanho) * sombraDoPlaneta(vPos);
  gl_FragColor = vec4(direta, alpha);
}
`;

// ------------------------------------------------------------
// A classe
// ------------------------------------------------------------

export interface QuadroDoGigante {
  jdTdb: number;
  fonte: FonteDeEfemerides | null;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  ligado: boolean;
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  dtS: number;
  psf: CalibracaoDaCasa;
  salto: boolean;
}

export interface EstadoDoGigante {
  emQuadro: boolean;
  carregando: boolean;
  gateArmado: boolean;
  cede: number;
  emRampa: boolean;
  raioPc: number;
  centroPc: THREE.Vector3;
  diametroPx: number;
  rUA: number;
}

/** O bloco comum de textura (`OpcoesDeTextura`) mais o id do gigante —
 *  a classe serve aos quatro. */
export interface OpcoesDoGigante extends OpcoesDeTextura {
  id: string;
}

/**
 * O ANEL de Saturno como CANAL do mesmo lote (22/08). Não repete em U:
 * a placa é radial, não equiretangular — repetir emendaria a borda
 * externa na interna. Antes ele descia DEPOIS do `map`, e já publicado:
 * uma falha do anel voltava o corpo inteiro a 'fria' e recarregava o
 * `map` por cima, até três mapas residentes e Saturno nunca em quadro.
 */
const CANAL_ANEL: CanalPedido = { canal: 'ring', cor: true, repetirEmU: false };

export class GiganteResolvido {
  readonly group = new THREE.Group();

  private readonly idCorpo: string;
  private readonly raioA: number;
  private readonly razaoC: number;
  private readonly razaoB: number;
  private readonly kPolar: number;
  private readonly temAnel: boolean;

  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;
  private readonly sombra = criaSombraNaCena();

  private texturas: EstadoDasTexturas = 'fria';
  private recargas = 0;
  private readonly texturasVivas: THREE.Texture[] = [];
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;
  private geoAnel: THREE.RingGeometry | null = null;
  private anel: THREE.Mesh | null = null;
  private matAnel: THREE.ShaderMaterial | null = null;
  private dummyAnel: THREE.DataTexture | null = null;

  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vAnelX = new THREE.Vector3();
  private readonly vAnelY = new THREE.Vector3();
  private readonly vAnelZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly mRx = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  private readonly estado: EstadoDoGigante;

  get estadoVivo(): Readonly<EstadoDoGigante> {
    return this.estado;
  }

  get id(): string {
    return this.idCorpo;
  }

  get planeta(): boolean {
    return true;
  }

  private readonly opcoes: OpcoesDoGigante;

  constructor(opcoes: OpcoesDoGigante) {
    this.opcoes = opcoes;
    this.idCorpo = opcoes.id;
    const { a, c, b } = raiosDoGigantePc(this.idCorpo);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.kPolar = c / a;
    this.temAnel = (CORPOS_COM_ANEL as readonly string[]).includes(this.idCorpo);
    this.group.visible = false;
    this.estado = {
      emQuadro: false,
      carregando: false,
      gateArmado: false,
      cede: 0,
      emRampa: false,
      raioPc: a,
      centroPc: this.centro,
      diametroPx: Number.NaN,
      rUA: Number.NaN,
    };
  }

  atualizar(q: QuadroDoGigante): EstadoDoGigante {
    const e = this.estado;
    if (this.disposto) return e;

    let saltoDeData = false;
    if (
      (q.jdTdb !== this.jdEscrito || q.fonte !== this.fonteEscrita) &&
      Number.isFinite(q.jdTdb)
    ) {
      saltoDeData = true;
      this.jdEscrito = q.jdTdb;
      this.fonteEscrita = q.fonte;
      const p = posicaoDoGiganteUA(this.idCorpo, q.jdTdb, q.fonte);
      if (p) {
        this.rUA = Math.hypot(p.x, p.y, p.z);
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        const eclipsadorId = PARES_DE_ECLIPSE[this.idCorpo];
        if (q.fonte && eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            this.idCorpo,
            [p.x, p.y, p.z],
            [pEcl.x, pEcl.y, pEcl.z],
            this.sombra
          );
        } else {
          this.sombra.ativo = false;
        }
      } else {
        this.rUA = Number.NaN;
        this.centro.set(Number.NaN, Number.NaN, Number.NaN);
        this.sombra.ativo = false;
      }
    }
    e.rUA = this.rUA;

    const dPc = q.camPosPc.distanceTo(this.centro);
    const diametroPx = diametroAparentePx(this.raioA, dPc, q.screenHPx, q.fovDeg);
    e.diametroPx = diametroPx;

    this.armado = gateBinario(this.armado, diametroPx);

    if (this.texturas === 'fria' && (this.armado || q.atlasQuente)) {
      this.iniciarCarga();
    }

    const emQuadro =
      this.armado &&
      q.ligado &&
      this.texturas === 'pronta' &&
      Number.isFinite(this.centro.x);
    e.emQuadro = emQuadro;
    e.carregando = this.texturas === 'buscando';
    e.gateArmado = this.armado;
    this.group.visible = emQuadro;

    const base = q.fonte
      ? aMagBaseDe(FOTOMETRIA[this.idCorpo].H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
      : A_MAG_BASE_PC[this.idCorpo];
    const fase = faseDoVertice(
      this.centro.x, this.centro.y, this.centro.z,
      q.camPosPc.x, q.camPosPc.y, q.camPosPc.z
    );
    const halo = psfPointSizePx(
      magDoVertice(base, dPc, fase),
      q.psf.expoM0,
      q.psf.sigmaPx,
      q.screenHPx
    );
    const alvo = cessaoAlvo(emQuadro, diametroPx, halo);
    e.cede =
      q.salto || saltoDeData
        ? alvo
        : stepRampToward(e.cede, alvo, q.dtS, RAMP_DURATION_MS);
    e.emRampa = e.cede !== alvo;

    if (emQuadro) this.posicionar(q);
    return e;
  }

  private posicionar(q: QuadroDoGigante) {
    const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(
      IAU_ORIENTATIONS[this.idCorpo],
      this.jdEscrito
    );
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(this.raioA, this.raioA * this.razaoC, this.raioA * this.razaoB))
      .setPosition(this.centro);

    // a exposição da visita (item 91): lei viva × constante do corpo. O
    // ANEL recebe o MESMO `ganho` lá embaixo — o anel de Saturno paga a
    // mesma conta do globo, e era o 0,21 dele que o apagava junto.
    const ganho = ganhoDoGlobo(this.rUA, this.idCorpo, q.politica);
    const dirSol = this.vTmp.copy(this.centro).multiplyScalar(-1);
    const norma = Math.max(dirSol.length(), 1e-30);
    dirSol.multiplyScalar(1 / norma);
    const sLx = dirSol.dot(this.vX);
    const sLy = dirSol.dot(this.vY);
    const sLz = dirSol.dot(this.vZ);

    const delta = this.vTmp.copy(q.camPosPc).sub(this.centro);
    const cLx = delta.dot(this.vX) / this.raioA;
    const cLy = delta.dot(this.vY) / this.raioA;
    const cLz = delta.dot(this.vZ) / this.raioA;

    const u = this.matSuperficie!.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).set(sLx, sLy, sLz);
    (u.uCamLocal.value as THREE.Vector3).set(cLx, cLy, cLz);
    u.uLuzGanho.value = ganho;
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);

    if (this.anel && this.matAnel) {
      // M = Basis INERCIAL · S(a) · Rx(−π/2): o padrão não herda W(t)
      const inercial = orientacaoInercialDoAnelNaCena(
        IAU_ORIENTATIONS[this.idCorpo],
        this.jdEscrito
      );
      this.vAnelX.set(inercial.colunaX[0], inercial.colunaX[1], inercial.colunaX[2]);
      this.vAnelY.set(inercial.colunaY[0], inercial.colunaY[1], inercial.colunaY[2]);
      this.vAnelZ.set(inercial.colunaZ[0], inercial.colunaZ[1], inercial.colunaZ[2]);
      this.anel.matrix
        .makeBasis(this.vAnelX, this.vAnelY, this.vAnelZ)
        .scale(this.vEscala.set(this.raioA, this.raioA, this.raioA))
        .multiply(this.mRx)
        .setPosition(this.centro);
      const ua = this.matAnel.uniforms;
      const nSol = Math.max(this.centro.length(), 1e-30);
      const solX = -this.centro.x / nSol;
      const solY = -this.centro.y / nSol;
      const solZ = -this.centro.z / nSol;
      const sAx = solX * this.vAnelX.x + solY * this.vAnelX.y + solZ * this.vAnelX.z;
      const sAy = solX * this.vAnelY.x + solY * this.vAnelY.y + solZ * this.vAnelY.z;
      const sAz = solX * this.vAnelZ.x + solY * this.vAnelZ.y + solZ * this.vAnelZ.z;
      const cAx = delta.dot(this.vAnelX) / this.raioA;
      const cAy = delta.dot(this.vAnelY) / this.raioA;
      const cAz = delta.dot(this.vAnelZ) / this.raioA;
      // frame do anel: X=vAnelX, Y=vAnelZ, Z=−vAnelY (Rx(−π/2))
      (ua.uDirSolLocal.value as THREE.Vector3).set(sAx, sAz, -sAy);
      (ua.uCamLocal.value as THREE.Vector3).set(cAx, cAz, -cAy);
      ua.uLuzGanho.value = ganho;
    }
  }

  private garantirCasca() {
    if (this.geometria || this.disposto) return;
    this.geometria = new THREE.SphereGeometry(1, 128, 64);
    if (!this.dummyAnel) {
      this.dummyAnel = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
      this.dummyAnel.needsUpdate = true;
    }
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: GIGANTE_VERT,
      fragmentShader: GIGANTE_LAMBERT_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uMapaAnel: { value: this.dummyAnel },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        uNormalEsc: {
          value: new THREE.Vector3(1, 1 / (this.razaoC * this.razaoC), 1 / (this.razaoB * this.razaoB)),
        },
        uEscalaLocal: { value: new THREE.Vector3(1, this.razaoC, this.razaoB) },
        uAnelAtivo: { value: this.temAnel ? 1 : 0 },
        uAnelRaios: {
          value: new THREE.Vector2(
            (ANEIS_CITADOS[this.idCorpo] ?? ANEL_SATURNO).rInt,
            (ANEIS_CITADOS[this.idCorpo] ?? ANEL_SATURNO).rExt
          ),
        },
        ...uniformsDeEclipseNeutros(),
      },
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    // globo opaco = ocultador do rascunho do campo (item 47): estrela
    // atrás dele não deposita clarão. Anel/atmosfera/nuvens ficam fora.
    this.superficie.layers.enable(CAMADA_DOS_OCULTADORES);
    this.superficie.matrixAutoUpdate = false;
    this.group.add(this.superficie);

    if (this.temAnel) {
      const anel = ANEIS_CITADOS[this.idCorpo] ?? ANEL_SATURNO;
      const placa = this.idCorpo === 'saturn';
      const modo = this.idCorpo === 'neptune' ? 1 : this.idCorpo === 'quaoar' ? 2 : 0;
      this.geoAnel = new THREE.RingGeometry(anel.rInt, anel.rExt, 192);
      this.matAnel = new THREE.ShaderMaterial({
        vertexShader: ANEL_VERT,
        fragmentShader: placa ? ANEL_FRAG : ANEL_PROC_FRAG,
        uniforms: {
          uMapaAnel: { value: this.dummyAnel },
          uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
          uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
          uLuzGanho: { value: 1 },
          uKPolar: { value: this.kPolar },
          uAnelRaios: { value: new THREE.Vector2(anel.rInt, anel.rExt) },
          uModo: { value: modo },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.anel = new THREE.Mesh(this.geoAnel, this.matAnel);
      this.anel.matrixAutoUpdate = false;
      this.group.add(this.anel);
    }
  }

  /** a carga preguiçosa — `map` e, em Saturno, o `ring`, no MESMO lote:
   *  ou os dois entram, ou nenhum entra e nada fica residente. */
  private iniciarCarga() {
    this.texturas = 'buscando';
    const id = this.idCorpo;
    const comAnel = this.temAnel && id === 'saturn';
    const pedido = comAnel ? [CANAL_MAP, CANAL_ANEL] : [CANAL_MAP];
    void carregarCanaisDoCorpo(id, pedido, this.opcoes, () => this.disposto)
      .then((porCanal) => {
        // cancelada no caminho: o lote já foi descartado lá dentro
        if (!porCanal) return;
        // e o microtask entre a chegada e esta linha ainda cabe um
        // `dispose()` do Director — o lote não fica sem dono
        if (this.disposto) {
          for (const t of porCanal.values()) t.dispose();
          return;
        }
        const tex = porCanal.get('map')!;
        this.garantirCasca();
        this.matSuperficie!.uniforms.uMapaDia.value = tex;
        this.texturasVivas.push(tex);
        if (comAnel) {
          const texAnel = porCanal.get('ring')!;
          this.matSuperficie!.uniforms.uMapaAnel.value = texAnel;
          this.matAnel!.uniforms.uMapaAnel.value = texAnel;
          this.texturasVivas.push(texAnel);
        }
        this.texturas = 'pronta';
      })
      .catch(() => {
        if (this.disposto) return;
        const r = estadoAposFalha(this.recargas, id, 'o corpo não nasce nesta sessão');
        this.recargas = r.recargas;
        this.texturas = r.texturas;
      });
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    this.geoAnel?.dispose();
    this.matAnel?.dispose();
    this.dummyAnel?.dispose();
    for (const t of this.texturasVivas) t.dispose();
    this.texturasVivas.length = 0;
  }
}
