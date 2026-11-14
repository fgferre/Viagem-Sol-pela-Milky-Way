// O ATO 3 DO FILME ESTELAR — PLÊIADES E HÍADES: duas idades do mesmo jeito
// de nascer. As Plêiades (112 milhões de anos) ainda andam juntas; as Híades
// (625 milhões) já se afrouxam, e Aldebaran, a laranja à frente delas, não é
// do grupo. Pontos e números nomeados de `roteiros/estelar/crescer.json`.
//
// A JUNTA DE ENTRADA: o Ato 2 entrega a câmera parada em `saidaDeOrion`,
// mirando as Plêiades (`juntas.ts`). Daí em diante a câmera viaja olhando
// para onde vai: cada travessia mira o destino, que nasce ponto e cresce.
import * as THREE from 'three';
import { LUGARES_DA_BUSCA } from '../../../../world/lugaresDoCeu';
import { CIMA_DA_ECLIPTICA, ate, girar, perpendicular, versor } from '../../solar/atos/geometria';
import { PONTOS_DAS_JUNTAS } from './juntas';

const lugar = (id: string) => {
  const l = LUGARES_DA_BUSCA.find((x) => x.id === id);
  if (!l) throw new Error(`filme estelar: sem o lugar “${id}”`);
  return new THREE.Vector3(l.x, l.y, l.z);
};
const PLEIADES = lugar('pleiades');
const HIADES = lugar('hyades');

// ================= C1 e C2 — POR DENTRO DAS PLÊIADES =================
// A câmera chega de Órion na reta da junta e ATRAVESSA o aglomerado: em reta
// pelo miolo, olhando adiante, e só depois de passar as brilhantes
// vira, numa curva, para o rumo das Híades (60° do rumo de chegada). As nove
// com nome cabem em ~1,5 pc do centro e ~2,5 pc de fundo, como o catálogo as
// desenha. A reta passa por `PASSAGEM`, escolhida numa grade de ±1,5 pc em
// volta do centro para as brilhantes passarem DE LADO (o quadro é mais
// largo que alto: de lado elas ficam mais tempo nele): Alcione (0,38 pc),
// Taígeta e Mérope à esquerda, Atlas (0,5 pc) à direita, e nenhuma estrela
// do catálogo a menos de 0,3 pc — `crescer.test.ts` cobra a folga.
const RUMO_DE_ENTRADA = ate(PONTOS_DAS_JUNTAS.saidaDeOrion, PLEIADES);
const RUMO_DE_SAIDA = ate(PLEIADES, HIADES);
const CIMA_NA_ENTRADA = perpendicular(CIMA_DA_ECLIPTICA, RUMO_DE_ENTRADA);
const DIREITA_NA_ENTRADA = new THREE.Vector3().crossVectors(RUMO_DE_ENTRADA, CIMA_NA_ENTRADA);
const PASSAGEM = PLEIADES.clone().addScaledVector(DIREITA_NA_ENTRADA, 0.7).addScaledVector(CIMA_NA_ENTRADA, -0.4);
/** a reta pelo miolo, em pc ao longo do rumo de chegada: começa na borda
 *  (a primeira com nome, Pleione, está 1,4 pc antes do centro) e acaba
 *  depois da última (Taígeta, 1,2 pc depois): 4,8 pc em ~9 s, no máximo
 *  0,8 pc/s no miolo; as brilhantes passam entre 4 e 7,5 s do plano */
const RETA_NO_MIOLO = { de: -3.2, ate: 1.6 };
/** a fração do plano que a reta ocupa; o resto é a curva */
const FRACAO_DA_RETA = 0.75;
const ENTRADA = PASSAGEM.clone().addScaledVector(RUMO_DE_ENTRADA, RETA_NO_MIOLO.de);
const FIM_DA_RETA = PASSAGEM.clone().addScaledVector(RUMO_DE_ENTRADA, RETA_NO_MIOLO.ate);
const SAIDA = FIM_DA_RETA.clone().addScaledVector(RUMO_DE_ENTRADA, 1.2).addScaledVector(RUMO_DE_SAIDA, 2.4);
/** a curva começa com a velocidade da reta: 3·c/(1 − f) = L/f (Bézier na ponta) */
const CONTROLE_DA_CURVA = ((RETA_NO_MIOLO.ate - RETA_NO_MIOLO.de) * (1 - FRACAO_DA_RETA)) / (3 * FRACAO_DA_RETA);
/** a mira adiante na reta: longe, no rumo da chegada */
const ADIANTE_NA_ENTRADA = PASSAGEM.clone().addScaledVector(RUMO_DE_ENTRADA, 30);

// ================= C3, C4 e C5 — AS HÍADES DE CIMA, E A LARANJA À FRENTE =================
// As Híades estão quase na reta Plêiades→Sol (16°): a câmera chega por trás
// delas, subindo (`CHEGADA_NAS_HIADES`, 35° acima do rumo de quem vem), e
// desce num arco por cima até ficar atrás do grupo, na reta Híades→Sol, um
// pouco acima dela: dali o grupo está no quadro e Aldebaran — a 44 % do
// caminho entre as Híades e o Sol, a 2,4° dessa reta — logo à frente.
const DE_CASA = versor(HIADES);
const DE_ONDE_VEM = ate(HIADES, SAIDA);
const CHEGADA_NAS_HIADES = girar(DE_ONDE_VEM, perpendicular(CIMA_DA_ECLIPTICA, DE_ONDE_VEM), 35);
const ATRAS_DAS_HIADES = girar(DE_CASA, perpendicular(CIMA_DA_ECLIPTICA, DE_CASA), 8);
const RAIO_DO_ARCO_DAS_HIADES = { de: 12, para: 10 };
const MIRANTE_DAS_HIADES = HIADES.clone().addScaledVector(ATRAS_DAS_HIADES, RAIO_DO_ARCO_DAS_HIADES.para);

/** os pontos nomeados do Ato 3, em pc */
export const PONTOS_CRESCER: Readonly<Record<string, THREE.Vector3>> = {
  passagemNasPleiades: PASSAGEM,
  entradaNasPleiades: ENTRADA,
  adianteNaEntrada: ADIANTE_NA_ENTRADA,
  fimDaRetaNasPleiades: FIM_DA_RETA,
  controleDaCurvaDe: FIM_DA_RETA.clone().addScaledVector(RUMO_DE_ENTRADA, CONTROLE_DA_CURVA),
  controleDaCurvaPara: SAIDA.clone().addScaledVector(RUMO_DE_SAIDA, -1),
  saidaDasPleiades: SAIDA,
  chegadaNasHiades: HIADES.clone().addScaledVector(CHEGADA_NAS_HIADES, RAIO_DO_ARCO_DAS_HIADES.de),
  chegadaNasHiadesDirecao: CHEGADA_NAS_HIADES,
  atrasDasHiades: ATRAS_DAS_HIADES,
  miranteDasHiades: MIRANTE_DAS_HIADES,
};

/** os números nomeados do Ato 3: distâncias em pc */
export const NUMEROS_CRESCER: Readonly<Record<string, number>> = {
  fracaoDaRetaNasPleiades: FRACAO_DA_RETA,
  raioDoArcoDasHiadesDe: RAIO_DO_ARCO_DAS_HIADES.de,
  raioDoArcoDasHiadesPara: RAIO_DO_ARCO_DAS_HIADES.para,
};
