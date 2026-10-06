// O ATO III DO FILME SOLAR — Saturno, os anéis, Encélado, Titã, Jápeto e
// Hipérion. Pontos e números nomeados de `roteiros/solar/saturno.json`.
import * as THREE from 'three';
import { IAU_ORIENTATIONS } from '../../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../../lib/atlas/orientacao';
import { JD2_SOLAR_TDB } from '../pinos';
import {
  ENCELADO, HIPERION, JAPETO, JUPITER, R_ENCELADO, R_HIPERION, R_JAPETO, R_SATURNO, R_TITA, SATURNO, SOL, TITA,
  ate, girar, naSuperficie, perpendicular, rad, versor,
} from './geometria';

// ================= ATO III — SATURNO =================
// Referencial dos anéis: E aponta o Sol no plano do anel, P é o polo;
// a face acesa dos anéis é a SUL (o Sol está 3,6° abaixo do plano).
const POLO_DE_SATURNO = new THREE.Vector3(
  ...baseCorpoEquatorial(IAU_ORIENTATIONS.saturn, JD2_SOLAR_TDB).polo
);
const E_SATURNO = perpendicular(ate(SATURNO, SOL), POLO_DE_SATURNO);
const F_SATURNO = new THREE.Vector3().crossVectors(POLO_DE_SATURNO, E_SATURNO);
/** ponto em raios de Saturno: raio no plano, azimute (0° = Sol), altura */
const emSaturno = (raio: number, azGraus: number, altura: number) => SATURNO.clone()
  .addScaledVector(girar(E_SATURNO, F_SATURNO, azGraus), raio * R_SATURNO)
  .addScaledVector(POLO_DE_SATURNO, altura * R_SATURNO);
/** o mesmo, por distância, azimute e elevação (negativa = face sul, acesa) */
const vistaDeSaturno = (d: number, azGraus: number, elevGraus: number) =>
  emSaturno(d * Math.cos(rad(elevGraus)), azGraus, d * Math.sin(rad(elevGraus)));
const azimute = (p: THREE.Vector3) => {
  const v = p.clone().sub(SATURNO);
  return THREE.MathUtils.radToDeg(Math.atan2(v.dot(F_SATURNO), v.dot(E_SATURNO)));
};
const AZ_CHEGADA = azimute(JUPITER);
const AZ_ENCELADO = azimute(ENCELADO);
/** o sentido em que o rasante gira: do lado de Júpiter para o de Encélado */
const GIRO = Math.sign(((AZ_ENCELADO - AZ_CHEGADA + 540) % 360) - 180);
const az = (graus: number) => AZ_CHEGADA + GIRO * graus;
/** o raio do anel desenhado (até o F), em raios de Saturno */
export const RAIO_DOS_ANEIS = 2.326;
/** o cruzamento declarado do plano: na divisão de Cassini (1,95–2,03) */
export const RAIO_DO_CRUZAMENTO = 1.99;
const CHEGADA_A_SATURNO = emSaturno(14, az(0), -14 * Math.sin(rad(2)));
const SOBRE_O_ANEL_A = emSaturno(2.25, az(60), -0.04);
const RASANTE = emSaturno(2.1, az(68), -0.025);
const CRUZAMENTO = emSaturno(RAIO_DO_CRUZAMENTO, az(76), 0);
const ALEM_DO_CRUZAMENTO = emSaturno(2.02, az(84), 0.04);
const SUBIDA = emSaturno(2.8, az(100), 0.6);
/** Encélado pelo lado do DIA: a câmera vem da subida (Encélado a ~60° de
 *  fase), cruza a linha do Sol e no joelho o vê a 30° de fase, 12° ao sul
 *  do equador (o polo sul e os jatos no limbo, acesos de lado); depois do
 *  joelho segue girando para o lado da noite (fase 115°) */
const SOL_EM_ENCELADO = ate(ENCELADO, SOL);
const LADO_DA_SUBIDA = perpendicular(ate(ENCELADO, SUBIDA), SOL_EM_ENCELADO);
/** a direção a `fase` graus do Sol, do lado oposto ao da subida, `sul` graus abaixo do equador */
const naNoiteDeEncelado = (fase: number, sul: number) => versor(
  girar(SOL_EM_ENCELADO, LADO_DA_SUBIDA, -fase).addScaledVector(POLO_DE_SATURNO, -Math.tan(rad(sul)))
);
const JOELHO_DE_ENCELADO = naNoiteDeEncelado(30, 12);
const DEPOIS_DE_ENCELADO = ENCELADO.clone().addScaledVector(naNoiteDeEncelado(115, 10), 14 * R_ENCELADO);
/** o acento traseiro: recuando até a fase 165° e só até 25 raios (a 40 a
 *  lua saía com ~16 px de raio), o crescente com as plumas em contraluz,
 *  ~26 px de raio, e o Sol a ~15° dele, no quadro (a foto da Cassini) */
const SAIDA_DE_ENCELADO = ENCELADO.clone().addScaledVector(naNoiteDeEncelado(165, 6), 25 * R_ENCELADO);
/** TITÃ (cena 17). Em JD2 Titã está a 165,2° do ponto subsolar de
 *  Saturno — atrás do planeta para quem vem do Sol, mas fora da sombra
 *  (a 14,8° do eixo dela, que a 19,7 raios tem 2,9° de meia-abertura).
 *  Visto de Titã, o Sol fica a ~5° da saída de Encélado: a câmera que
 *  vem do planeta chega pelo lado do dia, com o Sol às costas. No joelho
 *  a fase é `fase`, girada para o lado de Jápeto (para onde ela sai) */
const RASPAO_DE_TITA = { fase: 30, raio: 2.6, saida: 40 };
const SOL_EM_TITA = ate(TITA, SOL);
const JOELHO_DE_TITA = girar(SOL_EM_TITA, perpendicular(ate(TITA, JAPETO), SOL_EM_TITA), RASPAO_DE_TITA.fase);
const SAIDA_DE_TITA = TITA.clone().addScaledVector(ate(TITA, JAPETO), RASPAO_DE_TITA.saida * R_TITA);
/** JÁPETO (cena 18). Em JD2 o Sol está sobre 9,2°S, 244,7°L do mapa —
 *  no meio da face escura (Cassini Regio, que no mapa do motor vai de
 *  127°L a 18°L passando por 250°L, entre ~45°S e ~55°N): a face clara
 *  acesa são as calotas e a borda leste. A crista do relevo desenhado
 *  (rochoso.ts, RELEVO_DA_LUA: até 20 km) corre no equador de 332°L a
 *  136°L, quase toda do lado da noite (o terminador a cruza em 334,7°L):
 *  não há como mostrá-la acesa neste céu. O joelho fica sobre 45°S,
 *  255°L, a fase 37°: a face escura acesa em cima e a calota clara do
 *  sul embaixo, com a fronteira entre elas (~67°S) no meio do disco */
const RASPAO_DE_JAPETO = { lat: -45, lon: 255, raio: 2.2, saida: 40 };
const JOELHO_DE_JAPETO = versor(
  naSuperficie(IAU_ORIENTATIONS.iapetus, JD2_SOLAR_TDB)(RASPAO_DE_JAPETO.lat, RASPAO_DE_JAPETO.lon)
);
const SAIDA_DE_JAPETO = JAPETO.clone().addScaledVector(ate(JAPETO, HIPERION), RASPAO_DE_JAPETO.saida * R_JAPETO);
/** o cartão-postal: pela face acesa (sul), do lado do Sol em que Hipérion
 *  está, perto do Sol (fase 35–60°): o anel aberto 22–24° à câmera, a
 *  sombra do planeta no anel ao lado do globo, sem engolir o anel */
const LADO_DO_POSTAL = Math.sign(azimute(HIPERION)) || 1;
const POSTAL_1 = vistaDeSaturno(10, LADO_DO_POSTAL * 35, -22);
export const POSTAL_2 = vistaDeSaturno(10.5, LADO_DO_POSTAL * 60, -24);
/** Hipérion de passagem pelo lado do Sol (fase 45°, acesa). O joelho fica
 *  no meio entre o lado de onde a câmera vem (a saída de Jápeto, 91° de
 *  fase) e o lado para onde ela vai (o postal, 160°), girando em torno
 *  da direção do Sol: a câmera vira 80° até o joelho e 127° depois dele.
 *  Girado para o lado da saída de Encélado (a entrada antiga), a virada
 *  da chegada era de 135° e na gravação a lua sumia do quadro no chicote */
const SOL_EM_HIPERION = ate(HIPERION, SOL);
const JOELHO_DE_HIPERION = girar(SOL_EM_HIPERION, versor(
  perpendicular(ate(HIPERION, SAIDA_DE_JAPETO), SOL_EM_HIPERION)
    .add(perpendicular(ate(HIPERION, POSTAL_1), SOL_EM_HIPERION))
), 45);

/** os pontos nomeados do ato III, em pc */
export const PONTOS_SATURNO: Readonly<Record<string, THREE.Vector3>> = {
  chegadaASaturno: CHEGADA_A_SATURNO, sobreOAnelA: SOBRE_O_ANEL_A, rasante: RASANTE,
  cruzamento: CRUZAMENTO, alemDoCruzamento: ALEM_DO_CRUZAMENTO, subida: SUBIDA,
  joelhoDeEncelado: JOELHO_DE_ENCELADO, depoisDeEncelado: DEPOIS_DE_ENCELADO,
  saidaDeEncelado: SAIDA_DE_ENCELADO, joelhoDeTita: JOELHO_DE_TITA, saidaDeTita: SAIDA_DE_TITA,
  joelhoDeJapeto: JOELHO_DE_JAPETO, saidaDeJapeto: SAIDA_DE_JAPETO,
  joelhoDeHiperion: JOELHO_DE_HIPERION,
  postal1: POSTAL_1, postal2: POSTAL_2,
  postalDe: ate(SATURNO, POSTAL_1), postalPara: ate(SATURNO, POSTAL_2),
};

/** os números nomeados do ato III: distâncias em pc */
export const NUMEROS_SATURNO: Readonly<Record<string, number>> = {
  raspaoDeEncelado: 3.5 * R_ENCELADO, raspaoDeTita: RASPAO_DE_TITA.raio * R_TITA,
  raspaoDeJapeto: RASPAO_DE_JAPETO.raio * R_JAPETO, raspaoDeHiperion: 3 * R_HIPERION,
  raioDoPostalDe: POSTAL_1.distanceTo(SATURNO), raioDoPostalPara: POSTAL_2.distanceTo(SATURNO),
};
