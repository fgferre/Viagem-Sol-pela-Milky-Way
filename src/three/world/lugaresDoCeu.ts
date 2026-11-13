// ============================================================
// OS LUGARES DO CÉU NA CENA — o lado three da tabela única
// (`lib/lugaresDoFilme.ts`). A tabela diz O QUE é cada lugar; aqui mora
// ONDE ele está (as posições que dependem de constantes da galáxia) e
// DE ONDE a câmera o olha ao chegar (`poseDoLugar`). O rótulo do lugar
// também nasce aqui (`projetarLugares`), porque é a mesma geometria.
//
// O CENTRO GALÁCTICO (Sagittarius A✱) continua na lei antiga dele: sem
// `raioPc` na linha, `poseDoLugar` devolve `null` e quem chama cai em
// `escada.visitarEstrela`, bit a bit como antes; o rótulo dele segue
// sendo o de `labels.ts` (`sgr-a`).
// ============================================================
import * as THREE from 'three';
import type { LugarBuscavel } from '../../lib/buscaEstrelas';
import { nomeDoLugar } from '../../lib/buscaEstrelas';
import { LUGARES_DO_FILME } from '../../lib/lugaresDoFilme';
import type { LugarDoCeu } from '../../lib/lugaresDoFilme';
import { classeEmTexto } from '../atlasConfig';
import { GRAU, PHASE_OFFSET_GRAUS } from '../cinematic/enquadramento';
import { EX, EY, EZ, GAL } from './baseGalactica';
import { CENTRO_M110, CENTRO_M32, CENTRO_PNM, GNM, M31 } from './geradorDasVizinhas';
import {
  OPACIDADE_MINIMA_DO_ROTULO,
  PRIORIDADE_DO_ROTULO,
  SGR_A_ESMAECE_EM,
  SGR_A_SOME_EM,
  projectForced,
} from './labels';
import type { StarLabel } from './labels';

/** o prefixo da chave do rótulo de um lugar — o clique o reconhece */
export const CHAVE_DE_LUGAR = 'lugar:';

/**
 * O CENTRO DA ANÃ DE SAGITÁRIO como a galáxia a desenha: l = 5,6°,
 * b = −14,2°, 26 kpc do Sol — a mesma conta de `SGR_DWARF_POS`
 * (`geradorDaGalaxia.ts`), refeita aqui porque aquele módulo lê
 * `window` ao ser importado e quebraria quem só quer a geometria (os
 * testes da escolha). `lugaresDoFilme.test.ts` cobra que as duas batem.
 */
export const CENTRO_DA_ANA_DE_SAGITARIO = (() => {
  const l = 5.6 * (Math.PI / 180);
  const b = -14.2 * (Math.PI / 180);
  return EX.clone()
    .multiplyScalar(-Math.cos(b) * Math.cos(l))
    .addScaledVector(EY, -Math.cos(b) * Math.sin(l))
    .addScaledVector(EZ, Math.sin(b))
    .normalize()
    .multiplyScalar(26_000);
})();

/** "o meio do caminho" de "Nosso lugar": a fração Sol→centro enquadrada */
const FRACAO_RUMO_AO_CENTRO = 0.5;

function posicaoDe(lugar: LugarDoCeu): THREE.Vector3 | null {
  const alvo = lugar.alvo;
  if ('centroGalactico' in alvo) return GAL.GC_POS.clone();
  if ('pc' in alvo) return new THREE.Vector3(alvo.pc[0], alvo.pc[1], alvo.pc[2]);
  if ('vizinha' in alvo) {
    if (alvo.vizinha === 'gnm') return GNM.centro.clone();
    if (alvo.vizinha === 'pnm') return CENTRO_PNM.clone();
    return M31.centro.clone();
  }
  if ('cena' in alvo) {
    if (alvo.cena === 'centroGalactico') return GAL.GC_POS.clone();
    if (alvo.cena === 'anaDeSagitario') return CENTRO_DA_ANA_DE_SAGITARIO.clone();
    return GAL.GC_POS.clone().multiplyScalar(FRACAO_RUMO_AO_CENTRO);
  }
  // a linha cujo alvo é uma ESTRELA vira apelido dela no índice
  return null;
}

/**
 * OS LUGARES DO CÉU que a busca alcança — as palavras vêm da tabela, a
 * GEOMETRIA vem daqui. Toda posição é medida do Sol, que está na origem.
 *
 * A DISTÂNCIA QUE A PALETA MOSTRA NÃO É o comprimento do vetor (crítica
 * de 12/11): é a da literatura (`distanciaPc`), a MESMA que a ficha
 * escreve. O vetor é onde a cena desenha o lugar — a média das membros
 * no catálogo da casa, a anã onde a galáxia a põe —, e a paleta dizia
 * 418 anos-luz das Plêiades enquanto a ficha, um clique depois, dizia
 * 444. Uma VISTA cuja distância é do Sol ao centro ("Nosso lugar", a
 * galáxia de cima) não leva número: o destino não fica a essa distância.
 */
export const LUGARES_DA_BUSCA: readonly LugarBuscavel[] = LUGARES_DO_FILME.flatMap((lugar) => {
  const p = posicaoDe(lugar);
  if (!p) return [];
  return [
    {
      id: lugar.id,
      nome: lugar.nome,
      ...(lugar.nomeEn ? { nomeEn: lugar.nomeEn } : {}),
      ...(lugar.raioPc ? { raioPc: lugar.raioPc } : {}),
      ...(lugar.classe ? { classe: lugar.classe } : {}),
      ...(lugar.distanciaPc && !lugar.distanciaPc.doSolAoCentro ? { d: lugar.distanciaPc.valor } : {}),
      x: p.x,
      y: p.y,
      z: p.z,
    },
  ];
});

/** a linha da tabela de um lugar, pelo id */
export function lugarDaTabela(id: string): LugarDoCeu | undefined {
  return LUGARES_DO_FILME.find((l) => l.id === id);
}

const NORTE_CELESTE = new THREE.Vector3(0, 0, 1);

/**
 * O EIXO QUE O RIG PRECISA para pousar a câmera numa DIREÇÃO dada. O rig
 * não recebe direção: recebe um `eixoDe` e põe a câmera do lado OPOSTO
 * dele, girada `PHASE_OFFSET_GRAUS` rumo ao polo (`direcaoDeRepouso`).
 * Desfazer esse giro aqui deixa a lei do rig intacta — ela é a mesma de
 * toda estrela — e entrega a vista pedida exata. Vale enquanto `dir` e
 * o polo distam menos de 180° − o giro (todas as vistas da tabela).
 */
export function eixoQuePousaEm(dir: THREE.Vector3, polo: THREE.Vector3): THREE.Vector3 {
  const eixo = new THREE.Vector3().crossVectors(dir, polo);
  if (eixo.lengthSq() < 1e-12) return dir.clone().negate();
  return dir
    .clone()
    .applyAxisAngle(eixo.normalize(), -PHASE_OFFSET_GRAUS * GRAU)
    .negate();
}

export interface PoseDoLugar {
  alvo: THREE.Vector3;
  raio: number;
  eixoDe: THREE.Vector3;
  polo: THREE.Vector3;
  /** o piso do zoom que a linha pede (`pisoPc`); ausente = o de estrela */
  pisoRaio?: number;
}

/**
 * O ENQUADRAMENTO DE UM LUGAR: o centro, o raio e de onde se olha.
 * `null` = o lugar não tem lei própria (o centro galáctico de sempre).
 */
export function poseDoLugar(lugar: Pick<LugarBuscavel, 'id' | 'x' | 'y' | 'z'>): PoseDoLugar | null {
  const linha = lugarDaTabela(lugar.id);
  if (!linha?.raioPc || !linha.vista) return null;
  const alvo = new THREE.Vector3(lugar.x, lugar.y, lugar.z);
  const ngp = GAL.NGP.clone().normalize();
  // do centro galáctico para o Sol, no plano do disco
  const rumoAoSol = GAL.GC_POS.clone().negate().projectOnPlane(ngp).normalize();
  let dir: THREE.Vector3;
  let polo: THREE.Vector3;
  switch (linha.vista) {
    case 'doSol':
      // do lado do Sol, em cima da linha de visada: a forma do céu
      dir = alvo.clone().negate().normalize();
      polo = NORTE_CELESTE.clone();
      break;
    case 'deCimaDoDisco':
      // do polo norte galáctico; o alto da tela aponta do Sol para o
      // centro, então o Sol fica embaixo
      dir = ngp.clone();
      polo = rumoAoSol.clone().negate();
      break;
    case 'sobreOSol':
      // atrás do Sol (do lado de fora do disco) e 50° acima do plano
      dir = rumoAoSol
        .clone()
        .multiplyScalar(Math.cos(50 * GRAU))
        .addScaledVector(ngp, Math.sin(50 * GRAU))
        .normalize();
      polo = ngp.clone();
      break;
    case 'abaixoDoDisco': {
      // de LADO da linha centro→anã e 30° abaixo do disco: de frente
      // para essa linha a anã se sobrepõe ao bojo e some; de lado ela
      // fica no centro do quadro e a galáxia ao lado dela
      const paraFora = alvo.clone().sub(GAL.GC_POS).projectOnPlane(ngp).normalize();
      const deLado = new THREE.Vector3().crossVectors(ngp, paraFora).normalize();
      dir = deLado.multiplyScalar(Math.cos(30 * GRAU)).addScaledVector(ngp, -Math.sin(30 * GRAU)).normalize();
      polo = ngp.clone();
      break;
    }
    case 'comAViaLactea': {
      // do lado de FORA da Grande Nuvem (centro galáctico atrás dela),
      // girado 35° para longe da Pequena Nuvem no plano dos três: a Via
      // Láctea cai ~23° de um lado do quadro e a Pequena Nuvem ~34° do
      // outro (medido a 25 kpc, 12/11), e o polo deitado nesse plano põe
      // os três numa linha horizontal
      const fora = alvo.clone().sub(GAL.GC_POS).normalize();
      const rumoPnm = CENTRO_PNM.clone().sub(alvo);
      rumoPnm.addScaledVector(fora, -rumoPnm.dot(fora)).normalize();
      dir = fora.multiplyScalar(Math.cos(35 * GRAU)).addScaledVector(rumoPnm, -Math.sin(35 * GRAU)).normalize();
      polo = new THREE.Vector3().crossVectors(dir, rumoPnm).normalize();
      break;
    }
  }
  return {
    alvo,
    raio: linha.raioPc,
    eixoDe: eixoQuePousaEm(dir, polo),
    polo,
    ...(linha.pisoPc ? { pisoRaio: linha.pisoPc } : {}),
  };
}

/** além disto do Sol (pc) o visitante saiu do sistema solar: os nomes dos
 *  lugares próximos podem aparecer sem tocar a vista de abertura */
const FORA_DO_SISTEMA_PC = 1;
/** além disto do Sol a vizinhança estelar acabou (o mesmo corte de
 *  `projectLabels`): só aí os nomes da escala da galáxia aparecem */
const FORA_DA_VIZINHANCA_PC = 2000;

const _centro = new THREE.Vector3();

/**
 * OS NOMES DOS LUGARES NA CENA. Um lugar tem nome quando LÊ como objeto:
 * nem tão longe que vire um ponto (raio aparente < 0,3°), nem tão perto
 * que a câmera esteja dentro dele (a menos de dois raios — aí quem fala
 * são os nomes das estrelas-membro e o cabeçalho da ficha). O nome fica
 * NO CENTRO, como todo nome da casa (crítica de 12/11): até então ele se
 * apoiava meio raio de ENQUADRAMENTO acima do centro, e como a chegada
 * enquadra todo lugar pelo mesmo raio, o nome caía sempre no mesmo ponto
 * da tela, longe do objeto — o raio de enquadramento é bem maior que o
 * que se vê (o raio de maré das Plêiades, o disco inteiro de Andrômeda).
 * Uma VISTA (`semRotulo`) não tem nome na cena.
 *
 * OS NOMES DA ESCALA DA GALÁXIA só aparecem fora das DUAS vizinhanças:
 * a do Sol (`FORA_DA_VIZINHANCA_PC`) e a do centro, onde o nome é o de
 * Sagittarius A✱ — eles entram na mesma faixa em que o dele sai. Dentro
 * do bojo a anã de Sagitário, dezoito mil parsecs atrás do buraco, não
 * é objeto que se veja, e o nome dela lia como o nome do buraco.
 */
export function projetarLugares(camera: THREE.PerspectiveCamera): StarLabel[] {
  const out: StarLabel[] = [];
  const dHome = camera.position.length();
  if (dHome < FORA_DO_SISTEMA_PC) return out;
  const dGC = camera.position.distanceTo(GAL.GC_POS);
  const foraDoCentro = THREE.MathUtils.smoothstep(dGC, SGR_A_ESMAECE_EM, SGR_A_SOME_EM);
  for (const lugar of LUGARES_DA_BUSCA) {
    const linha = lugarDaTabela(lugar.id);
    if (!linha?.raioPc || linha.semRotulo) continue;
    if (linha.categoria === 'galaxia' && dHome < FORA_DA_VIZINHANCA_PC) continue;
    _centro.set(lugar.x, lugar.y, lugar.z);
    const dist = _centro.distanceTo(camera.position);
    const raioAparente = Math.atan(linha.raioPc / Math.max(dist, 1e-9)) / GRAU;
    const opacidade =
      THREE.MathUtils.smoothstep(raioAparente, 0.3, 0.6) *
      (1 - THREE.MathUtils.smoothstep(raioAparente, 22, 27)) *
      0.95 *
      (linha.categoria === 'galaxia' ? foraDoCentro : 1);
    if (opacidade < 0.02) continue;
    const l = projectForced(camera, nomeDoLugar(lugar), '', _centro, `${CHAVE_DE_LUGAR}${lugar.id}`);
    if (!l) continue;
    l.distPc = dist;
    l.opacity = opacidade;
    if (linha.classe) l.detalhe = classeEmTexto(linha.classe);
    l.prioridade = PRIORIDADE_DO_ROTULO.lugar;
    out.push(l);
  }
  return out;
}

/** o prefixo da chave de uma COMPANHEIRA desenhada sem linha na tabela */
export const CHAVE_DE_COMPANHEIRA = 'companheira:';

/**
 * AS COMPANHEIRAS DE UM LUGAR (13/11): o que a cena desenha junto com ele
 * e que, com ele em foco, tem nome — as elípticas de Andrômeda, que não
 * são destino próprio, e a Pequena Nuvem para a Grande, que é.
 */
const COMPANHEIRAS: Readonly<Record<string, readonly { id: string; nome: string; centro: THREE.Vector3 }[]>> = {
  andromeda: [
    { id: 'm32', nome: 'M32', centro: CENTRO_M32 },
    { id: 'm110', nome: 'M110', centro: CENTRO_M110 },
  ],
};
const LUGARES_COMPANHEIROS: Readonly<Record<string, readonly string[]>> = {
  'grande-nuvem-de-magalhaes': ['pequena-nuvem-de-magalhaes'],
};

/** o lugar cujo centro é o alvo do Atlas — o lugar em foco, ou nada */
export function lugarNoAlvo(alvo: THREE.Vector3 | null | undefined): LugarBuscavel | undefined {
  if (!alvo) return undefined;
  return LUGARES_DA_BUSCA.find(
    (l) => l.raioPc !== undefined && _centro.set(l.x, l.y, l.z).distanceTo(alvo) < l.raioPc * 1e-6
  );
}

/** os nomes das companheiras do lugar em foco, no centro de cada uma */
export function projetarCompanheiras(camera: THREE.PerspectiveCamera, idDoLugar: string): StarLabel[] {
  const out: StarLabel[] = [];
  for (const c of COMPANHEIRAS[idDoLugar] ?? []) {
    const l = projectForced(camera, c.nome, '', c.centro, `${CHAVE_DE_COMPANHEIRA}${c.id}`);
    if (!l) continue;
    l.distPc = c.centro.distanceTo(camera.position);
    l.prioridade = PRIORIDADE_DO_ROTULO.lugar;
    out.push(l);
  }
  return out;
}

/** quanto o nome do lugar sobe acima do grupo, em fração da altura */
export const FOLGA_DO_NOME_DO_GRUPO = 0.05;
/** de que distância na horizontal (fração da largura) outro nome divide a
 *  linha com o nome do lugar — o comprimento de um nome de galáxia */
const LARGURA_DO_NOME_DO_GRUPO = 0.25;

/**
 * O LUGAR EM FOCO DÁ A VEZ AO QUE ELE CONTÉM (13/11). As estrelas-membro
 * com nome e as companheiras em quadro podem escrever do outro lado da
 * âncora (`outroLado`), e o nome do lugar sai do centro — onde tomava a
 * vaga de Atlas e Electra nas Plêiades — para logo acima do grupo; se
 * outro nome já está nessa linha (a anã de Sagitário sobre a Grande
 * Nuvem), logo abaixo. Sem ninguém do grupo em quadro, o nome fica no
 * centro, como sempre.
 */
export function abrirVagaNoGrupo(idDoLugar: string, lista: readonly StarLabel[]): void {
  const membros = new Set<string>([
    ...(lugarDaTabela(idDoLugar)?.membros ?? []),
    ...(COMPANHEIRAS[idDoLugar] ?? []).map((c) => `${CHAVE_DE_COMPANHEIRA}${c.id}`),
    ...(LUGARES_COMPANHEIROS[idDoLugar] ?? []).map((id) => `${CHAVE_DE_LUGAR}${id}`),
  ]);
  if (membros.size === 0) return;
  const proprio = lista.find((l) => l.key === `${CHAVE_DE_LUGAR}${idDoLugar}`);
  let topo = Number.POSITIVE_INFINITY;
  let base = Number.NEGATIVE_INFINITY;
  for (const l of lista) {
    if (!membros.has(l.key)) continue;
    l.outroLado = true;
    if (l.opacity < OPACIDADE_MINIMA_DO_ROTULO) continue;
    topo = Math.min(topo, l.y);
    base = Math.max(base, l.y);
  }
  if (!proprio || !Number.isFinite(topo)) return;
  const acima = Math.min(proprio.y, topo) - FOLGA_DO_NOME_DO_GRUPO;
  const ocupada = (y: number) =>
    lista.some(
      (l) =>
        l !== proprio &&
        !membros.has(l.key) &&
        l.opacity >= OPACIDADE_MINIMA_DO_ROTULO &&
        Math.abs(l.y - y) < FOLGA_DO_NOME_DO_GRUPO &&
        Math.abs(l.x - proprio.x) < LARGURA_DO_NOME_DO_GRUPO
    );
  proprio.y = ocupada(acima) ? Math.max(proprio.y, base) + FOLGA_DO_NOME_DO_GRUPO : acima;
}
