// O ATO II DO FILME SOLAR — Júpiter, Io, Europa e o quase-sol. Pontos e números nomeados de
// `roteiros/solar/jupiter.json`.
import * as THREE from 'three';
import { IAU_ORIENTATIONS } from '../../../../../lib/atlas/iauOrientation';
import { GRM_NA_TEXTURA, JD_J_SOLAR_TDB, pino } from '../pinos';
import {
  CIMA_DA_ECLIPTICA, IO, JUPITER, R_IO, R_JUPITER, SATURNO, SOL, ate, girar, naSuperficie, perpendicular,
  raioPc,
} from './geometria';

// ================= ATO II — JÚPITER =================
// O céu de JD_J no mapa de Júpiter (longitude leste, Sistema III do
// motor): o ponto subsolar a 282,6°, quem chega de Ceres a 313,1° e
// 3,8°S, a Grande Mancha Vermelha a 312,1° e 20,3°S (36° do ponto
// subsolar: de tarde, acesa), Io a 342,7° e 5,9 raios, Europa a 279,4°
// e 9,3 raios (quase na linha do Sol).
//
// A CHEGADA (cena 10): a travessia de Ceres desliza 6° até o meridiano
// da Mancha, 10° ao norte dela, e pousa a 2,95 raios — o disco enche 65 %
// da altura do quadro (lente de 58°), a Mancha fica 10° abaixo do ponto
// sob a câmera (um pouco abaixo do centro do quadro) e as bandas correm
// deitadas (o polo de Júpiter está a 2° do cima do filme). É UMA curva
// cortada em dois planos: o nome de Júpiter só vale no primeiro, quando
// ele ainda é pequeno.
const noMapaDeJupiter = naSuperficie(IAU_ORIENTATIONS.jupiter, JD_J_SOLAR_TDB);
/** a direção da Grande Mancha Vermelha, do centro de Júpiter, onde a textura a desenha (JD_J) */
export const A_MANCHA = noMapaDeJupiter(GRM_NA_TEXTURA.lat, GRM_NA_TEXTURA.lonLeste);
const CHEGADA = { norte: 10, raio: 2.95 };
const FIM_DA_CHEGADA = JUPITER.clone().addScaledVector(
  noMapaDeJupiter(GRM_NA_TEXTURA.lat + CHEGADA.norte, GRM_NA_TEXTURA.lonLeste), CHEGADA.raio * R_JUPITER
);

// IO (cena 11). Vistos de Io, o Sol e Júpiter estão a 120° (Io a 60° do
// ponto subsolar). O joelho fica do lado do Sol, `alem` graus depois dele
// (girando para longe de Júpiter) e `norte` graus acima do plano
// Sol–Io–Júpiter: Io acesa (fase ~27°) e Júpiter a ~54° do centro dela —
// inteiro, ao lado, no alto do quadro (a câmera olha de cima do plano em
// que os dois estão). A mira é um ponto colado em Io, do lado de Júpiter,
// que no joelho cai a meio caminho angular entre os dois (triângulo
// isósceles). Europa está, vista de Io, entre o Sol e Júpiter (a 42° do
// Sol): a saída volta para ela, e o olhar cede Io ao rumo.
const RASPAO_DE_IO = { alem: 10, norte: 25, raio: 2.6, saida: 1.5 };
const EUROPA = pino('europa');
const SOL_EM_IO = ate(IO, SOL);
const LONGE_DE_JUPITER = perpendicular(ate(JUPITER, IO), SOL_EM_IO);
const NORTE_EM_IO = (() => {
  const n = new THREE.Vector3().crossVectors(SOL_EM_IO, LONGE_DE_JUPITER);
  return n.dot(CIMA_DA_ECLIPTICA) > 0 ? n : n.negate();
})();
const JOELHO_DE_IO = girar(
  girar(SOL_EM_IO, LONGE_DE_JUPITER, RASPAO_DE_IO.alem), NORTE_EM_IO, RASPAO_DE_IO.norte
);
const MIRA_DE_IO = IO.clone().addScaledVector(ate(IO, JUPITER), RASPAO_DE_IO.raio * R_IO);
/**
 * ONDE O RASPÃO DE IO ACABA (para quem escreve Europa e o arco do
 * quase-sol): a 1,5 raio de Júpiter de Io, na reta de Io a Europa, com a
 * câmera parada (o ritmo `glide`) e o olhar em Europa, o Sol a 42° dela,
 * na beira do quadro. Daqui Europa está a 7,0 raios de Júpiter, uma lasca
 * contra o Sol (138° de fase): para vê-la acesa, a câmera tem de passar
 * para o lado do Sol dela — é onde o raspão de Europa começa.
 */
export const SAIDA_DE_IO = IO.clone().addScaledVector(ate(IO, EUROPA), RASPAO_DE_IO.saida * R_JUPITER);
/** o rumo da saída de Io: o versor de `SAIDA_DE_IO` a Europa (o mesmo de Io a Europa) */
export const RUMO_DA_SAIDA_DE_IO = ate(SAIDA_DE_IO, EUROPA);

// O FIM DO ATO se mede de Júpiter: o Sol (`SOL_EM_JUPITER`) e o lado de
// Saturno perpendicular a ele (`LADO_DE_SATURNO`). Saturno está a 48,4°
// do Sol, desse lado; Io (a 60°) e a Mancha (a 31° de longitude) também.
const SOL_EM_JUPITER = ate(JUPITER, SOL);
const LADO_DE_SATURNO = perpendicular(ate(JUPITER, SATURNO), SOL_EM_JUPITER);
/** a direção, de Júpiter, a `graus` do Sol girando para o lado de Saturno */
const emJupiter = (graus: number) => girar(SOL_EM_JUPITER, LADO_DE_SATURNO, graus);

// O QUASE-SOL (cena 13). O Sol está tão longe que, visto daqui, o ângulo
// entre ele e Júpiter é 180° menos a fase de Júpiter: os dois só cabem
// no quadro de 16:9 com Júpiter perto de meio aceso. O arco anda em volta
// de Júpiter pelo lado de Saturno, de `de` graus do Sol (fase 25°: o lado
// do dia, as bandas, a Mancha a 20° do ponto sob a câmera) a `para`
// (fase 106°, 36 % aceso), abrindo de `raioDe` a `raioPara` raios, e o
// olhar cede de Júpiter a `MIRA_DO_QUASE_SOL`: o rumo, visto do fim do
// arco, a `peso` do caminho do Sol a Júpiter (o Sol a 41° da visada,
// Júpiter a 33°, o disco inteiro) e `baixo` graus abaixo dele — os dois
// na metade de cima do quadro, acima da legenda. O ponto fica a `alcance`
// vezes a distância a Júpiter: perto, para que o olhar acompanhe Júpiter
// enquanto a câmera gira e o Sol entre pela beira. No fim do arco a
// câmera para; dali Júpiter está a 122° de Saturno, e a virada do olhar
// para Saturno passa pelo Sol e deixa Júpiter às costas da chegada a
// Saturno (que parte de `FIM_DO_ARCO`).
const QUASE_SOL = { de: 25, para: 106, raioDe: 3.8, raioPara: 6.2, peso: 0.55, baixo: 9, alcance: 1.2 };
const INICIO_DO_ARCO = JUPITER.clone().addScaledVector(emJupiter(QUASE_SOL.de), QUASE_SOL.raioDe * R_JUPITER);
const FIM_DO_ARCO = JUPITER.clone().addScaledVector(emJupiter(QUASE_SOL.para), QUASE_SOL.raioPara * R_JUPITER);
const MIRA_DO_QUASE_SOL = (() => {
  const sol = ate(FIM_DO_ARCO, SOL);
  const jupiter = ate(FIM_DO_ARCO, JUPITER);
  const entre = girar(sol, perpendicular(jupiter, sol), QUASE_SOL.peso * THREE.MathUtils.radToDeg(sol.angleTo(jupiter)));
  const rumo = girar(entre, perpendicular(CIMA_DA_ECLIPTICA.clone().negate(), entre), QUASE_SOL.baixo);
  return FIM_DO_ARCO.clone().addScaledVector(rumo, QUASE_SOL.alcance * FIM_DO_ARCO.distanceTo(JUPITER));
})();

// EUROPA (cena 12). Europa está quase na reta de Júpiter ao Sol (3,3° do
// ponto subsolar), a 9,3 raios: vista do lado do Sol, está acesa, com o
// lado do dia de Júpiter atrás. A câmera sai de `SAIDA_DE_IO` (de onde
// Europa é uma lasca), contorna Europa pelo lado de Saturno e passa o
// joelho do lado do Sol, `alem` graus girados para Saturno (a fase dela
// no joelho, 36°), a `raio` raios dela: Europa enche 36° do quadro e
// Júpiter fica a 39° do centro dela, inteiro, ao lado. A mira é um ponto
// colado em Europa, `mira` raios para o lado de Júpiter e `abaixo` raios
// para o sul: os dois sobem para a metade de cima do quadro, sem que
// Europa encoste na tarja de cima nem a legenda (embaixo, à esquerda) a
// cubra. A saída desce para o lado do dia de Júpiter e pousa no começo
// do arco do quase-sol, olhando Júpiter. O raspão é UMA curva cortada em
// dois planos na mesma velocidade: o nome de Europa só vale no primeiro,
// enquanto ela tem menos de 4°.
const R_EUROPA = raioPc('europa');
const RASPAO_DE_EUROPA = { alem: 36, raio: 3.2, mira: 1.0, abaixo: 0.5 };
const SOL_EM_EUROPA = ate(EUROPA, SOL);
const JOELHO_DE_EUROPA = girar(SOL_EM_EUROPA, perpendicular(LADO_DE_SATURNO, SOL_EM_EUROPA), RASPAO_DE_EUROPA.alem);
const MIRA_DE_EUROPA = EUROPA.clone().addScaledVector(ate(EUROPA, JUPITER), RASPAO_DE_EUROPA.mira * R_EUROPA)
  .addScaledVector(perpendicular(CIMA_DA_ECLIPTICA.clone().negate(), SOL_EM_EUROPA), RASPAO_DE_EUROPA.abaixo * R_EUROPA);

/** os pontos nomeados do ato II, em pc */
export const PONTOS_JUPITER: Readonly<Record<string, THREE.Vector3>> = {
  aMancha: A_MANCHA, fimDaChegadaAJupiter: FIM_DA_CHEGADA,
  joelhoDeIo: JOELHO_DE_IO, miraDeIo: MIRA_DE_IO, saidaDeIo: SAIDA_DE_IO,
  rumoDaSaidaDeIo: RUMO_DA_SAIDA_DE_IO, Europa: EUROPA,
  joelhoDeEuropa: JOELHO_DE_EUROPA, miraDeEuropa: MIRA_DE_EUROPA,
  inicioDoArco: INICIO_DO_ARCO, fimDoArco: FIM_DO_ARCO, miraDoQuaseSol: MIRA_DO_QUASE_SOL,
  arcoDe: emJupiter(QUASE_SOL.de), arcoPara: emJupiter(QUASE_SOL.para),
};

/** os números nomeados do ato II: distâncias em pc */
export const NUMEROS_JUPITER: Readonly<Record<string, number>> = {
  raspaoDeIo: RASPAO_DE_IO.raio * R_IO,
  raspaoDeEuropa: RASPAO_DE_EUROPA.raio * R_EUROPA,
  raioDoArcoDe: QUASE_SOL.raioDe * R_JUPITER, raioDoArcoPara: QUASE_SOL.raioPara * R_JUPITER,
};
