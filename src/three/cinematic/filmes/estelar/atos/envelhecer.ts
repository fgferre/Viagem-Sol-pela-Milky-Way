// O ATO 4 DO FILME ESTELAR — ALDEBARAN E SÍRIUS: a velhice e o que sobra.
// Aldebaran, a gigante laranja que inchou, e Sírius B, a anã branca do
// tamanho da Terra. Pontos e números nomeados de `roteiros/estelar/envelhecer.json`.
//
// A JUNTA DE SAÍDA: o ato termina parado em `saidaDeSirius`, mirando
// Próxima, com a lente em 40° (`juntas.ts`).
import * as THREE from 'three';
import { estrelaVisitavelPorNome, posicaoDaCompanheira } from '../../../../../lib/atlas/estrelasVisitaveis';
import { JD_DO_FILME_TDB } from '../../../journey';
import { CIMA_DA_ECLIPTICA, R_SOL, UA, ate, girar, perpendicular, versor } from '../../solar/atos/geometria';
import { ESTRELAS_DO_FILME } from '../estrelas';

const ALDEBARAN = ESTRELAS_DO_FILME.Aldebaran;
const SIRIUS = ESTRELAS_DO_FILME.Sirius;
/** a direção horizontal (no chão do filme) a 90° de `d`, para o lado de `rumo` */
const deLado = (d: THREE.Vector3, rumo: THREE.Vector3) => {
  const lado = versor(new THREE.Vector3().crossVectors(perpendicular(CIMA_DA_ECLIPTICA, d), d));
  return lado.dot(rumo) >= 0 ? lado : lado.negate();
};

// ================= D1, D2 e D3 — ALDEBARAN =================
// Aldebaran está na reta Híades→Sírius (0,7°) e a 5,8° do Sol, visto dela.
// A câmera chega por TRÁS (do lado das Híades), contorna no chão do filme
// de 20° de um lado a 25° do outro do eixo, fechando de 2,2 para 1,45 UA —
// o disco de 45 raios do Sol ocupa de um terço a quase metade da altura —,
// e no fim vira para Sírius: o Sol está 6° ao lado no mesmo quadro. Dali
// ela sai em reta no rumo de Sírius, passando a ~3 raios do limbo.
const PARA_SIRIUS = ate(ALDEBARAN, SIRIUS);
const ATRAS_DE_ALDEBARAN = PARA_SIRIUS.clone().negate();
const LADO_DE_ALDEBARAN = deLado(ATRAS_DE_ALDEBARAN, new THREE.Vector3(0, 0, 1));
const ARCO_DE_ALDEBARAN = { de: -20, para: 25, raioDe: 2.2 * UA, raioPara: 1.45 * UA };
const CHEGADA_EM_ALDEBARAN = girar(ATRAS_DE_ALDEBARAN, LADO_DE_ALDEBARAN, ARCO_DE_ALDEBARAN.de);
const FIM_DO_ARCO_DE_ALDEBARAN_DIRECAO = girar(ATRAS_DE_ALDEBARAN, LADO_DE_ALDEBARAN, ARCO_DE_ALDEBARAN.para);
const FIM_DO_ARCO_DE_ALDEBARAN = ALDEBARAN.clone()
  .addScaledVector(FIM_DO_ARCO_DE_ALDEBARAN_DIRECAO, ARCO_DE_ALDEBARAN.raioPara);
/** quanto a reta de saída anda no rumo de Sírius: passa o limbo e deixa Aldebaran atrás */
const RETA_DE_SAIDA = 5.5 * UA;

// ================= D3, D4 e D5 — SÍRIUS B =================
// Sírius B onde o app a desenha: a órbita de Bond 2017 na data do filme (o
// relógio não anda neste ato), a 30 UA de Sírius A. A câmera chega perto da
// anã branca — 0,0081 raio do Sol, o tamanho da Terra — e a contorna até
// Sírius A ficar ao fundo, a 18° dela no quadro: a brasa pequena na frente,
// a estrela grande e brilhante atrás. Depois se afasta, virando para
// Próxima, até a junta.
const sirius = estrelaVisitavelPorNome('Sirius');
if (!sirius?.companheira) throw new Error('filme estelar: Sirius sem companheira');
const dSirius = SIRIUS.length();
const SIRIUS_B = SIRIUS.clone().add(new THREE.Vector3(...posicaoDaCompanheira(
  JD_DO_FILME_TDB, sirius.companheira.orbita,
  [SIRIUS.x / dSirius, SIRIUS.y / dSirius, SIRIUS.z / dSirius], dSirius
)));
export const RAIO_DE_SIRIUS_B = sirius.companheira.raioRsol.v * R_SOL;
/** o lado de B oposto a A: dali A fica exatamente atrás dela */
const ATRAS_DE_B = ate(SIRIUS, SIRIUS_B);
const LADO_DE_B = deLado(ATRAS_DE_B, PARA_SIRIUS.clone().negate());
const ARCO_DE_B = { de: 60, para: 18, raioDe: 40 * RAIO_DE_SIRIUS_B, raioPara: 10 * RAIO_DE_SIRIUS_B };
const FIM_DO_ARCO_DE_B_DIRECAO = girar(ATRAS_DE_B, LADO_DE_B, ARCO_DE_B.para);
const CHEGADA_EM_B_DIRECAO = girar(ATRAS_DE_B, LADO_DE_B, ARCO_DE_B.de);

/** os pontos nomeados do Ato 4, em pc */
export const PONTOS_ENVELHECER: Readonly<Record<string, THREE.Vector3>> = {
  chegadaEmAldebaran: ALDEBARAN.clone().addScaledVector(CHEGADA_EM_ALDEBARAN, ARCO_DE_ALDEBARAN.raioDe),
  chegadaEmAldebaranDirecao: CHEGADA_EM_ALDEBARAN,
  fimDoArcoDeAldebaranDirecao: FIM_DO_ARCO_DE_ALDEBARAN_DIRECAO,
  fimDoArcoDeAldebaran: FIM_DO_ARCO_DE_ALDEBARAN,
  alemDeAldebaran: FIM_DO_ARCO_DE_ALDEBARAN.clone().addScaledVector(PARA_SIRIUS, RETA_DE_SAIDA),
  siriusB: SIRIUS_B,
  chegadaEmB: SIRIUS_B.clone().addScaledVector(CHEGADA_EM_B_DIRECAO, ARCO_DE_B.raioDe),
  chegadaEmBDirecao: CHEGADA_EM_B_DIRECAO,
  fimDoArcoDeBDirecao: FIM_DO_ARCO_DE_B_DIRECAO,
  fimDoArcoDeB: SIRIUS_B.clone().addScaledVector(FIM_DO_ARCO_DE_B_DIRECAO, ARCO_DE_B.raioPara),
};

/** os números nomeados do Ato 4: distâncias em pc */
export const NUMEROS_ENVELHECER: Readonly<Record<string, number>> = {
  raioDoArcoDeAldebaranDe: ARCO_DE_ALDEBARAN.raioDe,
  raioDoArcoDeAldebaranPara: ARCO_DE_ALDEBARAN.raioPara,
  raioDoArcoDeBDe: ARCO_DE_B.raioDe,
  raioDoArcoDeBPara: ARCO_DE_B.raioPara,
};
