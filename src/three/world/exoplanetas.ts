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
// A APARÊNCIA: ninguém a viu. A CLASSE sai dos números
// (`climaDoExoplaneta`) e a FACE é imaginada a partir dela, desenhada
// pelos dois ramos procedurais da casa — o do `rochoso.ts` para os
// rochosos e o novo do `gigante.ts` para gigantes e sub-Netunos —, com a
// semente no id. Físico: a cor da PRÓPRIA estrela, o lado da noite, o
// terminador parado nos travados por maré, onde a superfície passaria do
// degelo ou da fusão da rocha e a razão entre o brilho próprio e o
// refletido. Medida: só a cor de HD 189733 b (`albedo`). O brilho é o da
// visita (artístico, como os planetas da casa no Atlas: cada mundo é
// exposto para si).
// ============================================================
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import {
  SISTEMAS_PLANETARIOS,
  baseDaOrbita,
  FRONTEIRAS_DA_CLASSE,
  climaDoExoplaneta,
  exoplanetaPorId,
  giroDoExoplaneta,
  geometriaDoPlaneta,
  pontoDaOrbita,
  posicaoDoExoplaneta,
  sementeDoExoplaneta,
  zonaHabitavel,
  type BaseDaOrbita,
  type ClimaDoExoplaneta,
  type Exoplaneta,
  type SistemaPlanetario,
} from '../../lib/exoplanetas';
import { estrelaVisitavelPorNome } from '../../lib/atlas/estrelasVisitaveis';
import { AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { J2000_JD } from '../../lib/atlas/time';
import { AU_KM } from '../../lib/atlas/elementosOrbitais';
import { uniformsDaLuzDaVisita } from '../../lib/atlas/luzDaVisita';
import { blackbodyLinear } from '../luzDaCasa';
import { ROCHOSO_PROC_FRAG, ROCHOSO_VERT, linhasDoGelo, uniformsDaFace } from './corpos/rochoso';
import { GIGANTE_PROC_FRAG, GIGANTE_VERT } from './corpos/gigante';
import { uniformsDeEclipseNeutros } from './corpos/eclipseNoMaterial';
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

/** a exposição da visita — artística: albedo 0,3 sai a ~0,27, abaixo
 *  do joelho da curva de tom (a 2,4 o canal vermelho de uma anã M
 *  saturava e o globo virava um disco chapado, sem a fase) */
const EXPOSICAO_DA_VISITA = 0.9;
/** cada mundo exposto para si, mas só pela METADE (raiz quadrada) da
 *  distância entre o albedo médio dele e 0,3: o basalto continua mais
 *  escuro que a rocha oxidada e o gelo bem mais claro que os dois — a
 *  exposição inteira igualava todos, e o gelo saía da cor da rocha */
const ALBEDO_DA_EXPOSICAO = 0.3;
/** onde o brilho próprio vence a luz refletida, a exposição é a dele, e o
 *  pico sai pouco acima do branco na lava (a fenda mais quente amarela, sem
 *  virar o pêssego estourado de 2) e abaixo dele no gigante jovem (a 2 o
 *  disco inteiro estourava e virava estrela) */
const PICO_DO_BRILHO_PROPRIO = { rochoso: 1.1, gas: 0.8 } as const;
/** a compressão do brilho próprio quando ele manda (potência sobre o canal
 *  mais forte; ver `brilhoNaTela`) */
const POTENCIA_DO_BRILHO_PROPRIO = 0.4;
/**
 * O OLHO DA VISITA SE ADAPTA EM PARTE à cor da estrela (artístico, 14/11):
 * a luz que acende o planeta anda esta fração do caminho até o branco. Sem
 * isso, sob uma anã vermelha (2.566 K: verde a 37 % e azul a 7 % do
 * vermelho) todo chão saía do mesmo laranja e o gelo não se lia como gelo;
 * com 40 % o laranja continua lá, e a superfície clara sai mais clara e
 * menos saturada que a rocha, como para um olho que passou um tempo ali.
 */
const ADAPTACAO_DO_OLHO = 0.4;
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
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _giro = new THREE.Matrix4();
const _inv = new THREE.Quaternion();

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

/** a cor da luz da estrela (sRGB linear, máximo 1), com o olho adaptado */
function corDaEstrela(teffK: number): [number, number, number] {
  const c = blackbodyLinear(teffK).map((x) => Math.max(0, x));
  const m = Math.max(c[0], c[1], c[2]) || 1;
  const a = ADAPTACAO_DO_OLHO;
  return [c[0] / m + (1 - c[0] / m) * a, c[1] / m + (1 - c[1] / m) * a, c[2] / m + (1 - c[2] / m) * a];
}

type Rgb = readonly [number, number, number];

/**
 * AS CORES DAS NUVENS pela classe de Sudarsky et al. 2000 (clara, escura;
 * albedo linear): I amônia (bege de Júpiter), II água (branco), III sem
 * nuvens (o azul do espalhamento), IV metais alcalinos (quase preto), V
 * silicatos (cinza-areia). O tom de cada classe é imaginado a partir do
 * albedo que o modelo prevê; a cor só anda perto das fronteiras (±15 % da
 * temperatura), para o meio de cada classe ser a classe.
 */
const NUVENS: readonly { clara: Rgb; escura: Rgb }[] = [
  { clara: [0.8, 0.71, 0.58], escura: [0.55, 0.38, 0.25] },
  { clara: [0.86, 0.86, 0.84], escura: [0.68, 0.68, 0.7] },
  { clara: [0.2, 0.3, 0.52], escura: [0.1, 0.15, 0.31] },
  { clara: [0.12, 0.095, 0.09], escura: [0.05, 0.038, 0.04] },
  { clara: [0.5, 0.42, 0.36], escura: [0.3, 0.22, 0.18] },
];

function nuvensEm(tK: number): { clara: Rgb; escura: Rgb } {
  const lt = Math.log(tK);
  // a posição contínua entre as classes: inteiro no meio, rampa de ±0,15
  // em ln T em volta de cada fronteira
  let pos = 0;
  FRONTEIRAS_DA_CLASSE.sudarskyK.forEach((t) => {
    pos += Math.min(1, Math.max(0, (lt - Math.log(t) + 0.15) / 0.3));
  });
  const k = Math.min(NUVENS.length - 2, Math.floor(pos));
  const f = pos - k;
  const [a, b] = [NUVENS[k]!, NUVENS[k + 1]!];
  return { clara: misturar(a.clara, b.clara, f), escura: misturar(a.escura, b.escura, f) };
}

const misturar = (x: Rgb, y: Rgb, f: number): Rgb => [x[0] + (y[0] - x[0]) * f, x[1] + (y[1] - x[1]) * f, x[2] + (y[2] - x[2]) * f];
const luminancia = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const entre = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const limitar = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** o brilho próprio (o `brilhoTermico` do GLSL, na CPU) vezes a luz, no canal mais forte */
function brilhoTermico(tK: number, teffK: number, diluicao: number, luz: Rgb): number {
  if (tK < 500) return 0;
  return Math.max(
    ...[23587, 26160, 30942].map(
      (c2, i) => ((Math.expm1(c2 / teffK) * Math.exp(-c2 / tK)) / -Math.expm1(-c2 / tK) / diluicao) * luz[i]!
    )
  );
}

/** a cor do gelo limpo, a mesma do GLSL (para a exposição) */
const GELO: Rgb = [0.8, 0.84, 0.9];
/**
 * A ROCHA pelo que se mede (imaginada a partir disso): fria e morna, a
 * rocha oxidada, clara e avermelhada (os planaltos de Marte); quente, o
 * basalto escuro; e quanto mais densa que a rocha com o núcleo da Terra no
 * mesmo tamanho (ρ ≈ 5,51·R^0,7, suposto), mais ferro e mais cinza. As
 * planícies de lava velha são o basalto.
 */
const ROCHA_OXIDADA: Rgb = [0.34, 0.21, 0.13];
const BASALTO: Rgb = [0.11, 0.105, 0.1];
const FERROSA: Rgb = [0.15, 0.15, 0.155];

/**
 * A FACE DE UM PLANETA: qual ramo o desenha e os uniformes dele. Tudo
 * aqui é imaginado a partir da classe e dos números medidos (temperatura,
 * densidade, tamanho) com a semente no id, exceto as temperaturas
 * (derivadas) e a cor de HD 189733 b (medida).
 */
export function faceDoPlaneta(pl: Exoplaneta, c: ClimaDoExoplaneta, teffK: number, luz: Rgb) {
  const [s0, s1, s2] = sementeDoExoplaneta(pl.id);
  const rochoso = c.classe === 'lava' || c.classe.startsWith('rochoso') || c.classe === 'gelado';
  const gigante = c.classe === 'giganteQuente' || c.classe === 'giganteFrio';
  // o piso da noite: a temperatura medida no espectro, quando ela passa da
  // irradiada (o gigante jovem que brilha sozinho); senão uma fração da
  // de equilíbrio — 0,4 sem atmosfera (rochoso), 0,6 com (gás) — suposta
  const proprio = c.atmosferaK > 1.2 * c.teqK;
  const piso = proprio ? c.atmosferaK : c.teqK * (rochoso ? 0.4 : 0.6);
  const tMax = Math.max(c.travado ? c.subestelarK : c.subestelarK * 0.75, piso);
  let albedoMedio: number;
  const u: Record<string, THREE.IUniform> = {
    uDirSolLocal: { value: new THREE.Vector3(1, 0, 0) },
    uCamLocal: { value: new THREE.Vector3(0, 0, 4) },
    uLuzGanho: { value: 1 },
    uNormalEsc: { value: new THREE.Vector3(1, 1, 1) },
    uEscalaLocal: { value: new THREE.Vector3(1, 1, 1) },
    ...uniformsDaLuzDaVisita(),
    ...uniformsDeEclipseNeutros(),
    ...uniformsDaFace(),
  };
  if (rochoso) {
    const R = pl.raioTerra.v;
    // morno → quente: a rocha escurece e a lava velha cobre mais chão
    const quente = entre(240, 420, c.teqK);
    const ferro = c.densidade === null ? 0.3 : limitar(0.5 + 2.5 * (c.densidade / (5.51 * R ** 0.7) - 1));
    const j = [(s0 % 10) / 10 - 0.5, (s1 % 10) / 10 - 0.5, (s2 % 10) / 10 - 0.5];
    // as planícies: o calor e o tamanho (mais calor guardado, mais vulcão)
    const mares = limitar(0.15 + 0.55 * quente + 0.25 * limitar((R - 0.8) / 0.4) + 0.2 * j[0]!);
    // as crateras: onde a lava não cobriu, e mais no planeta pequeno
    const crateras = limitar(0.85 - 0.6 * mares + 0.3 * limitar((1 - R) / 0.3) + 0.1 * j[1]!, 0.15, 1);
    const terra = misturar(misturar(ROCHA_OXIDADA, BASALTO, quente), FERROSA, 0.6 * ferro);
    // o matiz anda um pouco com a semente: do ferroso ao cinza
    const base: Rgb = [terra[0] * (1 + 0.25 * j[2]!), terra[1], terra[2] * (1 - 0.25 * j[2]!)];
    const mar = misturar(base.map((x) => x * 0.6) as unknown as Rgb, [0.07, 0.07, 0.075], 0.5);
    u.uAlbedoBase = { value: new THREE.Vector3(...base) };
    u.uBumpAlbedo = { value: 1 };
    u.uAlbedoMar.value.set(...mar);
    const gelo = linhasDoGelo([s0, s1, s2]);
    u.uLinhas.value = gelo.linhas;
    u.uTrechos.value = gelo.trechos;
    const gelado = c.classe === 'gelado';
    // o gelado: crateras e sujeira pelo tamanho — o pequeno guarda mais
    // crateras e fica limpo como Encélado; o grande tem terreno escuro velho
    // como Ganimedes — e a semente varia os dois
    (u.uMundo.value as THREE.Vector4).set(
      mares,
      gelado ? limitar(0.25 + 0.5 * limitar((1.1 - R) / 0.4) + 0.2 * j[1]!) : crateras,
      gelado ? limitar(0.3 + 0.6 * limitar((R - 0.8) / 0.4) + 0.4 * j[2]!) : 0.3 + 0.7 * ((s1 * 0.37) % 1),
      1 + Math.floor(s2 % 3)
    );
    // a fração da face de dia abaixo do degelo (travado: cos z < (273/T_sub)⁴)
    const fracaoDeGelo = c.classe === 'rochosoTemperado' ? limitar((273 / c.subestelarK) ** 4) : 0;
    const albRocha = luminancia(base) * (1 - 0.4 * mares) + luminancia(mar) * 0.4 * mares;
    albedoMedio = gelado ? luminancia(GELO) * 0.9 : albRocha + (luminancia(GELO) - albRocha) * fracaoDeGelo;
    const quenteOuLava = c.classe === 'rochosoQuente' || c.classe === 'lava';
    (u.uFace.value as THREE.Vector4).set(gelado ? 4 : quenteOuLava ? 2 : 1, c.subestelarK, piso, c.travado ? 1 : 0);
  } else {
    const nuvens = pl.albedo
      ? {
          clara: pl.albedo.rgb.map((x) => x * 1.3) as unknown as Rgb,
          escura: pl.albedo.rgb.map((x) => x * 0.7) as unknown as Rgb,
        }
      : nuvensEm(c.atmosferaK);
    u.uCorClara = { value: new THREE.Vector3(...nuvens.clara) };
    u.uCorEscura = { value: new THREE.Vector3(...nuvens.escura) };
    // os travados giram devagar: faixas largas e poucas; o sub-Netuno é
    // nevoento: pouco contraste
    const faixas = gigante ? (c.travado ? 7 : 16) : 6;
    const contraste = gigante ? (c.travado ? 0.6 : 0.85) : 0.45;
    const turbulencia = gigante ? 1 : 0.5;
    const tempestades = gigante ? 1 + Math.floor((s1 % 10) / 3.4) : s1 % 10 > 5 ? 1 : 0;
    u.uFaixas = { value: new THREE.Vector4(faixas, contraste, turbulencia, tempestades) };
    albedoMedio = luminancia(nuvens.clara) * 0.5 + luminancia(nuvens.escura) * 0.5;
    (u.uFace.value as THREE.Vector4).set(3, c.subestelarK, piso, c.travado ? 1 : 0);
  }
  (u.uSemente.value as THREE.Vector3).set(s0, s1, s2);
  (u.uEstrela.value as THREE.Vector2).set(teffK, c.diluicao);
  (u.uCorDaLuz.value as THREE.Vector3).set(...luz);
  let ganho =
    (EXPOSICAO_DA_VISITA * limitar(Math.sqrt(ALBEDO_DA_EXPOSICAO / albedoMedio), 0.6, 1.7)) / Math.sqrt(luminancia(luz));
  // o brilho próprio: a faixa escura do gigante e a fenda da lava passam
  // 10 % da temperatura do lugar
  const pico = brilhoTermico(tMax * 1.1, teffK, c.diluicao, luz);
  const brilho = u.uBrilho.value as THREE.Vector3;
  if (pico > albedoMedio) {
    ganho = 1 / pico;
    brilho.set(1 / pico, POTENCIA_DO_BRILHO_PROPRIO, rochoso ? PICO_DO_BRILHO_PROPRIO.rochoso : PICO_DO_BRILHO_PROPRIO.gas);
  } else if (pico * ganho > 1e-3) {
    brilho.set(ganho, 1, 1);
  }
  u.uLuzGanho.value = ganho;
  return {
    vert: rochoso ? ROCHOSO_VERT : GIGANTE_VERT,
    frag: rochoso ? ROCHOSO_PROC_FRAG : GIGANTE_PROC_FRAG,
    uniforms: u,
  };
}

interface Montagem {
  sistema: SistemaPlanetario;
  grupo: THREE.Group;
  orbitas: THREE.Group;
  zona: THREE.Mesh | null;
  bases: BaseDaOrbita[];
  /** `giroHoras` = null no travado (a cara para a estrela) */
  corpos: { planeta: Exoplaneta; malha: THREE.Mesh; raioPc: number; travado: boolean; giroHoras: number | null }[];
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
    const teff = estrela?.teffK.v ?? 5772;
    const luz = corDaEstrela(teff);
    // a malha da casca dos rochosos da casa (128 × 64)
    const esfera = new THREE.SphereGeometry(1, 128, 64);
    descartaveis.push(esfera);
    const corpos = sistema.planetas.map((pl) => {
      const clima = climaDoExoplaneta(pl, {
        teffK: teff,
        raioRsol: estrela?.raioRsol.v ?? 1,
        massaMsol: estrela?.massaMsol.v ?? 1,
        luminosidadeLsol: estrela?.luminosidadeLsol.v ?? 1,
      });
      const face = faceDoPlaneta(pl, clima, teff, luz);
      const mat = new THREE.ShaderMaterial({
        vertexShader: face.vert,
        fragmentShader: face.frag,
        uniforms: face.uniforms,
      });
      descartaveis.push(mat);
      const malha = new THREE.Mesh(esfera, mat);
      malha.scale.setScalar(raioDoPlanetaUa(pl));
      grupo.add(malha);
      const giro = giroDoExoplaneta(pl, clima);
      return { planeta: pl, malha, raioPc: raioDoPlanetaUa(pl) * AU_PARA_PC, travado: clima.travado, giroHoras: giro?.horas ?? null };
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
      // O GIRO: o polo do planeta é o da órbita; o travado olha a estrela
      // com o mesmo lado (+x local), o outro gira no dia medido ou suposto
      // (`giroDoExoplaneta`), no sentido da órbita, com o relógio da cena
      const base = m.bases[k]!;
      _y.set(base.polo[0], base.polo[1], base.polo[2]);
      if (c.travado || c.giroHoras === null) _x.set(-r[0] / n, -r[1] / n, -r[2] / n).addScaledVector(_y, -_x.dot(_y)).normalize();
      else {
        const voltas = ((q.jd - J2000_JD) * 24) / c.giroHoras;
        _x.set(base.u[0], base.u[1], base.u[2]).applyAxisAngle(_y, 2 * Math.PI * (voltas - Math.floor(voltas)));
      }
      _z.crossVectors(_x, _y);
      c.malha.quaternion.setFromRotationMatrix(_giro.makeBasis(_x, _y, _z));
      _inv.copy(c.malha.quaternion).invert();
      const u = (c.malha.material as THREE.ShaderMaterial).uniforms;
      (u.uDirSolLocal.value as THREE.Vector3).set(-r[0] / n, -r[1] / n, -r[2] / n).applyQuaternion(_inv);
      _pos.set(r[0], r[1], r[2]).multiplyScalar(AU_PARA_PC).add(escolhido.pos);
      (u.uCamLocal.value as THREE.Vector3).copy(q.camPos).sub(_pos).divideScalar(c.raioPc).applyQuaternion(_inv);
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
