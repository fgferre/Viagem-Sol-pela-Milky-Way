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
import { PRIORIDADE_DO_ROTULO, projectForced } from './labels';
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
 * GEOMETRIA vem daqui. Toda posição é medida do Sol, que está na
 * origem: o comprimento do vetor É a distância que a paleta mostra.
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
      d: p.length(),
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
  }
  return { alvo, raio: linha.raioPc, eixoDe: eixoQuePousaEm(dir, polo), polo };
}

/** além disto do Sol (pc) o visitante saiu do sistema solar: os nomes dos
 *  lugares próximos podem aparecer sem tocar a vista de abertura */
const FORA_DO_SISTEMA_PC = 1;
/** além disto do Sol a vizinhança estelar acabou (o mesmo corte de
 *  `projectLabels`): só aí os nomes da escala da galáxia aparecem */
const FORA_DA_VIZINHANCA_PC = 2000;

/** a que fração do raio, acima do centro, o nome do lugar se apoia */
const ALTURA_DO_NOME = 0.5;

const _topo = new THREE.Vector3();
const _cima = new THREE.Vector3();

/**
 * OS NOMES DOS LUGARES NA CENA. Um lugar tem nome quando LÊ como objeto:
 * nem tão longe que vire um ponto (raio aparente < 0,3°), nem tão perto
 * que a câmera esteja dentro dele (a menos de dois raios — aí quem fala
 * são os nomes das estrelas-membro e o cabeçalho da ficha). O nome fica
 * ACIMA do centro (meio raio), não nele: assim ele não disputa a vaga
 * com a estrela que mora no meio do aglomerado. Uma VISTA (`semRotulo`)
 * não tem nome na cena.
 */
export function projetarLugares(camera: THREE.PerspectiveCamera): StarLabel[] {
  const out: StarLabel[] = [];
  const dHome = camera.position.length();
  if (dHome < FORA_DO_SISTEMA_PC) return out;
  _cima.set(0, 1, 0).applyQuaternion(camera.quaternion);
  for (const lugar of LUGARES_DA_BUSCA) {
    const linha = lugarDaTabela(lugar.id);
    if (!linha?.raioPc || linha.semRotulo) continue;
    if (linha.categoria === 'galaxia' && dHome < FORA_DA_VIZINHANCA_PC) continue;
    _topo.set(lugar.x, lugar.y, lugar.z);
    const dist = _topo.distanceTo(camera.position);
    const raioAparente = Math.atan(linha.raioPc / Math.max(dist, 1e-9)) / GRAU;
    const opacidade =
      THREE.MathUtils.smoothstep(raioAparente, 0.3, 0.6) *
      (1 - THREE.MathUtils.smoothstep(raioAparente, 22, 27)) *
      0.95;
    if (opacidade < 0.02) continue;
    _topo.addScaledVector(_cima, linha.raioPc * ALTURA_DO_NOME);
    const l = projectForced(camera, nomeDoLugar(lugar), '', _topo, `${CHAVE_DE_LUGAR}${lugar.id}`);
    if (!l) continue;
    l.distPc = dist;
    l.opacity = opacidade;
    if (linha.classe) l.detalhe = classeEmTexto(linha.classe);
    l.prioridade = PRIORIDADE_DO_ROTULO.lugar;
    out.push(l);
  }
  return out;
}
