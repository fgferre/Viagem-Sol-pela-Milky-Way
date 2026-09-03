// ============================================================
// A LAJOTA VOLUMÉTRICA DO ANEL (item 139) — as PARTÍCULAS E PEDRAS DE
// GELO que se veem quando a câmera entra no anel de Saturno, portadas do
// projeto Saturn do dono (`src/effects/ringSlab.ts`, lá em TSL/WebGPU).
//
// A QUEIXA QUE A PEDIU, palavras dele em 02/09: "Os aneis de saturno no
// meu projeto quando vc entra neles vc ve as particulas e pedras de gelo,
// achei que vc ia trazer isso pro nosso projeto". Não tinha sido trazido:
// a lista da S5 do item 134 tinha quatro peças e esta não estava nela.
//
// O QUE ATRAVESSA É A MATEMÁTICA, NÃO O CÓDIGO. Lá cada grão é um sprite
// instanciado cuja posição sai do índice da instância dentro de um
// `positionNode` de nó; a casa é WebGL2/GLSL e faz a mesma conta num
// vértice comum, com o sorteio de cada grão ASSADO na CPU (o molde das
// plumas: mesmo grão para o mesmo índice, em qualquer tier, e captura
// reprodutível — a identidade A/B da casa não sobrevive a um hash de
// GPU que mude de fornecedor).
//
// OS NÚMEROS SÃO DELE, letra por letra: lajota de 7 000 km de lado,
// espessura visual de ±12 km, grão de 4 a 14 km, 65 536 grãos no topo,
// dose 0,30, o lobo para a frente `0,55 + 1,6·cos⁴`, e a ligação pela
// altura sobre o plano (1 600 km) e pelo raio (55 000 a 160 000 km).
//
// A ANCORAGEM NO MUNDO é o truque dele e é o que faz a lajota parecer
// um enxame parado enquanto a câmera anda: cada grão tem um lugar FIXO
// dentro de um quadrado de 7 000 km, e o quadrado salta de múltiplo em
// múltiplo para o mais próximo da câmera. Ninguém "segue" a câmera —
// quem segue é o LADRILHO, e o grão que sai por trás reaparece à frente
// já no lugar onde ele estaria.
//
// O QUE ELA GANHOU AQUI E NÃO TEM NO PROJETO DELE: a SOMBRA DO GLOBO. A
// lajota mora no mesmo frame do anel e recebe o mesmo
// `GLSL_SOMBRA_DO_PLANETA_NO_ANEL` — dentro da umbra o enxame apaga,
// como o anel chapado ao lado dele.
//
// A LEI DA ESTRELA: aditivo, sem escrever profundidade — o grão SOMA luz
// e não tapa nada. Por isso o tamanho do sprite é INSTRUMENTO no cadastro
// de escala (`src/three/escala.ts`, id `lajota-do-anel-de-saturno`), e a
// peça tem linha no censo da luz (`cadastroDeRepresentacoes.ts`): ela
// desenha em QUAD aditivo, que é a segunda varredura do censo.
//
// FORA DA LAJOTA NÃO EXISTE: com a câmera longe do plano do anel a malha
// sai do desenho (`visible = false`) e nem os uniformes se escrevem — o
// filme longe de Saturno não paga um bit por ela.
//
// O FRAME é o da `RingGeometry` do anel principal: plano XY, +Z é o POLO
// (a cicatriz W5-B), unidade = raio EQUATORIAL do corpo. A matriz vem
// copiada do mesh do anel, então a lajota gira com ele.
// ============================================================
import * as THREE from 'three';
import { BODY_AXES } from '../../../lib/atlas/iauOrientation';
import type { QualityLevel } from '../../core/engine';

/** 1 raio equatorial de Saturno em km — a régua deste arquivo. */
const KM_POR_RAIO = BODY_AXES.saturn[0]!;

/** O lado do ladrilho que acompanha a câmera (o `TILE = 7` dele). */
const LADO_DA_LAJOTA_KM = 7000;

/**
 * A MEIA-ESPESSURA VISUAL (o `THICKNESS = 0.012` dele). O anel de verdade
 * tem de ~10 m a ~1 km de espessura; ±12 km é a escolha DELE, e está
 * declarada no cadastro de escala. Sem exagero nenhum a lajota seria uma
 * folha fina demais para a câmera atravessar e ver volume.
 */
const ESPESSURA_KM = 12;

/** O grão: de 4 a 14 km (o `h4·0,010 + 0,004` dele), DIÂMETRO do sprite. */
const GRAO_MIN_KM = 4;
const GRAO_FAIXA_KM = 10;

/**
 * A LIGAÇÃO, os dois números dele: a lajota nasce quando a câmera está a
 * menos de 1 600 km do plano do anel (com fade linear até lá, para não
 * estalar) e entre 55 000 e 160 000 km do eixo. As duas bordas radiais
 * caem onde o perfil medido já é zero (o D começa em 66 900 km e o F
 * acaba em 140 500), então o corte duro em raio não aparece.
 */
const ALTURA_DA_LIGACAO_KM = 1600;
const RAIO_MIN_KM = 55000;
const RAIO_MAX_KM = 160000;

/** O alfa por grão (o `0.30` dele). */
const DOSE = 0.3;

/**
 * QUANTOS GRÃOS POR TIER — os degraus dele, com UM corte MEDIDO no topo.
 * `alta` é o `med` dele (24 576) e `performance` o `low` (8 192), letra
 * por letra; `cinema` sai dos 65 536 do `high` dele para 49 152.
 *
 * O CORTE É MEDIDO, e o que ele mede também DESMENTE uma expectativa: o
 * custo da lajota é de PREENCHIMENTO, não de contagem. Na vista de dentro
 * do anel B (1 000×700, dPR 1, levas assentadas em ~70 ms de quadro), o
 * passe deu 2,08 · 2,14 · 1,87 ms com os 65 536 dele e 1,99 · 1,92 ms com
 * 49 152 — 25 % menos grãos compram ~4 % de tempo, porque quem paga são os
 * pixels dos grãos PERTO, e esses continuam do mesmo tamanho. O corte fica
 * porque é ele que põe as duas medições abaixo do teto de 2 ms desta obra;
 * quem quiser mais barato mexe no TAMANHO do grão, não na contagem. Rastro
 * em `capturas/item139-custo.txt`.
 *
 * NÃO HÁ ENGORDA DO GRÃO para conservar a luz (as plumas têm), e é
 * decisão declarada: conservar `n · tamanho²` exigiria grão de até 40 km
 * no tier de baixo, MAIOR que os 24 km de espessura da própria lajota —
 * a pedra ficaria mais grossa que a camada que ela habita. Menos grãos é
 * uma lajota mais rala, que é o que ele mesmo faz.
 */
export const LAJOTA_POR_TIER: Readonly<Record<QualityLevel, number>> = {
  cinema: 49152,
  alta: 24576,
  performance: 8192,
};

const LAJOTA_MAX = LAJOTA_POR_TIER.cinema;

/**
 * O sorteio por ÍNDICE (nunca sequencial): o grão `i` tem os mesmos
 * quatro números em qualquer tier, então subir de qualidade é assar um
 * prefixo maior e o enxame não muda de forma. É a `ruido` das plumas.
 */
function sorteio(i: number, k: number): number {
  let t = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  t = Math.imul(t ^ (t >>> 15), 0x2545f491);
  t ^= t >>> 13;
  return (t >>> 0) / 4294967296;
}

const glsl = (km: number) => (km / KM_POR_RAIO).toExponential(8);

/**
 * O VÉRTICE FAZ TUDO: o lugar do grão, a busca no perfil, os três fades,
 * a luz e a sombra. O fragmento só recorta o disco.
 *
 * POR QUE NÃO NO FRAGMENTO, como no dele: o sprite aqui pode cobrir meia
 * tela (uma pedra de 14 km a 300 km da câmera), e o que decide o custo é
 * PREENCHIMENTO. Com a conta no vértice, o grão que não vale nada — fora
 * da faixa do anel, dentro da divisão de Cassini, longe demais no
 * ladrilho — sai da tela sem rasterizar um pixel.
 *
 * A BUSCA NO PERFIL É `textureLod(..., 0.0)`: em vértice não há derivada,
 * e pedir nível implícito é a mesma armadilha que o item 104 pagou no
 * anel chapado.
 */
const VERT_DA_LAJOTA = /* glsl */ `
attribute vec4 aGrao;

uniform sampler2D uMapaAnel;
uniform vec3 uDirSolLocal;
uniform vec3 uCamLocal;
uniform float uLuzGanho;
uniform float uKPolar;
uniform float uSolAngRad;
uniform float uVisivel;
uniform float uNearRaios;

varying vec2 vUv;
varying float vAlfa;
varying vec3 vCor;

const float LADO = ${glsl(LADO_DA_LAJOTA_KM)};
const float ESPESSURA = ${glsl(ESPESSURA_KM)};
const float GRAO_MIN = ${glsl(GRAO_MIN_KM)};
const float GRAO_FAIXA = ${glsl(GRAO_FAIXA_KM)};
const float DOSE = ${DOSE};
CONSTANTES_DO_ANEL
SOMBRA_DO_PLANETA

void main() {
  vUv = uv;
  vAlfa = 0.0;
  vCor = vec3(0.0);

  // ANCORAGEM NO MUNDO: o grão mora num ponto fixo do ladrilho, e o
  // ladrilho salta para o múltiplo mais próximo da câmera
  float ox = aGrao.x * LADO;
  float oy = aGrao.y * LADO;
  vec3 p = vec3(
    ox + floor((uCamLocal.x - ox) / LADO + 0.5) * LADO,
    oy + floor((uCamLocal.y - oy) / LADO + 0.5) * LADO,
    (aGrao.z - 0.5) * ESPESSURA * 2.0
  );

  // densidade e cor saem do MESMO perfil medido do anel chapado
  float r = length(p.xy);
  float u = ((r - R_INT) / (R_EXT - R_INT)) * U_ESCALA + U_BASE;
  vec4 perfil = (u < 0.0 || u > 1.0)
    ? vec4(0.0)
    : textureLod(uMapaAnel, vec2(u, 0.5), 0.0);

  vec3 paraCam = uCamLocal - p;
  float dist = length(paraCam);
  // o grão colado na lente sai: a soleira é o NEAR do quadro, medido por
  // quem o escreve (nearPlanePc), senão o plano de corte o cortaria ao
  // meio em vez de ele apagar
  float perto = smoothstep(uNearRaios * 1.5, uNearRaios * 4.0, dist);
  // a borda do ladrilho apaga antes de aparecer (o distFade dele,
  // escrito com as soleiras em ordem crescente: smoothstep decrescente é
  // INDEFINIDO em GLSL)
  float longe = 1.0 - smoothstep(LADO * 0.2, LADO * 0.48, dist);
  float vertical = pow(1.0 - clamp(abs(p.z) / ESPESSURA, 0.0, 1.0), 1.5);
  float alfa = perfil.a * perto * longe * vertical * uVisivel * DOSE;
  if (alfa < 2.0e-4) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  vec3 view = paraCam / max(dist, 1.0e-9);
  // o lobo PARA A FRENTE dele, verbatim: 2,15 em contraluz total contra
  // 0,55 de frente. Grão de gelo de centímetros a metros ainda difrata, e
  // é o que faz o enxame acender quando o Sol está atrás dele.
  float cosTheta = clamp(-dot(uDirSolLocal, view), -1.0, 1.0);
  float luz = 0.55 + pow(clamp(cosTheta, 0.0, 1.0), 4.0) * 1.6;
  // a mesma croma RELATIVA do anel chapado: razão contra a cor do B,
  // renormalizada, para passar só o DESVIO medido
  vec3 razao = perfil.rgb / COR_B_DO_PERFIL;
  vec3 tinta = COR_DO_GELO
    * (razao / max(dot(razao, vec3(0.2126, 0.7152, 0.0722)), 1.0e-4));
  if (dot(tinta, tinta) < 1.0e-6) tinta = COR_DO_GELO;

  vAlfa = alfa;
  vCor = tinta * IF_RETRO * luz * sombraDoPlaneta(p) * uLuzGanho;

  // o sprite é um QUAD deitado no plano da câmera (o SpriteNodeMaterial
  // dele). A escala do modelo (o raio a em pc) sai da própria coluna X —
  // sem uniform novo e sem chance de divergir da matriz que o corpo escreve
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float raioMundo = length((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  mv.xy += position.xy * (GRAO_MIN + aGrao.w * GRAO_FAIXA) * raioMundo;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_DA_LAJOTA = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying float vAlfa;
varying vec3 vCor;

void main() {
  // O DISCO DELE (smoothstep 0,5 -> 0,1 no raio): cheio até 10 % do raio e
  // apagado na borda, um fator só — o quadrado apagaria a pedra
  float d = length(vUv - 0.5);
  float i = 1.0 - smoothstep(0.1, 0.5, d);
  if (i * vAlfa < 1.0e-4) discard;
  gl_FragColor = vec4(vCor, i * vAlfa);
}
`;

/** O que o corpo entrega por quadro — tudo já no frame do ANEL. */
export interface QuadroDaLajota {
  dirSolLocal: THREE.Vector3;
  /** a posição da câmera no frame do anel, em raios equatoriais */
  camLocal: THREE.Vector3;
  /** o `ganhoDoGlobo` do corpo — a lajota segue a exposição da visita */
  luzGanho: number;
  solAngRad: number;
  /** o achatamento polar, para a sombra elipsoide do globo */
  kPolar: number;
  /** o plano NEAR do quadro em raios equatoriais (`nearPlanePc`) */
  nearRaios: number;
  tier: QualityLevel;
}

/** As peças que a lajota pede emprestadas ao anel — passadas de fora para
 *  não haver aresta de volta para `gigante.ts` (ciclo de módulo). */
export interface OpcoesDaLajota {
  /** `GLSL_SOMBRA_DO_PLANETA_NO_ANEL` */
  glslSombraDoPlaneta: string;
  /** `GLSL_CONSTANTES_DO_ANEL` — a régua do perfil e a cor do gelo */
  glslConstantesDoAnel: string;
  /** os raios da malha do anel em raios equatoriais (`ANEL_SATURNO`) */
  rInt: number;
  rExt: number;
}

export class LajotaDoAnel {
  readonly malha: THREE.Mesh;

  private readonly geometria = new THREE.InstancedBufferGeometry();
  private readonly quad = new THREE.PlaneGeometry(1, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly graos = new Float32Array(LAJOTA_MAX * 4);
  private readonly atributo: THREE.InstancedBufferAttribute;
  private assados = 0;

  constructor(opcoes: OpcoesDaLajota) {
    this.geometria.index = this.quad.index;
    this.geometria.attributes.position = this.quad.attributes.position!;
    this.geometria.attributes.uv = this.quad.attributes.uv!;
    this.atributo = new THREE.InstancedBufferAttribute(this.graos, 4);
    this.atributo.setUsage(THREE.DynamicDrawUsage);
    this.geometria.setAttribute('aGrao', this.atributo);
    this.geometria.instanceCount = 0;

    const vert = VERT_DA_LAJOTA.replace(
      'CONSTANTES_DO_ANEL',
      `${opcoes.glslConstantesDoAnel}
const float R_INT = ${opcoes.rInt};
const float R_EXT = ${opcoes.rExt};`
    ).replace('SOMBRA_DO_PLANETA', opcoes.glslSombraDoPlaneta);

    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: FRAG_DA_LAJOTA,
      uniforms: {
        uMapaAnel: { value: null },
        uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
        uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
        uLuzGanho: { value: 1 },
        uKPolar: { value: 1 },
        uSolAngRad: { value: 0 },
        uVisivel: { value: 0 },
        uNearRaios: { value: 1e-3 },
      },
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    this.malha = new THREE.Mesh(this.geometria, this.material);
    this.malha.matrixAutoUpdate = false;
    this.malha.visible = false;
    // o ladrilho SEGUE a câmera: nenhuma esfera envolvente o descreve, e
    // por isso o culling sai de cena — quem o substitui é o gate de
    // `atualizar`, que é mais barato e mais honesto
    this.malha.frustumCulled = false;
  }

  /** O perfil medido do anel, quando ele chega (mesmo dado do chapado). */
  ligarPerfil(textura: THREE.DataTexture) {
    this.material.uniforms.uMapaAnel.value = textura;
  }

  /** A MESMA MATRIZ DO ANEL PRINCIPAL — uma fonte de verdade para o frame. */
  fixarNoAnel(matriz: THREE.Matrix4) {
    this.malha.matrix.copy(matriz);
  }

  atualizar(q: QuadroDaLajota) {
    // A LIGAÇÃO POR DISTÂNCIA, os números dele: fade linear na altura
    // sobre o plano e corte duro em raio (onde o perfil já é zero).
    const alturaKm = Math.abs(q.camLocal.z) * KM_POR_RAIO;
    const rKm = Math.hypot(q.camLocal.x, q.camLocal.y) * KM_POR_RAIO;
    const dentro = rKm > RAIO_MIN_KM && rKm < RAIO_MAX_KM;
    const visivel = dentro
      ? Math.max(0, 1 - alturaKm / ALTURA_DA_LIGACAO_KM)
      : 0;
    this.malha.visible = visivel > 0.01;
    // FORA DA LAJOTA, CUSTO ZERO: sem desenho, sem uniforme, sem assar
    if (!this.malha.visible) return;

    const alvo = LAJOTA_POR_TIER[q.tier];
    if (alvo > this.assados) this.assar(alvo);
    this.geometria.instanceCount = alvo;

    const u = this.material.uniforms;
    (u.uDirSolLocal.value as THREE.Vector3).copy(q.dirSolLocal);
    (u.uCamLocal.value as THREE.Vector3).copy(q.camLocal);
    u.uLuzGanho.value = q.luzGanho;
    u.uKPolar.value = q.kPolar;
    u.uSolAngRad.value = q.solAngRad;
    u.uNearRaios.value = q.nearRaios;
    u.uVisivel.value = visivel;
  }

  /** O sorteio dos grãos, dos `assados` até `n` — ver `sorteio`. */
  private assar(n: number) {
    for (let i = this.assados; i < n; i++) {
      this.graos[i * 4] = sorteio(i, 0);
      this.graos[i * 4 + 1] = sorteio(i, 1);
      this.graos[i * 4 + 2] = sorteio(i, 2);
      this.graos[i * 4 + 3] = sorteio(i, 3);
    }
    this.assados = n;
    this.atributo.needsUpdate = true;
  }

  dispose() {
    this.quad.dispose();
    this.geometria.dispose();
    this.material.dispose();
  }
}
