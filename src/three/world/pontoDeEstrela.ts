// ============================================================
// O PONTO DE UMA ESTRELA COM LUGAR que o catálogo não desenha: Sirius B
// (sub-pixel em todo quadro em que A é disco) e as anfitriãs fracas demais
// para `stars.bin` (TRAPPIST-1, Kepler-186). A estrela ganha o ponto da PSF
// da casa (o MESMO `starPSF`/`STAR_FRAG` do campo, tamanho de INSTRUMENTO —
// declarado), com a magnitude da física dela (R² × radiância visível,
// ponto-zero do campo) e a distância da câmera em float64 (uniform), nunca
// de posição de mundo no shader. Veio do motor simples do piloto
// (`corpoDeEstrela.ts`, apagado em 12/11 quando o motor do Sol passou a
// desenhar todas as estrelas visitáveis).
// ============================================================
import * as THREE from 'three';
import { M_V_SOL_DO_CAMPO, blackbodyLinear, radianciaVisivelDeCorpoNegro } from '../luzDaCasa';
import { GLSL_STAR_PSF } from '../shaders/common';
import {
  BETA_DA_EMISSAO,
  GLSL_ANEIS_NO_CAMINHO,
  STAR_FRAG,
  UNIFORMES_DOS_ANEIS,
} from '../shaders/starShaders';
import { GLSL_PONTO_NA_BORDA, GLSL_PONTO_NA_BORDA_VARYINGS } from '../shaders/pontoNaBorda';

const VERT_PONTO = /* glsl */ `
uniform float uM;
uniform float uScreenH;
uniform float uExpoM0;
uniform float uSigmaPx;
uniform float uPr2;
uniform float uPeso;
uniform vec3 uCor;
varying vec3 vColor;
varying float vSigma;
varying float vPeak;
${GLSL_PONTO_NA_BORDA_VARYINGS}
${GLSL_STAR_PSF}
${GLSL_PONTO_NA_BORDA}
${GLSL_ANEIS_NO_CAMINHO}
void main() {
  float size; float peak; float sigmaFrac;
  starPSF(uM, uExpoM0, uSigmaPx, uScreenH, size, peak, sigmaFrac);
  vColor = uCor;
  vSigma = sigmaFrac;
  float peso = uPeso;
  // o anel com perfil no caminho, pela lei do campo (starShaders.ts)
  if (uAnelLigado > 0.5) peso *= transmitanciaDosAneis(modelMatrix[3].xyz - cameraPosition);
  vPeak = peak * peso * uPr2;
  gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0));
  gl_PointSize = size;
  prenderPontoNoClip(uScreenH);
}
`;

/** O que o ponto precisa saber da estrela. */
export interface FotosferaDoPonto {
  readonly teffK: number;
  readonly raioRsol: number;
}

/** A magnitude absoluta V de uma fotosfera, no ponto-zero do CAMPO. */
export function magnitudeAbsolutaDe(f: FotosferaDoPonto): number {
  const lum = f.raioRsol * f.raioRsol * radianciaVisivelDeCorpoNegro(f.teffK);
  return M_V_SOL_DO_CAMPO - 2.5 * Math.log10(lum);
}

/** O ponto de luz de uma estrela que o catálogo não desenha. */
export class PontoDeEstrela {
  readonly points: THREE.Points;
  private readonly mat: THREE.ShaderMaterial;
  private readonly mAbs: number;
  /** m − 5·log10(d) deste ponto (a régua do clarão: `CandidataVisitada`) */
  readonly mBase: number;
  /** a cor deste ponto — o clarão dele sai na mesma */
  readonly cor: readonly [number, number, number];

  constructor(f: FotosferaDoPonto, expoM0: number, sigmaPx: number) {
    this.mAbs = magnitudeAbsolutaDe(f);
    this.mBase = this.mAbs - 5;
    const [r, g, b] = blackbodyLinear(f.teffK);
    this.cor = [r, g, b];
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT_PONTO,
      fragmentShader: STAR_FRAG,
      uniforms: {
        uM: { value: 30 },
        uScreenH: { value: 1080 },
        uExpoM0: { value: expoM0 },
        uSigmaPx: { value: sigmaPx },
        uPr2: { value: 1 },
        uPeso: { value: 1 },
        uCor: { value: new THREE.Vector3(r, g, b) },
        uBeta: { value: BETA_DA_EMISSAO },
        uArteDaCruz: { value: 1 },
        ...UNIFORMES_DOS_ANEIS,
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      transparent: true,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 7;
    this.points.visible = false;
  }

  escrever(q: { posPc: THREE.Vector3; distPc: number; screenH: number; pr2: number; peso: number }) {
    this.points.position.copy(q.posPc);
    const d = Math.max(q.distPc, 1e-15);
    const u = this.mat.uniforms;
    u.uM.value = this.mAbs + 5 * Math.log10(d) - 5;
    u.uScreenH.value = q.screenH;
    u.uPr2.value = q.pr2;
    u.uPeso.value = Number.isFinite(q.peso) ? Math.min(1, Math.max(0, q.peso)) : 1;
  }

  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}
