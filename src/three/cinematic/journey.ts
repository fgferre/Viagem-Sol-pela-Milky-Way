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
import {
  bezier, distanciaExponencial, easeOut, glide, linear,
  panLook, settleFreeze, smooth, still,
  type PosFn,
} from './movimentos';
import { lerSequencia, type Shot } from './lerSequencia';
import { lerApoiosDoPlano, montarApoiosDoRoteiro } from './apoiosDoRoteiro';
import apoiosDaViagem from './roteiros/apoiosDaViagem.json';
import abertura from './roteiros/abertura.json';
import cinturao from './roteiros/cinturao.json';
import orion from './roteiros/orion.json';
import mergulho from './roteiros/mergulho.json';
import revelacao from './roteiros/revelacao.json';

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

const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
/** ponto galactocêntrico no referencial da cena */
const galPoint = (r: number, aRad: number, h: number, out: THREE.Vector3) =>
  out
    .copy(GAL.GC_POS)
    .addScaledVector(EX, Math.cos(aRad) * r)
    .addScaledVector(EY, Math.sin(aRad) * r)
    .addScaledVector(EZ, h);

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
 * Referência da F3: usa o mesmo cálculo exponencial da primitiva
 * `helice` e as mesmas distâncias entregues a `abertura.json`.
 * A ligação do roteiro à câmera é cobrada em `lerPlanoDeCamera.test`.
 *
 * Nos extremos devolve os extremos EXATOS: `Math.pow(x, 0)` é 1 e
 * `Math.pow(x, 1)` é o próprio x em IEEE754, então k=0 dá
 * `D_ABERTURA_PC × 1` e k=1 dá `D_ABERTURA_PC × (D_SAIDA_PC /
 * D_ABERTURA_PC)` — este último a menos de 1 ULP de `D_SAIDA_PC`, que é
 * o que o pouso em `ORBIT_EXIT` precisa (o plano seguinte parte da
 * constante, não daqui).
 */
export function distanciaDaAbertura(k: number): number {
  return distanciaExponencial(D_ABERTURA_PC, D_SAIDA_PC, k);
}

// Entrega da passagem por Sirius ao corredor do cinturão.
const POST_SIRIUS = new THREE.Vector3(0.4, 4.6, -0.6);

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
const CORE_R = 120;
// A aproximação parte destes mesmos 30°: usar 32° a 120 pc criava
// um salto de 4,2 pc no meio do ato III.
const CORE_A = 30;
const CORE_H = -4;
const CORE_IN = gal(CORE_R, CORE_A, CORE_H); // dentro do aglomerado central

// Sagittarius A*: curva rasante — arco de ~150° a 1,5 pc do centro
// (≈30 RS na escala artística — a distância dos presets da demo: é a
// proximidade, não o tamanho, que faz o disco encher o quadro),
// subindo de -0,3 a +0,55 pc (o disco gira de quase-de-perfil para
// levemente de cima: o anel de Einstein varre).
const BH_ARC_IN = 38; // graus
const BH_ARC_OUT = 190;
const BH_R = 1.5;
const BH_H_IN = -0.3;
const BH_H_OUT = 0.55;

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
  BH_R, THREE.MathUtils.degToRad(BH_ARC_OUT), BH_H_OUT, new THREE.Vector3()
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
  // Ato I e a passagem por Sirius. A distância cresce exponencialmente
  // em tempo cru; a volta e a lente suavizam por conta própria no roteiro.
  ...lerSequencia(abertura, {
    Sol: ORIGEM, paredeSolar: SUN_WALL, saidaSolar: ORBIT_EXIT,
    saidaDeSirius: POST_SIRIUS, miraDeSirius: SIRIUS.clone().multiplyScalar(2.4), Alnilam: ALNILAM,
  }, { distanciaInicial: D_ABERTURA_PC, distanciaFinal: D_SAIDA_PC }),
  // ================= ATO II — ÓRION =================
  // O corredor chega ao cinturão olhando à frente. A trava fecha a
  // lente nas Três Marias; o passo ao lado desfaz a fila. Câmera,
  // inclinação, pulso e edição vêm da mesma sequência, no relógio do filme.
  ...lerSequencia(cinturao, {
    saidaDeSirius: POST_SIRIUS, mirante: BELT_VIEW, desvio: BELT_BREAK, Alnilam: ALNILAM,
    // Recuo no meio do passo lateral: arco de revelação, com as mesmas pontas.
    curvaDoDesvio: BELT_VIEW.clone().lerp(BELT_BREAK, 0.5).addScaledVector(BELT_AXIS, -4),
  }),
  // Betelgeuse À FRENTE: ela nasce do bordo inferior e INCHA — de 95 a
  // 14 pc o diâmetro aparente cresce ~7×, e é esse crescimento que vende
  // "engoliria a órbita de Júpiter" antes de a legenda dizer. Depois a
  // passagem da supergigante em órbita de ASSUNTO (contemplar o alvo não
  // é voar de lado), Rigel de raspão em fly-under (6 pc abaixo, sem
  // parar) e a dobradiça: meia-volta RÁPIDA de 180° para o VAZIO onde o
  // Sol deveria estar — acento traseiro declarado e curto, cujo fim já
  // entrega o Escorpião pela borda.
  ...lerSequencia(orion, {
    desvio: BELT_BREAK, Alnilam: ALNILAM, Betelgeuse: BETELGEUSE,
    entradaOrbitaBetelgeuse: BET_ORBIT_IN, saidaOrbitaBetelgeuse: BET_ORBIT_OUT,
    controleRigel: RIGEL.clone().add(new THREE.Vector3(-10, -6, -14)),
    raspaoRigel: RIGEL_PASS, Rigel: RIGEL, Sol: ORIGEM, paradaDoVazio: LOOKBACK_2,
  }),

  // ================= ATO III — O MERGULHO =================
  // A virada para Antares, DE FRENTE (o olhar vira rápido do vazio de
  // casa para o portão do centro, com o bojo dourado subindo atrás —
  // geometria real do céu), o lançamento, as duas ondas de poeira e a
  // frenagem no aglomerado. O roteiro recebe as âncoras calculadas, sem
  // copiar a ciência para o JSON.
  ...lerSequencia(mergulho, {
    paradaDoVazio: LOOKBACK_2, Sol: ORIGEM,
    portaoAntares: ANT_GATE, Antares: ANTARES, saidaAntares: ANT_PASS,
    passagemAlta: ANTARES.clone().add(new THREE.Vector3(8, 16, 10)),
    passagemBaixa: ANTARES.clone().add(new THREE.Vector3(5.5, 3, 3)),
    entradaSagitario: gal(7400, 4, -28), muralhaSagitario: DIVE_1, saidaSagitario: DIVE_2,
    entradaScutum: gal(4600, 16, -30), muralhaScutum: DIVE_3, saidaScutum: DIVE_4,
    entradaBojo: gal(700, 29, -8), dentroDoBojo: gal(320, 30, -6), aglomeradoCentral: CORE_IN,
    centro: GAL.GC_POS,
  }, {
    raioAglomerado: CORE_R, anguloAglomerado: CORE_A, alturaAglomerado: CORE_H,
    raioRasante: BH_R, anguloEntradaRasante: BH_ARC_IN, anguloSaidaRasante: BH_ARC_OUT,
    alturaEntradaRasante: BH_H_IN, alturaSaidaRasante: BH_H_OUT,
  }),

  // ================= ATO IV — A REVELAÇÃO =================
  {
    // A FUGA: sai da curva olhando o monstro ENCOLHER — acento traseiro
    // declarado e curto. É o único adeus que o buraco negro ganha.
    // A curva sai RADIAL (C1 no azimute da rasante). glide parte e
    // chega parado — casa com a rasante e com a subida.
    ...lerApoiosDoPlano(apoiosDaViagem.estilingue),
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
  // Os holds de medição (perfil e face) e a travessia entre eles viram
  // roteiro: posição/mira/lente/inclinação EXATAS das rodadas 16–25, com
  // os marcos edge/face declarados nos próprios planos (ver CAPTURE_T).
  // A quietude curta segue: o quadro é a mensagem; na travessia o disco
  // de perfil ABRE em braços — o evento, não um arco mudo.
  ...lerSequencia(revelacao, {
    portaoPerfil: GATE_EDGE_POS, miraDoPortao: GATE_LOOK, portaoFace: GATE_FACE_POS,
    controleTravessia1: TRAV_C1, controleTravessia2: TRAV_C2,
  }, {
    lentePerfil: GATE_EDGE_FOV, lenteFace: GATE_FACE_FOV,
    inclinacaoPerfil: GATE_EDGE_ROLL, inclinacaoFace: GATE_FACE_ROLL,
  }),
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
export const APOIOS_DO_FILME = montarApoiosDoRoteiro(SHOTS, STARTS);

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

/** Marcos nomeados do roteiro; mantém o arredondamento dos juízes existentes. */
export const CAPTURE_T = {
  edge: Math.round(APOIOS_DO_FILME.instanteDeQA('edge')),
  face: Math.round(APOIOS_DO_FILME.instanteDeQA('face')),
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
    // Sem `fovEase`, a lente acompanha o mesmo `ke` da trajetória.
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
