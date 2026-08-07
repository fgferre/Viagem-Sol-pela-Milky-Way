// ============================================================
// A Viagem — roteiro cinematográfico em SHOTS parametrizados.
//
// Quatro atos, ~5min21 (os intervalos abaixo derivam de STARTS):
//   I   CASA (0–48s)        — parede de fogo, hélice ao redor do Sol
//                             (o céu inteiro gira; o bojo passa em
//                             contraluz atrás do Sol), Sirius de raspão.
//   II  ÓRION (48–116s)     — a TRAVA das Três Marias perto de casa (é
//                             só de perto que a fila é fila — a 55 pc a
//                             paralaxe ainda preserva o alinhamento),
//                             espiral em Betelgeuse, Rigel de raspão,
//                             o olhar-para-trás: o Sol já é invisível.
//   III O MERGULHO (116–229s) — Antares como portão, corrida de 8 kpc em
//                             ondas (braços como muralhas), Sagittarius A*
//                             com curva rasante ao redor do horizonte.
//   IV  A REVELAÇÃO (229–321s) — estilingue, pouso no quadro de perfil,
//                             travessia ao face-on, "você está aqui" com
//                             congelamento final.
//
// Sistema editorial (revisão "outros olhos" da rodada 26):
//   - legendas são JANELAS em tempo de viagem (captions[], com dur) —
//     função pura de t: seek/scrub/2× mostram a legenda certa;
//   - o ASSUNTO do shot sempre tem etiqueta (target), o fundo fica
//     mudo ou limitado durante o beat (quiet);
//   - a linha de DESTINO (dest) diz para onde se vai, com distância viva.
//
// Holds de medição são EXATOS por construção — posição, mira, fov e
// roll idênticos às rodadas 16–25 (roll do rig antigo assado; ver
// GATE_*). Um hold nunca é um corte: a câmera chega em movimento e
// POUSA no enquadramento.
// ============================================================
import * as THREE from 'three';
import { GAL, EX, EY, EZ } from '../world/galaxy';

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
const SOL = new THREE.Vector3(0, 0, 0);

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

interface ShotCaption {
  /** fração do shot em que a legenda ENTRA */
  at: number;
  text: string;
  sub?: string;
  /** janela de exibição em segundos de VIAGEM (padrão 8,6) */
  dur?: number;
}

interface Shot {
  dur: number;
  pos: PosFn;
  look: PosFn;
  fov0: number;
  fov1: number;
  ease?: Ease;
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

const SUN_WALL = helix(0.062, -150, 0.012); // parede de fogo
const ORBIT_EXIT = helix(0.55, 60, 0.17);

// partida: cruza a 0,35 pc de Sirius SEM centralizá-la (a primeira
// quebra de expectativa — a estrela mais brilhante do céu é só um poste)
const SIRIUS_C1 = new THREE.Vector3(0.15, 1.1, 0.15);
const SIRIUS_C2 = new THREE.Vector3(-0.35, 2.2, -0.45);
const POST_SIRIUS = new THREE.Vector3(0.4, 4.6, -0.6);
const LOOKBACK_1 = new THREE.Vector3(1.1, 7.2, 0.1);

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

// Ato IV — estilingue e subida olhando PARA TRÁS (o disco se constrói
// de dentro para fora), pouso no quadro de perfil, travessia em arco
// com a galáxia sempre no centro, pouso no face-on, deriva final.
const SLING_C1 = gal(900, 60, 260);
const SLING_C2 = gal(4200, 85, 2600);
const TRAV_C1 = new THREE.Vector3(-12000, 16800, 14000);
const TRAV_C2 = new THREE.Vector3(-26800, 2600, 22000);
const FINAL_POS = new THREE.Vector3(-11429, -7864, 29651);
// o gesto final aponta para a MENOR coisa do quadro: a mira desliza do
// centro galáctico para perto do Sol — o marcador deriva até o terço
const FINAL_LOOK = new THREE.Vector3(-155, -2491, -1381); // GC→Sol a 65%

// ---- a lista de shots ----------------------------------------------------
const SHOTS: Shot[] = [
  // ================= ATO I — CASA =================
  {
    // parede de fogo: 6 s imóveis (a revisão cortou a estática de 8).
    // A gramática do filme nos primeiros segundos: quietude é promessa.
    dur: 6,
    pos: still(SUN_WALL),
    look: still(SOL),
    fov0: 26, fov1: 26,
    quiet: true,
    captions: [{ at: 0.3, text: 'SOL', sub: 'uma estrela comum', dur: 9 }],
  },
  {
    // hélice ascendente: o Sol fica, o céu inteiro gira. O bojo dourado
    // (Sagitário) cruza atrás do Sol no meio do shot — casa em contraluz
    // contra o destino. ~210° em 24 s (< 9°/s: documentário).
    dur: 24,
    pos: orbit(SOL, 0.062, 0.55, THREE.MathUtils.degToRad(-150), THREE.MathUtils.degToRad(60), 0.012, 0.17),
    look: still(SOL),
    fov0: 26, fov1: 56,
    ease: glide,
    target: ['SOL'],
    quiet: true,
    captions: [
      // entra quando a faixa já está franca no quadro (revisão: em
      // k≈0,5 ela ainda estava espremida na borda)
      { at: 0.64, text: 'A VIA LÁCTEA, DE DENTRO', sub: 'aquela faixa no céu é o nosso destino' },
    ],
  },
  {
    // partida — Sirius cruza o quadro de raspão, sem ser centralizada
    dur: 11,
    pos: bezier(ORBIT_EXIT, SIRIUS_C1, SIRIUS_C2, POST_SIRIUS),
    look: panLook(SOL, SIRIUS.clone().multiplyScalar(2.4), smooth),
    fov0: 56, fov1: 63,
    ease: glide,
    warp: (k) => 0.25 * Math.sin(Math.PI * k),
    target: ['Sirius', 'SOL'],
    captions: [{ at: 0.4, text: 'SIRIUS', sub: 'a luz dela chega à Terra em 8 anos' }],
  },
  {
    // primeira guinada: o Sol à popa já é um ponto amarelo modesto
    dur: 7,
    pos: line(POST_SIRIUS, LOOKBACK_1),
    look: panLook(SIRIUS.clone().multiplyScalar(2.4), SOL, smooth),
    fov0: 63, fov1: 52,
    ease: glide,
    target: ['SOL'],
  },

  // ================= ATO II — ÓRION =================
  {
    // cruzeiro pelo corredor de nuvens até o mirante do cinturão
    dur: 12,
    pos: bezier(
      LOOKBACK_1,
      new THREE.Vector3(3, 22, -2),
      new THREE.Vector3(5, 40, -1.5),
      BELT_VIEW
    ),
    look: panLook(SOL, ALNILAM, smooth),
    fov0: 52, fov1: 54,
    ease: glide,
    warp: (k) => 0.3 * Math.sin(Math.PI * k),
    dest: 'Alnilam',
    captions: [{ at: 0.25, text: 'O MAR INTERESTELAR', sub: 'gás e poeira entre as estrelas' }],
  },
  {
    // A TRAVA DAS TRÊS MARIAS (queixa literal do dono, resolvida): a
    // câmera POUSA no eixo Terra→cinturão e FECHA a lente na fila —
    // gesto de telescópio; a 54° a fila era minúscula e as etiquetas
    // colidiam. As três em linha, como no céu de casa, NOMEADAS.
    dur: 12,
    pos: still(BELT_VIEW),
    look: still(ALNILAM),
    fov0: 54, fov1: 15,
    ease: settle,
    target: ['Alnitak', 'Alnilam', 'Mintaka'],
    quiet: true,
    captions: [
      { at: 0.12, text: 'AS TRÊS MARIAS', sub: 'Alnitak · Alnilam · Mintaka — em fila só vistas daqui', dur: 10 },
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
    captions: [
      { at: 0.08, text: 'UM PASSO AO LADO', sub: 'e a fila se desfaz — constelações são pontos de vista', dur: 7 },
    ],
  },
  {
    // aproximação de Betelgeuse por baixo (ela "nasce" do bordo inferior)
    dur: 6,
    pos: bezier(
      BELT_BREAK,
      new THREE.Vector3(-4, 80, 0),
      new THREE.Vector3(0, 125, -2),
      BET_ORBIT_IN
    ),
    look: panLook(ALNILAM, BETELGEUSE, smooth),
    fov0: 50, fov1: 62,
    ease: glide,
    warp: (k) => 0.35 * Math.sin(Math.PI * k),
    target: ['Betelgeuse'],
    dest: 'Betelgeuse',
  },
  {
    // Betelgeuse: espiral orbital FECHANDO (r 14→7 pc), sentido oposto à
    // hélice solar. A supergigante em primeiro plano, o fundo desfilando
    // por paralaxe. Encurtada de 20 s para 12 (revisão: o filme parava
    // demais aqui e de menos nas Três Marias).
    dur: 12,
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
    captions: [
      { at: 0.12, text: 'BETELGEUSE', sub: 'no lugar do Sol, engoliria a órbita de Júpiter', dur: 9 },
    ],
  },
  {
    // Rigel de raspão — silhueta azul cruzando, agora com nome
    dur: 8,
    pos: bezier(
      BET_ORBIT_OUT,
      new THREE.Vector3(18, 190, 6),
      RIGEL.clone().add(new THREE.Vector3(-10, -6, -14)),
      RIGEL_PASS
    ),
    look: panLook(BETELGEUSE, RIGEL, smooth),
    fov0: 38, fov1: 60,
    ease: glide,
    warp: (k) => 0.3 * Math.sin(Math.PI * k),
    target: ['Rigel'],
    captions: [{ at: 0.3, text: 'RIGEL', sub: 'a supergigante azul de Órion — 40.000 sóis', dur: 7 }],
  },
  {
    // a dobradiça: desacelera até quase zero, meia-volta de 180° e o
    // VAZIO — o quadro onde o Sol deveria estar, com a etiqueta SOL
    // marcando o ponto exato (a prova visual da legenda). O fim do giro
    // já entrega o Escorpião pela borda: sem segundo começo.
    dur: 12,
    pos: line(RIGEL_PASS, LOOKBACK_2),
    look: panLook(RIGEL, SOL, smooth),
    fov0: 60, fov1: 34,
    ease: settle,
    target: ['SOL'],
    quiet: true,
    captions: [{ at: 0.5, text: 'CASA', sub: 'daqui, o Sol já é invisível a olho nu', dur: 9 }],
  },

  // ================= ATO III — O MERGULHO =================
  {
    // a virada para Antares: o portão do centro
    dur: 14,
    pos: bezier(
      LOOKBACK_2,
      new THREE.Vector3(70, 160, -70),
      new THREE.Vector3(30, -40, -30),
      ANT_GATE
    ),
    look: panLook(SOL, ANTARES, smooth),
    fov0: 34, fov1: 50,
    ease: glide,
    warp: (k) => 0.45 * Math.sin(Math.PI * k),
    target: ['Antares'],
    dest: 'Antares',
    captions: [{ at: 0.5, text: 'ANTARES', sub: 'atrás dela: o centro. 26.000 anos-luz' }],
  },
  {
    // quase-parada diante da brasa — e o lançamento mais forte do filme
    dur: 9,
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
    // ONDA 1 — até a muralha de Sagitário. O bojo cravado no terço
    // superior, imóvel enquanto tudo flui; a linha de destino conta a
    // distância caindo.
    dur: 18,
    pos: bezier(ANT_PASS, gal(7700, 2, -30), gal(7100, 4, -26), DIVE_1),
    look: still(GAL.GC_POS),
    fov0: 58, fov1: 66,
    ease: glide,
    warp: (k) => 0.55 + 0.4 * Math.sin(Math.PI * k),
    roll: (k) => 0.10 * Math.sin(Math.PI * k),
    dest: 'SGR',
    captions: [{ at: 0.45, text: 'O MERGULHO', sub: 'oito mil parsecs até o coração' }],
  },
  {
    // ONDA 2 — a desaceleração É o braço de Sagitário: a poeira
    // engrossa, atravessamos POR DENTRO da lâmina (o único túnel escuro
    // do filme). Legenda descreve a EXPERIÊNCIA, não um nome invisível.
    dur: 14,
    pos: bezier(DIVE_1, gal(6100, 9, -2), gal(5600, 11, 2), DIVE_2),
    look: still(GAL.GC_POS),
    fov0: 66, fov1: 62,
    ease: glide,
    warp: (k) => 0.5 + 0.45 * Math.sin(Math.PI * k),
    roll: (k) => -0.12 * Math.sin(Math.PI * k),
    dest: 'SGR',
    captions: [
      { at: 0.25, text: 'BRAÇO DE SAGITÁRIO', sub: 'a poeira engrossa — estamos dentro de um braço espiral', dur: 9 },
    ],
  },
  {
    // ONDA 3 — Scutum-Centaurus na desaceleração de entrada, e a reta
    // final: aceleração exponencial, o dourado crescendo sem parar
    dur: 20,
    pos: bezier(DIVE_2, gal(4600, 16, -30), DIVE_3, DIVE_4),
    look: still(GAL.GC_POS),
    fov0: 62, fov1: 70,
    ease: glide,
    warp: (k) => 0.6 + 0.4 * Math.sin(Math.PI * k * 0.9),
    roll: (k) => 0.14 * Math.sin(Math.PI * k),
    dest: 'SGR',
    captions: [
      { at: 0.06, text: 'SCUTUM-CENTAURUS', sub: 'a última muralha de estrelas antes do coração', dur: 8 },
    ],
  },
  {
    // desaceleração no aglomerado central: e... nada aparece. Sgr A* só
    // se revela nos últimos segundos — uma pérola negra descentrada,
    // notada primeiro pela distorção do campo estelar.
    dur: 10,
    pos: bezier(DIVE_4, gal(700, 29, -8), gal(320, 30, -6), CORE_IN),
    look: still(GAL.GC_POS),
    fov0: 70, fov1: 55,
    ease: settle,
    warp: (k) => 0.9 * (1 - k) * (1 - k),
    dest: 'SGR',
    captions: [
      { at: 0.5, text: 'SAGITTARIUS A✱', sub: 'quatro milhões de sóis dentro da órbita de Mercúrio', dur: 9 },
    ],
  },
  {
    // aproximação final: de 120 pc a 1,5 pc do centro
    dur: 8,
    pos: (k, out) => {
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(32, BH_ARC_IN, k));
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
    // agora NOMEADO no clímax (revisão: o leigo via o Gargantua sem
    // saber o que era).
    dur: 20,
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
    captions: [
      { at: 0.15, text: 'O HORIZONTE', sub: 'a gravidade dobra o disco de luz ao redor da sombra', dur: 12 },
    ],
  },

  // ================= ATO IV — A REVELAÇÃO =================
  {
    // estilingue: sai da curva olhando PARA TRÁS — o disco de acreção
    // encolhendo, depois o disco DA GALÁXIA se construindo de dentro
    // para fora. A adrenalina vira contemplação no pouso do quadro de
    // perfil: o hold é o fim de um gesto, não uma pausa.
    dur: 28,
    pos: bezier(
      galPoint(BH_R, THREE.MathUtils.degToRad(BH_ARC_OUT), 0.55, new THREE.Vector3()),
      SLING_C1,
      SLING_C2,
      GATE_EDGE_POS
    ),
    look: panLook(GAL.GC_POS, GATE_LOOK, easeOut),
    fov0: 52, fov1: GATE_EDGE_FOV,
    ease: glide,
    warp: (k) => 0.65 * Math.sin(Math.PI * Math.min(k * 1.6, 1)) * (1 - k),
    // banking do estilingue assenta EXATAMENTE no roll do quadro de medição
    roll: (k) => 0.16 * Math.sin(Math.PI * k) * (1 - k) + GATE_EDGE_ROLL * smooth(k),
    captions: [
      { at: 0.22, text: 'O ESTILINGUE', sub: 'do coração para fora do disco', dur: 6 },
      { at: 0.6, text: 'A VIA LÁCTEA, POR FORA', sub: 'nenhum ser humano jamais viu isto', dur: 8 },
    ],
  },
  {
    // HOLD DE MEDIÇÃO — perfil (t 257–265; captura em t=261)
    dur: 8,
    pos: still(GATE_EDGE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_EDGE_FOV, fov1: GATE_EDGE_FOV,
    ease: linear,
    roll: () => GATE_EDGE_ROLL,
    captions: [
      { at: 0.12, text: 'ELA NÃO É PLANA', sub: 'repare nas pontas — o disco ondula' },
    ],
  },
  {
    // a travessia: um único arco com a galáxia sempre no centro do
    // quadro — o disco de perfil abre em braços espirais; a anã de
    // Sagitário passa como companheira pálida
    dur: 24,
    pos: bezier(GATE_EDGE_POS, TRAV_C1, TRAV_C2, GATE_FACE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_EDGE_FOV, fov1: GATE_FACE_FOV,
    ease: glide,
    warp: (k) => 0.2 * Math.sin(Math.PI * k),
    roll: (k) => THREE.MathUtils.lerp(GATE_EDGE_ROLL, GATE_FACE_ROLL, smooth(k)),
  },
  {
    // HOLD DE MEDIÇÃO — face-on (t 289–297; captura em t=293)
    dur: 8,
    pos: still(GATE_FACE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_FACE_FOV, fov1: GATE_FACE_FOV,
    ease: linear,
    roll: () => GATE_FACE_ROLL,
    captions: [
      { at: 0.12, text: 'NOSSA GALÁXIA', sub: '400 bilhões de estrelas' },
    ],
  },
  {
    // deriva final: NUNCA aproximar do marcador — a pequenez é a
    // mensagem. A mira desliza do centro para perto de casa; o marcador
    // do Sol pulsa, minúsculo. Pousa aos ~318 s e CONGELA: o filme
    // termina parado, com a última legenda persistindo até o fim.
    dur: 24,
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
    captions: [
      { at: 0.5, text: 'VOCÊ ESTÁ AQUI', sub: 'uma estrela comum — a nossa', dur: 60 },
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
    text: c.text,
    sub: c.sub,
  }))
).sort((a, b) => a.t0 - b.t0);

/** shot do hold de perfil / face-on — capturas no MEIO do hold */
const EDGE_HOLD = SHOTS.findIndex((s) => s.captions?.[0]?.text === 'ELA NÃO É PLANA');
const FACE_HOLD = SHOTS.findIndex((s) => s.captions?.[0]?.text === 'NOSSA GALÁXIA');
export const CAPTURE_T = {
  edge: Math.round(STARTS[EDGE_HOLD] + SHOTS[EDGE_HOLD].dur / 2),
  face: Math.round(STARTS[FACE_HOLD] + SHOTS[FACE_HOLD].dur / 2),
};
/** início do Ato IV — o botão "Ver a galáxia" salta para cá */
export const REVEAL_T = STARTS[SHOTS.length - 5];

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
    const fov = THREE.MathUtils.lerp(s.fov0, s.fov1, ke);

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
