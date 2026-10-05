// O ATO II DO FILME SOLAR — Júpiter e Io. Pontos e números nomeados de
// `roteiros/solar/jupiter.json`.
import * as THREE from 'three';
import { IO, JUPITER, R_IO, R_JUPITER, SATURNO, SOL, ate, girar, perpendicular, versor } from './geometria';

// ================= ATO II — JÚPITER =================
// O plano da órbita: W é o lado do Sol perpendicular ao rumo de Saturno;
// o Sol está a 42°, Saturno a 90° e Io, no céu de JD2, a 151° (110° do
// ponto subsolar: acesa). A chegada vem pelo lado do dia (100°); o
// raspão passa por FORA de Io com Júpiter inteiro ao lado dela; a saída
// sobe a 142° (fase 100°: Júpiter meia-lua, o Sol no quadro ao lado), e
// o arco desce pelo lado do dia até 57° (fase 15°: giboso, as bandas),
// de onde o rumo de Saturno está a 33°: Saturno fica ~147° atrás de
// Júpiter, e o fim do arco vira o olhar para ele antes da travessia.
const RUMO_DE_SATURNO = ate(JUPITER, SATURNO);
const W_JUPITER = perpendicular(ate(JUPITER, SOL), RUMO_DE_SATURNO);
const emJupiter = (graus: number) => girar(W_JUPITER, RUMO_DE_SATURNO, graus);
const ARCO = { de: 142, para: 57, raioDe: 10 * R_JUPITER, raioPara: 3.5 * R_JUPITER };
const CHEGADA_A_JUPITER = JUPITER.clone().addScaledVector(emJupiter(100), 12 * R_JUPITER);
const INICIO_DO_ARCO = JUPITER.clone().addScaledVector(emJupiter(ARCO.de), ARCO.raioDe);
const FIM_DO_ARCO = JUPITER.clone().addScaledVector(emJupiter(ARCO.para), ARCO.raioPara);
/** Io acesa com Júpiter INTEIRO ao lado: no joelho a câmera vê Io a 60° de
 *  fase, do lado de fora da órbita (no plano Sol–Io–Júpiter), e Júpiter
 *  a ~50° do centro de Io — fora do disco dela */
const SOL_EM_IO = ate(IO, SOL);
const JOELHO_DE_IO = girar(SOL_EM_IO, perpendicular(ate(JUPITER, IO), SOL_EM_IO), 60);
/** a mira do raspão: um ponto colado em Io, do lado de Júpiter, que no
 *  joelho cai a meio caminho angular entre os dois (triângulo isósceles) */
const MIRA_DE_IO = IO.clone().addScaledVector(ate(IO, JUPITER), 2.6 * R_IO);
/** a mira do começo do arco: a meio caminho entre Júpiter e o Sol, vistos
 *  de lá — os dois no quadro; ponto distante, quase uma direção */
const ENTRE_O_SOL_E_JUPITER = INICIO_DO_ARCO.clone().addScaledVector(
  versor(ate(INICIO_DO_ARCO, SOL).add(ate(INICIO_DO_ARCO, JUPITER))), 1000 * R_JUPITER
);

/** os pontos nomeados do ato II, em pc */
export const PONTOS_JUPITER: Readonly<Record<string, THREE.Vector3>> = {
  chegadaAJupiter: CHEGADA_A_JUPITER, joelhoDeIo: JOELHO_DE_IO, miraDeIo: MIRA_DE_IO,
  inicioDoArco: INICIO_DO_ARCO, fimDoArco: FIM_DO_ARCO,
  arcoDe: emJupiter(ARCO.de), arcoPara: emJupiter(ARCO.para),
  entreOSolEJupiter: ENTRE_O_SOL_E_JUPITER,
};

/** os números nomeados do ato II: distâncias em pc */
export const NUMEROS_JUPITER: Readonly<Record<string, number>> = {
  raspaoDeIo: 2.6 * R_IO,
  raioDoArcoDe: ARCO.raioDe, raioDoArcoPara: ARCO.raioPara,
};
