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
import { distanciaExponencial, glide } from './movimentos';
import { lerSequencia, type Shot } from './lerSequencia';
import { montarApoiosDoRoteiro } from './apoiosDoRoteiro';
import { idiomaAtual } from '../../lib/idioma';
import abertura from './roteiros/abertura.json';
import cinturao from './roteiros/cinturao.json';
import orion from './roteiros/orion.json';
import mergulho from './roteiros/mergulho.json';
import revelacao from './roteiros/revelacao.json';
import volta from './roteiros/volta.json';

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
/** fração da curva do estilingue que pertence à FUGA (olhar para trás) */
const FUGA_ATE = 0.22;
const TRAV_C1 = new THREE.Vector3(-12000, 16800, 14000);
const TRAV_C2 = new THREE.Vector3(-26800, 2600, 22000);
const FINAL_POS = new THREE.Vector3(-11429, -7864, 29651);
const DERIVA_C1 = new THREE.Vector3(-21000, -11500, 21500);
const DERIVA_C2 = new THREE.Vector3(-14800, -9200, 26800);
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
const VOLTA_R0 = 2.6e-9; // 80.220 km (~12,6 raios terrestres), lado noite
/** o raio do ÚLTIMO QUADRO — 60.171 km, o fim do dolly zoom abaixo */
const VOLTA_R1 = 1.95e-9;
/**
 * O DOLLY ZOOM DO ARREMATE (item 108 v2, pedido do dono em 31/08: "no
 * finalzinho nao tem como fazer um jogo de lente em que o fundo se
 * aproxima mais e mais para a Lua aparecer um pouco maior... nao tem um
 * truque de lente que muda essa perspectiva?"). É o efeito Vertigo: nos
 * últimos segundos a câmera RECUA e a lente FECHA na razão que mantém
 * `d · tan(fov/2)` CONSTANTE. Nessa razão a Terra não muda de tamanho
 * nem de lugar no quadro — e tudo que está atrás dela cresce, porque a
 * lente encolhe o quadro 1,9× enquanto a Lua, seis vezes mais longe,
 * quase não recua em ângulo. A perspectiva muda; não é zoom.
 *
 * A ÂNCORA É DUPLA, e a segunda é de graça: a mira do retrato é um
 * PONTO EM MUNDO medido no raio FINAL (`MIRA_DO_POUSO`, abaixo), então
 * o desvio angular dela cresce com a aproximação pela MESMA lei
 * (`tanβ · R_fim / R`) com que o meio-quadro cresce — a razão entre os
 * dois é constante, e a Terra fica parada no lugar exato do quadro
 * durante todo o efeito, não só do mesmo tamanho.
 *
 * QUEM EXECUTA A LEI É O MOTOR, e por uma primitiva GENÉRICA: o plano
 * do dolly declara `"lente": {"tipo":"ancorada", "centro":"Terra",
 * "distancia":…, "angulo":…}` e o `lerPlanoDeCamera` devolve um fov que
 * é FUNÇÃO DA POSIÇÃO, não do relógio. Nada disso sabe que filme está
 * rodando: qualquer roteiro futuro pede "segure este alvo do tamanho
 * que ele tem a tantos parsecs". O primeiro desenho desta obra fazia o
 * efeito com keyframes de lente em GRAUS, e não fechava: graus
 * interpolam em reta e a lei é uma tangente, então a Terra respirava
 * 1,2% mesmo partindo o efeito em dois planos. Com a primitiva o
 * respiro é ZERO por construção — e o roteiro voltou a ser um plano só.
 */
const FORCA_DO_DOLLY = 1.9;
/** a lente do último quadro; a lei da lente ancorada sai dela */
const LENTE_DO_FIM = 20;
/** onde o arco pousa: o ponto MAIS PERTO do filme, antes do recuo */
const RAIO_DO_POUSO = VOLTA_R1 / FORCA_DO_DOLLY;
/** a lente que segura a Terra do mesmo tamanho a cada raio */
const lenteAncorada = (raio: number) => 2 * THREE.MathUtils.radToDeg(Math.atan(
  Math.tan(THREE.MathUtils.degToRad(LENTE_DO_FIM / 2)) * (VOLTA_R1 / raio)
));
/**
 * As duas pontas da volta, como DIREÇÕES Terra→câmera. A chegada fica
 * 22° fora do eixo anti-Sol, do lado da Lua (é de lá que o raspão
 * entrega).
 *
 * O POUSO mudou de âncora na v2 do retrato (item 108, conferência do
 * dono de 31/08: "a lua nao está fácil de entender que é a Lua...
 * aproximar mais ela e a terra"). Antes ele era medido a partir do EIXO
 * SOLAR (20° ao norte), e a Lua caía a 32,9° do centro da Terra — para
 * caber os dois, a lente tinha de abrir 52°, e nessa lente a Lua vale
 * 0,51° de disco: 9 px de altura numa janela de 900. Nenhum
 * enquadramento salva 9 px.
 *
 * Agora ele é medido a partir da LINHA ANTI-LUA (Terra→câmera oposta à
 * Lua), a linha em que a Lua se esconde exatamente ATRÁS da Terra. O
 * pouso se afasta dessa linha por `AFASTAMENTO_DA_LUA`, e é esse
 * afastamento que MANDA na separação Terra–Lua no quadro: a 18° a Lua
 * fica a 16,4° do centro da Terra (metade de antes), a lente fecha para
 * 34° e a Lua dobra de tamanho na tela. O azimute do afastamento
 * (`AZIMUTE_DO_AFASTAMENTO`, 0° = norte equatorial, 90° = para o Sol)
 * é o que resta de composição: ele decide de que lado a Lua aparece e,
 * de quebra, a latitude subterrestre — 45° põe a Lua na diagonal de
 * cima à direita, deixa o disco a 16,7° do subsolar (dia cheio, as
 * Américas acesas) e o centro do disco a 14°S, entre o subsolar de
 * janeiro (23°S) e o equador.
 */
const SOLWARD = ANTISSOL.clone().negate();
const NORTE_EQ = new THREE.Vector3(0, 0, 1);
const DIR_CHEGADA = ANTISSOL.clone()
  .multiplyScalar(Math.cos(THREE.MathUtils.degToRad(22)))
  .addScaledVector(LADO_DA_LUA, Math.sin(THREE.MathUtils.degToRad(22)))
  .normalize();
/** Terra→câmera na linha em que a Lua fica escondida atrás da Terra */
const LINHA_ANTI_LUA = RUMO_DA_LUA.clone().negate();
const AFASTAMENTO_DA_LUA = THREE.MathUtils.degToRad(14);
const AZIMUTE_DO_AFASTAMENTO = THREE.MathUtils.degToRad(45);
const NORTE_DA_LINHA = NORTE_EQ.clone()
  .addScaledVector(LINHA_ANTI_LUA, -NORTE_EQ.dot(LINHA_ANTI_LUA)).normalize();
const SOL_DA_LINHA = SOLWARD.clone()
  .addScaledVector(LINHA_ANTI_LUA, -SOLWARD.dot(LINHA_ANTI_LUA)).normalize();
const LADO_DO_POUSO = NORTE_DA_LINHA.clone()
  .multiplyScalar(Math.cos(AZIMUTE_DO_AFASTAMENTO))
  .addScaledVector(SOL_DA_LINHA, Math.sin(AZIMUTE_DO_AFASTAMENTO))
  .normalize();
const DIR_POUSO = LINHA_ANTI_LUA.clone()
  .multiplyScalar(Math.cos(AFASTAMENTO_DA_LUA))
  .addScaledVector(LADO_DO_POUSO, Math.sin(AFASTAMENTO_DA_LUA))
  .normalize();
/** as três estações da volta: onde o arco começa, onde ele pousa (o
 *  ponto mais perto do filme) e onde o recuo do dolly zoom termina —
 *  as duas últimas na mesma linha Terra→câmera. */
const INICIO_DA_VOLTA = TERRA_PC.clone().addScaledVector(DIR_CHEGADA, VOLTA_R0);
const POUSO = TERRA_PC.clone().addScaledVector(DIR_POUSO, RAIO_DO_POUSO);
const FIM_DO_DOLLY = TERRA_PC.clone().addScaledVector(DIR_POUSO, VOLTA_R1);
/**
 * A MIRA DO POUSO — o RETRATO DE FAMÍLIA (item 108). O arremate não
 * mira o centro da Terra: escorrega `DESLOCAMENTO_DO_RETRATO` NA
 * DIREÇÃO EM QUE A LUA APARECE, medido no raio do pouso. A Terra cai
 * para o canto de baixo à esquerda e a Lua sobe para dentro do quadro;
 * o eixo do deslocamento não é mais o norte da tela (v1), e sim o
 * próprio eixo Terra→Lua projetado no plano da tela — assim a
 * composição segue a Lua se o azimute do pouso mudar, em vez de
 * depender de os dois terem sido escolhidos para casar.
 *
 * A mira é um PONTO EM MUNDO, então o desvio angular cresce com a
 * aproximação (0,03° na entrada de casa, 0,3° no raspão, 6,5° no pouso,
 * 3,4° no último quadro): de longe o take continua olhando a Terra, e o
 * retrato só se compõe quando há retrato.
 *
 * O DESLOCAMENTO É MEDIDO NO RAIO FINAL, e não no do pouso — é o que
 * faz a Terra ficar PARADA durante o dolly zoom. O desvio angular vale
 * `atan(tanβ · R_fim / R)` e o meio-quadro vale `tan(f_fim/2) · R_fim /
 * R`: as duas encolhem pelo MESMO fator quando a câmera recua, então a
 * razão entre elas — que é onde a Terra assenta no quadro — não muda.
 */
const DESLOCAMENTO_DO_RETRATO = THREE.MathUtils.degToRad(3.4);
const EIXO_DO_RETRATO = (() => {
  const paraTerra = TERRA_PC.clone().sub(FIM_DO_DOLLY).normalize();
  const paraLua = LUA_PC.clone().sub(FIM_DO_DOLLY).normalize();
  return paraLua.addScaledVector(paraTerra, -paraLua.dot(paraTerra)).normalize();
})();
export const MIRA_DO_POUSO = TERRA_PC.clone()
  .addScaledVector(EIXO_DO_RETRATO, VOLTA_R1 * Math.tan(DESLOCAMENTO_DO_RETRATO));
/**
 * O ROLL QUE PÕE OS POLOS PARA CIMA (pedido do dono): o rig olha o
 * mundo com o up do POLO GALÁCTICO (cameraRig.galacticUp), e no último
 * quadro o dono quer a Terra "no sentido dos polos" — o norte DELA para
 * cima. O ângulo abaixo gira a tela do up galáctico ao up equatorial,
 * medido ao redor do eixo de visada do pouso; o rig aplica roll com
 * rotateZ, que gira ao redor de câmera→trás (−olhar), e o sinal aqui
 * segue essa convenção. O eixo é a visada REAL do último quadro (a
 * mira do retrato, não o centro da Terra), senão o deslocamento do
 * retrato entortaria os polos que ele existe para preservar.
 * voltaParaCasa.test.ts reconstrói a câmera do rig e cobra o
 * alinhamento em graus.
 */
const ROLL_DOS_POLOS = (() => {
  const olhar = MIRA_DO_POUSO.clone().sub(FIM_DO_DOLLY).normalize();
  const upGal = EZ.clone().addScaledVector(olhar, -EZ.dot(olhar)).normalize();
  const upTerra = NORTE_EQ.clone().addScaledVector(olhar, -NORTE_EQ.dot(olhar)).normalize();
  const eixoDoRoll = olhar.clone().negate();
  return Math.atan2(
    new THREE.Vector3().crossVectors(upGal, upTerra).dot(eixoDoRoll),
    upGal.dot(upTerra)
  );
})();
/** 40° fora do eixo Lua→Terra, no flanco solar: crescente no quadro
 *  com a Terra ainda visível. O olhar do take puxa um pouco para a Lua
 *  no joelho para os dois caberem na lente. */
const EIXO_LUA_TERRA = TERRA_PC.clone().sub(LUA_PC).normalize();
const U_RASPAO_MIN = EIXO_LUA_TERRA.clone()
  .multiplyScalar(-Math.cos(THREE.MathUtils.degToRad(40)))
  .addScaledVector(FLANCO_ANTISSOL.clone().negate(), Math.sin(THREE.MathUtils.degToRad(40)))
  .normalize();
const JOELHO_DO_RASPAO = 0.62;
/** duração do take Lua→Terra e do raspão dentro dele, em segundos. O
 *  take encolheu de 12 s para 9 s quando o dolly zoom levou os últimos
 *  3 s da coda (item 108 v2); o raspão continua com os MESMOS 4,8 s de
 *  relógio absoluto de sempre, e é daí que sai a fração abaixo. */
const DUR_DO_TAKE = 9;
const DUR_DO_RASPAO = 4.8;
/** fração do take único dedicada ao fly-by da Lua. */
export const K_LUA_NO_TAKE = DUR_DO_RASPAO / DUR_DO_TAKE;
/** no joelho, o olhar é o meio-ângulo Lua–Terra. O ponto de mira mora
 *  a ~1e-8 pc da câmera (a escala Lua–Terra) — NUNCA a 1 pc. O rig
 *  amortece a mira em 0,4 s; um alvo a 1 pc nunca alcançava a Terra
 *  no play contínuo, e a órbita das Américas acontecia fora de quadro. */
const ALCANCE_DA_MIRA_PC = 8e-9;

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
  // Fuga, subida, holds, travessia e deriva vêm de uma sequência só. O
  // roteiro recebe as âncoras calculadas; não copia ciência nem quadros
  // de medição para o JSON.
  ...lerSequencia(revelacao, {
    saidaDoRasante: BH_EXIT,
    controleEstilingue1: SLING_C1, controleEstilingue2: SLING_C2,
    centro: GAL.GC_POS, portaoPerfil: GATE_EDGE_POS, miraDoPortao: GATE_LOOK,
    portaoFace: GATE_FACE_POS,
    controleTravessia1: TRAV_C1, controleTravessia2: TRAV_C2,
    controleDeriva1: DERIVA_C1, controleDeriva2: DERIVA_C2,
    fimDaDeriva: FINAL_POS, miraDaDeriva: FINAL_LOOK,
  }, {
    fimDaFuga: FUGA_ATE,
    lentePerfil: GATE_EDGE_FOV, lenteFace: GATE_FACE_FOV,
    inclinacaoPerfil: GATE_EDGE_ROLL, inclinacaoFace: GATE_FACE_ROLL,
  }),

  // ============ CODA — A VOLTA PARA CASA (pedido do dono, 19/08) ============
  ...lerSequencia(volta, {
    Terra: TERRA_PC, Lua: LUA_PC, fimDaDeriva: FINAL_POS,
    miraDoPouso: MIRA_DO_POUSO,
    entradaDeCasa: ENTRADA_DE_CASA, direcaoDoRaspao: U_RASPAO_MIN,
    inicioDaVolta: INICIO_DA_VOLTA,
    direcaoDaChegada: DIR_CHEGADA, direcaoDoPouso: DIR_POUSO,
    pouso: POUSO, fimDoDolly: FIM_DO_DOLLY,
  }, {
    distanciaDoRaspao: RASPAO_DA_LUA, joelhoDoRaspao: JOELHO_DO_RASPAO,
    fracaoDaLua: K_LUA_NO_TAKE, duracaoDoTake: DUR_DO_TAKE,
    raioInicialDaVolta: VOLTA_R0, raioDoPouso: RAIO_DO_POUSO,
    raioFinalDaVolta: VOLTA_R1,
    alcanceDaMira: ALCANCE_DA_MIRA_PC, inclinacaoDosPolos: ROLL_DOS_POLOS,
    lenteDoFim: LENTE_DO_FIM,
    // a lente com que o TAKE entrega o filme ao dolly sai da mesma lei
    // da lente ancorada, no raio do pouso: digitá-la à mão faria a
    // emenda saltar no dia em que qualquer um dos dois raios mudasse
    lenteDoPouso: lenteAncorada(RAIO_DO_POUSO),
  }),
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

/**
 * OS INSTANTES DA CODA QUE OS JUÍZES PRECISAM, derivados da lista de
 * shots e não copiados dela. A coda tem QUATRO planos desde o dolly
 * zoom (item 108 v2): aproximação, take Lua→Terra, o recuo e a parada
 * final — e é por isso que o take é o terceiro de trás para a frente. Antes disso `voltaParaCasa.test.ts` escrevia `duration - 12`
 * à mão, e a conta envelheceu no primeiro plano que entrou.
 */
const I_DO_TAKE = SHOTS.length - 3;
/** quando o take Lua→Terra começa */
export const T_DO_TAKE = STARTS[I_DO_TAKE];
/** quando o raspão entrega o voo ao arco da volta */
export const T_DA_VOLTA = T_DO_TAKE + K_LUA_NO_TAKE * SHOTS[I_DO_TAKE].dur;
/** quando o arco pousa e o dolly zoom começa a recuar */
export const T_DO_DOLLY = STARTS[I_DO_TAKE + 1];

// legendas achatadas em janelas absolutas [t0, t0+dur)
const CAPTION_WINDOWS = SHOTS.flatMap((s, i) =>
  (s.captions ?? []).map((c) => ({
    t0: STARTS[i] + c.at * s.dur,
    t1: STARTS[i] + c.at * s.dur + (c.dur ?? 8.6),
    shotIndex: i,
    shotEnd: STARTS[i] + s.dur,
    text: c.text,
    sub: c.sub,
    en: c.en,
    bridge: c.bridge ?? false,
  }))
).sort((a, b) => a.t0 - b.t0);

/**
 * O TEXTO DA LEGENDA NA LÍNGUA VIVA (item 130/F3). O RITMO NÃO PASSA
 * POR AQUI: entrada (`t0`), janela (`t1`) e passe pelo corte (`bridge`)
 * saem do roteiro em segundos e não olham o texto — trocar de língua no
 * meio do filme troca a frase e não move um quadro. Quem não tem `en`
 * fica em português na tela inglesa, de propósito.
 *
 * Consultado A CADA quadro (o Director compara o que está no ar com o
 * que deveria estar), e é por isso que a troca de idioma aparece no
 * quadro seguinte sem ninguém avisar o filme.
 */
function legendaNaLingua(w: (typeof CAPTION_WINDOWS)[number]): { text: string; sub?: string } {
  return w.en && idiomaAtual() === 'en' ? w.en : { text: w.text, sub: w.sub };
}

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
 * A porta `?jd=` manda no ATLAS (reaplicada ao entrar, `aplicarPortaJd`)
 * e NUNCA cala este relógio dentro do filme — conserto do item 108
 * (30/08): a guarda que a checava no tick foi removida com censo.
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
    // Lente ANCORADA (o dolly zoom) manda sobre o par de graus: ela é
    // função da posição, não do relógio. Sem `fovEase`, a lente
    // interpolada acompanha o mesmo `ke` da trajetória.
    const fov = s.fovDe
      ? s.fovDe(pos)
      : THREE.MathUtils.lerp(s.fov0, s.fov1, s.fovEase ? s.fovEase(k) : ke);

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
        const fala = legendaNaLingua(w);
        return { index: i, key: { caption: fala.text, sub: fala.sub } };
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
      text: legendaNaLingua(w).text,
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
