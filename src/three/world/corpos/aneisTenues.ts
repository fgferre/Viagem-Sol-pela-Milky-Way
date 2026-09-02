// ============================================================
// OS DOIS ANÉIS TÊNUES DE SATURNO (item 134/S5) — o F e o E, portados do
// projeto Saturn do dono (`src/materials/fRing.ts` e `src/effects/eRing.ts`,
// lá em TSL/WebGPU).
//
// O QUE ATRAVESSA É A MATEMÁTICA, NÃO O CÓDIGO. Lá o desvio radial da fita
// do F mora num `positionNode` de nó; aqui é o mesmo desvio escrito no
// vértice em GLSL. Os números — raio, largura, deslocamento e brilho das
// três fitas, os canais de Prometeu, o pico do E na órbita de Encélado —
// são os DELE, letra por letra.
//
// POR QUE NÃO ENTRAM NO PERFIL MEDIDO DO ANEL PRINCIPAL: o dado do Björn
// Jónsson (`gigante.ts`, `PERFIL_DO_ANEL`) é RADIAL e simétrico em azimute.
// O F é três fitas EXCÊNTRICAS com dobras e grumos, e o E é um toro cem mil
// quilômetros mais largo que a malha do anel principal — nenhum dos dois
// cabe numa tabela de raio. (Conferido no binário: os dois únicos texels de
// F que o dado tem, em 140 320 e 140 356 km, caem FORA da janela que a
// malha amostra, que termina em 140 180 km — não há dobra de contagem.)
//
// A LEI DA ESTRELA: aditivo, sem escrever profundidade — os dois são véu
// que SOMA luz, nunca material que tapa. Por isso a exagero declarado do
// desvio radial das fitas está no cadastro de escala (`src/three/escala.ts`,
// id `aneis-tenues-de-saturno`).
//
// O FRAME é o da `RingGeometry` do anel principal: plano XY, +Z é o POLO
// (a cicatriz W5-B), unidade = raio EQUATORIAL do corpo. A matriz vem
// copiada do mesh do anel, então as três fitas e o toro giram com ele.
// ============================================================
import * as THREE from 'three';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import { GLSL_RUIDO_DE_VALOR } from './corpos';

/** 1 raio equatorial de Saturno em km — a régua deste arquivo. */
const KM_POR_RAIO = BODY_AXES.saturn[0]!;

/**
 * O ANEL F, os números dele (`fRing.ts`): raio 140 180 km e três fitas com
 * deslocamento, largura e brilho próprios. A largura desenhada é 8× a
 * declarada porque o perfil transversal dele é uma gaussiana que já apaga
 * as bordas (`across`), e não uma faixa chapada.
 */
const RAIO_DO_F_KM = 140180;
const FITAS = [
  { desvioKm: 0, larguraKm: 45, brilho: 1.0 },
  { desvioKm: -180, larguraKm: 25, brilho: 0.45 },
  { desvioKm: 210, larguraKm: 20, brilho: 0.35 },
] as const;

/** A dobra e a excentricidade das fitas, em km (0,10 e 0,04 na régua dele,
 *  que é de 1 000 km por unidade de cena). */
const DOBRA_KM = 100;
const EXCENTRICIDADE_KM = 40;

/** Quantos segmentos em azimute — o `PlaneGeometry(1, 1, 1024, 1)` dele. */
const SEGMENTOS_DO_F = 1024;

/**
 * O ANEL E, os números dele (`eRing.ts`): toro de 170 000 a 330 000 km com
 * densidade gaussiana em torno da órbita de Encélado (238 000 km, meia
 * largura 38 000 km). Grão de mícron espalha quase só PARA A FRENTE — o
 * anel some visto de frente e acende em contraluz, que é a razão de as
 * fotos dele existirem só contra o Sol.
 */
const E_INTERNO_KM = 170000;
const E_EXTERNO_KM = 330000;
const E_PICO_KM = 238000;
const E_SIGMA_KM = 38000;

const VERT_DO_F = /* glsl */ `
attribute float aTheta;
attribute float aLado;

uniform float uRaioBase;
uniform float uLargura;
uniform float uDobra;
uniform float uExcentricidade;
uniform float uFase;
uniform float uSemente;

varying vec3 vPos;
varying float vLado;
varying float vTheta;

${GLSL_RUIDO_DE_VALOR}

void main() {
  // a dobra dele é mx_noise_float (Perlin, centrado em zero); o ruído de
  // valor da casa devolve [0, 1], então centra-se aqui — é a mesma tradução
  // que a S3c fez no grão do esculpido
  float dobra = (ruido(vec3(
    cos(aTheta) * 3.0 + uSemente * 7.3, sin(aTheta) * 3.0, uFase * 0.15
  )) * 2.0 - 1.0) * uDobra;
  float ecc = cos(aTheta + uSemente * 2.1) * uExcentricidade;
  float r = uRaioBase + dobra + ecc + aLado * uLargura;
  vPos = vec3(r * cos(aTheta), r * sin(aTheta), 0.0);
  vLado = aLado;
  vTheta = aTheta;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}
`;

const FRAG_DO_F = /* glsl */ `
precision highp float;

uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uBrilho;
uniform float uSemente;
uniform float uFase;
uniform float uPrometeuLon;

varying vec3 vPos;
varying float vLado;
varying float vTheta;

vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
${GLSL_RUIDO_DE_VALOR}
SOMBRA_DO_PLANETA

void main() {
  // OS CANAIS DE PROMETEU (PIA08397, Murray 2008, o F11.2b dele): a lua
  // orbita POR DENTRO do F, logo mais rápido, e cada passagem abre sulcos
  // escuros que ficam ATRÁS dela em longitude e morrem em algumas dezenas
  // de graus.
  float dLon = vTheta - uPrometeuLon;
  float phi = atan(sin(dLon), cos(dLon));
  float q = phi / 0.55;
  float rastro = exp(-q * q) * smoothstep(-0.02, 0.02, phi);
  float pente = sin(phi * 52.0) * 0.5 + 0.5;
  float canais = 1.0 - rastro * pente * 0.72;

  // os grumos ao longo da fita
  float grumo = ruido(vec3(
    cos(vTheta) * 14.0 + uSemente * 3.1, sin(vTheta) * 14.0, uFase * 0.3
  ));
  float atravessa = pow(1.0 - clamp(abs(vLado) * 2.0, 0.0, 1.0), 2.0);

  vec3 view = normSeguro(uCamLocal - vPos);
  float cosTheta = clamp(-dot(uDirSolLocal, view), -1.0, 1.0);
  // o lobo para a frente dele: 2,25 em contraluz total contra 0,05 de
  // frente — 45×, e é por isso que o F só existe nas fotos contra o Sol
  float frente = pow(clamp(cosTheta + 0.15, 0.0, 1.15), 4.0) * 2.2 + 0.05;

  vec3 cor = vec3(0.9, 0.92, 1.0) * frente * uBrilho
    * mix(0.4, 1.6, grumo) * sombraDoPlaneta(vPos) * uLuzGanho;
  // aditivo (srcAlpha, um): o alfa carrega SÓ o perfil transversal e os
  // canais, para nenhum dos dois entrar ao quadrado
  gl_FragColor = vec4(cor, atravessa * 0.5 * canais);
}
`;

const VERT_DO_E = /* glsl */ `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG_DO_E = /* glsl */ `
precision highp float;

uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uVisivel;

varying vec3 vPos;

const float PICO = ${(E_PICO_KM / KM_POR_RAIO).toFixed(6)};
const float SIGMA = ${(E_SIGMA_KM / KM_POR_RAIO).toFixed(6)};

vec3 normSeguro(vec3 v) { return v / max(length(v), 1.0e-6); }
SOMBRA_DO_PLANETA

void main() {
  float r = length(vPos.xy);
  float d = (r - PICO) / SIGMA;
  float densidade = exp(-d * d);
  vec3 view = normSeguro(uCamLocal - vPos);
  float cosTheta = clamp(-dot(uDirSolLocal, view), -1.0, 1.0);
  // grão de mícron: SÓ o lobo para a frente, sem retro nenhum
  float frente = pow(clamp(cosTheta, 0.0, 1.0), 6.0);
  float alfa = densidade * frente * 0.06 * uVisivel;
  if (alfa < 4.0e-4) discard;
  gl_FragColor = vec4(
    vec3(0.55, 0.75, 1.0) * sombraDoPlaneta(vPos) * uLuzGanho, alfa
  );
}
`;

/** O que o corpo entrega por quadro — tudo já no frame do ANEL. */
export interface QuadroDosAneisTenues {
  dirSolLocal: THREE.Vector3;
  /** a posição da câmera no frame do anel, em raios equatoriais */
  camLocal: THREE.Vector3;
  /** o `ganhoDoGlobo` do corpo — os dois véus seguem a exposição da visita */
  luzGanho: number;
  solAngRad: number;
  /** o achatamento polar, para a sombra elipsoide do globo */
  kPolar: number;
  /** azimute de Prometeu no frame do anel (rad) — os canais do F */
  prometeuLon: number;
  /** a fase que faz a dobra das fitas andar com a data (rad) */
  fase: number;
}

function geometriaDaFita(): THREE.BufferGeometry {
  const n = SEGMENTOS_DO_F;
  const thetas = new Float32Array((n + 1) * 2);
  const lados = new Float32Array((n + 1) * 2);
  const pos = new Float32Array((n + 1) * 2 * 3);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    thetas[i * 2] = t;
    thetas[i * 2 + 1] = t;
    lados[i * 2] = -0.5;
    lados[i * 2 + 1] = 0.5;
  }
  const indices = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  // `position` existe só para o three não reclamar do atributo obrigatório:
  // quem desenha a fita é o vértice, a partir de aTheta/aLado
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTheta', new THREE.BufferAttribute(thetas, 1));
  geo.setAttribute('aLado', new THREE.BufferAttribute(lados, 1));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  // o `position` é zero, então a esfera envolvente se escreve à mão — é ela
  // que deixa o culling honesto sem desligá-lo
  geo.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(),
    (RAIO_DO_F_KM + 400 + DOBRA_KM + EXCENTRICIDADE_KM) / KM_POR_RAIO
  );
  return geo;
}

export class AneisTenuesDeSaturno {
  readonly grupo = new THREE.Group();

  private readonly geoDaFita = geometriaDaFita();
  private readonly geoDoE: THREE.RingGeometry;
  private readonly fitas: THREE.Mesh[] = [];
  private readonly toro: THREE.Mesh;
  private readonly materiais: THREE.ShaderMaterial[] = [];

  constructor(glslSombraDoPlaneta: string) {
    const comSombra = (fonte: string) =>
      fonte.replace('SOMBRA_DO_PLANETA', glslSombraDoPlaneta);

    FITAS.forEach((fita, i) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT_DO_F,
        fragmentShader: comSombra(FRAG_DO_F),
        uniforms: {
          uRaioBase: { value: (RAIO_DO_F_KM + fita.desvioKm) / KM_POR_RAIO },
          uLargura: { value: (fita.larguraKm * 8) / KM_POR_RAIO },
          uDobra: { value: DOBRA_KM / KM_POR_RAIO },
          uExcentricidade: { value: EXCENTRICIDADE_KM / KM_POR_RAIO },
          uBrilho: { value: fita.brilho },
          uSemente: { value: i },
          uFase: { value: 0 },
          uPrometeuLon: { value: 0 },
          uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
          uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
          uLuzGanho: { value: 1 },
          uKPolar: { value: 1 },
          uSolAngRad: { value: 0 },
        },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.geoDaFita, material);
      mesh.matrixAutoUpdate = false;
      this.fitas.push(mesh);
      this.materiais.push(material);
      this.grupo.add(mesh);
    });

    this.geoDoE = new THREE.RingGeometry(
      E_INTERNO_KM / KM_POR_RAIO, E_EXTERNO_KM / KM_POR_RAIO, 128, 4
    );
    const matDoE = new THREE.ShaderMaterial({
      vertexShader: VERT_DO_E,
      fragmentShader: comSombra(FRAG_DO_E),
      uniforms: {
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        uKPolar: { value: 1 },
        uSolAngRad: { value: 0 },
        uVisivel: { value: 1 },
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
    this.toro = new THREE.Mesh(this.geoDoE, matDoE);
    this.toro.matrixAutoUpdate = false;
    this.materiais.push(matDoE);
    this.grupo.add(this.toro);
  }

  /** A MESMA MATRIZ DO ANEL PRINCIPAL — uma fonte de verdade para o frame:
   *  se o anel gira, os dois véus giram com ele, sem segunda conta. */
  fixarNoAnel(matriz: THREE.Matrix4) {
    for (const fita of this.fitas) fita.matrix.copy(matriz);
    this.toro.matrix.copy(matriz);
  }

  atualizar(q: QuadroDosAneisTenues) {
    for (const material of this.materiais) {
      const u = material.uniforms;
      (u.uDirSolLocal.value as THREE.Vector3).copy(q.dirSolLocal);
      (u.uCamLocal.value as THREE.Vector3).copy(q.camLocal);
      u.uLuzGanho.value = q.luzGanho;
      u.uKPolar.value = q.kPolar;
      u.uSolAngRad.value = q.solAngRad;
      if (u.uFase) u.uFase.value = q.fase;
      if (u.uPrometeuLon) u.uPrometeuLon.value = q.prometeuLon;
    }
    // O TORO SOME DE DENTRO (a `eRingProximity` dele): um véu difuso visto
    // de dentro vira uma parede de luz sem forma, então ele apaga quando a
    // câmera está perto da órbita de Encélado ou colada no plano. E some
    // do DESENHO, não só do alfa — é o gate de custo do anel maior da cena.
    const rCam = Math.hypot(q.camLocal.x, q.camLocal.y);
    const visivel = Math.min(1, Math.max(
      Math.abs(rCam - E_PICO_KM / KM_POR_RAIO) / (90000 / KM_POR_RAIO),
      Math.abs(q.camLocal.z) / (25000 / KM_POR_RAIO)
    ));
    (this.toro.material as THREE.ShaderMaterial).uniforms.uVisivel.value = visivel;
    this.toro.visible = visivel > 0.01;
  }

  dispose() {
    this.geoDaFita.dispose();
    this.geoDoE.dispose();
    for (const material of this.materiais) material.dispose();
  }
}
