// ============================================================
// AS ESTRELAS S NA CENA (13/11/2026) — as estrelas que giram em volta de
// Sagittarius A✱, nas posições que as órbitas medidas dão para o `jd` do
// Director (`lib/estrelasS.ts`), como pontos pela lei da casa (a MESMA
// PSF `starPSF`/`STAR_FRAG` do campo e de `pontoDeEstrela.ts`, magnitude
// pela física de cada uma), e as órbitas como linhas tênues, numa camada
// que o visitante liga e desliga (`noorbitass`).
//
// POR QUE DEPOIS DO PASSE DO BURACO. O passe (`blackHole.ts`) dobra a
// cena inteira como se tudo estivesse ATRÁS do buraco, e o buraco que ele
// desenha entre 1,4 pc e a vista de perto é inflado: o RS desenhado fica
// ~1/27 da distância da câmera (medido: 391 UA a 0,05 pc, 77 UA a 2.000
// UA, contra 0,085 UA reais), então a sombra ocupa sempre ~5,5° de raio e
// o disco ~45°. As órbitas S (periastro de S2: 120 UA; apoastro: 1.944
// UA) caem DENTRO desse buraco falso em toda a descida; dobradas por ele,
// as órbitas medidas sairiam tortas. Por isso as estrelas S entram por
// cima do passe (`Post.addSobreOBuraco`), na posição verdadeira, sem a
// lente de um buraco que não tem o tamanho real.
//
// A REGRA DA SOMBRA: uma estrela S (ou um trecho de órbita) cuja linha de
// visada cai DENTRO da sombra desenhada some, na frente ou atrás — é o
// que se vê no lugar dela. Sem isso, de longe, o aglomerado viraria um
// nó de pontos DENTRO do disco preto, como se as estrelas estivessem no
// buraco. A sombra cresce com o desenho inflado, e a regra é a mesma em
// toda escala: de longe (a mais de ~0,6 pc) o aglomerado inteiro cabe na
// sombra e nada aparece; de perto, as estrelas saem da borda dela.
//
// PRECISÃO: o grupo mora em Sgr A✱ e a geometria é o deslocamento até ele
// (milésimos de pc em float32); a translação câmera↔centro entra pela
// `modelViewMatrix`, calculada em float64 na CPU — a câmera a 8 kpc do
// Sol não borra nada.
// ============================================================
import * as THREE from 'three';
import { B_CRITICO } from '../../lib/buracoNegro';
import { ESTRELAS_S, jdDoAno, posicaoDaEstrelaS } from '../../lib/estrelasS';
import { blackbodyLinear } from '../luzDaCasa';
import { GLSL_STAR_PSF } from '../shaders/common';
import { BETA_DA_EMISSAO, STAR_FRAG } from '../shaders/starShaders';
import { GLSL_PONTO_NA_BORDA, GLSL_PONTO_NA_BORDA_VARYINGS } from '../shaders/pontoNaBorda';
import { GAL } from './baseGalactica';
import { entregaDoBuraco } from './blackHole';
import { magnitudeAbsolutaDe } from './pontoDeEstrela';
import { PRIORIDADE_DO_ROTULO, projectForced } from './labels';
import type { StarLabel } from './labels';
import { CHAVE_DE_LUGAR } from './lugaresDoCeu';

/** além disto (pc do centro) o aglomerado inteiro cabe na sombra inflada:
 *  nada se desenha e o passe nem roda (o filme a 1,5 pc sai igual) */
export const ALCANCE_DAS_ESTRELAS_S_PC = 1;
/** pontos por órbita (amostrados em anomalia verdadeira) */
const PONTOS_DA_ORBITA = 256;
/** a cor das órbitas, a mesma neutra das órbitas da casa (`orbitas.ts`) */
const COR_DA_ORBITA = new THREE.Color(0.62, 0.7, 0.85);
/** tênues: S2 um pouco mais que as vizinhas */
const ALFA_DA_ORBITA_S2 = 0.5;
const ALFA_DA_ORBITA = 0.12;
/**
 * AS LINHAS SÃO MAPA, vistas de fora do aglomerado: com a câmera DENTRO
 * das órbitas (a vista de perto fica a 2 UA do buraco, e o periastro de
 * S2 é 120 UA) cada órbita vira uma reta riscando o céu inteiro. Elas
 * somem entre 400 e 150 UA do centro; as estrelas ficam.
 */
const ORBITAS_SOMEM_EM_PC = 150 / 206264.806;
const ORBITAS_PLENAS_EM_PC = 400 / 206264.806;
/** a borda da regra da sombra, em raios aparentes da sombra */
const SOMBRA_SOME = 1.05;
const SOMBRA_VOLTA = 1.35;

const GLSL_SOMBRA = /* glsl */ `
uniform float uSenSombra;
float foraDaSombraEntre(vec3 pView, vec3 centro) {
  if (uSenSombra <= 0.0) return 1.0;
  float ang = acos(clamp(dot(normalize(pView), normalize(centro)), -1.0, 1.0));
  float th = asin(min(uSenSombra, 1.0));
  return smoothstep(th * ${SOMBRA_SOME.toFixed(2)}, th * ${SOMBRA_VOLTA.toFixed(2)}, ang);
}
`;

const VERT_PONTOS = /* glsl */ `
attribute float aM;
attribute vec3 aCor;
uniform float uScreenH;
uniform float uExpoM0;
uniform float uSigmaPx;
uniform float uPr2;
varying vec3 vColor;
varying float vSigma;
varying float vPeak;
${GLSL_PONTO_NA_BORDA_VARYINGS}
${GLSL_STAR_PSF}
${GLSL_PONTO_NA_BORDA}
${GLSL_SOMBRA}
void main() {
  float size; float peak; float sigmaFrac;
  starPSF(aM, uExpoM0, uSigmaPx, uScreenH, size, peak, sigmaFrac);
  vec4 pv = modelViewMatrix * vec4(position, 1.0);
  float vis = foraDaSombraEntre(pv.xyz, (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz);
  vColor = aCor;
  vSigma = sigmaFrac;
  vPeak = peak * uPr2 * vis;
  gl_Position = projectionMatrix * pv;
  gl_PointSize = vis > 0.0 ? size : 0.0;
  prenderPontoNoClip(uScreenH);
}
`;

// a regra da sombra POR FRAGMENTO: um trecho de órbita quase de perfil
// atravessa a sombra entre dois vértices fora dela, e o teste por vértice
// o deixava riscar o disco preto
const VERT_ORBITA = /* glsl */ `
varying vec3 vPos;
varying vec3 vCentro;
void main() {
  vec4 pv = modelViewMatrix * vec4(position, 1.0);
  vPos = pv.xyz;
  vCentro = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * pv;
}
`;

const FRAG_ORBITA = /* glsl */ `
uniform vec3 uCor;
uniform float uAlfa;
varying vec3 vPos;
varying vec3 vCentro;
${GLSL_SOMBRA}
void main() {
  gl_FragColor = vec4(uCor * (uAlfa * foraDaSombraEntre(vPos, vCentro)), 1.0);
}
`;

/** a direção Sol→Sgr A✱ da cena, onde a base do céu das órbitas se apoia */
function direcaoDoCentro(): [number, number, number] {
  const d = GAL.GC_POS.clone().normalize();
  return [d.x, d.y, d.z];
}

/** o ano decimal em que a estrela está na anomalia verdadeira `nu` */
function anoNaAnomalia(nu: number, o: { e: number; periastroAno: number; periodoAnos: number }): number {
  const E = 2 * Math.atan(Math.sqrt((1 - o.e) / (1 + o.e)) * Math.tan(nu / 2));
  const M = E - o.e * Math.sin(E);
  return o.periastroAno + (M / (2 * Math.PI)) * o.periodoAnos;
}

/**
 * O raio aparente da sombra desenhada, como seno do ângulo, com a câmera
 * a `dGC` pc do centro e o RS desenhado `rsPc` (`entregaDoBuraco`). Zero
 * quando o buraco não está desenhado.
 */
export function senoDaSombra(dGC: number, rsPc: number, buracoDesenhado: boolean): number {
  if (!buracoDesenhado || !(rsPc > 0)) return 0;
  return Math.min(1, (B_CRITICO * rsPc) / Math.max(dGC, 1e-30));
}

/** o quanto um ponto (offset do centro, pc) está fora da sombra — a MESMA conta do shader */
export function foraDaSombra(camPos: THREE.Vector3, offset: THREE.Vector3, senSombra: number): number {
  if (senSombra <= 0) return 1;
  const c = _c.copy(GAL.GC_POS).sub(camPos);
  const p = _p.copy(GAL.GC_POS).add(offset).sub(camPos);
  const ang = c.angleTo(p);
  const th = Math.asin(Math.min(senSombra, 1));
  return THREE.MathUtils.smoothstep(ang, th * SOMBRA_SOME, th * SOMBRA_VOLTA);
}
const _c = new THREE.Vector3();
const _p = new THREE.Vector3();
const _w = new THREE.Vector3();

export interface QuadroDasEstrelasS {
  camPos: THREE.Vector3;
  jd: number;
  /** o RS desenhado agora (`entregaDoBuraco`), pc */
  rsPc: number;
  /** o buraco está desenhado (passe vivo e camada ligada) */
  buracoDesenhado: boolean;
  hPx: number;
  pr2: number;
  expoM0: number;
  sigmaPx: number;
  orbitas: boolean;
}

export class EstrelasS {
  /** a cena que o passe por cima do buraco desenha */
  readonly cena = new THREE.Scene();
  private readonly grupo = new THREE.Group();
  private readonly pontos: THREE.Points;
  private readonly matPontos: THREE.ShaderMaterial;
  private readonly orbitas: THREE.LineLoop[] = [];
  private readonly mAbs: Float32Array;
  private readonly direcao = direcaoDoCentro();
  /** os deslocamentos vivos, pc (S2 é o índice 0) */
  private readonly offsets = ESTRELAS_S.map(() => new THREE.Vector3());
  private senSombra = 0;
  private vivo = false;

  constructor() {
    this.grupo.position.copy(GAL.GC_POS);
    this.cena.add(this.grupo);
    const n = ESTRELAS_S.length;
    this.mAbs = new Float32Array(ESTRELAS_S.map((s) => magnitudeAbsolutaDe(s)));
    const cores = new Float32Array(n * 3);
    ESTRELAS_S.forEach((s, i) => cores.set(blackbodyLinear(s.teffK), i * 3));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aM', new THREE.BufferAttribute(new Float32Array(n).fill(99), 1));
    geo.setAttribute('aCor', new THREE.BufferAttribute(cores, 3));
    this.matPontos = new THREE.ShaderMaterial({
      vertexShader: VERT_PONTOS,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uScreenH: { value: 1080 },
        uExpoM0: { value: 3.5 },
        uSigmaPx: { value: 0.85 },
        uPr2: { value: 1 },
        uSenSombra: { value: 0 },
        uBeta: { value: BETA_DA_EMISSAO },
        uArteDaCruz: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });
    this.pontos = new THREE.Points(geo, this.matPontos);
    this.pontos.frustumCulled = false;
    this.pontos.renderOrder = 2;

    const dir = this.direcao;
    for (const s of ESTRELAS_S) {
      const pos = new Float32Array(PONTOS_DA_ORBITA * 3);
      for (let k = 0; k < PONTOS_DA_ORBITA; k++) {
        const nu = -Math.PI + ((k + 0.5) / PONTOS_DA_ORBITA) * 2 * Math.PI;
        pos.set(posicaoDaEstrelaS(jdDoAno(anoNaAnomalia(nu, s.orbita)), s, dir), k * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_ORBITA,
        fragmentShader: FRAG_ORBITA,
        uniforms: {
          uCor: { value: COR_DA_ORBITA },
          uAlfa: { value: 0 },
          uSenSombra: this.matPontos.uniforms.uSenSombra,
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
      });
      const linha = new THREE.LineLoop(g, mat);
      linha.frustumCulled = false;
      linha.renderOrder = 1;
      this.orbitas.push(linha);
      this.grupo.add(linha);
    }
    this.grupo.add(this.pontos);
    this.grupo.visible = false;
  }

  /** há algo a desenhar neste quadro (o passe por cima do buraco roda) */
  get ativo(): boolean {
    return this.vivo;
  }

  atualizar(q: QuadroDasEstrelasS) {
    const dGC = q.camPos.distanceTo(GAL.GC_POS);
    this.vivo = Number.isFinite(q.jd) && dGC < ALCANCE_DAS_ESTRELAS_S_PC;
    this.grupo.visible = this.vivo;
    if (!this.vivo) return;
    this.senSombra = senoDaSombra(dGC, q.rsPc, q.buracoDesenhado);
    const pos = this.pontos.geometry.getAttribute('position') as THREE.BufferAttribute;
    const aM = this.pontos.geometry.getAttribute('aM') as THREE.BufferAttribute;
    ESTRELAS_S.forEach((s, i) => {
      const [x, y, z] = posicaoDaEstrelaS(q.jd, s, this.direcao);
      this.offsets[i].set(x, y, z);
      pos.setXYZ(i, x, y, z);
      // a distância em float64, nunca da posição de mundo no shader
      const d = _w.copy(GAL.GC_POS).add(this.offsets[i]).distanceTo(q.camPos);
      aM.setX(i, this.mAbs[i] + 5 * Math.log10(Math.max(d, 1e-15)) - 5);
    });
    pos.needsUpdate = true;
    aM.needsUpdate = true;
    const u = this.matPontos.uniforms;
    u.uScreenH.value = q.hPx;
    u.uExpoM0.value = q.expoM0;
    u.uSigmaPx.value = q.sigmaPx;
    u.uPr2.value = q.pr2;
    u.uSenSombra.value = this.senSombra;
    const presenca = THREE.MathUtils.smoothstep(dGC, ORBITAS_SOMEM_EM_PC, ORBITAS_PLENAS_EM_PC);
    this.orbitas.forEach((l, i) => {
      l.visible = q.orbitas && presenca > 0;
      (l.material as THREE.ShaderMaterial).uniforms.uAlfa.value =
        presenca * (i === 0 ? ALFA_DA_ORBITA_S2 : ALFA_DA_ORBITA);
    });
  }

  dispose() {
    this.pontos.geometry.dispose();
    this.matPontos.dispose();
    for (const l of this.orbitas) {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    }
  }
}

/**
 * O NOME DE S2 sobre a estrela viva (só no Atlas — no filme os nomes são
 * do roteiro): onde ela não está coberta pela sombra desenhada e a câmera
 * está no alcance das estrelas S. O clique leva ao lugar `s2`.
 */
export function projetarS2(camera: THREE.PerspectiveCamera, jd: number): StarLabel[] {
  const dGC = camera.position.distanceTo(GAL.GC_POS);
  if (!Number.isFinite(jd) || dGC >= ALCANCE_DAS_ESTRELAS_S_PC) return [];
  const [x, y, z] = posicaoDaEstrelaS(jd, ESTRELAS_S[0], direcaoDoCentro());
  const offset = _o.set(x, y, z);
  const vis = foraDaSombra(camera.position, offset, senoDaSombra(dGC, entregaDoBuraco(dGC).rsPc, true));
  if (vis < 0.5) return [];
  const l = projectForced(camera, 'S2', '', _w.copy(GAL.GC_POS).add(offset), `${CHAVE_DE_LUGAR}s2`);
  if (!l) return [];
  l.opacity = 0.95 * vis;
  l.prioridade = PRIORIDADE_DO_ROTULO.lugar;
  return [l];
}
const _o = new THREE.Vector3();
