// ============================================================
// OS ROCHOSOS RESOLVIDOS (Onda 6, F3+F5) — Mercúrio, Vênus, Marte,
// Fobos, Deimos e as ~17 luas texturadas sob a MESMA lei da Terra e
// da Lua: uma classe genérica parametrizada por corpo, nascida do
// molde da Lua (lua.ts) com os dois ramos de BRDF que a fase pede.
//
// PROVENIÊNCIA: implementação NOVA, como as irmãs. Do doador
// atravessam como ESPEC: a lista dos 7 opt-in de Lommel-Seeliger
// (correção de fato 1 do desenho — aqui só Mercúrio é regolito;
// Vênus, Marte, Fobos e Deimos ficam na Lambert estática do
// doador) e a regra "planeta Lambertiano com textura real".
//
// AS QUATRO LEIS de terra.ts/lua.ts valem palavra por palavra
// (escalar único de luz, relógio do Director, orientação IAU
// medida, carga preguiçosa). O que muda por corpo é DADO:
//
//   - BRDF: 'ls' (Mercúrio + Io, Europa, Ganimedes, Calisto, Encélado
//     — os 5 opt-in da F5; o C = 4/3 DERIVADO por quadratura da Lua,
//     importado de lua.ts, nunca redigitado) ou 'lambert'.
//   - FIGURA: esfera ou elipsoide triaxial por BODY_AXES — a
//     escala anisotrópica mora na matriz, como o achatamento da
//     Terra. A NORMAL do elipsoide aqui é o gradiente EXATO
//     (x/a², y/c², z/b²): a aproximação de primeiro grau da Terra
//     (a/c em vez de a²/c²) erra 0,3% no achatamento terrestre,
//     mas em Fobos (a/c = 1,43) seria uma mentira geométrica.
//   - POSIÇÃO: os três planetas têm retrato congelado (o "sem
//     rede" honesto da Terra); Fobos e Deimos, como a Lua, só
//     nascem com a efeméride viva (Kepler composto com Marte —
//     a cadeia de posicaoHeliocentrica).
//   - CESSÃO: os três planetas têm ponto fotométrico na camada
//     (IDS_FOTOMETRIA) e cedem por dominância (D5), pelo MESMO
//     bloco da Terra; Fobos e Deimos, como a Lua, nascem
//     mesh↔nada aos 4 px do gate (pendência MH18, Onda 7).
//   - ECLIPSE: Fobos e Deimos ganharam o par na TABELA da lib
//     (data-only, F3) — a sombra de Marte. Os três planetas não
//     têm par: o fator fica neutro por construção da lib.
//
// VÊNUS É O TOPO DE NUVENS: o mapa é o 4k_venus_atmosphere (o que
// se vê do espaço). A superfície de radar NÃO entra — uma casca
// translúcida sobre ela fingiria enxergar através de 20 km de
// nuvem. A super-rotação das nuvens (4 dias) NÃO é modelada: o
// doador aplicava o 1,03 da Terra a qualquer casca, número sem
// fonte para Vênus — pendência declarada, textura gira com o W
// sólido IAU (retrógrado, que o kernel já carrega).
// ============================================================
import * as THREE from 'three';
import { AU_KM } from '../../../lib/atlas/elementosOrbitais';
import {
  AU_PARA_PC,
  eclipticaParaEquatorial,
} from '../../../lib/atlas/frameGalactico';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../../lib/atlas/iauOrientation';
import { ganhoFundido } from '../../../lib/atlas/luz';
import type { PoliticaDeLuz } from '../../../lib/atlas/luz';
import {
  GLSL_SOMBRA_ECLIPSE,
  PARES_DE_ECLIPSE,
  criaSombraNaCena,
  resolveSombraNaCena,
} from '../../../lib/atlas/eclipse';
import type { QualityLevel } from '../../core/engine';
import type { FonteDeEfemerides, PsfDoCampo } from '../planetas/planetas';
import {
  A_MAG_BASE_PC,
  DESLOCAMENTO_UA_PARA_PC,
  faseDoVertice,
  magDoVertice,
} from '../planetas/planetas';
import { FOTOMETRIA, aMagBaseDe } from '../planetas/fotometria';
import { RETRATO_2026 } from '../planetas/retrato2026';
import { RAMP_DURATION_MS, psfPointSizePx, stepRampToward } from '../lodStellar';
import { diametroAparentePx } from './corpos';
import { LS_NORMALIZACAO_GLSL } from './lua';
import {
  RECARGAS_ATE_DESISTIR,
  alvoDePixels,
  cessaoAlvo,
  detectarWebp,
  escolherVariante,
  escreverSombraDeEclipse,
  LIMIAR_DO_GATE_PX,
  gateBinario,
  orientacaoDoCorpoNaCena,
  uniformsDeEclipseNeutros,
} from './terra';
import type { ManifestDeTexturas } from './terra';


/**
 * Limiar aparente da LUA rochosa. O gate do planeta (4 px) nasceria
 * Io/Europa/Ganimedes (37/10/11 px) no retrato oficial de Júpiter e
 * Tétis/Titã no de Saturno — as 4 vistas da F4 deixariam de ser
 * bit-idênticas. 64 px é ~16× o limiar do planeta: a lua só entra
 * como assunto (a vista titan/europa mede ~829 px a 4 raios).
 */
export const LIMIAR_LUA_ROCHOSA_PX = 64;

/** Os dois BRDFs da fase — Lommel-Seeliger (regolito) ou Lambert. */
export type BrdfDoRochoso = 'ls' | 'lambert';

/** A configuração de um corpo rochoso — dado, nunca ramo novo. */
export interface ConfigDoRochoso {
  readonly id: string;
  readonly brdf: BrdfDoRochoso;
}

/**
 * OS ROCHOSOS DA F3+F5, na ordem do Sol para fora. A lista é o
 * DADO VIVO que o Director percorre para construir, ticar e
 * descartar — a "lista dos corpos construídos, nunca redigitada"
 * que a escada consulta (director.ts, `podeAproximar`).
 * Vanth/Weywot NÃO entram: sem textura/licença não nasce mesh.
 */
export const ROCHOSOS: readonly ConfigDoRochoso[] = [
  { id: 'mercury', brdf: 'ls' },
  { id: 'venus', brdf: 'lambert' },
  { id: 'mars', brdf: 'lambert' },
  { id: 'phobos', brdf: 'lambert' },
  { id: 'deimos', brdf: 'lambert' },
  { id: 'io', brdf: 'ls' },
  { id: 'europa', brdf: 'ls' },
  { id: 'ganymede', brdf: 'ls' },
  { id: 'callisto', brdf: 'ls' },
  { id: 'mimas', brdf: 'lambert' },
  { id: 'enceladus', brdf: 'ls' },
  { id: 'tethys', brdf: 'lambert' },
  { id: 'dione', brdf: 'lambert' },
  { id: 'rhea', brdf: 'lambert' },
  { id: 'titan', brdf: 'lambert' },
  { id: 'iapetus', brdf: 'lambert' },
  { id: 'miranda', brdf: 'lambert' },
  { id: 'ariel', brdf: 'lambert' },
  { id: 'umbriel', brdf: 'lambert' },
  { id: 'titania', brdf: 'lambert' },
  { id: 'oberon', brdf: 'lambert' },
  { id: 'triton', brdf: 'lambert' },
];

/** Raios do corpo em pc — BODY_AXES (a fonte única) pelos
 *  conversores únicos; nenhum literal novo de comprimento. */
export function raiosDoRochosoPc(id: string): { a: number; c: number; b: number } {
  const [aKm, bKm, cKm] = BODY_AXES[id];
  return {
    a: (aKm / AU_KM) * AU_PARA_PC,
    c: (cKm / AU_KM) * AU_PARA_PC,
    b: (bKm / AU_KM) * AU_PARA_PC,
  };
}

/**
 * A posição heliocêntrica em UA (eclíptica J2000): efeméride viva
 * quando há fonte; o RETRATO congelado quando não há E o corpo é
 * planeta (o estado honesto do "sem rede", idêntico ao da camada);
 * null para lua sem fonte (não há luas no retrato — o contrato da
 * Lua, palavra por palavra).
 */
export function posicaoDoRochosoUA(
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
// GLSL — os dois BRDFs, shaders próprios no padrão da casa.
// ------------------------------------------------------------

const ROCHOSO_VERT = /* glsl */ `
varying vec3 vLocal; // posição na ESFERA UNITÁRIA (a figura mora na matriz)
varying vec2 vUv;
void main() {
  vLocal = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLSL_NORMAL_ELIPSOIDE = /* glsl */ `
// gradiente exato do elipsoide (x/a², y/c², z/b²) em unidades de a:
// uNormalEsc = (1, a²/c², a²/b²) — esfera ⇒ (1,1,1) exato
vec3 normalDoCorpo(vec3 p, vec3 esc) { return normSeguro(p * esc); }
`;

/**
 * LAMBERT — Vênus, Marte, Fobos, Deimos e as luas sem opt-in de
 * regolito: difusa cos(incidência) e nada mais (a esfera Lambertiana
 * estática do doador). O eclipse entra pelo chunk único da lib, SÓ
 * na direta, depois do BRDF.
 */
export const ROCHOSO_LAMBERT_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;  // corpo→Sol, frame LOCAL (unitário)
uniform vec3 uCamLocal;     // câmera no frame local, em raios de a
uniform float uLuzGanho;    // ganhoFundido(dUA da CADEIA) — o escalar único
uniform vec3 uNormalEsc;    // (1, a²/c², a²/b²): gradiente do elipsoide
uniform vec3 uEscalaLocal;  // (1, c/a, b/a): ponto real do elipsoide
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  float ndotl = max(dot(n, uDirSolLocal), 0.0);
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  vec3 direta =
    (albedo * ndotl) * uLuzGanho * fatorDeEclipse(pElip, n, dot(n, uDirSolLocal));
  gl_FragColor = vec4(direta, 1.0);
}
`;

/**
 * LOMMEL-SEELIGER — Mercúrio e os 5 opt-in da F5 (Io, Europa,
 * Ganimedes, Calisto, Encélado), da lista dos 7 (correção de fato 1
 * do desenho; a Lua consome o mesmo C em lua.ts): a MESMA lei, com
 * o C = 4/3 importado dela (a derivação por quadratura mora em
 * lua.test.ts e cobre TODOS os consumidores — o literal é UM só).
 */
export const ROCHOSO_LS_FRAG = /* glsl */ `
uniform sampler2D uMapaDia;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform vec3 uNormalEsc;
uniform vec3 uEscalaLocal;
varying vec3 vLocal;
varying vec2 vUv;
vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_NORMAL_ELIPSOIDE}
${GLSL_SOMBRA_ECLIPSE}
void main() {
  vec3 n = normalDoCorpo(vLocal, uNormalEsc);
  vec3 pElip = vLocal * uEscalaLocal;
  vec3 albedo = texture2D(uMapaDia, vUv).rgb;
  float mu0 = clamp(dot(n, uDirSolLocal), 0.0, 1.0);
  float mu = clamp(dot(n, normSeguro(uCamLocal - pElip)), 0.0, 1.0);
  float ls = ${LS_NORMALIZACAO_GLSL} * mu0 / max(mu0 + mu, 1.0e-4);
  vec3 direta = albedo * (ls * uLuzGanho) * fatorDeEclipse(pElip, n, mu0);
  gl_FragColor = vec4(direta, 1.0);
}
`;

// ------------------------------------------------------------
// A classe — o molde é a Lua; o que a Terra tem a mais (cessão,
// retrato) entra como ramo de DADO (planeta × lua), nunca cópia.
// ------------------------------------------------------------

/** O que o Director entrega por tick. */
export interface QuadroDoRochoso {
  jdTdb: number;
  fonte: FonteDeEfemerides | null;
  camPosPc: THREE.Vector3;
  screenHPx: number;
  fovDeg: number;
  ligado: boolean;
  atlasQuente: boolean;
  politica: PoliticaDeLuz;
  /** os três de PLANETA (a cessão suave, D5); luas ignoram. */
  dtS: number;
  psf: PsfDoCampo;
  salto: boolean;
}

export interface EstadoDoRochoso {
  emQuadro: boolean;
  carregando: boolean;
  gateArmado: boolean;
  cede: number;
  emRampa: boolean;
  raioPc: number;
  centroPc: THREE.Vector3;
  diametroPx: number;
  /** distância heliocêntrica da CADEIA, em UA; NaN sem posição. */
  rUA: number;
}

export interface OpcoesDoRochoso {
  config: ConfigDoRochoso;
  tier: QualityLevel;
  maxTextureSize?: number;
  base: string;
  webp?: boolean;
  buscarManifest?: (url: string) => Promise<ManifestDeTexturas>;
  carregarTextura?: (url: string) => Promise<THREE.Texture>;
}

type EstadoDasTexturas = 'fria' | 'buscando' | 'pronta' | 'falhou';

export class RochosoResolvido {
  readonly group = new THREE.Group();

  private readonly config: ConfigDoRochoso;
  private readonly raioA: number;
  private readonly razaoC: number; // c/a
  private readonly razaoB: number; // b/a
  /** planeta ⇒ retrato congelado de fallback + cessão do ponto (D5) */
  private readonly ehPlaneta: boolean;

  private readonly centro = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);
  private jdEscrito = Number.NaN;
  private fonteEscrita: FonteDeEfemerides | null = null;
  private rUA = Number.NaN;
  private armado = false;

  /** a sombra do eclipse (F3: Fobos/Deimos ← Marte), no cache de
   *  jd/fonte — scratch único (out-parameter), como nas irmãs */
  private readonly sombra = criaSombraNaCena();

  private texturas: EstadoDasTexturas = 'fria';
  private recargas = 0;
  private readonly texturasVivas: THREE.Texture[] = [];
  private disposto = false;

  private geometria: THREE.SphereGeometry | null = null;
  private superficie: THREE.Mesh | null = null;
  private matSuperficie: THREE.ShaderMaterial | null = null;

  // rascunhos reusados — zero alocação por quadro (M4 da casa)
  private readonly vX = new THREE.Vector3();
  private readonly vY = new THREE.Vector3();
  private readonly vZ = new THREE.Vector3();
  private readonly vTmp = new THREE.Vector3();
  private readonly vEscala = new THREE.Vector3();
  private readonly estado: EstadoDoRochoso;

  /** o estado do último tick — somente leitura; o centro é VIVO. */
  get estadoVivo(): Readonly<EstadoDoRochoso> {
    return this.estado;
  }

  /** o id da casa ('mercury'…'deimos') — o Director registra por ele. */
  get id(): string {
    return this.config.id;
  }

  /** planeta (retrato + cessão do ponto) × lua (sem fonte, não nasce). */
  get planeta(): boolean {
    return this.ehPlaneta;
  }

  private readonly opcoes: OpcoesDoRochoso;

  constructor(opcoes: OpcoesDoRochoso) {
    this.opcoes = opcoes;
    this.config = opcoes.config;
    const { a, c, b } = raiosDoRochosoPc(this.config.id);
    this.raioA = a;
    this.razaoC = c / a;
    this.razaoB = b / a;
    this.ehPlaneta = this.config.id in RETRATO_2026;
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

  /**
   * O TICK — a mesma ordem das irmãs: posição (cache por jd E fonte)
   * → diâmetro aparente → gate → gatilho de textura → matriz e
   * uniforms (só em quadro). Sem posição (lua sem efeméride) o
   * centro fica NaN e nada entra em quadro — o contrato da Lua.
   */
  atualizar(q: QuadroDoRochoso): EstadoDoRochoso {
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
      const p = posicaoDoRochosoUA(this.config.id, q.jdTdb, q.fonte);
      if (p) {
        this.rUA = Math.hypot(p.x, p.y, p.z);
        const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
        this.centro.set(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
        // O ECLIPSE (F2c/F3): o par da TABELA, no MESMO relógio do
        // quadro — sem fonte viva não há eclipsador medido, e corpo
        // sem par fica neutro por construção da lib
        const eclipsadorId = PARES_DE_ECLIPSE[this.config.id];
        if (q.fonte && eclipsadorId) {
          const pEcl = q.fonte.posicaoHeliocentrica(eclipsadorId, q.jdTdb);
          resolveSombraNaCena(
            this.config.id,
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

    this.armado = gateBinario(
      this.armado,
      this.ehPlaneta
        ? diametroPx
        : diametroPx * (LIMIAR_DO_GATE_PX / LIMIAR_LUA_ROCHOSA_PX)
    );

    // o MESMO gatilho duplo das irmãs (lei 4): gate armado OU fase atlas
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

    // A CESSÃO SUAVE do ponto fotométrico (D5) — só PLANETA tem ponto
    // na camada; a conta é a da Terra, palavra por palavra, com o H do
    // corpo (FOTOMETRIA) e a MESMA base da camada (efeméride viva com
    // fonte, retrato sem ela).
    if (this.ehPlaneta) {
      const base = q.fonte
        ? aMagBaseDe(FOTOMETRIA[this.config.id].H, this.rUA) + DESLOCAMENTO_UA_PARA_PC
        : A_MAG_BASE_PC[this.config.id];
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
    }

    if (emQuadro) this.posicionar(q);
    return e;
  }

  /** matriz + uniforms do quadro — só roda com o mesh em quadro. */
  private posicionar(q: QuadroDoRochoso) {
    const { colunaX, colunaY, colunaZ } = orientacaoDoCorpoNaCena(
      IAU_ORIENTATIONS[this.config.id],
      this.jdEscrito
    );
    this.vX.set(colunaX[0], colunaX[1], colunaX[2]);
    this.vY.set(colunaY[0], colunaY[1], colunaY[2]);
    this.vZ.set(colunaZ[0], colunaZ[1], colunaZ[2]);

    // a figura (esfera ou triaxial) mora na escala da matriz — a
    // geometria é sempre a esfera unitária (a lição da Terra)
    const sup = this.superficie!;
    sup.matrix
      .makeBasis(this.vX, this.vY, this.vZ)
      .scale(this.vEscala.set(this.raioA, this.raioA * this.razaoC, this.raioA * this.razaoB))
      .setPosition(this.centro);

    // frame local (CPU em float64): câmera em raios de a, Sol unitário
    const ganho = ganhoFundido(this.rUA, q.politica);
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
    // a sombra do eclipse — o mesmo fio das irmãs (sem deriva: casca única)
    escreverSombraDeEclipse(u, this.sombra, this.vX, this.vY, this.vZ, 0);
  }

  /** geometria + material + mesh, UMA vez, na primeira necessidade. */
  private garantirCasca() {
    if (this.geometria || this.disposto) return;
    this.geometria = new THREE.SphereGeometry(1, 128, 64);
    this.matSuperficie = new THREE.ShaderMaterial({
      vertexShader: ROCHOSO_VERT,
      fragmentShader:
        this.config.brdf === 'ls' ? ROCHOSO_LS_FRAG : ROCHOSO_LAMBERT_FRAG,
      uniforms: {
        uMapaDia: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        // o gradiente EXATO do elipsoide (o cabeçalho diz por que não
        // é a aproximação de primeiro grau da Terra)
        uNormalEsc: {
          value: new THREE.Vector3(1, 1 / (this.razaoC * this.razaoC), 1 / (this.razaoB * this.razaoB)),
        },
        uEscalaLocal: { value: new THREE.Vector3(1, this.razaoC, this.razaoB) },
        ...uniformsDeEclipseNeutros(),
      },
      // corpo resolvido OPACO: escreve e testa o depth do palco (F0)
      depthWrite: true,
      depthTest: true,
      transparent: false,
    });
    this.superficie = new THREE.Mesh(this.geometria, this.matSuperficie);
    this.superficie.matrixAutoUpdate = false;
    this.group.add(this.superficie);
  }

  /** a carga preguiçosa — manifest, escada por tier, UM canal (map). */
  private iniciarCarga() {
    this.texturas = 'buscando';
    const { base, tier, maxTextureSize } = this.opcoes;
    const id = this.config.id;
    const buscar =
      this.opcoes.buscarManifest ??
      (async (url: string): Promise<ManifestDeTexturas> => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.json() as Promise<ManifestDeTexturas>;
      });
    const carregar =
      this.opcoes.carregarTextura ??
      ((url: string) => new THREE.TextureLoader().loadAsync(url));
    const webpOk = this.opcoes.webp ?? detectarWebp();

    void (async () => {
      const manifest = await buscar(`${base}data/atlas/texturas.json`);
      const alvo = alvoDePixels(tier, 'map', maxTextureSize);
      const variante = escolherVariante(manifest.entradas, id, 'map', alvo, webpOk);
      if (!variante) throw new Error(`${id} sem variante para 'map' ≤ ${alvo}px`);
      const tex = await carregar(`${base}${variante.arquivo}`);
      if (this.disposto) {
        tex.dispose();
        return;
      }
      // cor em sRGB; wrap REPEAT em U (a emenda 0/360 do equiretangular)
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = 4;
      this.garantirCasca();
      this.matSuperficie!.uniforms.uMapaDia.value = tex;
      this.texturasVivas.push(tex);
      this.texturas = 'pronta';
    })().catch(() => {
      if (this.disposto) return;
      // o MESMO backoff contado das irmãs (auditoria item 6): falha
      // volta a 'fria' e o gatilho rearma, até RECARGAS_ATE_DESISTIR;
      // planeta que desiste conserva o PONTO com a fotometria certa
      // (degradação honesta), lua que desiste simplesmente não nasce.
      if (this.recargas < RECARGAS_ATE_DESISTIR) {
        this.recargas++;
        this.texturas = 'fria';
      } else {
        this.texturas = 'falhou';
        console.warn(
          `[${id}] carga de textura falhou ${1 + RECARGAS_ATE_DESISTIR}×; o corpo não nasce nesta sessão`
        );
      }
    });
  }

  dispose() {
    this.disposto = true;
    this.group.clear();
    this.geometria?.dispose();
    this.matSuperficie?.dispose();
    for (const t of this.texturasVivas) t.dispose();
    this.texturasVivas.length = 0;
  }
}
