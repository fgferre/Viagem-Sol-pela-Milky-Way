// ============================================================
// OS SISTEMAS PLANETÁRIOS NA CENA — o lado three de `lib/exoplanetas.ts`,
// no molde dos cometas e das sondas: onde cada planeta está no instante
// vivo (`posicaoDoExoplanetaNaCena`), o nome e o marcador
// (`projetarExoplanetas`), de onde a câmera olha ao chegar
// (`poseDoSistema`, `poseDoExoplaneta`) e a camada `noexoplanetas`: as
// órbitas e a zona habitável do sistema ativo.
//
// O QUADRO LOCAL. Cada sistema é um grupo POSTO na estrela (a posição do
// ponto do catálogo, a mesma do corpo da estrela) e ESCALADO de UA para
// parsec: os filhos moram em UA. A conta grande (12 pc até TRAPPIST-1)
// fica na matriz, em precisão dupla, e o float32 do shader só vê números
// de 0,01 a 100 — sem o grupo local, 12 pc em float32 têm passo de
// 0,2 UA, e as sete órbitas de TRAPPIST-1 cabem em 0,06 UA.
//
// A REGRA DE ESCALA: o planeta TAPA o que está atrás, então tem o raio
// medido (ou o derivado da massa, declarado). De longe ele é o MARCADOR
// de instrumento dos rótulos; as órbitas e a zona habitável são
// instrumento de leitura, como as órbitas do Sistema Solar — nunca luz.
//
// A APARÊNCIA: ninguém sabe. A esfera é cinza neutro (albedo 0,3,
// artístico) acesa pela cor da PRÓPRIA estrela, com a fase que a
// geometria dá; só HD 189733 b tem a cor medida (`albedo`). O brilho é o
// da visita (artístico, como os planetas da casa no Atlas): o que é
// físico é a cor relativa e o lado da noite.
// ============================================================
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  SISTEMAS_PLANETARIOS,
  baseDaOrbita,
  exoplanetaPorId,
  geometriaDoPlaneta,
  pontoDaOrbita,
  posicaoDoExoplaneta,
  zonaHabitavel,
  type BaseDaOrbita,
  type Exoplaneta,
  type SistemaPlanetario,
} from '../../lib/exoplanetas';
import { estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import { AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import { blackbodyLinear } from '../luzDaCasa';
import { PRIORIDADE_DO_ROTULO, projectForced } from './labels';
import type { OclusorDeRotulo, StarLabel } from './labels';
import { LARGURA_DA_FITA_PX } from './orbitas';
import { eixoQuePousaEm } from './lugaresDoCeu';
import type { PoseDaSonda } from './sondas';

/** o prefixo da chave do rótulo de um exoplaneta — o clique o reconhece */
export const CHAVE_DE_EXOPLANETA = 'exoplaneta:';

/** a tinta da órbita: branco-azulado pálido, longe do verde dos cometas */
const COR_DA_ORBITA: readonly [number, number, number] = [0.7, 0.82, 1];
const ALFA_DA_ORBITA = 0.7;
/** a do cinturão de poeira: areia, mais apagada */
const COR_DO_CINTURAO: readonly [number, number, number] = [0.95, 0.82, 0.6];
const ALFA_DO_CINTURAO = 0.45;
export const COR_DO_MARCADOR_DO_EXOPLANETA = 'rgba(190, 210, 255, 0.9)';
/** a zona habitável: verde apagado, só um véu de leitura */
const COR_DA_ZONA = new THREE.Color(0.25, 0.75, 0.4);
const ALFA_DA_ZONA = 0.015;
/**
 * PERTO DE UM PLANETA as linhas e o véu somem: a zona habitável é um
 * plano que passa pelo planeta e, vista de dentro, vira uma parede
 * verde. Inteiras a partir de 150 raios do planeta mais perto; nada a
 * menos de 30 (a chegada é a 1–3 raios).
 */
const LINHAS_SOMEM_RAIOS: readonly [number, number] = [30, 150];

/** o cinza neutro de quem não tem cor medida (o albedo de Bond da Terra) */
export const ALBEDO_NEUTRO = 0.3;
/** a exposição da visita — artística: albedo 0,3 sai a ~0,27, abaixo
 *  do joelho da curva de tom (a 2,4 o canal vermelho de uma anã M
 *  saturava e o globo virava um disco chapado, sem a fase) */
const EXPOSICAO_DA_VISITA = 0.9;
const RAIO_TERRA_KM = 6371;

/** a câmera a menos disto (pc) de uma anfitriã liga o sistema dela */
export const RAIO_DO_SISTEMA_ATIVO_PC = 0.05;

const PONTOS_DA_ORBITA = 256;

/** o raio do planeta em UA */
export function raioDoPlanetaUa(planeta: Exoplaneta): number {
  return (planeta.raioTerra.v * RAIO_TERRA_KM) / AU_KM;
}

/** as bases de órbita de um sistema, para uma posição da estrela */
function basesDe(sistema: SistemaPlanetario, pos: THREE.Vector3): BaseDaOrbita[] {
  return sistema.planetas.map((pl) => {
    const g = geometriaDoPlaneta(pl, sistema);
    return baseDaOrbita([pos.x, pos.y, pos.z], g.iGraus, g.nodoGraus);
  });
}

/** onde o planeta está na CENA (pc), dada a posição da anfitriã */
export function posicaoDoExoplanetaNaCena(
  id: string,
  jd: number,
  posDaEstrela: THREE.Vector3,
  out = new THREE.Vector3()
): THREE.Vector3 | null {
  const achado = exoplanetaPorId(id);
  if (!achado || !Number.isFinite(jd)) return null;
  const g = geometriaDoPlaneta(achado.planeta, achado.sistema);
  const base = baseDaOrbita([posDaEstrela.x, posDaEstrela.y, posDaEstrela.z], g.iGraus, g.nodoGraus);
  const r = posicaoDoExoplaneta(achado.planeta, base, jd);
  return out.set(r[0], r[1], r[2]).multiplyScalar(AU_PARA_PC).add(posDaEstrela);
}

/** o polo do sistema: o do maior planeta (ou do cinturão), na cena */
function poloDoSistema(sistema: SistemaPlanetario, pos: THREE.Vector3): THREE.Vector3 {
  const maior = [...sistema.planetas].sort((a, b) => b.massaTerra.v - a.massaTerra.v)[0];
  if (maior) {
    const g = geometriaDoPlaneta(maior, sistema);
    const b = baseDaOrbita([pos.x, pos.y, pos.z], g.iGraus, g.nodoGraus);
    return new THREE.Vector3(...b.polo);
  }
  const c = sistema.cinturoes?.[0];
  const b = baseDaOrbita([pos.x, pos.y, pos.z], c?.iGraus ?? 60, c?.nodoGraus ?? 0);
  return new THREE.Vector3(...b.polo);
}

/**
 * O raio (UA) do quadro do sistema: o maior afélio (planeta ou
 * cinturão), e a zona habitável só até o dobro dele — em 51 Pegasi a
 * zona fica a 1,6 UA e o planeta a 0,05: enquadrar a zona sumiria com a
 * órbita dentro do brilho da estrela. Quem quiser a zona afasta a roda.
 */
export function extensaoDoSistemaUa(sistema: SistemaPlanetario): number {
  let r = 0;
  for (const pl of sistema.planetas) r = Math.max(r, pl.aUA * (1 + pl.e));
  for (const c of sistema.cinturoes ?? []) r = Math.max(r, c.aUA * (1 + c.e));
  const estrela = estrelaVisitavelPorNome(sistema.estrela);
  if (estrela) {
    const fora = zonaHabitavel(estrela.teffK.v, estrela.luminosidadeLsol.v).foraUA;
    r = r > 0 ? Math.max(r, Math.min(fora, 2 * r)) : fora;
  }
  return r;
}

/** de quantos graus acima do plano das órbitas a câmera olha */
const ELEVACAO_DO_SISTEMA = 35;
/** a esfera enquadrada, em frações da extensão — o sistema inteiro */
const FOLGA_DO_SISTEMA = 1.1;

/**
 * A CHEGADA NUM SISTEMA: a estrela no centro, o polo das órbitas no alto
 * da tela, a câmera 35° acima do plano e do lado do Sol (olha-se o
 * sistema "de casa", com a elipse aberta) — a vista de abertura do
 * Sistema Solar transposta. O piso do zoom é o raio da estrela.
 */
export function poseDoSistema(sistema: SistemaPlanetario, pos: THREE.Vector3, raioDaEstrelaPc: number): PoseDaSonda {
  const polo = poloDoSistema(sistema, pos);
  const paraCasa = pos.clone().negate().normalize();
  const noPlano = paraCasa.addScaledVector(polo, -paraCasa.dot(polo));
  if (noPlano.lengthSq() < 1e-12) noPlano.set(1, 0, 0).cross(polo);
  noPlano.normalize();
  const g = (ELEVACAO_DO_SISTEMA * Math.PI) / 180;
  const dir = noPlano.multiplyScalar(Math.cos(g)).addScaledVector(polo, Math.sin(g)).normalize();
  return {
    alvo: pos.clone(),
    raio: extensaoDoSistemaUa(sistema) * FOLGA_DO_SISTEMA * AU_PARA_PC,
    eixoDe: eixoQuePousaEm(dir, polo),
    polo,
    pisoRaio: raioDaEstrelaPc,
  };
}

/** quantos graus a câmera fica fora da linha planeta→estrela (a fase) */
const FASE_DA_CHEGADA_GRAUS = 60;

/**
 * A CHEGADA NUM PLANETA: o globo enchendo o quadro, olhado a 60° da
 * direção da estrela — o lado do dia com o terminador à vista, para a
 * fase dizer de onde vem a luz. O polo é o do sistema.
 */
export function poseDoExoplaneta(id: string, jd: number, posDaEstrela: THREE.Vector3): PoseDaSonda | null {
  const achado = exoplanetaPorId(id);
  const alvo = posicaoDoExoplanetaNaCena(id, jd, posDaEstrela);
  if (!achado || !alvo) return null;
  const polo = poloDoSistema(achado.sistema, posDaEstrela);
  const paraEstrela = posDaEstrela.clone().sub(alvo).normalize();
  const dir = paraEstrela.applyAxisAngle(polo, (FASE_DA_CHEGADA_GRAUS * Math.PI) / 180);
  const raio = raioDoPlanetaUa(achado.planeta) * AU_PARA_PC;
  return { alvo, raio, eixoDe: eixoQuePousaEm(dir, polo), polo, pisoRaio: raio };
}

const _pos = new THREE.Vector3();

/**
 * O NOME CURTO DENTRO DO PRÓPRIO SISTEMA (13/11): a letra ("TRAPPIST-1 e"
 * → "e", "Proxima b" → "b"). Os planetas só têm nome com o sistema deles
 * ativo, e ali o nome da estrela repetido sete vezes não cabia — só três
 * dos sete ganhavam vaga. Nome sem letra no fim fica inteiro.
 */
export function nomeCurtoDoExoplaneta(nome: string): string {
  const letra = /\s([a-z])$/.exec(nome);
  return letra ? letra[1] : nome;
}

/** OS NOMES E OS MARCADORES DOS PLANETAS do sistema ativo — o planeta em
 *  foco diz o nome inteiro; os outros, a letra */
export function projetarExoplanetas(
  camera: THREE.PerspectiveCamera,
  jd: number,
  ativo: { sistema: SistemaPlanetario; pos: THREE.Vector3 } | null,
  foco: string | null,
  comMarcador: boolean
): StarLabel[] {
  const out: StarLabel[] = [];
  if (!ativo || !Number.isFinite(jd)) return out;
  const bases = basesDe(ativo.sistema, ativo.pos);
  ativo.sistema.planetas.forEach((pl, k) => {
    const r = posicaoDoExoplaneta(pl, bases[k], jd);
    _pos.set(r[0], r[1], r[2]).multiplyScalar(AU_PARA_PC).add(ativo.pos);
    const nome = pl.id === foco ? pl.nome : nomeCurtoDoExoplaneta(pl.nome);
    const l = projectForced(camera, nome, '', _pos, `${CHAVE_DE_EXOPLANETA}${pl.id}`);
    if (!l) return;
    l.opacity = pl.contestado ? 0.7 : 0.95;
    l.prioridade = pl.id === foco ? PRIORIDADE_DO_ROTULO.foco : PRIORIDADE_DO_ROTULO.exoplaneta;
    l.outroLado = true;
    if (comMarcador) {
      l.comAnel = true;
      l.corDoAnel = COR_DO_MARCADOR_DO_EXOPLANETA;
    }
    out.push(l);
  });
  return out;
}

const PLANETA_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const PLANETA_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uLuz;
uniform vec3 uCor;
varying vec3 vN;
void main() {
  float l = max(dot(normalize(vN), uLuz), 0.0);
  gl_FragColor = vec4(uCor * l, 1.0);
}
`;

/** a cor da luz da estrela (sRGB linear, máximo 1) */
function corDaEstrela(teffK: number): [number, number, number] {
  const c = blackbodyLinear(teffK).map((x) => Math.max(0, x));
  const m = Math.max(...c) || 1;
  return [c[0] / m, c[1] / m, c[2] / m];
}

interface Montagem {
  sistema: SistemaPlanetario;
  grupo: THREE.Group;
  orbitas: THREE.Group;
  zona: THREE.Mesh | null;
  bases: BaseDaOrbita[];
  corpos: { planeta: Exoplaneta; malha: THREE.Mesh; raioPc: number }[];
  descartaveis: { dispose(): void }[];
}

function linha(pts: Float32Array, cor: readonly [number, number, number], alfa: number, descartaveis: { dispose(): void }[]) {
  const geo = new LineGeometry();
  geo.setPositions(pts);
  const mat = new LineMaterial({
    color: new THREE.Color(cor[0], cor[1], cor[2]),
    linewidth: LARGURA_DA_FITA_PX,
    transparent: true,
    opacity: alfa,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  descartaveis.push(geo, mat);
  mat.userData.alfa = alfa;
  const l = new Line2(geo, mat);
  l.renderOrder = 9;
  return l;
}

/**
 * A CAMADA DOS SISTEMAS PLANETÁRIOS: monta (uma vez, preguiçosa) o
 * sistema ativo — o que está em foco, ou o de uma anfitriã a menos de
 * `RAIO_DO_SISTEMA_ATIVO_PC` da câmera — e move os planetas com o relógio.
 * Sem sistema ativo nada é desenhado nem escrito.
 */
export class SistemasPlanetarios {
  readonly group = new THREE.Group();
  /** a gaveta (`noexoplanetas`): órbitas e zona; os planetas ficam */
  ligado = true;
  private readonly montagens = new Map<string, Montagem>();
  private ativoAgora: { sistema: SistemaPlanetario; pos: THREE.Vector3 } | null = null;
  private readonly poolDeOclusores: OclusorDeRotulo[] = [];
  private readonly listaDeOclusores: OclusorDeRotulo[] = [];

  constructor() {
    this.group.name = 'exoplanetas';
  }

  /** o sistema ativo deste quadro (os rótulos o leem) */
  get ativo() {
    return this.ativoAgora;
  }

  private montar(sistema: SistemaPlanetario, pos: THREE.Vector3): Montagem {
    const grupo = new THREE.Group();
    grupo.scale.setScalar(AU_PARA_PC);
    const orbitas = new THREE.Group();
    grupo.add(orbitas);
    const descartaveis: { dispose(): void }[] = [];
    const bases = basesDe(sistema, pos);
    sistema.planetas.forEach((pl, k) => {
      const pts = new Float32Array((PONTOS_DA_ORBITA + 1) * 3);
      for (let i = 0; i <= PONTOS_DA_ORBITA; i++) {
        const p = pontoDaOrbita(pl, bases[k], (2 * Math.PI * i) / PONTOS_DA_ORBITA);
        pts.set(p, i * 3);
      }
      orbitas.add(linha(pts, COR_DA_ORBITA, pl.contestado ? ALFA_DA_ORBITA * 0.5 : ALFA_DA_ORBITA, descartaveis));
    });
    for (const c of sistema.cinturoes ?? []) {
      const base = baseDaOrbita([pos.x, pos.y, pos.z], c.iGraus, c.nodoGraus);
      const falso = { aUA: c.aUA, e: c.e, omegaGraus: 0 } as Exoplaneta;
      const pts = new Float32Array((PONTOS_DA_ORBITA + 1) * 3);
      for (let i = 0; i <= PONTOS_DA_ORBITA; i++) pts.set(pontoDaOrbita(falso, base, (2 * Math.PI * i) / PONTOS_DA_ORBITA), i * 3);
      orbitas.add(linha(pts, COR_DO_CINTURAO, ALFA_DO_CINTURAO, descartaveis));
    }
    // A ZONA HABITÁVEL: um anel no plano do sistema, entre as duas bordas
    const estrela = estrelaVisitavelPorNome(sistema.estrela);
    let zona: THREE.Mesh | null = null;
    if (estrela) {
      const hz = zonaHabitavel(estrela.teffK.v, estrela.luminosidadeLsol.v);
      const geo = new THREE.RingGeometry(hz.dentroUA, hz.foraUA, 128, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: COR_DA_ZONA,
        transparent: true,
        opacity: ALFA_DA_ZONA,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      descartaveis.push(geo, mat);
      mat.userData.alfa = ALFA_DA_ZONA;
      zona = new THREE.Mesh(geo, mat);
      zona.renderOrder = 8;
      // o anel nasce no plano xy: o z dele vai ao polo do sistema
      const polo = poloDoSistema(sistema, pos);
      zona.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), polo);
      orbitas.add(zona);
    }
    const [r, g, b] = estrela ? corDaEstrela(estrela.teffK.v) : [1, 1, 1];
    const esfera = new THREE.SphereGeometry(1, 64, 32);
    descartaveis.push(esfera);
    const corpos = sistema.planetas.map((pl) => {
      const alb = pl.albedo?.rgb ?? [ALBEDO_NEUTRO, ALBEDO_NEUTRO, ALBEDO_NEUTRO];
      const mat = new THREE.ShaderMaterial({
        vertexShader: PLANETA_VERT,
        fragmentShader: PLANETA_FRAG,
        uniforms: {
          uLuz: { value: new THREE.Vector3(1, 0, 0) },
          uCor: {
            value: new THREE.Vector3(r * alb[0], g * alb[1], b * alb[2]).multiplyScalar(EXPOSICAO_DA_VISITA),
          },
        },
      });
      descartaveis.push(mat);
      const malha = new THREE.Mesh(esfera, mat);
      malha.scale.setScalar(raioDoPlanetaUa(pl));
      grupo.add(malha);
      return { planeta: pl, malha, raioPc: raioDoPlanetaUa(pl) * AU_PARA_PC };
    });
    const m = { sistema, grupo, orbitas, zona, bases, corpos, descartaveis };
    this.group.add(grupo);
    this.montagens.set(sistema.id, m);
    return m;
  }

  /**
   * O passo do quadro. `posDe` dá a posição viva da anfitriã (a do corpo
   * da estrela); `palco` recebe a superfície de cada planeta do sistema
   * ativo — o near da casa só conhece o Sol e a estrela, e cortaria o
   * planeta de perto.
   */
  update(q: {
    jd: number;
    camPos: THREE.Vector3;
    focoSistema: string | null;
    posDe: (nome: string) => THREE.Vector3 | null;
    palco: { registrar(id: string, raioPc: number, pos: THREE.Vector3): void; remover(id: string): void };
  }) {
    let escolhido: { sistema: SistemaPlanetario; pos: THREE.Vector3 } | null = null;
    let dMin = RAIO_DO_SISTEMA_ATIVO_PC;
    for (const s of SISTEMAS_PLANETARIOS) {
      const pos = q.posDe(s.estrela);
      if (!pos) continue;
      if (s.id === q.focoSistema) {
        escolhido = { sistema: s, pos };
        break;
      }
      const d = q.camPos.distanceTo(pos);
      if (d < dMin) {
        dMin = d;
        escolhido = { sistema: s, pos };
      }
    }
    for (const [id, m] of this.montagens) {
      if (escolhido?.sistema.id === id) continue;
      m.grupo.visible = false;
      for (const c of m.corpos) q.palco.remover(`exoplaneta:${c.planeta.id}`);
    }
    this.ativoAgora = escolhido;
    if (!escolhido || !Number.isFinite(q.jd)) return;
    const m = this.montagens.get(escolhido.sistema.id) ?? this.montar(escolhido.sistema, escolhido.pos);
    m.grupo.visible = true;
    m.grupo.position.copy(escolhido.pos);
    let pertoEmRaios = Infinity;
    m.corpos.forEach((c, k) => {
      const r = posicaoDoExoplaneta(c.planeta, m.bases[k], q.jd);
      c.malha.position.set(r[0], r[1], r[2]);
      const n = Math.hypot(r[0], r[1], r[2]) || 1;
      (c.malha.material as THREE.ShaderMaterial).uniforms.uLuz.value.set(-r[0] / n, -r[1] / n, -r[2] / n);
      _pos.set(r[0], r[1], r[2]).multiplyScalar(AU_PARA_PC).add(escolhido.pos);
      q.palco.registrar(`exoplaneta:${c.planeta.id}`, c.raioPc, _pos);
      pertoEmRaios = Math.min(pertoEmRaios, q.camPos.distanceTo(_pos) / c.raioPc);
    });
    const [a, b] = LINHAS_SOMEM_RAIOS;
    const fator = Math.min(1, Math.max(0, (pertoEmRaios - a) / (b - a)));
    m.orbitas.visible = this.ligado && fator > 0;
    m.orbitas.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (mat && typeof mat.userData.alfa === 'number') mat.opacity = mat.userData.alfa * fator;
    });
  }

  /**
   * OS DISCOS QUE ESCONDEM NOME: cada planeta do sistema ativo, com a
   * chave do próprio rótulo — a lei das estrelas com lugar
   * (`estrelasNoQuadro.oclusores`). Lista e objetos reusados.
   */
  oclusores(): readonly OclusorDeRotulo[] {
    this.listaDeOclusores.length = 0;
    const ativo = this.ativoAgora;
    const m = ativo ? this.montagens.get(ativo.sistema.id) : null;
    if (!m || !ativo) return this.listaDeOclusores;
    m.corpos.forEach((c, k) => {
      let o = this.poolDeOclusores[k];
      if (!o) {
        o = { x: 0, y: 0, z: 0, raio: 0 };
        this.poolDeOclusores[k] = o;
      }
      _pos.copy(c.malha.position).multiplyScalar(AU_PARA_PC).add(ativo.pos);
      o.x = _pos.x;
      o.y = _pos.y;
      o.z = _pos.z;
      o.raio = c.raioPc;
      o.chave = `${CHAVE_DE_EXOPLANETA}${c.planeta.id}`;
      this.listaDeOclusores.push(o);
    });
    return this.listaDeOclusores;
  }

  dispose() {
    for (const m of this.montagens.values()) for (const d of m.descartaveis) d.dispose();
    this.montagens.clear();
  }
}
