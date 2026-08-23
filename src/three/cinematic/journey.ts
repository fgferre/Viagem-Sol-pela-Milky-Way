// ============================================================
// A Viagem — roteiro cinematográfico em SHOTS parametrizados.
//
// CORTE DE 19/08 — o roteiro repensado depois da reprovação do dono
// ("muito enfadonho... minutos sem nada acontecer... feio viajar de
// lado"). As duas leis dele, agora executáveis em roteiroPerfil.test:
//   - A FRENTE É A VISÃO PRINCIPAL: em travessia a câmera olha para
//     onde vai ("os aviões não voam de lado"); lado e traseira são
//     acentos DECLARADOS (`lingua`), nunca o normal.
//   - TEMPO SEM ATIVIDADE NÃO EXISTE: trecho parado encurta, acelera
//     ou ganha evento. Quietude só quando é a mensagem — e curta.
//
// Quatro atos e uma coda, ~3min13 (os intervalos derivam de STARTS).
// Corte de 19/08 à noite: o dono ainda via "periodos longos da camera
// se movimentando sem nenhuma acao" e pediu câmera mais cinematográfica
// (fly-by, take único). O que mudou é DURAÇÃO e a coda; a abertura e
// os QUADROS de medição ficam.
//   I   CASA (0–30s)        — parede de fogo e hélice exponencial,
//                             INTACTAS (composição aprovada pelo dono).
//   II  ÓRION (30–80s)      — Sirius, corredor curto, a TRAVA das Três
//                             Marias, o passo ao lado, Betelgeuse,
//                             Rigel, a dobradiça: CASA.
//   III O MERGULHO (80–135s) — Antares, lançamento, duas ondas (a
//                             segunda agora é um BEAT, o berçário),
//                             freio no aglomerado, curva rasante.
//   IV  A REVELAÇÃO (135–176s) — fuga, subida, holds EXATOS mais
//                             curtos, travessia que mostra os braços,
//                             "você está aqui".
//   CODA A VOLTA (176–193s) — mergulho e UM take Lua→Terra de 12 s
//                             (a Lua passa à frente, a Terra fica no
//                             fundo, depois a volta até as Américas).
//
// Sistema editorial (revisão "outros olhos" da rodada 26):
//   - legendas são JANELAS em tempo de viagem (captions[], com dur) —
//     função pura de t: seek/scrub/2× mostram a legenda certa;
//   - o ASSUNTO do shot sempre tem etiqueta (target), o fundo fica
//     mudo ou limitado durante o beat (quiet);
//   - a linha de DESTINO (dest) diz para onde se vai, com distância viva;
//   - a LÍNGUA do shot declara o olhar (`lingua`): 'frente' (padrão),
//     'assunto' (órbita contemplando um alvo) ou 'tras' (acento curto).
//
// Holds de medição são EXATOS por construção — posição, mira, fov e
// roll idênticos às rodadas 16–25 (roll do rig antigo assado; ver
// GATE_*). Um hold nunca é um corte: a câmera chega em movimento e
// POUSA no enquadramento.
// ============================================================
import * as THREE from 'three';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import {
  GAL,
  EX,
  EY,
  EZ,
  LIMIAR_FORA_DO_DISCO,
  dentroDoDisco,
} from '../world/baseGalactica';
import { RAIO_ARTISTICO_DO_SOL_PC, RAIO_SOL_PC } from '../escala';
import { AU_PARA_PC } from '../../lib/atlas/frameGalactico';
import { ORIGEM } from './enquadramento';

// ---- Quadros de MEDIÇÃO (não alterar sem atualizar scripts/visual/
// rodada.mjs e docs/reference/VISUAL_TARGETS.md). As posições vêm da
// rodada 16 (linha de nós do warp, z=500 pc) e são a razão de os gates
// serem comparáveis entre rodadas. ?pos= não reproduz o rig (up/roll);
// só keyframe reproduz.
const GATE_LOOK = new THREE.Vector3(-442, -7117, -3946);
const GATE_EDGE_POS = new THREE.Vector3(-597, 14597, 6287);
const GATE_EDGE_FOV = 58;
const GATE_FACE_POS = new THREE.Vector3(-25573, -13060, 15832);
const GATE_FACE_FOV = 57;
// O rig ANTIGO inclinava a câmera nas curvas, e as capturas oficiais
// das rodadas 16–25 saíram com esse roll (medido reproduzindo o rig
// antigo frame a frame, congelado até convergência: 0,041510 rad no
// perfil; 0,060000 — o clamp — no face-on). Os holds reproduzem o
// valor exato para as fotos continuarem bit-comparáveis; o tremor do
// rig antigo nesses instantes era ≤2e-4 rad (sub-pixel) e foi omitido.
const GATE_EDGE_ROLL = 0.04151;
const GATE_FACE_ROLL = 0.06;

// Estrelas-âncora (coordenadas HYG reais, pc)
const SIRIUS = new THREE.Vector3(-0.494, 2.477, -0.758);
const BETELGEUSE = new THREE.Vector3(3.189, 151.364, 19.682);
const ALNILAM = new THREE.Vector3(62.8, 602.7, -12.7);
const RIGEL = new THREE.Vector3(51.601, 256.71, -37.74);
const ANTARES = new THREE.Vector3(-58.5, -140.3, -75.6);

// ---- eases ------------------------------------------------------------
type Ease = (x: number) => number;
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
const linear: Ease = (x) => x;
const smooth: Ease = (x) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
const easeOut: Ease = (x) => 1 - Math.pow(1 - x, 3);
/** parte devagar, cruza rápido, pousa devagar — o "gesto" padrão */
const glide: Ease = (x) => THREE.MathUtils.smoothstep(x, 0, 1);
/** lançamento: quase parado, então a aceleração mais forte do filme */
const launch: Ease = (x) => Math.pow(x, 2.6);
/** pouso longo: chega com energia e assenta como tripé travando */
const settle: Ease = (x) => 1 - Math.pow(1 - x, 2.2);
/** pousa aos 88% e CONGELA — o ponto final do filme (revisão: o
 *  arremate não pode acabar em movimento) */
const settleFreeze: Ease = (x) => settle(Math.min(x / 0.88, 1));

// ---- primitivas de trajetória ------------------------------------------
type PosFn = (k: number, out: THREE.Vector3) => THREE.Vector3;

const still = (p: THREE.Vector3): PosFn => (_k, out) => out.copy(p);
const line = (a: THREE.Vector3, b: THREE.Vector3): PosFn => (k, out) =>
  out.copy(a).lerp(b, k);
function bezier(
  a: THREE.Vector3, c1: THREE.Vector3, c2: THREE.Vector3, b: THREE.Vector3
): PosFn {
  return (k, out) => {
    const i = 1 - k;
    out.copy(a).multiplyScalar(i * i * i);
    out.addScaledVector(c1, 3 * i * i * k);
    out.addScaledVector(c2, 3 * i * k * k);
    out.addScaledVector(b, k * k * k);
    return out;
  };
}
/**
 * Órbita/espiral ao redor de um centro no referencial galáctico:
 * raio, ângulo e altura (ao longo do polo) interpolados em k.
 * U=EX, V=EY são o plano do disco; ang em radianos.
 */
function orbit(
  center: THREE.Vector3,
  r0: number, r1: number,
  a0: number, a1: number,
  h0: number, h1: number
): PosFn {
  return (k, out) => {
    const r = THREE.MathUtils.lerp(r0, r1, k);
    const a = THREE.MathUtils.lerp(a0, a1, k);
    const h = THREE.MathUtils.lerp(h0, h1, k);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.copy(center);
    out.addScaledVector(EX, ca * r);
    out.addScaledVector(EY, sa * r);
    out.addScaledVector(EZ, h);
    return out;
  };
}
/** ponto galactocêntrico no referencial da cena */
const galPoint = (r: number, aRad: number, h: number, out: THREE.Vector3) =>
  out
    .copy(GAL.GC_POS)
    .addScaledVector(EX, Math.cos(aRad) * r)
    .addScaledVector(EY, Math.sin(aRad) * r)
    .addScaledVector(EZ, h);
/** mira que desliza entre dois pontos (para virar o olhar sem saltos) */
const panLook = (a: THREE.Vector3, b: THREE.Vector3, ease: Ease = smooth): PosFn =>
  (k, out) => out.copy(a).lerp(b, ease(k));
/**
 * O GESTO-PADRÃO DA FRENTE (lei de 19/08): vira CEDO do ponto `a` para o
 * assunto `b` (até a fração `fim` do plano) e SEGURA nele — o giro é
 * atividade, a espera de olhar parado no ponto errado não é.
 */
const panThenHold = (a: THREE.Vector3, b: THREE.Vector3, fim: number): PosFn =>
  (k, out) => out.copy(a).lerp(b, smooth(Math.min(k / fim, 1)));
/** slerp de versores — o lerp de PONTOS perto da câmera gira 445 °/s
 *  (Sirius) e 650 °/s (fuga). A direção não atravessa a origem. */
const _eixoSlerp = new THREE.Vector3();
function slerpVersor(
  a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3
): THREE.Vector3 {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  if (dot > 0.9995) return out.copy(a).lerp(b, t).normalize();
  if (dot < -0.9995) {
    _eixoSlerp.set(Math.abs(a.x) < 0.9 ? 1 : 0, Math.abs(a.x) < 0.9 ? 0 : 1, 0);
    _eixoSlerp.cross(a).normalize();
    return out.copy(a).applyAxisAngle(_eixoSlerp, Math.PI * t);
  }
  const omega = Math.acos(dot);
  const so = Math.sin(omega);
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .addScaledVector(b, Math.sin(t * omega) / so);
}
/**
 * O olhar de um EVENTO de passagem: vira cedo (`k1`) do assunto `a` para
 * o `assunto` (DIREÇÃO a partir da câmera, não ponto em mundo), vive o
 * assunto crescendo, e em `k2` entrega o rumo seguinte.
 */
function lookEvento(
  posDe: PosFn,
  a: THREE.Vector3,
  assunto: THREE.Vector3,
  rumo: THREE.Vector3,
  k1: number,
  k2: number
): PosFn {
  const p = new THREE.Vector3();
  const dirA = new THREE.Vector3();
  const dirB = new THREE.Vector3();
  const dir = new THREE.Vector3();
  return (k, out) => {
    posDe(k, p);
    let de: THREE.Vector3;
    let para: THREE.Vector3;
    let t: number;
    if (k <= k1) {
      de = a;
      para = assunto;
      t = glide(k / k1);
    } else if (k <= k2) {
      de = assunto;
      para = assunto;
      t = 1;
    } else {
      de = assunto;
      para = rumo;
      t = glide((k - k2) / (1 - k2));
    }
    dirA.copy(de).sub(p);
    const la = dirA.length();
    if (la > 1e-20) dirA.multiplyScalar(1 / la);
    dirB.copy(para).sub(p);
    const lb = dirB.length();
    if (lb > 1e-20) dirB.multiplyScalar(1 / lb);
    slerpVersor(dirA, dirB, t, dir);
    return out.copy(p).addScaledVector(dir, 1);
  };
}
/** vira cedo de `de` para `para` (direção) e segura — o panThenHold de
 *  PONTOS chicoteia quando o alvo passa perto da câmera (Rigel, 47°). */
function lookPan(
  posDe: PosFn, de: THREE.Vector3, para: THREE.Vector3, fim: number
): PosFn {
  return lookEvento(posDe, de, para, para, fim, 1);
}

interface ShotCaption {
  /** fração do shot em que a legenda ENTRA */
  at: number;
  text: string;
  sub?: string;
  /** janela de exibição em segundos de VIAGEM (padrão 8,6) */
  dur?: number;
  /** autoriza esta legenda, e somente ela, a sobreviver ao corte do plano */
  bridge?: boolean;
}

interface Shot {
  dur: number;
  pos: PosFn;
  look: PosFn;
  fov0: number;
  fov1: number;
  ease?: Ease;
  /**
   * EASE SÓ DO FOV (F3), quando ele precisa divergir do da trajetória.
   * Ausente, o fov usa o `ease` do plano, como sempre — e a expressão
   * que `at` avalia é EXATAMENTE a de antes, então nenhum plano herdado
   * muda um bit. Nasceu por causa de um plano: a hélice da abertura
   * refilmada, cuja posição precisa do parâmetro CRU (a distância é
   * exponencial em segundos de relógio) enquanto o zoom 26°→56° tem de
   * continuar com o `glide` de sempre. O mergulho de volta da coda usa
   * o mesmo par (ease cru + fovEase) pela mesma razão. Sem este campo, a alternativa
   * seria inverter o smoothstep dentro do `pos` por Newton para
   * recuperar o `k` cru — conta iterativa por quadro para reproduzir um
   * número que já existe.
   */
  fovEase?: Ease;
  /** intensidade de warp (vinheta/CA/bloom), decisão de direção por shot */
  warp?: (k: number) => number;
  /** banking em radianos (positivo = horário); 0 nos holds por contrato */
  roll?: (k: number) => number;
  captions?: ShotCaption[];
  /** o(s) ASSUNTO(s) do shot: etiqueta forçada, nunca sofre culling.
   *  'SOL' e 'SGR' são pseudo-alvos; o resto é nome de estrela do HYG. */
  target?: string[];
  /** silencia as etiquetas de fundo durante o beat */
  quiet?: boolean;
  /** linha de destino com distância viva: 'SGR' ou nome de estrela */
  dest?: string;
  /**
   * A LÍNGUA DO OLHAR (lei do dono, 19/08): 'frente' é o padrão e não
   * se escreve — a câmera olha para onde vai. 'assunto' declara órbita
   * ou contemplação de um alvo (trava, rasante, revelação da galáxia).
   * 'tras' declara acento traseiro CURTO (a dobradiça de CASA, a fuga
   * do buraco negro). A lei executável (roteiroPerfil.test) cobra a
   * frente de quem não declarou e o limite de duração de quem declarou.
   */
  lingua?: 'frente' | 'assunto' | 'tras';
}

// ---- pontos calculados do roteiro ---------------------------------------
// Hélice do Ato I no referencial galáctico centrado no Sol: θ=0 é o lado
// ANTICENTRO (câmera entre o Sol e a borda; o bojo fica atrás do Sol).
const helix = (r: number, aDeg: number, h: number, out = new THREE.Vector3()) =>
  out
    .set(0, 0, 0)
    .addScaledVector(EX, Math.cos(THREE.MathUtils.degToRad(aDeg)) * r)
    .addScaledVector(EY, Math.sin(THREE.MathUtils.degToRad(aDeg)) * r)
    .addScaledVector(EZ, h);

// ---- A ABERTURA REFILMADA (F3 da onda do Sol real) ---------------------
//
// A PAREDE DE FOGO EXISTE; ela só estava filmada no lugar errado. De
// 2026-08-03 a 2026-08-13 o plano de abertura era `helix(0.062, -150,
// 0.012)` — a câmera a 0,0631506 pc do Sol, ou seja a 13.027 UA, em
// volta de uma bola de 0,011 pc (2.269 UA) de raio. O Sol enchia 76% da
// altura do quadro porque o Sol tinha 487.441× o tamanho do Sol.
//
// A F3 manteve a COMPOSIÇÃO e trocou o LUGAR, que era a única das três
// saídas que não entregava outro filme (as outras duas: manter o
// inflado só no filme, ou refilmar tudo como voo único, que apagaria 19
// dos 24 planos). O fator é um só e sai da razão dos dois raios:
//
//     K = R☉ / R_artístico = 2,2567e-8 / 0,011 = 2,051531e-6
//
// e a abertura inteira é o ponto antigo MULTIPLICADO por ele. Escalar o
// VETOR (e não recalcular a hélice com números novos) é o que torna a
// promessa exata em vez de aproximada: a direção sai bit a bit a mesma,
// e o ângulo subtendido é `r/d`, onde `r` e `d` foram divididos pelo
// MESMO K. Medido: o Sol subtende 19,762056°, com diferença de 0,0e0
// para o ângulo do plano antigo. A mesma parede de fogo, no mesmo lugar
// do quadro, a 3,998 milhões de km — 5,741 raios solares.
//
// E O LUGAR EXISTE: a Parker Solar Probe passa a 9,86 raios solares do
// Sol desde 2024. A abertura do filme é hoje um lugar 1,7× mais perto do
// que a sonda mais próxima que a humanidade já pôs lá — mas é um lugar,
// com uma distância que se pode conferir, e não uma bola de mentira.
const K_DA_ABERTURA = RAIO_SOL_PC / RAIO_ARTISTICO_DO_SOL_PC;
const SUN_WALL = helix(0.062, -150, 0.012).multiplyScalar(K_DA_ABERTURA);
const ORBIT_EXIT = helix(0.55, 60, 0.17);

/** distância câmera↔Sol no primeiro quadro do filme, em pc. */
export const D_ABERTURA_PC = SUN_WALL.length();
/** distância câmera↔Sol no fim da hélice (a saída não se moveu), em pc. */
export const D_SAIDA_PC = ORBIT_EXIT.length();
/**
 * O TAMANHO DA SUBIDA, em décadas de distância: 6,6477. É o número que
 * torna a hélice impossível de interpolar em linha reta, e é por isso
 * que ele tem nome.
 *
 * A ARMADILHA QUE ELE FECHA, medida antes de escrever a curva: a
 * primitiva `orbit()` interpola raio, ângulo e altura LINEARMENTE. Com o
 * ponto de partida 4,3 milhões de vezes mais perto, uma interpolação
 * linear poria a câmera 1.000× mais longe no primeiro CENTÉSIMO de
 * segundo do plano — o Sol sairia de 74% da altura do quadro para um
 * ponto antes do segundo quadro, e o resto dos 24 s seria uma estrela
 * parada. A curva certa é EXPONENCIAL: distância multiplicada por um
 * fator constante por segundo, que é o que dá a sensação de subida
 * uniforme quando a escala muda por ordens de grandeza (é a mesma razão
 * por que a régua do voo livre é "2% da distância por segundo", e não
 * "2 pc/s").
 *
 * 6,6477 décadas em 24 s = **0,27699 década por segundo**, ou ×1,891 de
 * distância a cada segundo. Marcos medidos com esta curva: o Sol cruza a
 * órbita da Terra em t≈5,68 s e desarma o gate de corpo (4 px) em
 * t≈8,5 s; a entrega ponto→clarão acontece entre t≈18,7 s e t≈20,2 s.
 */
export const DECADAS_DA_ABERTURA = Math.log10(D_SAIDA_PC / D_ABERTURA_PC);

/**
 * A DISTÂNCIA AO SOL na hélice de abertura, em pc, como função pura do
 * parâmetro CRU do plano (`k` em [0,1], que é `t/24` — não o eased).
 * Exportada porque é ela que o juiz da F3 amostra: quem quiser provar
 * que o tamanho aparente do Sol não salta entre quadros precisa da
 * MESMA função que o quadro usa, não de uma reescrita no teste.
 *
 * Nos extremos devolve os extremos EXATOS: `Math.pow(x, 0)` é 1 e
 * `Math.pow(x, 1)` é o próprio x em IEEE754, então k=0 dá
 * `D_ABERTURA_PC × 1` e k=1 dá `D_ABERTURA_PC × (D_SAIDA_PC /
 * D_ABERTURA_PC)` — este último a menos de 1 ULP de `D_SAIDA_PC`, que é
 * o que o pouso em `ORBIT_EXIT` precisa (o plano seguinte parte da
 * constante, não daqui).
 */
export function distanciaDaAbertura(k: number): number {
  return D_ABERTURA_PC * Math.pow(D_SAIDA_PC / D_ABERTURA_PC, clamp01(k));
}

/**
 * A HÉLICE DA ABERTURA — a direção de sempre, a distância nova.
 *
 * A DECOMPOSIÇÃO, e ela é o coração da fase: a hélice antiga misturava
 * DIREÇÃO e DISTÂNCIA numa interpolação só (raio, ângulo e altura em
 * lerp). Aqui as duas se separam — a direção continua sendo exatamente a
 * da hélice antiga (mesmos 0,062→0,55 de raio, mesmos −150°→60° de
 * ângulo, mesmos 0,012→0,17 de altura, mesmo easing `glide`), só que
 * NORMALIZADA e re-escalada pela distância exponencial. O gesto da
 * câmera — a volta de 210° em torno do Sol, subindo do plano do disco —
 * é o mesmo; o que mudou foi só quão rápido ela se afasta.
 *
 * POR QUE O `ease` DO PLANO É `linear` E O `glide` VEM PARA DENTRO: o
 * `Journey.at` passa ao `pos` o parâmetro JÁ suavizado, e a distância
 * precisa do CRU para que "0,277 década por segundo" seja verdade em
 * segundos de relógio. Com o plano em `linear`, `pos` recebe o cru,
 * aplica `glide` sozinho na direção, e o `fovEase` (campo novo do Shot,
 * ver `at`) devolve ao fov a mesma curva de antes — bit a bit, porque é
 * a MESMA expressão `lerp(fov0, fov1, glide(k))` de sempre.
 */
function heliceDaAbertura(): PosFn {
  const direcao = orbit(
    ORIGEM,
    0.062, 0.55,
    THREE.MathUtils.degToRad(-150), THREE.MathUtils.degToRad(60),
    0.012, 0.17
  );
  return (k, out) => {
    direcao(glide(k), out);
    return out.multiplyScalar(distanciaDaAbertura(k) / out.length());
  };
}

// partida: cruza a 0,35 pc de Sirius DE FRENTE — o olhar vira cedo
// para ela (direção, não ponto), ela incha na aproximação e o olhar
// entrega o rumo do cinturão na saída
const SIRIUS_C1 = new THREE.Vector3(0.15, 1.1, 0.15);
const SIRIUS_C2 = new THREE.Vector3(-0.35, 2.2, -0.45);
const POST_SIRIUS = new THREE.Vector3(0.4, 4.6, -0.6);
const SIRIUS_PATH = bezier(ORBIT_EXIT, SIRIUS_C1, SIRIUS_C2, POST_SIRIUS);

// Ato II — a TRAVA das Três Marias vem ANTES de Betelgeuse: o ponto de
// vista fica no eixo Terra→Alnilam a 55 pc de casa, onde a paralaxe
// ainda preserva a fila que se vê da Terra (a 150+ pc a geometria já
// desmonta — Mintaka/Alnitak estão a 212/226 pc, Alnilam a 606).
const BELT_AXIS = ALNILAM.clone().normalize();
const BELT_VIEW = BELT_AXIS.clone().multiplyScalar(55);
const BELT_BREAK = BELT_VIEW.clone().add(new THREE.Vector3(-8, 2, 4));
// espiral orbital de Betelgeuse (entrada por baixo, fecha o raio)
const BET_ORBIT_IN = new THREE.Vector3()
  .copy(BETELGEUSE)
  .addScaledVector(EX, Math.cos(1.9) * 14)
  .addScaledVector(EY, Math.sin(1.9) * 14)
  .addScaledVector(EZ, -6);
const BET_ORBIT_OUT = new THREE.Vector3()
  .copy(BETELGEUSE)
  .addScaledVector(EX, Math.cos(-0.4) * 7)
  .addScaledVector(EY, Math.sin(-0.4) * 7)
  .addScaledVector(EZ, 3.5);
// Rigel de raspão (fly-under: passamos 6 pc abaixo dela, sem parar)
const RIGEL_PASS = RIGEL.clone().add(new THREE.Vector3(-4, 14, -9));
const RIGEL_PATH = bezier(
  BET_ORBIT_OUT,
  new THREE.Vector3(18, 190, 6),
  RIGEL.clone().add(new THREE.Vector3(-10, -6, -14)),
  RIGEL_PASS
);
const LOOKBACK_2 = new THREE.Vector3(52, 296, -52); // a parada do vazio

// Ato III — Antares como portão: quase-parada diante da brasa vermelha
// com o bojo dourado no MESMO eixo (geometria real do céu), e o
// lançamento mais agressivo do filme.
const ANT_GATE = ANTARES.clone().add(new THREE.Vector3(10, 36, 15));
const ANT_PASS = ANTARES.clone().add(new THREE.Vector3(4, -6, 1.5));

// A corrida: waypoints no referencial galactocêntrico (R, azimute, z),
// ~25 pc ABAIXO do plano — a poeira vira um teto de tempestade. Três
// ondas: braço de Sagitário (~6,5 kpc), travessia de nuvem (~5 kpc),
// Scutum-Centaurus (~4 kpc) — cada crista com respiro depois.
const gal = (R: number, azDeg: number, z: number) =>
  galPoint(R, THREE.MathUtils.degToRad(azDeg), z, new THREE.Vector3());
const DIVE_1 = gal(6600, 6, -14); // muralha de Sagitário
const DIVE_2 = gal(5100, 13, -8); // dentro da lâmina — travessia de nuvem
const DIVE_3 = gal(3900, 20, -24); // Scutum-Centaurus
const DIVE_4 = gal(1500, 27, -14); // reta final, bojo enchendo o quadro
const CORE_IN = gal(120, 30, -4); // dentro do aglomerado central

// Sagittarius A*: curva rasante — arco de ~150° a 1,5 pc do centro
// (≈30 RS na escala artística — a distância dos presets da demo: é a
// proximidade, não o tamanho, que faz o disco encher o quadro),
// subindo de -0,3 a +0,55 pc (o disco gira de quase-de-perfil para
// levemente de cima: o anel de Einstein varre).
const BH_ARC_IN = 38; // graus
const BH_ARC_OUT = 190;
const BH_R = 1.5;

// Ato IV — a fuga olhando o monstro encolher (acento traseiro curto),
// a subida com o disco se construindo de dentro para fora, pouso no
// quadro de perfil, travessia em arco com a galáxia sempre no centro,
// pouso no face-on, deriva final. A CURVA é uma só (o estilingue de
// sempre); a fuga e a subida a dividem em dois olhares.
// C1 no azimute da rasante (190°): o de 60° atravessava o centro e a
// mira do adeus girava 650 °/s — Sagittarius A* saía do quadro.
const SLING_C1 = gal(900, 190, 260);
const SLING_C2 = gal(4200, 85, 2600);
const BH_EXIT = galPoint(
  BH_R, THREE.MathUtils.degToRad(BH_ARC_OUT), 0.55, new THREE.Vector3()
);
const SLING = bezier(BH_EXIT, SLING_C1, SLING_C2, GATE_EDGE_POS);
/** fração da curva do estilingue que pertence à FUGA (olhar para trás) */
const FUGA_ATE = 0.22;
const TRAV_C1 = new THREE.Vector3(-12000, 16800, 14000);
const TRAV_C2 = new THREE.Vector3(-26800, 2600, 22000);
const FINAL_POS = new THREE.Vector3(-11429, -7864, 29651);
// o gesto final aponta para a MENOR coisa do quadro: a mira desliza do
// centro galáctico para perto do Sol — o marcador deriva até o terço
const FINAL_LOOK = new THREE.Vector3(-155, -2491, -1381); // GC→Sol a 65%

// ---- A VOLTA PARA CASA (coda de 19/08, pedido literal do dono) ----------
//
// O filme sobe 26.000 anos-luz para dizer "você está aqui" — e volta,
// em quinze segundos, para o único lugar do quadro onde há olhos.
//
// O RELÓGIO DO FILME: os atos rodam no instante do retrato
// (EPOCA_JD_TDB, 2026-01-01 00:00 UTC) — mas às 00:00 UTC o meio-dia
// está sobre o Pacífico, e o dono pediu o pouso com "o dia acontecendo
// com as Américas aparecendo". A coda então pede o céu das 16:00 UTC
// do MESMO dia (meio-dia solar a ~60°O — a Amazônia no centro do dia,
// as duas Américas acesas). O director troca o relógio no gatilho do
// pré-aquecimento (t≥REVEAL_T), o único trecho em que NADA que depende
// dele está em quadro — a câmera está saindo do buraco negro, a
// 26.000 anos-luz de casa.
//
// A geometria é REAL nesse instante: os dois vetores abaixo saem da
// MESMA cadeia do app (efemerides.bin → eclipticaParaEquatorial ×
// AU_PARA_PC), calculados uma vez e pinados como os quadros de medição
// — e voltaParaCasa.test.ts RECOMPUTA pela cadeia e cobra igualdade
// bit a bit: se o instante ou a efeméride mudarem, o juiz grita antes
// de a câmera chegar numa Terra que não está mais lá.
//
// A sorte do instante: a Lua está gibosa (155° do Sol, ~94% acesa) do
// lado ANTI-Sol — exatamente no corredor de quem chega por trás da
// Terra. O raspão passa pelo flanco solar dela, e a chegada vê a Terra
// de noite antes de a volta amanhecer sobre as Américas.
/** o instante do céu da coda: 16:00 UTC de 2026-01-01, em JD TDB */
export const JD_DO_FILME_TDB = 2461042.16753588;
export const TERRA_PC = new THREE.Vector3(
  -9.005623255658378e-7, 0.000004295230365654541, 0.000001861898774935369
);
export const LUA_PC = new THREE.Vector3(
  -8.978208032539119e-7, 0.000004305191642310892, 0.0000018673338296557573
);
/** Terra→anti-Sol (o Sol é a origem da cena) */
const ANTISSOL = TERRA_PC.clone().normalize();
/** Terra→Lua */
const RUMO_DA_LUA = LUA_PC.clone().sub(TERRA_PC).normalize();
/** fora do plano Sol–Terra–Lua */
const FORA_DO_PLANO = new THREE.Vector3()
  .crossVectors(RUMO_DA_LUA, ANTISSOL).normalize();
/** no plano, ⊥ ao rumo da Lua, apontando para o lado ANTI-Sol */
const FLANCO_ANTISSOL = new THREE.Vector3()
  .crossVectors(FORA_DO_PLANO, RUMO_DA_LUA).normalize();
/** no plano, ⊥ ao anti-Sol, para o lado da Lua — o plano da volta */
const LADO_DA_LUA = RUMO_DA_LUA.clone()
  .addScaledVector(ANTISSOL, -RUMO_DA_LUA.dot(ANTISSOL)).normalize();

/** entrada do corredor: 0,017 UA além da Lua, na linha de chegada */
const ENTRADA_DE_CASA = LUA_PC.clone()
  .addScaledVector(RUMO_DA_LUA, 0.017 * AU_PARA_PC)
  .addScaledVector(FLANCO_ANTISSOL, 2e-9);
/** o ponto do raspão: ~6,2 raios lunares, 40° fora do eixo Lua→Terra
 *  no flanco solar — crescente grande no quadro, Terra ainda no fov. */
const RASPAO_DA_LUA = 3.5e-10;
/** raio da volta na Terra (do lado escuro ao claro) */
const VOLTA_R0 = 2.6e-9; // ~12,6 raios terrestres, lado noite
const VOLTA_R1 = 1.13e-9; // ~5,5 raios terrestres: Terra a ~45% do quadro
/**
 * As duas pontas da volta, como DIREÇÕES Terra→câmera. A chegada fica
 * 22° fora do eixo anti-Sol, do lado da Lua (é de lá que o raspão
 * entrega). O POUSO fica 20° fora do eixo solar, PARA O NORTE
 * equatorial — a cena é o frame equatorial J2000, então (0,0,1) é o
 * polo norte da Terra: o desvio ao norte sobe o centro do disco do
 * subsolar (23°S de janeiro) para perto do equador, e as duas Américas
 * cabem acesas no quadro.
 */
const SOLWARD = ANTISSOL.clone().negate();
const NORTE_EQ = new THREE.Vector3(0, 0, 1);
const NORTE_PERP = NORTE_EQ.clone()
  .addScaledVector(SOLWARD, -NORTE_EQ.dot(SOLWARD)).normalize();
const DIR_CHEGADA = ANTISSOL.clone()
  .multiplyScalar(Math.cos(THREE.MathUtils.degToRad(22)))
  .addScaledVector(LADO_DA_LUA, Math.sin(THREE.MathUtils.degToRad(22)))
  .normalize();
const DIR_POUSO = SOLWARD.clone()
  .multiplyScalar(Math.cos(THREE.MathUtils.degToRad(20)))
  .addScaledVector(NORTE_PERP, Math.sin(THREE.MathUtils.degToRad(20)))
  .normalize();
/** o arco da volta: rotação de DIR_CHEGADA a DIR_POUSO num eixo só */
const EIXO_DA_VOLTA = new THREE.Vector3()
  .crossVectors(DIR_CHEGADA, DIR_POUSO).normalize();
const ANGULO_DA_VOLTA = DIR_CHEGADA.angleTo(DIR_POUSO);
/** onde a volta começa (fim do raspão) e onde pousa (o quadro final) */
const INICIO_DA_VOLTA = TERRA_PC.clone().addScaledVector(DIR_CHEGADA, VOLTA_R0);
const POUSO = TERRA_PC.clone().addScaledVector(DIR_POUSO, VOLTA_R1);
/**
 * O ROLL QUE PÕE OS POLOS PARA CIMA (pedido do dono): o rig olha o
 * mundo com o up do POLO GALÁCTICO (cameraRig.galacticUp), e no último
 * quadro o dono quer a Terra "no sentido dos polos" — o norte DELA para
 * cima. O ângulo abaixo gira a tela do up galáctico ao up equatorial,
 * medido ao redor do eixo de visada do pouso; o rig aplica roll com
 * rotateZ, que gira ao redor de câmera→trás (−olhar), e o sinal aqui
 * segue essa convenção. voltaParaCasa.test.ts reconstrói a câmera do
 * rig e cobra o alinhamento em graus.
 */
const ROLL_DOS_POLOS = (() => {
  const olhar = TERRA_PC.clone().sub(POUSO).normalize();
  const upGal = EZ.clone().addScaledVector(olhar, -EZ.dot(olhar)).normalize();
  const upTerra = NORTE_EQ.clone().addScaledVector(olhar, -NORTE_EQ.dot(olhar)).normalize();
  const eixoDoRoll = olhar.clone().negate();
  return Math.atan2(
    new THREE.Vector3().crossVectors(upGal, upTerra).dot(eixoDoRoll),
    upGal.dot(upTerra)
  );
})();
/**
 * O MERGULHO DE VOLTA: distância à Terra exponencial (11,5 décadas em
 * 6 s — a régua da abertura, 7× mais rápida) com a direção deslizando
 * do alto galáctico para o corredor da Lua. `k` CRU, como na hélice.
 */
const D_VOLTA_0 = FINAL_POS.distanceTo(TERRA_PC);
const D_VOLTA_1 = ENTRADA_DE_CASA.distanceTo(TERRA_PC);
const U_VOLTA_0 = FINAL_POS.clone().sub(TERRA_PC).normalize();
const U_VOLTA_1 = ENTRADA_DE_CASA.clone().sub(TERRA_PC).normalize();
function mergulhoDeVolta(): PosFn {
  const u = new THREE.Vector3();
  return (k, out) => {
    u.copy(U_VOLTA_0).lerp(U_VOLTA_1, glide(k)).normalize();
    const d = D_VOLTA_0 * Math.pow(D_VOLTA_1 / D_VOLTA_0, clamp01(k));
    return out.copy(TERRA_PC).addScaledVector(u, d);
  };
}
/**
 * O RASPÃO: distância à LUA em vale logarítmico (entra a 0,017 UA,
 * toca 7,1 raios lunares no joelho k=0,62, sai a 0,0024 UA rumo à
 * volta) enquanto a direção Lua→câmera desliza para o flanco solar e
 * depois para a saída — é o vale que garante a Lua GRANDE no quadro,
 * coisa que uma bézier com pontas longe não garante.
 */
const U_RASPAO_IN = ENTRADA_DE_CASA.clone().sub(LUA_PC).normalize();
/** 40° fora do eixo Lua→Terra, no flanco solar: crescente no quadro
 *  com a Terra ainda visível. O olhar do take puxa um pouco para a Lua
 *  no joelho para os dois caberem na lente. */
const EIXO_LUA_TERRA = TERRA_PC.clone().sub(LUA_PC).normalize();
const U_RASPAO_MIN = EIXO_LUA_TERRA.clone()
  .multiplyScalar(-Math.cos(THREE.MathUtils.degToRad(40)))
  .addScaledVector(FLANCO_ANTISSOL.clone().negate(), Math.sin(THREE.MathUtils.degToRad(40)))
  .normalize();
const U_RASPAO_OUT = INICIO_DA_VOLTA.clone().sub(LUA_PC).normalize();
const D_RASPAO_IN = ENTRADA_DE_CASA.distanceTo(LUA_PC);
const D_RASPAO_OUT = INICIO_DA_VOLTA.distanceTo(LUA_PC);
const JOELHO_DO_RASPAO = 0.62;
/** erf de Abramowitz–Stegun 7.1.26 — só para alongar o vale do raspão. */
function erfAprox(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const p = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * p - 1.453152027) * p) + 1.421413741) * p
    - 0.284496736) * p + 0.254829592) * p * Math.exp(-a * a);
  return s * y;
}
/**
 * k uniforme → parâmetro que ANDA MAIS DEVAGAR no joelho (a Lua fica
 * grande ~1,5 s) e nunca para: velocidade mínima ~36% da média.
 */
function alongaJoelho(k: number): number {
  const j = JOELHO_DO_RASPAO;
  const sig = 0.16;
  const extra = 0.64;
  const s2 = sig * Math.SQRT2;
  const integ = (u: number) =>
    u - extra * sig * Math.sqrt(2 * Math.PI) * 0.5 * erfAprox((u - j) / s2);
  return (integ(k) - integ(0)) / (integ(1) - integ(0));
}
function raspaoDaLua(): PosFn {
  const u = new THREE.Vector3();
  return (k, out) => {
    const k2 = alongaJoelho(k);
    const antes = k2 <= JOELHO_DO_RASPAO;
    const t = antes
      ? k2 / JOELHO_DO_RASPAO
      : (k2 - JOELHO_DO_RASPAO) / (1 - JOELHO_DO_RASPAO);
    // CHAO linear: o ease sozinho parava no joelho (derivada 0) e o
    // play já travou duas vezes com a câmera parada. O dono pediu
    // desacelerar, não parar.
    const CHAO = 0.18;
    const f = antes
      ? CHAO * t + (1 - CHAO) * (1 - Math.pow(1 - t, 1.6))
      : CHAO * t + (1 - CHAO) * Math.pow(t, 1.45);
    const d = antes
      ? D_RASPAO_IN * Math.pow(RASPAO_DA_LUA / D_RASPAO_IN, f)
      : RASPAO_DA_LUA * Math.pow(D_RASPAO_OUT / RASPAO_DA_LUA, f);
    u.copy(antes ? U_RASPAO_IN : U_RASPAO_MIN)
      .lerp(antes ? U_RASPAO_MIN : U_RASPAO_OUT, f)
      .normalize();
    return out.copy(LUA_PC).addScaledVector(u, d);
  };
}
/**
 * O TAKE ÚNICO Lua→Terra. A Lua passa GRANDE à frente com a Terra no
 * fundo; no joelho o olhar cede a ela um instante e devolve à casa —
 * pedido do dono: "leve desacelerada e virar rapidamente a camera para
 * ela e desvirar". k em [0, K_LUA_NO_TAKE] é o vale; o resto é a volta.
 * A volta NÃO usa settleFreeze (comia a rotação: 140° em 3 s e o
 * espectador perdia as Américas). Ease mais longo, freeze só no fim.
 */
export const K_LUA_NO_TAKE = 0.40;
/** a volta na Terra: gira 88% do trecho, pousa e CONGELA */
const easeDaVolta = (x: number) => {
  const u = Math.min(x / 0.88, 1);
  return 1 - Math.pow(1 - u, 1.55);
};
function takeDaCasa(): PosFn {
  const raspao = raspaoDaLua();
  return (k, out) => {
    if (k <= K_LUA_NO_TAKE) return raspao(k / K_LUA_NO_TAKE, out);
    const u = easeDaVolta((k - K_LUA_NO_TAKE) / (1 - K_LUA_NO_TAKE));
    out.copy(DIR_CHEGADA).applyAxisAngle(EIXO_DA_VOLTA, ANGULO_DA_VOLTA * u);
    return out
      .multiplyScalar(THREE.MathUtils.lerp(VOLTA_R0, VOLTA_R1, u))
      .add(TERRA_PC);
  };
}
/** no joelho, o olhar é o meio-ângulo Lua–Terra. O ponto de mira mora
 *  a ~1e-8 pc da câmera (a escala Lua–Terra) — NUNCA a 1 pc. O rig
 *  amortece a mira em 0,4 s; um alvo a 1 pc nunca alcançava a Terra
 *  no play contínuo, e a órbita das Américas acontecia fora de quadro. */
const ALCANCE_DA_MIRA_PC = 8e-9;
function lookDoTake(): PosFn {
  const raspao = raspaoDaLua();
  const pos = new THREE.Vector3();
  const dirTerra = new THREE.Vector3();
  const dirLua = new THREE.Vector3();
  return (k, out) => {
    if (k >= K_LUA_NO_TAKE) return out.copy(TERRA_PC);
    const kr = alongaJoelho(k / K_LUA_NO_TAKE);
    // pico no JOELHO (~83%), sobe e desce em ~1,5 s, zero EXATO nas
    // pontas — o take começa e termina na Terra.
    const WMAX = 0.83;
    const w = kr <= JOELHO_DO_RASPAO
      ? WMAX * 0.5 * (1 - Math.cos((Math.PI * kr) / JOELHO_DO_RASPAO))
      : WMAX * 0.5 * (1 + Math.cos(
        (Math.PI * (kr - JOELHO_DO_RASPAO)) / (1 - JOELHO_DO_RASPAO)
      ));
    if (w < 1e-6) return out.copy(TERRA_PC);
    raspao(k / K_LUA_NO_TAKE, pos);
    dirTerra.copy(TERRA_PC).sub(pos).normalize();
    dirLua.copy(LUA_PC).sub(pos).normalize();
    dirTerra.lerp(dirLua, w).normalize();
    return out.copy(pos).addScaledVector(dirTerra, ALCANCE_DA_MIRA_PC);
  };
}

// ---- a lista de shots ----------------------------------------------------
const SHOTS: Shot[] = [
  // ================= ATO I — CASA =================
  {
    // parede de fogo: 6 s imóveis (a revisão cortou a estática de 8).
    // A gramática do filme nos primeiros segundos: quietude é promessa.
    // F3: mesma parede, mesmo enquadramento, a 4,00 milhões de km do
    // Sol REAL — ver `SUN_WALL` e a conta do K lá em cima.
    dur: 6,
    pos: still(SUN_WALL),
    look: still(ORIGEM),
    fov0: 26, fov1: 26,
    quiet: true,
    captions: [{
      at: 0.3,
      text: 'SOL',
      sub: '600 milhões de toneladas de hidrogênio fundidas por segundo',
      dur: 9,
      bridge: true,
    }],
  },
  {
    // hélice ascendente: o Sol fica, o céu inteiro gira. O bojo dourado
    // (Sagitário) cruza atrás do Sol no meio do shot — casa em contraluz
    // contra o destino. ~210° em 24 s (< 9°/s: documentário).
    //
    // F3: A SUBIDA VIROU EXPONENCIAL. O gesto é o mesmo (mesma volta,
    // mesma altura ganha, mesmo zoom); o que mudou é que a câmera agora
    // parte de 5,74 raios solares em vez de 13.027 UA, e sobe 6,65
    // décadas de distância em vez de 0,96. Interpolar isso em linha reta
    // deixaria o filme com 23,99 s de estrela parada; a curva é
    // `distanciaDaAbertura`, taxa constante de 0,277 década/s. O `ease`
    // do plano é `linear` para o `pos` receber o parâmetro cru — quem
    // devolve o `glide` à direção é a própria hélice, e ao fov, o
    // `fovEase`.
    dur: 24,
    pos: heliceDaAbertura(),
    look: still(ORIGEM),
    fov0: 26, fov1: 56,
    ease: linear,
    fovEase: glide,
    target: ['SOL'],
    quiet: true,
    captions: [
      // entra quando a faixa já está franca no quadro (revisão: em
      // k≈0,5 ela ainda estava espremida na borda)
      { at: 0.64, text: 'A VIA LÁCTEA, DE DENTRO', sub: 'a faixa no céu é o disco: cem mil anos-luz vistos de dentro' },
    ],
  },
  // ================= ATO II — ÓRION =================
  {
    // partida À FRENTE: o olhar vira cedo para Sirius (DIREÇÃO a
    // partir da câmera, não ponto em mundo — o lerp de Sol→Sirius×2,4
    // girava 445 °/s e o play borrava 1 s), ela incha de ponto a farol
    // na passagem a 0,35 pc e o olhar entrega o rumo do cinturão.
    dur: 7,
    pos: SIRIUS_PATH,
    look: lookEvento(SIRIUS_PATH, ORIGEM, SIRIUS.clone().multiplyScalar(2.4), ALNILAM, 0.58, 0.82),
    fov0: 56, fov1: 63,
    ease: glide,
    warp: (k) => 0.25 * Math.sin(Math.PI * k),
    roll: (k) => 0.08 * Math.sin(Math.PI * k),
    target: ['Sirius', 'SOL'],
    captions: [
      {
        at: 0.4,
        text: 'SIRIUS',
        sub: 'brilha tanto por estar a 8,6 anos-luz — é só uma vizinha',
        dur: 4,
      },
    ],
  },
  {
    // cruzeiro pelo corredor de nuvens até o mirante do cinturão —
    // olhando para ONDE SE VAI. Em 6 s (era 10): o destino quase não
    // crescia, era câmera andando sem ação.
    dur: 6,
    pos: bezier(
      POST_SIRIUS,
      new THREE.Vector3(1.5, 12, 0),
      new THREE.Vector3(4, 35, -1.5),
      BELT_VIEW
    ),
    look: still(ALNILAM),
    fov0: 63, fov1: 54,
    ease: glide,
    warp: (k) => 0.3 * Math.sin(Math.PI * k),
    roll: (k) => 0.06 * Math.sin(Math.PI * k),
    dest: 'Alnilam',
    captions: [
      { at: 0.22, text: 'A BOLHA LOCAL', sub: 'gás a um milhão de graus, esculpido por supernovas antigas', dur: 4.5 },
    ],
  },
  {
    // A TRAVA DAS TRÊS MARIAS: a câmera POUSA no eixo Terra→cinturão e
    // FECHA a lente na fila — gesto de telescópio, agora em 6 s. As
    // três em linha, como no céu de casa, NOMEADAS.
    dur: 6,
    pos: still(BELT_VIEW),
    look: still(ALNILAM),
    fov0: 54, fov1: 15,
    ease: settle,
    target: ['Alnitak', 'Alnilam', 'Mintaka'],
    quiet: true,
    lingua: 'assunto',
    captions: [
      { at: 0.12, text: 'AS TRÊS MARIAS', sub: 'Alnitak, Alnilam, Mintaka — três supergigantes alinhadas só daqui', dur: 5 },
    ],
  },
  {
    // o passo ao lado: a fila se desfaz diante dos olhos — a
    // constelação é um acidente de ponto de vista, demonstrado
    dur: 6,
    pos: line(BELT_VIEW, BELT_BREAK),
    look: still(ALNILAM),
    fov0: 15, fov1: 50,
    ease: glide,
    target: ['Alnitak', 'Alnilam', 'Mintaka'],
    quiet: true,
    lingua: 'assunto',
    captions: [
      { at: 0.08, text: 'UM PASSO AO LADO', sub: 'Alnilam está 1.200 anos-luz mais ao fundo — a fila era um ponto de vista', dur: 5.4 },
    ],
  },
  {
    // Betelgeuse À FRENTE: ela nasce do bordo inferior e INCHA — de 95
    // a 14 pc o diâmetro aparente cresce ~7×, e é esse crescimento que
    // vende "engoliria a órbita de Júpiter" antes de a legenda dizer
    dur: 5,
    pos: bezier(
      BELT_BREAK,
      new THREE.Vector3(-4, 80, 0),
      new THREE.Vector3(0, 125, -2),
      BET_ORBIT_IN
    ),
    look: panThenHold(ALNILAM, BETELGEUSE, 0.25),
    fov0: 50, fov1: 62,
    ease: glide,
    warp: (k) => 0.35 * Math.sin(Math.PI * k),
    target: ['Betelgeuse'],
    dest: 'Betelgeuse',
  },
  {
    // a passagem da supergigante: o mesmo arco fechando (r 14→7 pc),
    // órbita de ASSUNTO declarada — contemplar o alvo não é voar de lado
    dur: 6,
    pos: (k, out) => {
      const r = THREE.MathUtils.lerp(14, 7, k);
      const a = THREE.MathUtils.lerp(1.9, -0.4, k); // sentido horário
      const h = THREE.MathUtils.lerp(-6, 3.5, k);
      out.copy(BETELGEUSE);
      out.addScaledVector(EX, Math.cos(a) * r);
      out.addScaledVector(EY, Math.sin(a) * r);
      out.addScaledVector(EZ, h);
      return out;
    },
    look: still(BETELGEUSE),
    fov0: 62, fov1: 38,
    ease: glide,
    target: ['Betelgeuse'],
    quiet: true,
    lingua: 'assunto',
    captions: [
      { at: 0.08, text: 'BETELGEUSE', sub: 'supergigante vermelha à beira de explodir — engoliria a órbita de Júpiter', dur: 5.4 },
    ],
  },
  {
    // Rigel de raspão, DE FRENTE: o olhar vira rápido de Betelgeuse
    // para ela e a silhueta azul cresce até passar por cima
    dur: 7,
    pos: RIGEL_PATH,
    look: lookPan(RIGEL_PATH, BETELGEUSE, RIGEL, 0.45),
    fov0: 38, fov1: 60,
    ease: glide,
    warp: (k) => 0.3 * Math.sin(Math.PI * k),
    roll: (k) => -0.08 * Math.sin(Math.PI * k),
    target: ['Rigel'],
    captions: [{ at: 0.25, text: 'RIGEL', sub: 'supergigante azul a 12.000 K — 40.000 sóis em poucos milhões de anos', dur: 5 }],
  },
  {
    // a dobradiça: desacelera, meia-volta RÁPIDA de 180° e o VAZIO — o
    // quadro onde o Sol deveria estar. Acento traseiro DECLARADO, curto.
    // O fim do giro já entrega o Escorpião pela borda.
    dur: 7,
    pos: line(RIGEL_PASS, LOOKBACK_2),
    look: panThenHold(RIGEL, ORIGEM, 0.4),
    fov0: 60, fov1: 34,
    ease: settle,
    target: ['SOL'],
    quiet: true,
    lingua: 'tras',
    captions: [{ at: 0.35, text: 'CASA', sub: 'a 800 anos-luz o Sol caiu para magnitude 12: invisível a olho nu', dur: 4.4 }],
  },

  // ================= ATO III — O MERGULHO =================
  {
    // a virada para Antares, DE FRENTE: o olhar vira rápido do vazio de
    // casa para o portão do centro, e Antares cresce de brasa a farol
    // com o bojo dourado subindo atrás — geometria real do céu
    dur: 8,
    pos: bezier(
      LOOKBACK_2,
      new THREE.Vector3(70, 160, -70),
      new THREE.Vector3(30, -40, -30),
      ANT_GATE
    ),
    look: panThenHold(ORIGEM, ANTARES, 0.3),
    fov0: 34, fov1: 50,
    ease: glide,
    warp: (k) => 0.45 * Math.sin(Math.PI * k),
    roll: (k) => 0.07 * Math.sin(Math.PI * k),
    target: ['Antares'],
    dest: 'Antares',
    captions: [
      { at: 0.38, text: 'ANTARES', sub: 'brasa a 550 anos-luz, no alinhamento do centro da galáxia', dur: 4.8 },
    ],
  },
  {
    // o lançamento mais forte do filme: a brasa passa por cima e o
    // olhar entrega o rumo do centro enquanto o warp arma
    dur: 6,
    pos: bezier(
      ANT_GATE,
      ANTARES.clone().add(new THREE.Vector3(8, 16, 10)),
      ANTARES.clone().add(new THREE.Vector3(5.5, 3, 3)),
      ANT_PASS
    ),
    look: panLook(ANTARES, GAL.GC_POS, easeOut),
    fov0: 50, fov1: 58,
    ease: launch,
    warp: (k) => 0.85 * Math.pow(k, 2),
    target: ['Antares'],
    quiet: true,
  },
  {
    // ONDA 1 — ATRAVESSA a muralha de Sagitário por dentro: a poeira
    // engrossa até o único túnel escuro do filme no meio do plano, e o
    // dourado explode do outro lado.
    dur: 10,
    pos: bezier(ANT_PASS, gal(7400, 4, -28), DIVE_1, DIVE_2),
    look: still(GAL.GC_POS),
    fov0: 58, fov1: 64,
    ease: glide,
    warp: (k) => 0.55 + 0.4 * Math.sin(Math.PI * k),
    roll: (k) => 0.10 * Math.sin(Math.PI * k),
    dest: 'SGR',
    target: ['Shaula', 'Dschubba', 'Lesath', 'Paikauhale'],
    captions: [
      {
        at: 0.06,
        text: 'O MERGULHO',
        sub: 'braço de Sagitário: a poeira extingue e avermelha as estrelas',
        dur: 4.2,
      },
      {
        at: 0.50,
        text: 'O BERÇÁRIO',
        sub: 'Shaula, Dschubba, Lesath — o berçário de Escorpião no caminho',
        dur: 4.8,
      },
    ],
  },
  {
    // ONDA 2 — Scutum-Centaurus: a segunda crista é um BEAT, não um
    // corredor mudo. O berçário com NOME (estrelas reais) ficou na
    // Onda 1, onde elas passam; aqui é o último braço antes do centro.
    dur: 7,
    pos: bezier(DIVE_2, gal(4600, 16, -30), DIVE_3, DIVE_4),
    look: still(GAL.GC_POS),
    fov0: 64, fov1: 70,
    ease: glide,
    warp: (k) => 0.6 + 0.4 * Math.sin(Math.PI * k * 0.9),
    roll: (k) => -0.12 * Math.sin(Math.PI * k),
    dest: 'SGR',
    captions: [
      {
        at: 0.18,
        text: 'O ÚLTIMO BRAÇO',
        sub: 'Scutum-Centaurus — o gás comprime e acende estrelas azuis',
        dur: 5,
      },
    ],
  },
  {
    // desaceleração no aglomerado central. A distorção prepara a
    // revelação que pertence à curva rasante.
    dur: 5,
    pos: bezier(DIVE_4, gal(700, 29, -8), gal(320, 30, -6), CORE_IN),
    look: still(GAL.GC_POS),
    fov0: 70, fov1: 55,
    ease: settle,
    warp: (k) => 0.9 * (1 - k) * (1 - k),
    dest: 'SGR',
  },
  {
    // aproximação final: de 120 pc a 1,5 pc do centro.
    // O ângulo de partida É o de CORE_IN (30°), não 32° — 2° a 120 pc
    // eram 4,2 pc de salto, o microtravamento no meio do ato III.
    dur: 5,
    pos: (k, out) => {
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(30, BH_ARC_IN, k));
      const r = THREE.MathUtils.lerp(120, BH_R, k);
      const z = THREE.MathUtils.lerp(-4, -0.3, k);
      return galPoint(r, a, z, out);
    },
    look: still(GAL.GC_POS),
    fov0: 55, fov1: 50,
    ease: glide,
    dest: 'SGR',
    quiet: true,
  },
  {
    // A CURVA RASANTE: ~150° ao redor do horizonte, periastro no mínimo
    // de velocidade de todo o ato — a física faz a coreografia (anel de
    // Einstein varrendo o campo estelar). Plano contínuo, sem cortes,
    // NOMEADO no clímax. Órbita de ASSUNTO declarada: é o alvo que se
    // contempla, não voo de lado.
    dur: 14,
    pos: (k, out) => {
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(BH_ARC_IN, BH_ARC_OUT, k));
      const z = THREE.MathUtils.lerp(-0.3, 0.55, k);
      return galPoint(BH_R, a, z, out);
    },
    look: still(GAL.GC_POS),
    fov0: 50, fov1: 52,
    ease: glide,
    roll: (k) => 0.22 * Math.sin(Math.PI * k),
    quiet: true,
    lingua: 'assunto',
    captions: [
      {
        at: 0.1,
        text: 'SAGITTARIUS A✱',
        sub: 'quatro milhões de sóis num volume menor que a órbita de Mercúrio',
        dur: 5.5,
      },
      {
        at: 0.5,
        text: 'O HORIZONTE',
        sub: 'a gravidade curva a luz ao redor da sombra — lente de Einstein',
        dur: 6.6,
      },
    ],
  },

  // ================= ATO IV — A REVELAÇÃO =================
  {
    // A FUGA: sai da curva olhando o monstro ENCOLHER — acento traseiro
    // declarado e curto. É o único adeus que o buraco negro ganha.
    // A curva sai RADIAL (C1 no azimute da rasante). glide parte e
    // chega parado — casa com a rasante e com a subida.
    dur: 5,
    pos: (k, out) => SLING(k * FUGA_ATE, out),
    look: still(GAL.GC_POS),
    fov0: 52, fov1: 54,
    ease: glide,
    warp: (k) => 0.6 * (1 - k),
    roll: (k) => 0.1 * Math.sin(Math.PI * k),
    quiet: true,
    lingua: 'tras',
    captions: [
      { at: 0.2, text: 'O ESTILINGUE', sub: 'do coração para o vazio acima do disco', dur: 4 },
    ],
  },
  {
    // A SUBIDA: o resto da mesma curva, com o olhar entregue ao quadro
    // de perfil enquanto o disco DA GALÁXIA se constrói de dentro para
    // fora. A adrenalina vira contemplação no pouso: o hold é o fim de
    // um gesto, não uma pausa.
    dur: 10,
    pos: (k, out) => SLING(FUGA_ATE + (1 - FUGA_ATE) * k, out),
    look: panLook(GAL.GC_POS, GATE_LOOK, easeOut),
    fov0: 54, fov1: GATE_EDGE_FOV,
    ease: glide,
    warp: (k) => 0.35 * Math.sin(Math.PI * Math.min(k * 1.6, 1)) * (1 - k),
    // banking da subida assenta EXATAMENTE no roll do quadro de medição
    roll: (k) => 0.12 * Math.sin(Math.PI * k) * (1 - k) + GATE_EDGE_ROLL * smooth(k),
    lingua: 'assunto',
    captions: [
      {
        at: 0.55,
        text: 'A VIA LÁCTEA, POR FORA',
        sub: 'reconstrução a partir de 1,8 bilhão de estrelas da missão Gaia',
        dur: 4.2,
      },
    ],
  },
  {
    // HOLD DE MEDIÇÃO — perfil (posição/mira/fov/roll EXATOS das
    // rodadas 16–25; o instante deriva de STARTS — ver CAPTURE_T).
    // Quietude curta: o quadro é a mensagem, 5 s bastam.
    dur: 5,
    pos: still(GATE_EDGE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_EDGE_FOV, fov1: GATE_EDGE_FOV,
    ease: linear,
    roll: () => GATE_EDGE_ROLL,
    lingua: 'assunto',
    captions: [{ at: 0.1, text: 'ELA NÃO É PLANA', sub: 'cem mil anos-luz de lado, mil de espessura — as bordas ondulam', dur: 4.4 }],
  },
  {
    // a travessia: o disco de perfil ABRE em braços — esse é o evento,
    // não um arco mudo. 9 s e uma legenda no meio do gesto.
    dur: 9,
    pos: bezier(GATE_EDGE_POS, TRAV_C1, TRAV_C2, GATE_FACE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_EDGE_FOV, fov1: GATE_FACE_FOV,
    ease: glide,
    warp: (k) => 0.2 * Math.sin(Math.PI * k),
    roll: (k) => THREE.MathUtils.lerp(GATE_EDGE_ROLL, GATE_FACE_ROLL, smooth(k)),
    lingua: 'assunto',
    captions: [
      {
        at: 0.22,
        text: 'OS BRAÇOS',
        sub: 'não são braços rígidos — são ondas que comprimem o gás em espiral',
        dur: 6,
      },
    ],
  },
  {
    // HOLD DE MEDIÇÃO — face-on (posição/mira/fov/roll EXATOS; o
    // instante deriva de STARTS — ver CAPTURE_T)
    dur: 5,
    pos: still(GATE_FACE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_FACE_FOV, fov1: GATE_FACE_FOV,
    ease: linear,
    roll: () => GATE_FACE_ROLL,
    lingua: 'assunto',
    captions: [{ at: 0.1, text: 'NOSSA GALÁXIA', sub: 'espiral barrada — centenas de bilhões de estrelas a 220 km/s', dur: 4.4 }],
  },
  {
    // deriva: NUNCA aproximar do marcador — a pequenez é a mensagem. A
    // mira desliza do centro para perto de casa; o marcador do Sol
    // pulsa, minúsculo. Pousa aos ~88% e CONGELA — e é desse
    // congelamento que a coda CORTA para o mergulho de volta.
    dur: 7,
    pos: bezier(
      GATE_FACE_POS,
      new THREE.Vector3(-21000, -11500, 21500),
      new THREE.Vector3(-14800, -9200, 26800),
      FINAL_POS
    ),
    look: panLook(GATE_LOOK, FINAL_LOOK, smooth),
    fov0: GATE_FACE_FOV, fov1: 54,
    ease: settleFreeze,
    roll: (k) => GATE_FACE_ROLL * (1 - smooth(Math.min(k / 0.88, 1))),
    target: ['SOL'],
    lingua: 'assunto',
    captions: [{
      at: 0.2,
      text: 'VOCÊ ESTÁ AQUI',
      sub: 'Esporão de Órion, 26 mil anos-luz do centro — uma volta a cada 230 milhões de anos',
      dur: 5.4,
    }],
  },

  // ============ CODA — A VOLTA PARA CASA (pedido do dono, 19/08) ============
  {
    // o mergulho de volta: 11,5 décadas em 5 s, caindo do alto galáctico
    // no corredor da Lua. Olha para CASA o tempo todo (a frente é a
    // visão). Interpolar FINAL_LOOK→TERRA como PONTOS, de perto, virava
    // um giro de ~85° que o play não seguia — a Lua passava fora de
    // quadro. O corte de 4,8° na junta o rig amortece em ângulo.
    dur: 5,
    pos: mergulhoDeVolta(),
    look: still(TERRA_PC),
    fov0: 54, fov1: 62,
    ease: linear,
    fovEase: glide,
    warp: (k) => 0.9 * Math.sin(Math.PI * Math.min(k * 1.35, 1)),
    quiet: true,
    captions: [{ at: 0.12, text: 'A VOLTA PARA CASA', sub: '26 mil anos-luz até os minutos-luz de casa', dur: 4.2 }],
  },
  {
    // UM TAKE: a Lua passa GRANDE à frente com a Terra no fundo; no
    // joelho o olhar cede a ela e devolve à casa. 12 s: a Lua fica com
    // ~4,8 s (vale mais largo, sem parar) e a Terra com ~7,2 s para a
    // rotação se ler. fov0 casa com o fim do mergulho (62°).
    dur: 12,
    pos: takeDaCasa(),
    look: lookDoTake(),
    fov0: 62, fov1: 46,
    ease: linear,
    fovEase: glide,
    warp: (k) => 0.45 * (1 - Math.min(k / K_LUA_NO_TAKE, 1)) ** 2,
    roll: (k) => {
      if (k <= K_LUA_NO_TAKE) return 0;
      const u = (k - K_LUA_NO_TAKE) / (1 - K_LUA_NO_TAKE);
      return ROLL_DOS_POLOS * easeDaVolta(u);
    },
    quiet: true,
    lingua: 'assunto',
    captions: [
      { at: 0.06, text: 'A LUA', sub: '1,3 segundo-luz — o mais longe que o ser humano já chegou', dur: 4.2 },
      { at: 0.44, text: 'A TERRA', sub: 'o único ponto com oceano de onde a galáxia inteira foi decifrada', dur: 60 },
    ],
  },
];

// tempos derivados (uma única fonte: a lista acima)
const STARTS: number[] = [];
{
  let acc = 0;
  for (const s of SHOTS) {
    STARTS.push(acc);
    acc += s.dur;
  }
}
const JOURNEY_DURATION = STARTS[STARTS.length - 1] + SHOTS[SHOTS.length - 1].dur;

// legendas achatadas em janelas absolutas [t0, t0+dur)
const CAPTION_WINDOWS = SHOTS.flatMap((s, i) =>
  (s.captions ?? []).map((c) => ({
    t0: STARTS[i] + c.at * s.dur,
    t1: STARTS[i] + c.at * s.dur + (c.dur ?? 8.6),
    shotIndex: i,
    shotEnd: STARTS[i] + s.dur,
    text: c.text,
    sub: c.sub,
    bridge: c.bridge ?? false,
  }))
).sort((a, b) => a.t0 - b.t0);

export interface JourneyScriptAudit {
  duration: number;
  shotCount: number;
  /** janelas dos planos com a língua do olhar — é o que a lei executável
   *  (roteiroPerfil.test) usa para cobrar frente de quem não declarou */
  shots: { t0: number; dur: number; lingua: 'frente' | 'assunto' | 'tras' }[];
  captions: {
    t0: number;
    t1: number;
    shotIndex: number;
    text: string;
    sub?: string;
    bridge: boolean;
  }[];
  overlaps: { first: string; second: string; at: number }[];
  crossings: {
    text: string;
    shotIndex: number;
    shotEnd: number;
    t1: number;
    bridge: boolean;
  }[];
}

/**
 * Auditoria editorial do filme. Ela torna erro de roteiro verificável:
 * legendas não se atropelam nem vazam por um corte sem passe explícito.
 */
export function auditarRoteiro(): JourneyScriptAudit {
  const overlaps = CAPTION_WINDOWS.slice(1).flatMap((current, i) => {
    const previous = CAPTION_WINDOWS[i];
    return current.t0 < previous.t1
      ? [{ first: previous.text, second: current.text, at: current.t0 }]
      : [];
  });
  const crossings = CAPTION_WINDOWS.filter(
    (caption) => caption.shotIndex < SHOTS.length - 1 && caption.t1 > caption.shotEnd
  ).map(({ text, shotIndex, shotEnd, t1, bridge }) => ({
    text,
    shotIndex,
    shotEnd,
    t1,
    bridge,
  }));

  return {
    duration: JOURNEY_DURATION,
    shotCount: SHOTS.length,
    shots: SHOTS.map((s, i) => ({ t0: STARTS[i], dur: s.dur, lingua: s.lingua ?? 'frente' })),
    captions: CAPTION_WINDOWS.map(({ t0, t1, shotIndex, text, sub, bridge }) => ({
      t0,
      t1,
      shotIndex,
      text,
      sub,
      bridge,
    })),
    overlaps,
    crossings,
  };
}

/** shot do hold de perfil / face-on — capturas no MEIO do hold */
const EDGE_HOLD = SHOTS.findIndex((s) => s.captions?.[0]?.text === 'ELA NÃO É PLANA');
const FACE_HOLD = SHOTS.findIndex((s) => s.captions?.[0]?.text === 'NOSSA GALÁXIA');
export const CAPTURE_T = {
  edge: Math.round(STARTS[EDGE_HOLD] + SHOTS[EDGE_HOLD].dur / 2),
  face: Math.round(STARTS[FACE_HOLD] + SHOTS[FACE_HOLD].dur / 2),
};
/** início do Ato IV — o botão "Ver a galáxia" salta para cá. Achado pelo
 *  NOME do beat (a fuga do estilingue), não por índice mágico: a conta de
 *  planos muda com o corte, o nome não. */
export const REVEAL_T =
  STARTS[SHOTS.findIndex((s) => s.captions?.[0]?.text === 'O ESTILINGUE')];

/**
 * O CALENDÁRIO DO FILME — que dia o céu mostra em cada segundo do
 * corte, e é o filme quem manda. São 193 s do MESMO dia, 2026-01-01: os
 * atos correm no instante do retrato (00:00 UTC, a época em que os dez
 * corpos estão congelados quando não há rede) e a coda pede as 16:00
 * UTC do mesmo dia, o meio-dia solar a ~60°O que acende as Américas
 * para o pouso. A troca segue caindo em `REVEAL_T`, o único trecho em
 * que nada que dependa do relógio está em quadro — a câmera sai do
 * buraco negro, a 26.000 anos-luz de casa.
 *
 * Por que uma FUNÇÃO e não a linha solta que existia no tick: a linha
 * só corria a partir de `REVEAL_T`, então a data que o visitante
 * escolhera no Atlas atravessava o portal e ficava dentro do filme.
 * Medido em 21/08: viajar para 2035 no Atlas, Partir e arrastar a barra
 * para o Ato I dava planetas de 2035 no filme, com o relógio saltando
 * sozinho para 2026 quando a barra chegava à coda — dois calendários no
 * mesmo corte, nenhum declarado. Um relógio só, e no filme ele é este.
 * A porta `?jd=` do operador continua com precedência (o tick a checa).
 */
export function jdDoFilme(t: number): number {
  return t >= REVEAL_T ? JD_DO_FILME_TDB : EPOCA_JD_TDB;
}

interface JourneySample {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  warp: number; // 0..1 para pós-processamento
  roll: number; // radianos
}

export interface JourneyMeta {
  /** assunto(s) do shot — etiqueta forçada ('SOL' | 'SGR' | nome HYG) */
  target?: string[];
  /** fundo mudo durante o beat */
  quiet: boolean;
  /** destino da linha de rumo ('SGR' | nome HYG) */
  dest?: string;
}

export class Journey {
  readonly duration = JOURNEY_DURATION;

  private shotAt(t: number): { i: number; k: number } {
    if (t <= 0) return { i: 0, k: 0 };
    if (t >= JOURNEY_DURATION) return { i: SHOTS.length - 1, k: 1 };
    let i = SHOTS.length - 1;
    for (let s = 0; s < SHOTS.length; s++) {
      if (t < STARTS[s] + SHOTS[s].dur) {
        i = s;
        break;
      }
    }
    return { i, k: clamp01((t - STARTS[i]) / SHOTS[i].dur) };
  }

  at(t: number): JourneySample {
    const { i, k } = this.shotAt(t);
    const s = SHOTS[i];
    const ke = (s.ease ?? glide)(k);
    const pos = s.pos(ke, new THREE.Vector3());
    const look = s.look(ke, new THREE.Vector3());
    // sem `fovEase` o argumento é o MESMO `ke` de sempre — a expressão
    // não muda, e nenhum dos 23 planos herdados move um bit
    const fov = THREE.MathUtils.lerp(s.fov0, s.fov1, s.fovEase ? s.fovEase(k) : ke);

    return {
      pos,
      look,
      fov,
      warp: clamp01(s.warp ? s.warp(k) : 0),
      roll: s.roll ? s.roll(k) : 0,
    };
  }

  /**
   * Legenda ativa como FUNÇÃO PURA de t (janela [entrada, entrada+dur)):
   * seek, scrub e 2× mostram exatamente o que o espectador deve ver.
   */
  captionAt(t: number): { index: number; key: { caption: string; sub?: string } } {
    for (let i = CAPTION_WINDOWS.length - 1; i >= 0; i--) {
      const w = CAPTION_WINDOWS[i];
      if (t >= w.t0 && t < w.t1) {
        return { index: i, key: { caption: w.text, sub: w.sub } };
      }
    }
    return { index: -1, key: { caption: '' } };
  }

  metaAt(t: number): JourneyMeta {
    const s = SHOTS[this.shotAt(t).i];
    return { target: s.target, quiet: s.quiet ?? false, dest: s.dest };
  }

  /** cada marca da barra É uma legenda — leva o título junto, para o HUD
   *  poder nomear o capítulo em vez de mostrar um traço anônimo */
  get tickTimes(): { t: number; text: string }[] {
    return CAPTION_WINDOWS.map((w) => ({
      t: w.t0 / JOURNEY_DURATION,
      text: w.text,
    }));
  }
}

/**
 * O SEGUNDO EM QUE A VIAGEM DEIXA O DISCO — 148,394 s no corte de hoje,
 * e DERIVADO, nunca digitado: a mesma conta de que o quadro vive
 * (`dentroDoDisco`, a fonte única do envelope) varrida sobre esta mesma
 * trajetória. Como o `REVEAL_T`, muda sozinho quando o corte muda; ao
 * contrário dele, não tem nome de plano porque a saída cai no MEIO da
 * subida, não numa junta.
 *
 * Existe porque o latch `leftDisk` do Director é HISTÓRIA — uma vez
 * fora, fica fora — e o `seek` não tem história. Arrastar a barra até a
 * coda nascia "dentro do disco" e ressuscitava a nebulosa atrás da
 * Terra, com o cartão da galáxia apagado: o oposto do que o play
 * contínuo mostra no mesmo instante. Medido no navegador em 21/08, o
 * play contínuo arma o latch em t=148,46 (amostragem de 16 ms a 8×) —
 * a varredura e o navegador concordam.
 *
 * O laço custa 1,4 ms nesta máquina e roda uma vez por sessão. A
 * bisseção existe porque o `seek` compara com `>=`: um degrau de 0,1 s
 * poria a fronteira até 100 ms cedo demais.
 */
export const T_SAIDA_DO_DISCO = (() => {
  const filme = new Journey();
  const fora = (t: number) => dentroDoDisco(filme.at(t).pos) <= LIMIAR_FORA_DO_DISCO;
  const passo = 0.1;
  for (let t = 0; t <= filme.duration; t += passo) {
    if (!fora(t)) continue;
    let dentro = t - passo;
    let saiu = t;
    for (let i = 0; i < 30; i++) {
      const meio = (dentro + saiu) / 2;
      if (fora(meio)) saiu = meio;
      else dentro = meio;
    }
    return saiu;
  }
  // roteiro que nunca sai do disco: o latch nunca nasce armado
  return Number.POSITIVE_INFINITY;
})();
