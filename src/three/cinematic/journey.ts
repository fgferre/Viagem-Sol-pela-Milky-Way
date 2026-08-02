// ============================================================
// A Viagem — roteiro cinematográfico em SHOTS parametrizados.
//
// Quatro atos, ~5 min:
//   I   CASA (0–52s)        — parede de fogo, hélice ao redor do Sol
//                             (o céu inteiro gira; o bojo passa em
//                             contraluz atrás do Sol), Sirius de raspão.
//   II  ÓRION (52–118s)     — Betelgeuse em espiral orbital, o desfile
//                             das Três Marias (o alinhamento se forma e
//                             se desfaz por paralaxe), Rigel de passagem,
//                             o olhar-para-trás: o Sol já é invisível.
//   III O MERGULHO (118–212s) — Antares como portão, corrida de 8 kpc em
//                             ondas (braços como muralhas), Sagittarius A*
//                             com curva rasante ao redor do horizonte.
//   IV  A REVELAÇÃO (212–312s) — subida olhando para trás, pouso no
//                             enquadramento de perfil, travessia em arco
//                             ao face-on, "você está aqui".
//
// Cada shot é uma função paramétrica (posição/mira/fov/warp/roll) com
// easing próprio: holds são EXATOS por construção — é isso que garante
// os dois quadros de medição (edge/face) bit-a-bit reproduzíveis.
// Princípio do painel de direção: um hold nunca é um corte — a câmera
// chega em movimento e POUSA no enquadramento.
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
const BELLATRIX = new THREE.Vector3(11.659, 76.036, 8.56);
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
/** mira que desliza entre dois pontos (para virar o olhar sem saltos) */
const panLook = (a: THREE.Vector3, b: THREE.Vector3, ease: Ease = smooth): PosFn =>
  (k, out) => out.copy(a).lerp(b, ease(k));

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
  caption?: { at: number; text: string; sub?: string };
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

// Ato II — chegada a Betelgeuse POR BAIXO (ela "nasce" do bordo inferior),
// espiral orbital com as Três Marias ao fundo, desfile lateral do cinturão.
const BET_BELOW = BETELGEUSE.clone()
  .addScaledVector(EZ, -7)
  .add(new THREE.Vector3(2.5, -16, 0));
const BET_ORBIT_CENTER = BETELGEUSE;
// desfile: paralelo ao cinturão, ligeiramente abaixo; o alinhamento
// Alnitak–Alnilam–Mintaka se FORMA quando a câmera cruza o eixo Terra→
// cinturão e se desfaz em seguida (paralaxe de 200–600 pc de profundidade)
const BELT_IN = new THREE.Vector3(44, 186, -20);
const BELT_OUT = new THREE.Vector3(-14, 232, 4);
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
const gal = (R: number, azDeg: number, z: number) => {
  const a = THREE.MathUtils.degToRad(azDeg);
  return new THREE.Vector3()
    .copy(GAL.GC_POS)
    .addScaledVector(EX, Math.cos(a) * R)
    .addScaledVector(EY, Math.sin(a) * R)
    .addScaledVector(EZ, z);
};
const DIVE_1 = gal(6600, 6, -14); // muralha de Sagitário
const DIVE_2 = gal(5100, 13, -8); // dentro da lâmina — travessia de nuvem
const DIVE_3 = gal(3900, 20, -24); // Scutum-Centaurus
const DIVE_4 = gal(1500, 27, -14); // reta final, bojo enchendo o quadro
const CORE_IN = gal(120, 30, -4); // dentro do aglomerado central

// Sagittarius A*: curva rasante — arco de ~150° a 4,6 pc do horizonte,
// subindo de -1,2 a +1,8 pc de altura (o disco de acreção gira de
// quase-de-perfil para levemente de cima: o anel de Einstein varre).
const BH_ARC_IN = 38; // graus
const BH_ARC_OUT = 190;
const BH_R = 4.6;

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
    // parede de fogo: 8 s imóveis. A gramática do filme nos primeiros
    // segundos: aqui a quietude é a promessa.
    dur: 8,
    pos: still(SUN_WALL),
    look: still(SOL),
    fov0: 26, fov1: 26,
    caption: { at: 0.45, text: 'SOL', sub: 'uma estrela comum' },
  },
  {
    // hélice ascendente: o Sol fica, o céu inteiro gira. O bojo dourado
    // (Sagitário) cruza atrás do Sol no meio do shot — casa em contraluz
    // contra o destino. Uma volta de ~210° em 22 s (< 10°/s: documentário).
    dur: 22,
    pos: orbit(SOL, 0.062, 0.55, THREE.MathUtils.degToRad(-150), THREE.MathUtils.degToRad(60), 0.012, 0.17),
    look: still(SOL),
    fov0: 26, fov1: 56,
    ease: glide,
    caption: { at: 0.52, text: 'A VIA LÁCTEA, DE DENTRO', sub: 'aquela faixa no céu é o nosso destino' },
  },
  {
    // partida — Sirius cruza o quadro de raspão, sem ser centralizada
    dur: 11,
    pos: bezier(ORBIT_EXIT, SIRIUS_C1, SIRIUS_C2, POST_SIRIUS),
    look: panLook(SOL, SIRIUS.clone().multiplyScalar(2.4), smooth),
    fov0: 56, fov1: 63,
    ease: glide,
    warp: (k) => 0.25 * Math.sin(Math.PI * k),
    caption: { at: 0.4, text: 'SIRIUS', sub: 'a luz dela chega à Terra em 8 anos' },
  },
  {
    // primeira guinada: o Sol à popa já é um ponto amarelo modesto
    dur: 7,
    pos: line(POST_SIRIUS, LOOKBACK_1),
    look: panLook(SIRIUS.clone().multiplyScalar(2.4), SOL, smooth),
    fov0: 63, fov1: 52,
    ease: glide,
  },

  // ================= ATO II — ÓRION =================
  {
    // cruzeiro pelo corredor de nuvens até Órion; Betelgeuse por baixo
    dur: 14,
    pos: bezier(
      LOOKBACK_1,
      new THREE.Vector3(6, 46, -4),
      BELLATRIX.clone().add(new THREE.Vector3(-6, -18, -10)),
      BET_BELOW
    ),
    look: panLook(SOL, BETELGEUSE, smooth),
    fov0: 52, fov1: 62,
    ease: glide,
    warp: (k) => 0.3 * Math.sin(Math.PI * k),
    caption: { at: 0.3, text: 'O MAR INTERESTELAR', sub: 'gás e poeira entre as estrelas' },
  },
  {
    // Betelgeuse: espiral orbital FECHANDO (r 14→7 pc), sentido oposto à
    // hélice solar. A supergigante em primeiro plano, as Três Marias ao
    // fundo se deformando por paralaxe: a constelação morre em cena.
    dur: 20,
    pos: (k, out) => {
      const r = THREE.MathUtils.lerp(14, 7, k);
      const a = THREE.MathUtils.lerp(1.9, -0.4, k); // sentido horário
      const h = THREE.MathUtils.lerp(-6, 3.5, k);
      out.copy(BET_ORBIT_CENTER);
      out.addScaledVector(EX, Math.cos(a) * r);
      out.addScaledVector(EY, Math.sin(a) * r);
      out.addScaledVector(EZ, h);
      return out;
    },
    look: still(BETELGEUSE),
    fov0: 62, fov1: 38,
    ease: glide,
    caption: { at: 0.35, text: 'BETELGEUSE', sub: 'no lugar do Sol, engoliria a órbita de Júpiter' },
  },
  {
    // o desfile das Três Marias: travelling lateral abaixo do cinturão.
    // No meio do shot a câmera cruza o eixo Terra→cinturão e por ~2 s
    // as três se ALINHAM como no céu de casa — e se desfazem.
    dur: 14,
    pos: line(BELT_IN, BELT_OUT),
    look: panLook(BETELGEUSE, ALNILAM, easeOut),
    fov0: 38, fov1: 54,
    ease: glide,
    caption: { at: 0.42, text: 'AS TRÊS MARIAS', sub: 'alinhadas apenas vistas da Terra' },
  },
  {
    // Rigel de raspão — silhueta azul cruzando, sem parar
    dur: 8,
    pos: bezier(
      BELT_OUT,
      new THREE.Vector3(18, 244, -18),
      RIGEL.clone().add(new THREE.Vector3(-10, -6, -14)),
      RIGEL_PASS
    ),
    look: panLook(ALNILAM, RIGEL, smooth),
    fov0: 54, fov1: 60,
    ease: glide,
    warp: (k) => 0.3 * Math.sin(Math.PI * k),
  },
  {
    // a dobradiça: desacelera até quase zero, meia-volta de 180° e
    // 4 s de VAZIO — o quadro onde o Sol deveria estar. O fim do giro
    // já entrega o Escorpião pela borda: sem segundo começo.
    dur: 12,
    pos: line(RIGEL_PASS, LOOKBACK_2),
    look: panLook(RIGEL, SOL, smooth),
    fov0: 60, fov1: 34,
    ease: settle,
    caption: { at: 0.55, text: 'CASA', sub: 'daqui, o Sol já é invisível a olho nu' },
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
    caption: { at: 0.5, text: 'ANTARES', sub: 'atrás dela: o centro. 26.000 anos-luz' },
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
  },
  {
    // ONDA 1 — até a muralha de Sagitário. O bojo cravado no terço
    // superior, imóvel enquanto tudo flui.
    dur: 18,
    pos: bezier(ANT_PASS, gal(7700, 2, -30), gal(7100, 4, -26), DIVE_1),
    look: still(GAL.GC_POS),
    fov0: 58, fov1: 66,
    ease: glide,
    warp: (k) => 0.55 + 0.4 * Math.sin(Math.PI * k),
    roll: (k) => 0.10 * Math.sin(Math.PI * k),
    caption: { at: 0.55, text: 'O MERGULHO', sub: 'oito mil parsecs até o coração' },
  },
  {
    // ONDA 2 — respiro, e a travessia POR DENTRO da lâmina de poeira
    // (2–3 s de interior púrpura; o único túnel escuro do filme)
    dur: 14,
    pos: bezier(DIVE_1, gal(6100, 9, -2), gal(5600, 11, 2), DIVE_2),
    look: still(GAL.GC_POS),
    fov0: 66, fov1: 62,
    ease: glide,
    warp: (k) => 0.5 + 0.45 * Math.sin(Math.PI * k),
    roll: (k) => -0.12 * Math.sin(Math.PI * k),
  },
  {
    // ONDA 3 — Scutum-Centaurus e a reta final: aceleração exponencial,
    // a densidade e o dourado crescendo sem parar
    dur: 20,
    pos: bezier(DIVE_2, gal(4600, 16, -30), DIVE_3, DIVE_4),
    look: still(GAL.GC_POS),
    fov0: 62, fov1: 70,
    ease: glide,
    warp: (k) => 0.6 + 0.4 * Math.sin(Math.PI * k * 0.9),
    roll: (k) => 0.14 * Math.sin(Math.PI * k),
    caption: { at: 0.45, text: 'BRAÇO DE SCUTUM-CENTAURUS', sub: 'a luz daqui só chegará à Terra no ano 15.000' },
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
  },
  {
    // aproximação final: de 120 pc a 4,6 pc do horizonte
    dur: 8,
    pos: (k, out) => {
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(32, BH_ARC_IN, k));
      const r = THREE.MathUtils.lerp(120, BH_R, k);
      const z = THREE.MathUtils.lerp(-4, -1.2, k);
      out.copy(GAL.GC_POS);
      out.addScaledVector(EX, Math.cos(a) * r);
      out.addScaledVector(EY, Math.sin(a) * r);
      out.addScaledVector(EZ, z);
      return out;
    },
    look: still(GAL.GC_POS),
    fov0: 55, fov1: 50,
    ease: glide,
    caption: { at: 0.5, text: 'SAGITTARIUS A✱', sub: 'quatro milhões de sóis dentro da órbita de Mercúrio' },
  },
  {
    // A CURVA RASANTE: ~150° ao redor do horizonte, periastro no mínimo
    // de velocidade de todo o ato — a física faz a coreografia (anel de
    // Einstein varrendo o campo estelar). Plano contínuo, sem cortes.
    dur: 20,
    pos: (k, out) => {
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(BH_ARC_IN, BH_ARC_OUT, k));
      const z = THREE.MathUtils.lerp(-1.2, 1.8, k);
      out.copy(GAL.GC_POS);
      out.addScaledVector(EX, Math.cos(a) * BH_R);
      out.addScaledVector(EY, Math.sin(a) * BH_R);
      out.addScaledVector(EZ, z);
      return out;
    },
    look: still(GAL.GC_POS),
    fov0: 50, fov1: 52,
    ease: glide,
    roll: (k) => 0.22 * Math.sin(Math.PI * k),
  },

  // ================= ATO IV — A REVELAÇÃO =================
  {
    // estilingue: sai da curva olhando PARA TRÁS — o disco de acreção
    // encolhendo, depois o disco DA GALÁXIA se construindo de dentro
    // para fora. A adrenalina vira contemplação no pouso do quadro de
    // perfil: o hold é o fim de um gesto, não uma pausa.
    dur: 28,
    pos: bezier(
      (() => {
        const a = THREE.MathUtils.degToRad(BH_ARC_OUT);
        return new THREE.Vector3()
          .copy(GAL.GC_POS)
          .addScaledVector(EX, Math.cos(a) * BH_R)
          .addScaledVector(EY, Math.sin(a) * BH_R)
          .addScaledVector(EZ, 1.8);
      })(),
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
  },
  {
    // HOLD DE MEDIÇÃO — perfil (t 257–265; captura em t=261)
    dur: 8,
    pos: still(GATE_EDGE_POS),
    look: still(GATE_LOOK),
    fov0: GATE_EDGE_FOV, fov1: GATE_EDGE_FOV,
    ease: linear,
    roll: () => GATE_EDGE_ROLL,
    caption: { at: 0.12, text: 'A VIA LÁCTEA', sub: 'ela não é plana — ela ondula' },
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
    caption: { at: 0.12, text: 'NOSSA GALÁXIA', sub: 'quatro grandes braços · 400 bilhões de estrelas' },
  },
  {
    // deriva final: NUNCA aproximar do marcador — a pequenez é a
    // mensagem. A mira desliza do centro para perto de casa; o
    // marcador do Sol deriva até o terço direito e pulsa, minúsculo.
    dur: 24,
    pos: bezier(
      GATE_FACE_POS,
      new THREE.Vector3(-21000, -11500, 21500),
      new THREE.Vector3(-14800, -9200, 26800),
      FINAL_POS
    ),
    look: panLook(GATE_LOOK, FINAL_LOOK, smooth),
    fov0: GATE_FACE_FOV, fov1: 54,
    ease: settle,
    roll: (k) => GATE_FACE_ROLL * (1 - smooth(k)),
    caption: { at: 0.58, text: 'VOCÊ ESTÁ AQUI', sub: 'uma estrela comum — a nossa' },
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

/** shot do hold de perfil / face-on — capturas no MEIO do hold */
const EDGE_HOLD = SHOTS.findIndex((s) => s.caption?.text === 'A VIA LÁCTEA');
const FACE_HOLD = SHOTS.findIndex((s) => s.caption?.text === 'NOSSA GALÁXIA');
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
  speed: number; // pc/s
  warp: number; // 0..1 para pós-processamento
  roll: number; // radianos
}

const _pA = new THREE.Vector3();
const _pB = new THREE.Vector3();

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

  private posAt(t: number, out: THREE.Vector3): THREE.Vector3 {
    const { i, k } = this.shotAt(t);
    const s = SHOTS[i];
    return s.pos((s.ease ?? glide)(k), out);
  }

  at(t: number): JourneySample {
    const { i, k } = this.shotAt(t);
    const s = SHOTS[i];
    const ke = (s.ease ?? glide)(k);
    const pos = s.pos(ke, new THREE.Vector3());
    const look = s.look(ke, new THREE.Vector3());
    const fov = THREE.MathUtils.lerp(s.fov0, s.fov1, ke);

    // velocidade real por diferença central (para HUD/efeitos)
    const eps = 0.06;
    this.posAt(Math.max(t - eps, 0), _pA);
    this.posAt(Math.min(t + eps, JOURNEY_DURATION), _pB);
    const speed = _pB.distanceTo(_pA) / (2 * eps);

    return {
      pos,
      look,
      fov,
      speed,
      warp: clamp01(s.warp ? s.warp(k) : 0),
      roll: s.roll ? s.roll(k) : 0,
    };
  }

  captionAt(t: number): { index: number; key: { caption: string; sub?: string } } {
    let index = -1;
    let caption = '';
    let sub: string | undefined;
    for (let s = 0; s < SHOTS.length; s++) {
      const c = SHOTS[s].caption;
      if (!c) continue;
      if (t >= STARTS[s] + c.at * SHOTS[s].dur) {
        index++;
        caption = c.text;
        sub = c.sub;
      } else break;
    }
    return { index, key: { caption, sub } };
  }

  get tickTimes(): number[] {
    const ticks: number[] = [];
    for (let s = 0; s < SHOTS.length; s++) {
      const c = SHOTS[s].caption;
      if (c) ticks.push((STARTS[s] + c.at * SHOTS[s].dur) / JOURNEY_DURATION);
    }
    return ticks;
  }
}
