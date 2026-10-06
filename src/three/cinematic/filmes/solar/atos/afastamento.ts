// O ATO IV DO FILME SOLAR — o escuro: a saída de Saturno para Urano, Urano
// deitado, Netuno e Tritão, Plutão e Caronte; depois o retrato de família,
// a 40 UA. Pontos e números nomeados de `roteiros/solar/afastamento.json`.
import * as THREE from 'three';
import { IAU_ORIENTATIONS } from '../../../../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../../../../lib/atlas/orientacao';
import { CORACAO_NA_TEXTURA, JD_E_SOLAR_TDB, pino } from '../pinos';
import {
  CIMA_DA_ECLIPTICA, SATURNO, TERRA, UA, ate, girar, naSuperficie, perpendicular, raioPc, rad, versor,
} from './geometria';

export const URANO = pino('uranus');
export const NETUNO = pino('neptune');
export const TRITAO = pino('triton');
export const PLUTAO = pino('pluto');
export const CARONTE = pino('charon');
const R_URANO = raioPc('uranus');
const R_TRITAO = raioPc('triton');
const R_PLUTAO = raioPc('pluto');

// ================= A SAÍDA DE SATURNO =================
// Do fim do postal a câmera dá a volta por fora de Saturno até o lado de
// Urano e para a 1 UA dele, na linha Saturno → Urano, olhando Urano. Visto
// do postal Urano está a 26° de Saturno, quase atrás do planeta: a volta
// (154° em torno de Saturno, já a dezenas de raios) tira Saturno e as
// luas do quadro, e é aí que o céu passa de JD2 a JD_E (`trocas`).
/** a que distância de Saturno a saída para, em UA */
export const D_SAIDA_DE_SATURNO_UA = 1;
const SAIDA_DE_SATURNO = SATURNO.clone().addScaledVector(ate(SATURNO, URANO), D_SAIDA_DE_SATURNO_UA * UA);

// ================= URANO (cena 20) =================
// Referencial de Urano em JD_E: P é o polo norte (IAU), E aponta o Sol no
// plano do equador, F = P × E. O Sol está a 70,4° de latitude: o polo
// norte quase de frente para ele. Quem chega de Saturno vem a 14° do polo
// (o planeta visto de cima, um alvo); o joelho fica PERTO DO EQUADOR, do
// lado do dia, onde o eixo de rotação fica a 75° da visada e, com o
// "cima" do filme na eclíptica, a 3° da horizontal do quadro: deitado. A
// câmera recua do joelho pela mesma direção, olhando Urano (a vista não
// gira, o planeta encolhe), e para a 30 raios; dali Netuno está a 43° de
// Urano, e a chegada a ele começa virando o olhar.
const POLO_DE_URANO = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.uranus, JD_E_SOLAR_TDB).polo);
const E_URANO = perpendicular(URANO.clone().negate(), POLO_DE_URANO);
const F_URANO = new THREE.Vector3().crossVectors(POLO_DE_URANO, E_URANO);
/** a direção, do centro de Urano, de azimute `az` (0° = Sol) e elevação `el` sobre o equador */
const deUrano = (az: number, el: number) => girar(E_URANO, F_URANO, az)
  .multiplyScalar(Math.cos(rad(el))).addScaledVector(POLO_DE_URANO, Math.sin(rad(el))).normalize();
/** o joelho da passagem: azimute e elevação (graus) e distância (raios); a saída, em raios */
export const RASPAO_DE_URANO = { az: -40, el: 15, raio: 6, saida: 30 };
const JOELHO_DE_URANO = deUrano(RASPAO_DE_URANO.az, RASPAO_DE_URANO.el);
const SAIDA_DE_URANO = URANO.clone().addScaledVector(JOELHO_DE_URANO, RASPAO_DE_URANO.saida * R_URANO);

// ================= NETUNO E TRITÃO (cena 21) =================
// A câmera vem de Urano (a 40° do Sol, visto de Netuno) direto a Tritão,
// que está a 36,4° do ponto subsolar de Netuno. No joelho Netuno fica AO
// LADO de Tritão: a direção do joelho é a de Netuno → Tritão girada de
// `aoLado` graus em torno do "cima" do filme (a eclíptica), para Netuno
// sair na horizontal do quadro, e para o lado em que Tritão cai à
// DIREITA e Netuno à esquerda, perto do centro e acima da legenda (que
// fica embaixo à esquerda: o fundo dela desfoca o que passa atrás, e
// texto branco sobre Tritão não se lê). Depois do joelho a câmera
// recua pela mesma direção e para a `saida` raios. O OLHAR não centra Tritão: fica numa direção FIXA,
// entre os dois, com Netuno a `netunoDoEixo` graus do eixo da vista —
// longe do eixo a lente retilínea estica o disco (a 29°, na versão
// centrada em Tritão, Netuno saía oval: 1/cos 29° = +14 %); ao recuar
// pela direção do joelho, Tritão fica no mesmo ponto do quadro e Netuno
// quase não anda.
export const RASPAO_DE_TRITAO = { aoLado: 31, raio: 3.5, saida: 40, netunoDoEixo: 15 };
const DE_NETUNO_A_TRITAO = ate(NETUNO, TRITAO);
const JOELHO_DE_TRITAO = (() => {
  const [a, b] = [1, -1].map((s) =>
    DE_NETUNO_A_TRITAO.clone().applyAxisAngle(CIMA_DA_ECLIPTICA, s * rad(RASPAO_DE_TRITAO.aoLado)));
  // olhando Tritão do joelho (frente = −a), a direita do quadro é frente × cima;
  // Netuno, na direção −DE_NETUNO_A_TRITAO, à esquerda
  const direita = new THREE.Vector3().crossVectors(a.clone().negate(), CIMA_DA_ECLIPTICA);
  return DE_NETUNO_A_TRITAO.dot(direita) > 0 ? a : b;
})();
/** a direção fixa do olhar na passagem: a de Netuno, vista do joelho,
 *  girada para Tritão até Netuno ficar a `netunoDoEixo` graus do eixo */
export const OLHAR_EM_TRITAO = (() => {
  const joelho = TRITAO.clone().addScaledVector(JOELHO_DE_TRITAO, RASPAO_DE_TRITAO.raio * R_TRITAO);
  const paraNetuno = ate(joelho, NETUNO);
  return girar(paraNetuno, perpendicular(ate(joelho, TRITAO), paraNetuno), RASPAO_DE_TRITAO.netunoDoEixo);
})();
/** o ponto que a mira segue: a 1 pc de Tritão nessa direção — de qualquer
 *  lugar do sistema de Netuno (menos de 1e-7 pc dali), a mesma direção */
const MIRA_EM_TRITAO = TRITAO.clone().add(OLHAR_EM_TRITAO);
/** onde a passagem por Tritão deixa a câmera, parada, olhando na direção
 *  `OLHAR_EM_TRITAO` (Tritão e Netuno no quadro): o ponto de partida do
 *  resto do ato (Plutão) */
export const SAIDA_DE_TRITAO = TRITAO.clone().addScaledVector(JOELHO_DE_TRITAO, RASPAO_DE_TRITAO.saida * R_TRITAO);

// ================= PLUTÃO E CARONTE (cena 22) =================
// Em JD_E, com N o polo norte de Plutão (IAU; o de Caronte é o mesmo, e a
// órbita de Caronte fica no equador), o Sol está a 59,8° de latitude e a
// 109,2° da direção de Caronte; o coração (`CORACAO_NA_TEXTURA`), a 17°
// de latitude e a 162,7° de Caronte, quase do lado oposto: de frente para
// ele, Caronte fica atrás de Plutão. A chegada vem da saída de Tritão (a
// 87,6° do coração, visto de Plutão) e PARA na direção do coração, a
// `coracao` raios, com o coração no centro do disco e Plutão à direita
// (`noQuadro`): a legenda longa da cena ocupa o terço esquerdo do quadro,
// de baixo até perto do meio, e o fundo dela desfoca o que passa atrás. De
// lá, a 5,5 raios, Caronte fica atrás de Plutão, rente ao limbo. Parada
// ali, a câmera mostra a luz de verdade (a curva `luz` do plano) e só
// depois faz o arco: por cima do polo norte de Plutão até perto de
// Caronte, no ponto `par` — latitude (sobre o equador comum) e azimute a
// partir da direção de Plutão (girando para N × essa direção), vistos de Caronte,
// em graus, e distância a Caronte em raios de Plutão. Dali Caronte, mais
// perto que Plutão, sai do tamanho dele, ao lado e abaixo, visto de 50°
// de latitude: o polo norte escuro (Mordor Macula), no verão de 2026,
// voltado para a câmera. Plutão, visto do lado de Caronte, está meio
// aceso (o lado dele que encara Caronte fica a 109° do Sol).
/** a visita a Plutão: a distância no coração (raios) e onde Plutão fica no
 *  quadro (fração de meio quadro); a lente no coração (graus, vertical);
 *  o fim do arco (latitude e azimute vistos de Caronte, em graus, e a
 *  distância a Caronte, em raios de Plutão) e quanto a mira, no fim, vai
 *  de Caronte a Plutão; e até onde o recuo do retrato leva a câmera,
 *  olhando o par, em raios */
export const VISITA_A_PLUTAO = {
  coracao: 5.5, noQuadro: { x: 0.33, y: 0.22 }, lente: 30,
  par: { lat: 50, az: 160, raio: 12, mira: 0.5 }, recuo: 3000,
} as const;
const POLO_DE_PLUTAO = new THREE.Vector3(...baseCorpoEquatorial(IAU_ORIENTATIONS.pluto, JD_E_SOLAR_TDB).polo);
/** de Caronte para Plutão, no equador comum, e o leste desse rumo */
const T_CARONTE = perpendicular(PLUTAO.clone().sub(CARONTE), POLO_DE_PLUTAO);
const L_CARONTE = new THREE.Vector3().crossVectors(POLO_DE_PLUTAO, T_CARONTE);
/** a direção, do centro de Plutão, do coração no mapa no céu JD_E */
export const DIRECAO_DO_CORACAO = naSuperficie(IAU_ORIENTATIONS.pluto, JD_E_SOLAR_TDB)(
  CORACAO_NA_TEXTURA.lat, CORACAO_NA_TEXTURA.lonLeste);
const NO_CORACAO = PLUTAO.clone().addScaledVector(DIRECAO_DO_CORACAO, VISITA_A_PLUTAO.coracao * R_PLUTAO);
/** o ponto que a mira segue na chegada e na luz: visto do coração
 *  (olhando Plutão), ao lado dele, para Plutão cair em `noQuadro` */
const MIRA_NO_CORACAO = (() => {
  const frente = DIRECAO_DO_CORACAO.clone().negate();
  const cima = perpendicular(CIMA_DA_ECLIPTICA, frente);
  const direita = new THREE.Vector3().crossVectors(frente, cima);
  const meiaAltura = Math.tan(rad(VISITA_A_PLUTAO.lente / 2));
  return PLUTAO.clone()
    .addScaledVector(direita, -VISITA_A_PLUTAO.noQuadro.x * meiaAltura * (16 / 9) * VISITA_A_PLUTAO.coracao * R_PLUTAO)
    .addScaledVector(cima, -VISITA_A_PLUTAO.noQuadro.y * meiaAltura * VISITA_A_PLUTAO.coracao * R_PLUTAO);
})();
/** onde o arco deixa a câmera: perto de Caronte, ao norte */
const NO_PAR = CARONTE.clone().addScaledVector(
  girar(T_CARONTE, L_CARONTE, VISITA_A_PLUTAO.par.az).multiplyScalar(Math.cos(rad(VISITA_A_PLUTAO.par.lat)))
    .addScaledVector(POLO_DE_PLUTAO, Math.sin(rad(VISITA_A_PLUTAO.par.lat))).normalize(),
  VISITA_A_PLUTAO.par.raio * R_PLUTAO);
/** a direção, do centro de Plutão, do fim do arco */
export const DIRECAO_DO_PAR = versor(NO_PAR.clone().sub(PLUTAO));
/** a mira no fim do arco: entre as direções de Caronte e de Plutão, à
 *  distância de Caronte (um ponto perto do par: no fim do arco a mira vira
 *  para ele sem perder Plutão de vista) */
const MIRA_NO_PAR = NO_PAR.clone().addScaledVector(
  ate(NO_PAR, CARONTE).lerp(ate(NO_PAR, PLUTAO), VISITA_A_PLUTAO.par.mira).normalize(),
  NO_PAR.distanceTo(CARONTE));

// ================= O RETRATO DE FAMÍLIA (cena 23) =================
// Do fim do arco a câmera recua de Plutão pela mesma direção (o par
// encolhe até virar ponto) e vira para o Sol; depois vai a 40 UA do Sol,
// onde a Voyager 1 estava ao fazer o retrato, e a lente fecha. Visto de
// Plutão a Terra está a 157° — quase atrás do Sol, a ~35 px dele na lente
// de 12° —, então o retrato não fica no rumo de Plutão: fica girado de
// `giro` graus em torno do polo da eclíptica, para o lado da Terra (o pino
// de JD_A dá o lado; a Terra de JD_E está a 9° dele), onde ela se afasta
// do clarão. A Terra, Vênus, Júpiter e Saturno são desenhados onde a
// efeméride os põe em JD_E (montar.test.ts confere a Terra no quadro).
/** o retrato: a distância ao Sol (UA) e o giro, em graus, do rumo de Plutão */
export const RETRATO = { distancia: 40, giro: 35 } as const;
const RECUO_DE_PLUTAO = PLUTAO.clone().addScaledVector(DIRECAO_DO_PAR, VISITA_A_PLUTAO.recuo * R_PLUTAO);
const FIM_DO_RETRATO = (() => {
  const [a, b] = [1, -1].map((s) => versor(PLUTAO).applyAxisAngle(CIMA_DA_ECLIPTICA, s * rad(RETRATO.giro)));
  return (a.angleTo(TERRA) < b.angleTo(TERRA) ? a : b).multiplyScalar(RETRATO.distancia * UA);
})();

/** os pontos nomeados do ato IV, em pc (os corpos de fora entram aqui) */
export const PONTOS_AFASTAMENTO: Readonly<Record<string, THREE.Vector3>> = {
  Urano: URANO, Netuno: NETUNO, Tritao: TRITAO, Plutao: PLUTAO, Caronte: CARONTE,
  saidaDeSaturno: SAIDA_DE_SATURNO,
  joelhoDeUrano: JOELHO_DE_URANO, saidaDeUrano: SAIDA_DE_URANO,
  joelhoDeTritao: JOELHO_DE_TRITAO, saidaDeTritao: SAIDA_DE_TRITAO, miraEmTritao: MIRA_EM_TRITAO,
  direcaoDoCoracao: DIRECAO_DO_CORACAO, noCoracao: NO_CORACAO, miraNoCoracao: MIRA_NO_CORACAO,
  direcaoDoPar: DIRECAO_DO_PAR, noPar: NO_PAR, miraNoPar: MIRA_NO_PAR,
  recuoDePlutao: RECUO_DE_PLUTAO, fimDoRetrato: FIM_DO_RETRATO,
};

/** os números nomeados do ato IV: distâncias em pc */
export const NUMEROS_AFASTAMENTO: Readonly<Record<string, number>> = {
  raspaoDeUrano: RASPAO_DE_URANO.raio * R_URANO, raspaoDeTritao: RASPAO_DE_TRITAO.raio * R_TRITAO,
  raioNoCoracao: VISITA_A_PLUTAO.coracao * R_PLUTAO, raioNoPar: NO_PAR.distanceTo(PLUTAO),
};
