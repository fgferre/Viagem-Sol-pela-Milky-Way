// O ATO I DO FILME SOLAR — os mundos de pedra: Terra, Lua, Marte, Ceres,
// Mercúrio e Vênus. Pontos e números nomeados de `roteiros/solar/casa.json`.
import * as THREE from 'three';
import { AU_PARA_PC } from '../../../../../lib/atlas/frameGalactico';
import { IAU_ORIENTATIONS } from '../../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../../lib/atlas/orientacao';
import { JD_A_SOLAR_TDB } from '../pinos';
import {
  CERES, CIMA_DA_ECLIPTICA, JUPITER, LUA, MARTE, MERCURIO, R_CERES, R_LUA, R_MARTE, R_MERCURIO, R_TERRA,
  R_VENUS, SOL, TERRA, VENUS, ate, girar, perpendicular, rad, versor,
} from './geometria';

// ================= ATO I — OS MUNDOS DE PEDRA =================
// A ordem na tela é Mercúrio → Vênus → Terra → Lua; a ordem AQUI é
// Terra → Mercúrio → Vênus porque o corte de Vênus para a Terra deriva
// do meio do caminho da chegada à Terra.
//
// A Terra e a Lua. O plano Sol–Terra–Lua: 0° é o lado do Sol, 90° é a
// Lua (no quarto minguante de JD_A). O voo baixo anda do dia para o
// terminador do lado OPOSTO à Lua; a subida volta por cima do lado do
// dia (a Terra cheia encolhendo) e gira até o lado da Lua, sempre
// olhando a Terra.
const SOL_NA_TERRA = versor(SOL.clone().sub(TERRA));
const LADO_DA_LUA = perpendicular(ate(TERRA, LUA), SOL_NA_TERRA);
const naTerra = (graus: number) => girar(SOL_NA_TERRA, LADO_DA_LUA, graus);
const noChao = (graus: number) => TERRA.clone().addScaledVector(naTerra(graus), R_TERRA);
const VOO = { de: 10, para: -45, raioDe: 1.45 * R_TERRA, raioPara: 1.35 * R_TERRA };
/** o olhar do voo: o chão 42° adiante, logo aquém do horizonte (42–46°) —
 *  44° abaixo do rumo, a frente; no fim o terminador (−90°) está no horizonte */
const ADIANTE = 42;
const FIM_DO_VOO = TERRA.clone().addScaledVector(naTerra(VOO.para), VOO.raioPara);
/**
 * O MEIO DO CAMINHO: onde a chegada à Terra começa, logo depois do corte
 * de Vênus (ver FIM_EM_VENUS), a esta distância da Terra, 5° para o lado
 * da Lua — fora da linha Sol–Terra para o giro do olhar do Sol à Terra
 * ter um plano (na linha os dois ficam opostos e o giro não tem lado).
 * A distância é a da chegada aprovada no prólogo de 05/10, quando a
 * partida do Sol ainda vinha direto para cá.
 */
const CHEGADA = { graus: 5, distancia: 0.267 * AU_PARA_PC };
const MEIO_DO_CAMINHO = TERRA.clone().addScaledVector(naTerra(CHEGADA.graus), CHEGADA.distancia);
/** a subida: um arco pelo lado do dia, de −45° a +45°, de 1,35 a 8 raios
 *  (com a Lua no quarto, a 90°, os +100° de antes passavam do terminador
 *  e a Terra encolhia como um crescente) */
const SUBIDA_DA_TERRA = { para: 45, raio: 8 * R_TERRA };
/** onde a subida pousa e a saída para a Lua começa */
const FIM_DA_SUBIDA = TERRA.clone().addScaledVector(naTerra(SUBIDA_DA_TERRA.para), SUBIDA_DA_TERRA.raio);
// A LUA — A TERRA VISTA DA LUA (cena 7). T aponta a Terra; S, o Sol (no
// quarto de JD_A, a 90° de T: a Terra meia-acesa); NORTE é o norte da
// eclíptica (o cima do filme). O voo corre no meio-plano que contém T,
// inclinado 55° de S para o norte — pelo lado aceso —, e `naLua` conta
// os graus a partir de T. A 1,4 raio o horizonte da Lua fica 44° abaixo
// do plano local: a Terra só fica BAIXA sobre ele com a câmera além da
// borda do disco (visto da Terra). No joelho, a 130° de T, o horizonte na
// direção da Terra é o chão a ~86° de T — onde a Terra está ~4° acima do
// horizonte local —, aceso com o Sol a ~35°. Dali a câmera sobe (130° →
// 165°, 1,4 → 4 raios) e a Terra fica de 4° a 9° acima da borda, atrás
// dela: o olhar volta para a Terra (o acento declarado, a foto da Apollo 8)
// e depois entrega o rumo de Marte, que em JD_A está a 1° do Sol.
const TERRA_NA_LUA = ate(LUA, TERRA);
const SOL_NA_LUA = perpendicular(ate(LUA, SOL), TERRA_NA_LUA);
const NORTE_NA_LUA = (() => {
  const n = new THREE.Vector3().crossVectors(TERRA_NA_LUA, SOL_NA_LUA);
  return n.dot(CIMA_DA_ECLIPTICA) > 0 ? n : n.negate();
})();
const VOO_NA_LUA = { norte: 55, de: 25, raioDe: 6, joelho: 130, raio: 1.4, para: 165, raioPara: 4, abaixo: 6 };
const naLua = (graus: number) =>
  girar(TERRA_NA_LUA, girar(SOL_NA_LUA, NORTE_NA_LUA, VOO_NA_LUA.norte), graus);
/** onde a saída da Terra pousa e o raspão começa: a 6 raios, 25° do lado de quem vem da Terra */
const INICIO_DO_RASPAO_DA_LUA = LUA.clone().addScaledVector(naLua(VOO_NA_LUA.de), VOO_NA_LUA.raioDe * R_LUA);
const JOELHO_DA_LUA = naLua(VOO_NA_LUA.joelho);
const NO_JOELHO_DA_LUA = LUA.clone().addScaledVector(JOELHO_DA_LUA, VOO_NA_LUA.raio * R_LUA);
const FIM_DO_RASPAO_DA_LUA = LUA.clone().addScaledVector(naLua(VOO_NA_LUA.para), VOO_NA_LUA.raioPara * R_LUA);
/** a mira do Nascer da Terra: 6° abaixo da Terra, para o horizonte, vista
 *  do joelho — a Terra no terço de cima do quadro, o chão aceso embaixo */
const MIRA_DA_TERRA = (() => {
  const visada = ate(NO_JOELHO_DA_LUA, TERRA);
  const paraALua = perpendicular(ate(NO_JOELHO_DA_LUA, LUA), visada);
  return NO_JOELHO_DA_LUA.clone().addScaledVector(
    girar(visada, paraALua, VOO_NA_LUA.abaixo), NO_JOELHO_DA_LUA.distanceTo(TERRA)
  );
})();
/**
 * O ROLAMENTO DO NASCER DA TERRA: o cima do filme é o polo da eclíptica e
 * o voo corre 55° ao norte do Sol; para o horizonte ficar NIVELADO sob a
 * Terra, a câmera rola até o seu cima apontar o zênite local, medido no
 * joelho. Sinal do `camera.rotateZ` do rig: o cima novo é
 * cima·cos r − direita·sin r, com direita = visada × cima.
 */
const ROLAMENTO_DA_LUA = (() => {
  const visada = ate(NO_JOELHO_DA_LUA, MIRA_DA_TERRA);
  const cima = perpendicular(CIMA_DA_ECLIPTICA, visada);
  const direita = new THREE.Vector3().crossVectors(visada, cima);
  const zenite = perpendicular(JOELHO_DA_LUA, visada);
  return Math.atan2(-zenite.dot(direita), zenite.dot(cima));
})();
/** O CORTE DA LUA PARA MARTE: Marte está a 1° do Sol (conjunção em 09/01) e
 *  a reta passaria pelo Sol; a Lua acaba olhando Marte e a chegada começa
 *  pela MESMA direção, 0,15 UA antes dele, do lado do Sol (Marte cheio) */
const OLHAR_DO_CORTE_DE_MARTE = ate(FIM_DO_RASPAO_DA_LUA, MARTE);
const CORTE_DE_MARTE = MARTE.clone().addScaledVector(OLHAR_DO_CORTE_DE_MARTE, -0.15 * AU_PARA_PC);

// MARTE (cena 8). O mapa segue o meridiano IAU (leste positivo). Em JD_A o
// ponto subsolar está a 10°S, 14°L e o Valles Marineris (14°S, 301°L) a
// 73° a oeste dele, de manhã, com o Sol a ~19°: a luz de lado mostra o
// canion. O raspão desce do lado do Sol pelo paralelo do canion, para o
// oeste, e o olhar segura o chão do canion adiante.
const BASE_DE_MARTE = baseCorpoEquatorial(IAU_ORIENTATIONS.mars, JD_A_SOLAR_TDB);
const POLO_DE_MARTE = new THREE.Vector3(...BASE_DE_MARTE.polo);
const MERIDIANO_DE_MARTE = new THREE.Vector3(...BASE_DE_MARTE.nodoQ).multiplyScalar(Math.cos(rad(BASE_DE_MARTE.wDeg)))
  .addScaledVector(new THREE.Vector3(...BASE_DE_MARTE.lesteDeQ), Math.sin(rad(BASE_DE_MARTE.wDeg)));
const LESTE_DE_MARTE = new THREE.Vector3().crossVectors(POLO_DE_MARTE, MERIDIANO_DE_MARTE);
/** a direção, do centro de Marte, da latitude e longitude (leste) dadas */
const emMarte = (lat: number, lonLeste: number) => MERIDIANO_DE_MARTE.clone()
  .multiplyScalar(Math.cos(rad(lat)) * Math.cos(rad(lonLeste)))
  .addScaledVector(LESTE_DE_MARTE, Math.cos(rad(lat)) * Math.sin(rad(lonLeste)))
  .addScaledVector(POLO_DE_MARTE, Math.sin(rad(lat)));
const RASPAO_DE_MARTE = { lat: -13.9, canion: 300.8, inicio: 10, raioDoInicio: 6, joelho: 4, raio: 1.35, saida: 20 };
const SOL_EM_MARTE = ate(MARTE, SOL);
const VALLES_MARINERIS = emMarte(RASPAO_DE_MARTE.lat, RASPAO_DE_MARTE.canion);
/** onde a chegada pousa e o raspão começa: Marte cheio, a 6 raios, 10° do subsolar para o canion */
const INICIO_DO_RASPAO_DE_MARTE = MARTE.clone().addScaledVector(
  girar(SOL_EM_MARTE, perpendicular(VALLES_MARINERIS, SOL_EM_MARTE), RASPAO_DE_MARTE.inicio),
  RASPAO_DE_MARTE.raioDoInicio * R_MARTE
);
/** o joelho: o mesmo paralelo, 18° a leste do canion (o olhar o segura adiante) */
const JOELHO_DE_MARTE = emMarte(RASPAO_DE_MARTE.lat, RASPAO_DE_MARTE.canion + RASPAO_DE_MARTE.joelho);
const CHAO_DE_MARTE = MARTE.clone().addScaledVector(VALLES_MARINERIS, R_MARTE);
/** o raspão entrega o voo na direção de Ceres */
const SAIDA_DE_MARTE = MARTE.clone().addScaledVector(ate(MARTE, CERES), RASPAO_DE_MARTE.saida * R_MARTE);

// CERES (cena 9): a chegada vem de Marte (Ceres a 24° de fase: giboso), a
// passagem a 2,5 raios dobra o rumo para Júpiter (93° adiante) pelo lado
// do Sol, e o cinturão em volta é vazio.
const DE_MARTE_EM_CERES = ate(CERES, SAIDA_DE_MARTE);
const RUMO_DE_JUPITER_EM_CERES = ate(CERES, JUPITER);
const CHEGADA_A_CERES = CERES.clone().addScaledVector(DE_MARTE_EM_CERES, 8 * R_CERES);
const JOELHO_DE_CERES = versor(DE_MARTE_EM_CERES.clone().add(RUMO_DE_JUPITER_EM_CERES));
const SAIDA_DE_CERES = CERES.clone().addScaledVector(RUMO_DE_JUPITER_EM_CERES, 40 * R_CERES);

// Mercúrio e Vênus. Em JD_A os dois estão do OUTRO lado do Sol em
// relação à Terra (Mercúrio a 158°, Vênus a 177°: a quatro dias da
// conjunção superior), então quem vem do Sol os encontra acesos de
// frente. De Vênus à Terra a linha reta passa a 4,7 raios do Sol: ali
// a travessia vira CORTE (ver FIM_EM_VENUS).
//
// Mercúrio: S aponta o Sol, N é o norte da eclíptica (o cima do filme)
// tirado de S, e o lado de Vênus fecha o trio. O raspão desce pelo
// lado do dia até 1,35 raio a 35°N, 4° aquém do terminador, onde o Sol
// está a ~3° do horizonte. Olhando o meridiano para o norte (o polo do
// próprio hemisfério), o horizonte entra NIVELADO sem rolar a câmera: o
// cima é o norte, o zênite local está no mesmo meridiano e o olhar fica
// perpendicular ao polo (no hemisfério sul, olhar para o norte e para
// baixo aponta a ~17° do polo, e o rig troca o cima pelo de visada
// "de face": o horizonte tomba). A luz vem de lado (o Sol a oeste, no
// horizonte), as sombras se alongam, e o terminador corre ao lado, a
// leste, até o limbo.
const SOL_EM_MERCURIO = ate(MERCURIO, SOL);
const RUMO_DE_VENUS = ate(MERCURIO, VENUS);
const NORTE_EM_MERCURIO = perpendicular(CIMA_DA_ECLIPTICA, SOL_EM_MERCURIO);
const LADO_DE_VENUS = (() => {
  const w = new THREE.Vector3().crossVectors(NORTE_EM_MERCURIO, SOL_EM_MERCURIO);
  return w.dot(RUMO_DE_VENUS) > 0 ? w : w.negate();
})();
/** a direção, do centro de Mercúrio, a `graus` do Sol para o lado de
 *  Vênus e a `norte` graus de latitude (eclíptica) */
const emMercurio = (graus: number, norte = 0) => versor(
  girar(SOL_EM_MERCURIO, LADO_DE_VENUS, graus).multiplyScalar(Math.cos(rad(norte)))
    .addScaledVector(NORTE_EM_MERCURIO, Math.sin(rad(norte)))
);
/**
 * O MEIO DO CAMINHO DE MERCÚRIO: onde a partida do Sol entrega à chegada,
 * 5° fora da linha Sol–Mercúrio (o giro do olhar do Sol a Mercúrio tem
 * de ter um plano), do lado de Vênus. A distância é a que iguala a
 * velocidade da partida (`quadratic`, 9 s) à da chegada (`settle`, 6 s)
 * na junta — conferida em montar.test.ts.
 */
const CHEGADA_A_MERCURIO = { graus: 5, distancia: 0.0905 * AU_PARA_PC };
const MEIO_DE_MERCURIO = MERCURIO.clone()
  .addScaledVector(emMercurio(CHEGADA_A_MERCURIO.graus), CHEGADA_A_MERCURIO.distancia);
const RASPAO_DE_MERCURIO = { inicio: 10, raioDoInicio: 6, joelho: 86, norte: 35, raio: 1.35, chao: 19, saida: 20 };
/** onde a chegada pousa e o raspão começa: Mercúrio cheio, a 6 raios */
const INICIO_DO_RASPAO_DE_MERCURIO = MERCURIO.clone().addScaledVector(
  emMercurio(RASPAO_DE_MERCURIO.inicio), RASPAO_DE_MERCURIO.raioDoInicio * R_MERCURIO
);
const JOELHO_DE_MERCURIO = emMercurio(RASPAO_DE_MERCURIO.joelho, RASPAO_DE_MERCURIO.norte);
/** o chão que o olhar segura no joelho: o mesmo meridiano, 19° ao norte
 *  (o olhar ~55° abaixo do horizonte local, o limbo no terço de cima) */
const CHAO_DE_MERCURIO = MERCURIO.clone().addScaledVector(
  emMercurio(RASPAO_DE_MERCURIO.joelho, RASPAO_DE_MERCURIO.norte + RASPAO_DE_MERCURIO.chao), R_MERCURIO
);
/** o raspão entrega o voo na direção de Vênus */
const SAIDA_DE_MERCURIO = MERCURIO.clone().addScaledVector(RUMO_DE_VENUS, RASPAO_DE_MERCURIO.saida * R_MERCURIO);

// Vênus: o plano do Sol e de quem chega de Mercúrio (a 31° do Sol, vista
// de Vênus: ela chega quase cheia). A travessia pousa a 7 raios, a 40°
// do Sol; a passagem varre o lado do dia, desce a 2,4 raios a 18° e
// acaba a 3 raios do lado do Sol, onde o corte a recolhe.
const SOL_EM_VENUS = ate(VENUS, SOL);
const LADO_DE_MERCURIO = perpendicular(ate(VENUS, SAIDA_DE_MERCURIO), SOL_EM_VENUS);
const PASSAGEM_POR_VENUS = { chegada: 40, raioDaChegada: 7, joelho: 18, raio: 2.4, raioDoFim: 3 };
const CHEGADA_A_VENUS = VENUS.clone().addScaledVector(
  girar(SOL_EM_VENUS, LADO_DE_MERCURIO, PASSAGEM_POR_VENUS.chegada),
  PASSAGEM_POR_VENUS.raioDaChegada * R_VENUS
);
const JOELHO_DE_VENUS = girar(SOL_EM_VENUS, LADO_DE_MERCURIO, PASSAGEM_POR_VENUS.joelho);
/**
 * O CORTE DE VÊNUS PARA A TERRA. A travessia contínua passaria a 4,7
 * raios do Sol a quase 1 UA/s — um clarão de dois quadros. Então a
 * passagem acaba olhando Vênus pela MESMA direção com que a chegada à
 * Terra começa olhando o Sol (do meio do caminho): no corte o olhar não
 * gira (a mola da junta do rig não tem o que absorver), a lente é a
 * mesma, e o disco branco de Vênus dá lugar ao Sol no mesmo ponto do
 * quadro. A câmera fica do lado do Sol, com Vênus a ~3° de fase: cheia.
 */
const OLHAR_DO_CORTE = ate(MEIO_DO_CAMINHO, SOL);
const FIM_EM_VENUS = VENUS.clone().addScaledVector(OLHAR_DO_CORTE, -PASSAGEM_POR_VENUS.raioDoFim * R_VENUS);

/** os pontos nomeados do ato I, em pc */
export const PONTOS_CASA: Readonly<Record<string, THREE.Vector3>> = {
  meioDeMercurio: MEIO_DE_MERCURIO, inicioDoRaspaoDeMercurio: INICIO_DO_RASPAO_DE_MERCURIO,
  joelhoDeMercurio: JOELHO_DE_MERCURIO, chaoDeMercurio: CHAO_DE_MERCURIO,
  saidaDeMercurio: SAIDA_DE_MERCURIO,
  chegadaAVenus: CHEGADA_A_VENUS, joelhoDeVenus: JOELHO_DE_VENUS, fimEmVenus: FIM_EM_VENUS,
  meioDoCaminho: MEIO_DO_CAMINHO,
  inicioDoVoo: TERRA.clone().addScaledVector(naTerra(VOO.de), VOO.raioDe),
  vooDe: naTerra(VOO.de), vooPara: naTerra(VOO.para),
  adianteNoInicio: noChao(VOO.de - ADIANTE), adianteNoFim: noChao(VOO.para - ADIANTE),
  fimDoVoo: FIM_DO_VOO,
  subidaDe: naTerra(VOO.para), subidaPara: naTerra(SUBIDA_DA_TERRA.para),
  fimDaSubida: FIM_DA_SUBIDA, inicioDoRaspaoDaLua: INICIO_DO_RASPAO_DA_LUA,
  joelhoDaLua: JOELHO_DA_LUA, fimDoRaspaoDaLua: FIM_DO_RASPAO_DA_LUA, miraDaTerra: MIRA_DA_TERRA,
  corteDeMarte: CORTE_DE_MARTE, inicioDoRaspaoDeMarte: INICIO_DO_RASPAO_DE_MARTE,
  joelhoDeMarte: JOELHO_DE_MARTE, chaoDeMarte: CHAO_DE_MARTE, saidaDeMarte: SAIDA_DE_MARTE,
  chegadaACeres: CHEGADA_A_CERES, joelhoDeCeres: JOELHO_DE_CERES, saidaDeCeres: SAIDA_DE_CERES,
};

/** os números nomeados do ato I: distâncias em pc; o rolamento em radianos */
export const NUMEROS_CASA: Readonly<Record<string, number>> = {
  raspaoDeMercurio: RASPAO_DE_MERCURIO.raio * R_MERCURIO,
  raspaoDeVenus: PASSAGEM_POR_VENUS.raio * R_VENUS,
  raioDoVooDe: VOO.raioDe, raioDoVooPara: VOO.raioPara,
  raioDaSubidaDe: VOO.raioPara, raioDaSubidaPara: SUBIDA_DA_TERRA.raio,
  raspaoDaLua: VOO_NA_LUA.raio * R_LUA, rolamentoDaLua: ROLAMENTO_DA_LUA,
  raspaoDeMarte: RASPAO_DE_MARTE.raio * R_MARTE, raspaoDeCeres: 2.5 * R_CERES,
};
