// ============================================================
// OS LUGARES DO CÉU — o vocabulário bilíngue e a curadoria de tudo o
// que a busca alcança e que NÃO é estrela nem corpo do sistema (item
// 129/F5; céu profundo, pilar 3 do NORTE, 12/11/2026). Nasceu para os
// beats do filme (daí o nome do arquivo) com uma linha só, o centro
// galáctico; desde 12/11 é a tabela ÚNICA dos lugares: aglomerados,
// nebulosas e os enquadramentos da galáxia inteira.
//
// UMA FONTE POR NOME (revisão de 01/09): estrela do catálogo NÃO entra
// aqui — Sirius, Betelgeuse e as Três Marias (apelido das três do
// cinturão) já moram em `apelidosDeEstrelas.ts`/no próprio índice.
//
// O QUE UM LUGAR É: um centro, um raio de enquadramento, uma vista e
// uma ficha com procedência. A GEOMETRIA da escala galáctica (o centro,
// a anã de Sagitário) depende de constantes do three e entra injetada
// por `three/world/lugaresDoCeu.ts`; os centros dos aglomerados são a
// MÉDIA das estrelas-membro tal como o catálogo da casa as desenha
// (`stars_meta.json`) — `lugaresDoFilme.test.ts` recalcula a média e
// cobra o número escrito aqui. NADA aqui é arquivo de dados novo.
//
// OS FATOS: cada linha diz de onde veio (`fonte`) e com que selo
// (`procedencia`). Os números da literatura foram escritos de memória
// da literatura citada na tarefa de 12/11 — a citação está ao lado
// para quem quiser conferir.
// ============================================================
import type { Procedencia } from '../three/selo';
import { RS_SGR_A_PC } from './buracoNegro';

export type CategoriaDeLugar = 'aglomerado' | 'nebulosa' | 'galaxia';

/**
 * DE ONDE A CÂMERA OLHA, ao chegar (a lei mora em
 * `three/world/lugaresDoCeu.ts`, `poseDoLugar`):
 * - `doSol`: em cima da linha Sol→lugar, do lado do Sol, norte celeste
 *   no alto — é a vista de quem olha do quintal, só que mais perto;
 * - `deCimaDoDisco`: do polo norte galáctico, com o Sol embaixo e o
 *   centro no meio;
 * - `sobreOSol`: atrás e acima do Sol, polo norte galáctico no alto,
 *   com o Sol e o centro no mesmo quadro;
 * - `abaixoDoDisco`: do lado sul do disco e de lado, com a anã de
 *   Sagitário no centro e a galáxia ao lado dela;
 * - `comAViaLactea`: de trás da Grande Nuvem, de lado, com a Via Láctea
 *   de um lado do quadro e a Pequena Nuvem do outro — "a nossa galáxia
 *   tem companheiras".
 */
export type VistaDoLugar = 'doSol' | 'deCimaDoDisco' | 'sobreOSol' | 'abaixoDoDisco' | 'comAViaLactea';

/** uma linha da ficha de um lugar — as palavras nas duas línguas */
export interface FatoDoLugar {
  campo:
    | 'tamanho'
    | 'idade'
    | 'membros'
    | 'orbita'
    | 'nucleo'
    | 'noCatalogo'
    | 'naCena'
    | 'massa'
    | 'horizonte'
    | 'sombra'
    | 'anelEht'
    | 'estrelaS2'
    | 'luz'
    | 'periodo'
    | 'periastro'
    | 'velocidade'
    | 'desvioParaOVermelho'
    | 'precessao'
    | 'estrela';
  pt: string;
  en: string;
  procedencia: Procedencia;
  /** a citação (nomes e anos não se traduzem) ou uma frase bilíngue */
  fonte: string | { pt: string; en: string };
}

export interface LugarDoCeu {
  /** a chave do link (`?foco=sagittarius-a`) — ASCII, sem espaço */
  id: string;
  /** o nome que o Director ANUNCIA em pt-BR (rótulo e cabeçalho da
   *  ficha). Para o centro galáctico tem de ser igual letra a letra ao
   *  de `director/rotulos.ts`: é por ele que `chaveDoFoco` o reconhece. */
  nome: string;
  /** o nome em inglês; ausente = o mesmo `nome` */
  nomeEn?: string;
  pt: readonly string[];
  en: readonly string[];
  alvo:
    | { estrela: string }
    | { centroGalactico: true }
    /** posição fixa na cena (pc, equatorial J2000, Sol na origem) */
    | { pc: readonly [number, number, number] }
    /** posição que só o three conhece (`lugaresDoCeu.ts`) */
    | { cena: 'centroGalactico' | 'rumoAoCentro' | 'anaDeSagitario' }
    /** as galáxias vizinhas: o centro mora no modelo delas
     *  (`three/world/geradorDasVizinhas.ts`) */
    | { vizinha: 'gnm' | 'pnm' | 'm31' };
  /** as nomeadas do catálogo que pertencem ao lugar */
  membros?: readonly string[];
  categoria?: CategoriaDeLugar;
  /** a palavra da classe (`classe.<x>` nas tabelas de idioma) */
  classe?: string;
  /** o raio da esfera ENQUADRADA, em pc — ausente = a lei antiga do
   *  centro galáctico (`escada.irAte`), que fica como estava */
  raioPc?: number;
  /** o piso do zoom, em pc — ausente = o de estrela à distância do lugar
   *  (`raioDeEnquadramentoEstelar`), que é maior que um lugar de UA */
  pisoPc?: number;
  /** o raio da esfera enquadrada no degrau de PERTO (o "Aproximar" da
   *  ficha), em pc, pela mesma vista — ausente = o lugar não tem o que
   *  mostrar mais de perto do que a chegada já mostra, e o botão não existe */
  raioDePertoPc?: number;
  vista?: VistaDoLugar;
  /** só para a vista `doSol`: a câmera sobe estes graus acima do plano da
   *  galáxia, girando em volta do lugar — ausente = 0, a linha de visada
   *  exata. Existe para S2: o disco do buraco é desenhado no plano da
   *  galáxia, e o Sol está nele; da linha de visada exata o disco se vê
   *  de perfil, um risco reto atravessando a sombra (13/11) */
  elevacaoGraus?: number;
  /** uma VISTA, não um objeto (a galáxia de cima, o endereço do Sol):
   *  não ganha nome na cena — quem marca o lugar é o rótulo do Sol */
  semRotulo?: true;
  /** a distância da LITERATURA ao Sol, em pc (a ficha a escreve em
   *  anos-luz — parsec não aparece na tela). É a ÚNICA distância do
   *  lugar: a nota da busca lê esta mesma (`LUGARES_DA_BUSCA`).
   *  `doSolAoCentro` = o destino é uma VISTA e o número não é a distância
   *  até ele, é a do Sol ao centro: a ficha o rotula assim e a busca não
   *  o mostra. O próprio centro (Sagittarius A✱) não leva a marca — para
   *  ele as duas distâncias são a mesma. */
  distanciaPc?: { valor: number; fonte: string; doSolAoCentro?: true };
  oQueE?: { pt: string; en: string };
  fatos?: readonly FatoDoLugar[];
}

/**
 * FORA DA VIA LÁCTEA? — um nome anunciado (pt ou en) que é de uma galáxia
 * vizinha. A linha de contexto o põe sob o Grupo Local, nunca sob a Via
 * Láctea: nem as Nuvens de Magalhães, satélites dela, moram dentro dela.
 */
export function foraDaViaLactea(nome: string): boolean {
  return LUGARES_DO_FILME.some(
    (l) => 'vizinha' in l.alvo && (l.nome === nome || l.nomeEn === nome)
  );
}

const SINTESE = { pt: 'síntese da literatura', en: 'summary of the literature' };
const CATALOGO_DA_CASA = { pt: 'catálogo da casa (AT-HYG)', en: 'the app’s catalogue (AT-HYG)' };
const MODELO_DA_CASA = { pt: 'modelo da galáxia da casa', en: 'the app’s galaxy model' };
const MODELO_DAS_VIZINHAS = { pt: 'modelo de partículas da casa', en: 'the app’s particle model' };
const MASSA_POR_ESTRELA = {
  pt: 'massa estelar ÷ massa média de uma estrela (0,3–0,5 M☉)',
  en: 'stellar mass ÷ the mean mass of a star (0.3–0.5 M☉)',
};
const TEMPO_DA_LUZ = { pt: 'distância ÷ velocidade da luz', en: 'distance ÷ speed of light' };

export const LUGARES_DO_FILME: ReadonlyArray<LugarDoCeu> = [
  {
    id: 'sagittarius-a',
    nome: 'Sagittarius A✱',
    pt: ['Sagittarius A*', 'Sgr A*', 'Buraco negro', 'Centro da galáxia', 'Centro galáctico'],
    en: ['Sagittarius A*', 'Sgr A*', 'Black hole', 'Galactic center', 'Galactic centre'],
    alvo: { centroGalactico: true },
    classe: 'buraco negro',
    distanciaPc: { valor: 8150, fonte: 'Reid et al. 2019 (VLBI)' },
    oQueE: {
      pt: 'O buraco negro supermassivo no centro da Via Láctea: 4 milhões de vezes a massa do Sol num espaço menor que a órbita de Mercúrio. Ele quase não brilha — o gás que cai nele é ralo — e se revela pelo que faz: as estrelas mais próximas giram em volta dele em poucos anos, e a luz que passa perto se curva.',
      en: 'The supermassive black hole at the centre of the Milky Way: 4 million times the Sun’s mass in a space smaller than Mercury’s orbit. It barely shines — the gas falling in is thin — and it shows itself by what it does: the nearest stars circle it in a few years, and light passing close to it bends.',
    },
    // os números saem de `lib/buracoNegro.ts` (o teste da linha os cobra)
    fatos: [
      {
        campo: 'massa',
        pt: '≈ 4,30 milhões de massas solares',
        en: '≈ 4.30 million solar masses',
        procedencia: 'medido',
        fonte: {
          pt: 'GRAVITY Collaboration 2022 (órbitas das estrelas S)',
          en: 'GRAVITY Collaboration 2022 (orbits of the S stars)',
        },
      },
      {
        campo: 'horizonte',
        pt: '0,085 UA (12,7 milhões de km) de raio — pouco mais de 1/5 do raio da órbita de Mercúrio',
        en: '0.085 AU (12.7 million km) in radius — just over 1/5 of the radius of Mercury’s orbit',
        procedencia: 'derivado',
        fonte: { pt: '2GM/c² com a massa medida', en: '2GM/c² from the measured mass' },
      },
      {
        campo: 'sombra',
        pt: '0,44 UA de diâmetro (5,2 raios de Schwarzschild); daqui da Terra, 54 microssegundos de arco',
        en: '0.44 AU across (5.2 Schwarzschild radii); seen from Earth, 54 microarcseconds',
        procedencia: 'derivado',
        fonte: {
          pt: 'relatividade geral, buraco sem rotação (Synge 1966)',
          en: 'general relativity, non-rotating hole (Synge 1966)',
        },
      },
      {
        campo: 'anelEht',
        pt: 'um anel de 51,8 ± 2,3 microssegundos de arco, em ondas de rádio de 1,3 mm (observado em 2017, publicado em 2022)',
        en: 'a ring 51.8 ± 2.3 microarcseconds across, in 1.3 mm radio waves (observed in 2017, published in 2022)',
        procedencia: 'medido',
        fonte: 'Event Horizon Telescope Collaboration 2022 (ApJL 930, L12)',
      },
      {
        campo: 'estrelaS2',
        pt: 'uma volta a cada 16,05 anos; no ponto mais perto passa a 120 UA do buraco, a ≈ 7.700 km/s (o último foi em maio de 2018, o próximo em 2034)',
        en: 'one orbit every 16.05 years; at closest approach it passes 120 AU from the hole at ≈ 7,700 km/s (the last was in May 2018, the next in 2034)',
        procedencia: 'medido',
        fonte: 'GRAVITY Collaboration 2020 (A&A 636, L5)',
      },
      {
        campo: 'naCena',
        pt: 'de perto, a sombra e o disco têm o tamanho real, e a luz das estrelas e do gás atrás deles é desviada pela relatividade geral (buraco sem rotação): calculada raio a raio perto do buraco e, mais longe, pela fórmula do desvio fraco. O disco de acreção é o “Gargantua”, inspirado no filme Interstellar, e o brilho dele é artístico: o gás que cai em Sgr A✱ é ralo e brilha em rádio e raios X, quase nada em luz visível. De longe o disco é desenhado muito maior que o real (até 125.884 vezes), para ser visto, e encolhe até o tamanho verdadeiro a 2 UA do buraco, onde fica a vista de perto. Onde a luz desviada viria de fora da tela, mostra-se a cena sem desvio — uma aproximação.',
        en: 'up close, the shadow and the disc are true to size, and the light of the stars and gas behind them is bent by general relativity (non-rotating hole): computed ray by ray near the hole and, further out, by the weak-bending formula. The accretion disc is the “Gargantua”, inspired by the film Interstellar, and its brightness is artistic: the gas falling into Sgr A✱ is thin and shines in radio and X-rays, hardly at all in visible light. From afar the disc is drawn far larger than real (up to 125,884 times) so it can be seen, and it shrinks to its true size 2 AU from the hole, where the close view sits. Where the bent light would come from outside the screen, the unbent scene is shown — an approximation.',
        procedencia: 'derivado',
        fonte: {
          pt: 'relatividade geral (Schwarzschild 1916)',
          en: 'general relativity (Schwarzschild 1916)',
        },
      },
    ],
  },
  {
    // A ÓRBITA DE S2 (13/11/2026): o lugar é a órbita inteira em volta do
    // buraco, vista do lado do Sol com o norte celeste no alto — o céu dos
    // artigos, erguido 3° acima do disco. A estrela anda com o relógio (`lib/estrelasS.ts`); o nome
    // dela na cena é o da estrela viva (`world/estrelasS.ts`), por isso a
    // linha não tem rótulo de lugar.
    id: 's2',
    nome: 'S2',
    pt: ['S2', 'S0-2', 'Estrela S2', 'Estrelas S'],
    en: ['S2', 'S0-2', 'Star S2', 'S stars', 'S-stars'],
    alvo: { cena: 'centroGalactico' },
    classe: 'estrela',
    // o apoastro de S2 é 1.944 UA (0,0094 pc): a esfera de 0,0105 pc o contém
    raioPc: 0.0105,
    // o piso do degrau de perto do buraco (3 RS, `escada.ts`)
    pisoPc: 3 * RS_SGR_A_PC,
    vista: 'doSol',
    // 3°: o menor ângulo, entre 3, 6, 10 e 15 (prancha de 14/11), em que
    // o disco já é faixa e não risco; a elipse de S2 sai 2,4 % menor no
    // eixo maior e girada 2,8° em relação à do céu (o teste da linha cobra)
    elevacaoGraus: 3,
    semRotulo: true,
    distanciaPc: { valor: 8150, fonte: 'Reid et al. 2019 (VLBI)' },
    oQueE: {
      pt: 'Uma estrela azul e quente, dez vezes mais pesada que o Sol, que dá uma volta em torno do buraco negro do centro da galáxia a cada 16 anos. A órbita dela, medida no infravermelho desde 1992, é a prova de que ali há 4 milhões de massas solares num ponto — e, no periastro de 2018, mostrou dois efeitos da relatividade geral.',
      en: 'A hot blue star, ten times heavier than the Sun, that circles the black hole at the centre of the galaxy every 16 years. Its orbit, measured in the infrared since 1992, is the proof that 4 million solar masses sit in a single point — and at its 2018 closest approach it showed two effects of general relativity.',
    },
    fatos: [
      {
        campo: 'periodo',
        pt: 'uma volta a cada 16,05 anos',
        en: 'one orbit every 16.05 years',
        procedencia: 'medido',
        fonte: 'GRAVITY Collaboration 2020 (A&A 636, L5)',
      },
      {
        campo: 'periastro',
        pt: '120 UA do buraco (≈ 1.400 raios de Schwarzschild), em 19 de maio de 2018; o próximo em 2034',
        en: '120 AU from the hole (≈ 1,400 Schwarzschild radii), on 19 May 2018; the next in 2034',
        procedencia: 'medido',
        fonte: 'GRAVITY Collaboration 2018 (A&A 615, L15)',
      },
      {
        campo: 'velocidade',
        pt: '≈ 7.650 km/s no periastro — 2,55 % da velocidade da luz',
        en: '≈ 7,650 km/s at closest approach — 2.55 % of the speed of light',
        procedencia: 'medido',
        fonte: 'GRAVITY Collaboration 2018 (A&A 615, L15)',
      },
      {
        campo: 'desvioParaOVermelho',
        pt: 'no periastro a luz chega ≈ 200 km/s mais avermelhada que pela lei de Newton (desvio gravitacional + Doppler transverso); medido f = 0,90 ± 0,09 ± 0,15, onde 1 é a relatividade geral e 0 é Newton',
        en: 'at closest approach its light arrives ≈ 200 km/s redder than Newton predicts (gravitational redshift + transverse Doppler); measured f = 0.90 ± 0.09 ± 0.15, where 1 is general relativity and 0 is Newton',
        procedencia: 'medido',
        fonte: 'GRAVITY Collaboration 2018 (A&A 615, L15)',
      },
      {
        campo: 'precessao',
        pt: 'a elipse gira ≈ 12′ a cada volta (precessão de Schwarzschild; a relatividade geral prevê 12,1′); medido f = 1,10 ± 0,19, onde 1 é a relatividade geral',
        en: 'the ellipse turns ≈ 12′ each orbit (Schwarzschild precession; general relativity predicts 12.1′); measured f = 1.10 ± 0.19, where 1 is general relativity',
        procedencia: 'medido',
        fonte: 'GRAVITY Collaboration 2020 (A&A 636, L5)',
      },
      {
        campo: 'estrela',
        pt: 'anã do tipo B: ≈ 28.500 K na superfície, ≈ 5,5 raios do Sol, ≈ 13,6 massas solares, ≈ 6,6 milhões de anos',
        en: 'a B-type dwarf: ≈ 28,500 K at the surface, ≈ 5.5 solar radii, ≈ 13.6 solar masses, ≈ 6.6 million years old',
        procedencia: 'derivado',
        fonte: 'Habibi et al. 2017 (ApJ 847, 120)',
      },
      {
        campo: 'naCena',
        pt: 'S2 e 17 vizinhas (Gillessen et al. 2017) estão onde as órbitas medidas as põem na data do relógio, e a órbita de Kepler não inclui a precessão. A vista é do lado do Sol, 3° acima do plano da galáxia — da linha de visada exata o disco do buraco seria só um risco —, e por isso a órbita de S2 sai quase como no céu da Terra, mas não idêntica. Cada estrela é um ponto de luz: nenhum disco de estrela S foi resolvido. Perto do centro o buraco é desenhado maior que o real, e a sombra inflada esconde as estrelas S que ela cobre na tela.',
        en: 'S2 and 17 neighbours (Gillessen et al. 2017) sit where the measured orbits put them on the clock’s date, and the Kepler orbit leaves out the precession. The view is from the Sun’s side, 3° above the plane of the galaxy — from the exact line of sight the hole’s disc would be a mere streak —, so S2’s orbit looks almost as it does in Earth’s sky, but not identical. Each star is a point of light: no S star’s disc has ever been resolved. Near the centre the hole is drawn larger than real, and the inflated shadow hides the S stars it covers on screen.',
        procedencia: 'derivado',
        fonte: { pt: 'leis de Kepler com os elementos medidos', en: 'Kepler’s laws with the measured elements' },
      },
    ],
  },
  {
    id: 'pleiades',
    nome: 'Plêiades',
    nomeEn: 'Pleiades',
    pt: ['Plêiades', 'Sete Irmãs', 'M45', 'Messier 45', 'Aglomerado das Plêiades'],
    en: ['Pleiades', 'Seven Sisters', 'M45', 'Messier 45', 'Subaru', 'Melotte 22'],
    // a média das nove nomeadas abaixo, como o catálogo as desenha
    alvo: { pc: [67.68, 102.77, 55.37] },
    membros: ['Alcyone', 'Atlas', 'Electra', 'Maia', 'Merope', 'Taygeta', 'Pleione', 'Celaeno', 'Asterope'],
    categoria: 'aglomerado',
    classe: 'aglomerado aberto',
    // 7 pc põem a câmera a ~45 pc do centro, do lado do Sol: perto o
    // bastante para as nove encherem o miolo do quadro com a forma que
    // se conhece do céu
    raioPc: 7,
    vista: 'doSol',
    distanciaPc: { valor: 136.2, fonte: 'Melis et al. 2014 (VLBI)' },
    oQueE: {
      pt: 'Um aglomerado aberto jovem em Touro: mais de mil estrelas nascidas da mesma nuvem, que ainda viajam juntas. As mais brilhantes são estrelas azuis e quentes do tipo B.',
      en: 'A young open cluster in Taurus: more than a thousand stars born from the same cloud, still travelling together. The brightest are hot blue B-type stars.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: 'raio de maré ≈ 38 anos-luz',
        en: 'tidal radius ≈ 38 light-years',
        procedencia: 'derivado',
        fonte: 'Lodieu et al. 2019 (Gaia DR2)',
      },
      {
        campo: 'idade',
        pt: '≈ 112 milhões de anos',
        en: '≈ 112 million years',
        procedencia: 'derivado',
        fonte: { pt: 'Dahm 2015 (limite de depleção do lítio)', en: 'Dahm 2015 (lithium depletion boundary)' },
      },
      {
        campo: 'membros',
        pt: '≈ 1.250 estrelas confirmadas',
        en: '≈ 1,250 confirmed stars',
        procedencia: 'derivado',
        fonte: 'Lodieu et al. 2019 (Gaia DR2)',
      },
      {
        campo: 'noCatalogo',
        pt: '9 com nome (Alcione, Atlas, Electra, Maia, Mérope, Taígeta, Pleione, Celeno, Astérope) e ≈ 84 sem nome a mais que o campo, num cone de 2°',
        en: '9 named (Alcyone, Atlas, Electra, Maia, Merope, Taygeta, Pleione, Celaeno, Asterope) and ≈ 84 unnamed above the field, within a 2° cone',
        procedencia: 'derivado',
        fonte: CATALOGO_DA_CASA,
      },
      {
        campo: 'naCena',
        pt: 'a medida de distância do Gaia erra nas estrelas muito brilhantes; as daqui cuja medida é ruim recebem a distância do aglomerado, e a profundidade desenhada fica igual à largura que se vê no céu.',
        en: 'Gaia’s distance measurement goes wrong for very bright stars; those here with a poor measurement take the cluster’s distance, and the depth drawn equals the width seen in the sky.',
        procedencia: 'derivado',
        fonte: CATALOGO_DA_CASA,
      },
    ],
  },
  {
    id: 'hyades',
    nome: 'Híades',
    nomeEn: 'Hyades',
    pt: ['Híades', 'Melotte 25', 'Caldwell 41', 'Cabeça do Touro'],
    en: ['Hyades', 'Melotte 25', 'Caldwell 41', 'Head of the Bull'],
    // a média das onze nomeadas abaixo, como o catálogo as desenha
    alvo: { pc: [17.39, 40.1, 14.51] },
    membros: [
      'Ain', 'Chamukuy', 'Prima Hyadum', 'Secunda Hyadum', 'θ¹ Tau', 'δ² Tau',
      'δ³ Tau', 'ρ Tau', 'κ¹ Tau', 'κ² Tau', 'υ Tau',
    ],
    categoria: 'aglomerado',
    classe: 'aglomerado aberto',
    raioPc: 6,
    vista: 'doSol',
    distanciaPc: { valor: 47.5, fonte: 'Gaia Collaboration 2018 (DR2)' },
    oQueE: {
      pt: 'O aglomerado aberto mais próximo do Sol: o "V" da cabeça do Touro. Aldebarã, a estrela mais brilhante do V, não faz parte dele — está a menos da metade da distância, na frente.',
      en: 'The open cluster closest to the Sun: the "V" of the Bull’s head. Aldebaran, the brightest star of the V, is not a member — it sits less than halfway, in front of it.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: 'raio de maré ≈ 33 anos-luz',
        en: 'tidal radius ≈ 33 light-years',
        procedencia: 'derivado',
        fonte: 'Perryman et al. 1998 (Hipparcos)',
      },
      {
        campo: 'idade',
        pt: '≈ 625 a 750 milhões de anos',
        en: '≈ 625 to 750 million years',
        procedencia: 'derivado',
        fonte: 'Perryman et al. 1998; Gaia Collaboration 2018',
      },
      {
        campo: 'membros',
        pt: '≈ 500 estrelas a até 60 anos-luz do centro',
        en: '≈ 500 stars within 60 light-years of the centre',
        procedencia: 'derivado',
        fonte: 'Röser et al. 2019 (Gaia DR2)',
      },
      {
        campo: 'noCatalogo',
        pt: '11 com nome (Ain, Chamukuy, Prima e Secunda Hyadum, θ¹, δ², δ³, ρ, κ¹, κ², υ Tau) e ≈ 130 sem nome a mais que o campo, num cone de 10°',
        en: '11 named (Ain, Chamukuy, Prima and Secunda Hyadum, θ¹, δ², δ³, ρ, κ¹, κ², υ Tau) and ≈ 130 unnamed above the field, within a 10° cone',
        procedencia: 'derivado',
        fonte: CATALOGO_DA_CASA,
      },
      {
        campo: 'naCena',
        pt: 'cada estrela está na distância medida para ela; só as de medida ruim são puxadas para a distância do aglomerado.',
        en: 'each star sits at the distance measured for it; only those with a poor measurement are pulled towards the cluster’s distance.',
        procedencia: 'derivado',
        fonte: CATALOGO_DA_CASA,
      },
    ],
  },
  {
    id: 'nebulosa-de-orion',
    nome: 'Nebulosa de Órion',
    nomeEn: 'Orion Nebula',
    pt: ['Nebulosa de Órion', 'Grande Nebulosa de Órion', 'M42', 'Messier 42', 'NGC 1976'],
    en: ['Orion Nebula', 'Great Orion Nebula', 'M42', 'Messier 42', 'NGC 1976'],
    // θ¹ Ori C, a estrela que acende o gás, como o catálogo da casa a
    // desenha (414 pc, a distância do Trapézio por VLBI — Menten et al.
    // 2007 —, que o catálogo dá às estrelas dele): o gás desenhado em
    // `world/nebulosaDeOrion.ts` nasce em volta DELA, e o teste de lá
    // cobra que os dois números são o mesmo
    alvo: { pc: [44.381, 409.7733, -38.8873] },
    categoria: 'nebulosa',
    classe: 'nebulosa de emissão',
    raioPc: 2.5,
    vista: 'doSol',
    distanciaPc: { valor: 414, fonte: 'Menten et al. 2007 (VLBA)' },
    oQueE: {
      pt: 'Um berçário de estrelas: uma bolha de gás aberta na face de uma nuvem escura, acesa por dentro pela estrela mais quente do Trapézio, θ¹ Ori C. A luz dela arranca os elétrons do hidrogênio e do oxigênio, e o gás brilha em vermelho e verde-azulado. É a região de formação de estrelas de grande massa mais próxima do Sol, visível a olho nu na espada de Órion.',
      en: 'A stellar nursery: a bubble of gas opened on the face of a dark cloud, lit from inside by the hottest star of the Trapezium, θ¹ Ori C. Its light strips the electrons from hydrogen and oxygen, and the gas glows red and blue-green. It is the nearest region forming massive stars, visible to the naked eye in Orion’s sword.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: '≈ 25 anos-luz de lado a lado (a parte visível)',
        en: '≈ 25 light-years across (the visible part)',
        procedencia: 'derivado',
        fonte: { pt: '65′ no céu, à distância acima', en: '65′ on the sky, at the distance above' },
      },
      {
        campo: 'idade',
        pt: 'as estrelas do aglomerado: ≈ 1 a 3 milhões de anos',
        en: 'the cluster’s stars: ≈ 1 to 3 million years',
        procedencia: 'derivado',
        fonte: 'Hillenbrand 1997',
      },
      {
        campo: 'membros',
        pt: 'mais de mil estrelas jovens no aglomerado da nebulosa',
        en: 'more than a thousand young stars in the nebula’s cluster',
        procedencia: 'derivado',
        fonte: 'Hillenbrand 1997',
      },
      {
        campo: 'nucleo',
        pt: 'θ¹ Ori C, estrela O7V de ≈ 39.000 K, acende o gás; ela fica ≈ 0,2 parsec (0,7 ano-luz) na frente da parede da nuvem',
        en: 'θ¹ Ori C, an O7V star of ≈ 39,000 K, lights the gas; it sits ≈ 0.2 parsec (0.7 light-year) in front of the cloud wall',
        procedencia: 'medido',
        fonte: 'Pabst et al. 2020; Kraus et al. 2009; O’Dell & Henney 2008',
      },
      {
        campo: 'naCena',
        pt: 'medido: a distância, o tamanho, a estrela que acende, a parede 0,2 pc atrás dela, a Barra vista de lado a 2′ a sudeste, o véu de poeira na frente, a bolha de ~4 parsecs soprada pelo vento da estrela e aberta para sudoeste, M43 ao norte com a faixa escura, e o brilho caindo do miolo para fora com a luz da estrela. Inventado: a forma exata da parede (uma tigela rasa, de borda mais alta a nordeste) e da bolha, as duas asas (cristas da parede como a Barra), o traçado da Baía Escura e das faixas de poeira, o contorno e o fundo da nuvem escura por trás, o gás que rareia longe da parede e todo o detalhe fino — fios, dobras e grumos são ruído de computador. A luz espalhada pelo véu é a de quem olha do lado do Sol. Ganho de brilho: a tela mostra a luz que a estrela manda elevada a 0,3 (cem vezes mais luz aparecem como quatro vezes mais brilho), uma lei fixa do objeto, a mesma de qualquer lugar, para o miolo e a parte larga caberem juntos na mesma foto. O gás está em volta de θ¹ Ori C onde o catálogo a põe (1.304 anos-luz, dentro da faixa medida de 1.266 a 1.350); só ela, das estrelas do Trapézio, tem nome no catálogo.',
        en: 'measured: the distance, the size, the star that lights it, the wall 0.2 pc behind it, the Bar seen edge-on 2′ to the southeast, the dust veil in front, the ~4-parsec bubble blown by the star’s wind and open to the southwest, M43 to the north with its dark lane, and the brightness falling from the core outwards with the star’s light. Invented: the exact shape of the wall (a shallow bowl whose rim is higher to the northeast) and of the bubble, the two wings (ridges of the wall like the Bar), the outline of the Dark Bay and of the dust lanes, the outline and back of the dark cloud behind, the gas thinning away from the wall and all the fine detail — threads, folds and clumps are computer noise. The light scattered by the veil is the one seen from the Sun’s side. Brightness gain: the screen shows the light the star sends raised to the power 0.3 (a hundred times more light shows as four times more brightness), a fixed law of the object, the same from anywhere, so the core and the wide part fit in the same picture. The gas sits around θ¹ Ori C where the catalogue places it (1,304 light-years, within the measured range of 1,266 to 1,350); of the Trapezium stars, only it is named in the catalogue.',
        procedencia: 'artistico',
        fonte: {
          pt: 'O’Dell & Henney 2008; van der Werf et al. 2013; Pabst et al. 2019; Güdel et al. 2008; O’Dell & Abel 2025; Berné et al. 2022; Simón-Díaz et al. 2011; Kounkel et al. 2017',
          en: 'O’Dell & Henney 2008; van der Werf et al. 2013; Pabst et al. 2019; Güdel et al. 2008; O’Dell & Abel 2025; Berné et al. 2022; Simón-Díaz et al. 2011; Kounkel et al. 2017',
        },
      },
    ],
  },
  {
    id: 'via-lactea',
    nome: 'Via Láctea vista de cima',
    nomeEn: 'The Milky Way from above',
    pt: ['Via Láctea', 'Via Láctea vista de cima', 'Nossa galáxia', 'Galáxia inteira'],
    en: ['Milky Way', 'The Milky Way from above', 'Our galaxy', 'Whole galaxy'],
    alvo: { cena: 'centroGalactico' },
    categoria: 'galaxia',
    classe: 'galáxia espiral barrada',
    raioPc: 11_500,
    vista: 'deCimaDoDisco',
    semRotulo: true,
    distanciaPc: { valor: 8150, fonte: 'Reid et al. 2019 (VLBI)', doSolAoCentro: true },
    oQueE: {
      pt: 'A nossa galáxia, uma espiral barrada, vista do polo norte galáctico — o Sol fica embaixo, o centro no meio. Ninguém jamais a viu de fora: o desenho é um modelo de partículas guiado por medidas.',
      en: 'Our galaxy, a barred spiral, seen from the north galactic pole — the Sun is at the bottom, the centre in the middle. Nobody has ever seen it from outside: the drawing is a particle model guided by measurements.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: 'disco de estrelas com ≈ 100 mil anos-luz de diâmetro',
        en: 'a stellar disc ≈ 100,000 light-years across',
        procedencia: 'derivado',
        fonte: SINTESE,
      },
      {
        campo: 'idade',
        pt: '≈ 13 bilhões de anos (as estrelas mais velhas)',
        en: '≈ 13 billion years (its oldest stars)',
        procedencia: 'derivado',
        fonte: SINTESE,
      },
      {
        campo: 'membros',
        pt: '100 a 400 bilhões de estrelas',
        en: '100 to 400 billion stars',
        procedencia: 'derivado',
        fonte: SINTESE,
      },
      {
        campo: 'naCena',
        pt: 'estrelas, gás e poeira são milhões de partículas sorteadas de um modelo científico; perto do Sol a estrutura segue medidas, o lado de lá do centro é modelado; não é uma foto',
        en: 'stars, gas and dust are millions of particles drawn from a scientific model; near the Sun the structure follows measurements, the far side of the centre is modelled; not a photograph',
        procedencia: 'derivado',
        fonte: MODELO_DA_CASA,
      },
    ],
  },
  {
    id: 'nosso-lugar',
    nome: 'Nosso lugar na galáxia',
    nomeEn: 'Our place in the galaxy',
    pt: ['Nosso lugar na galáxia', 'Onde estamos', 'Braço de Órion', 'Braço Local'],
    en: ['Our place in the galaxy', 'Where we are', 'Orion Arm', 'Local Arm', 'Orion Spur'],
    alvo: { cena: 'rumoAoCentro' },
    categoria: 'galaxia',
    classe: 'vista da galáxia',
    raioPc: 9_000,
    vista: 'sobreOSol',
    semRotulo: true,
    distanciaPc: { valor: 8150, fonte: 'Reid et al. 2019 (VLBI)', doSolAoCentro: true },
    oQueE: {
      pt: 'Onde o Sol mora: num braço menor, o Braço de Órion, a cerca de 26 mil anos-luz do centro, quase no plano do disco. O nome SOL marca o ponto; o centro da galáxia fica no alto do quadro.',
      en: 'Where the Sun lives: in a minor arm, the Orion Arm, about 26,000 light-years from the centre, almost in the plane of the disc. The SUN label marks the spot; the galactic centre is at the top of the frame.',
    },
    fatos: [
      {
        campo: 'idade',
        pt: 'o Sol: 4,6 bilhões de anos',
        en: 'the Sun: 4.6 billion years',
        procedencia: 'medido',
        fonte: { pt: 'datação de meteoritos', en: 'meteorite dating' },
      },
      {
        campo: 'orbita',
        pt: 'uma volta do Sol em torno do centro leva de 200 a 230 milhões de anos',
        en: 'one lap of the Sun around the centre takes 200 to 230 million years',
        procedencia: 'derivado',
        fonte: SINTESE,
      },
      {
        campo: 'naCena',
        pt: 'a posição do Sol é medida; os braços em volta dele são partículas sorteadas de um modelo guiado por medidas',
        en: 'the Sun’s position is measured; the arms around it are particles drawn from a model guided by measurements',
        procedencia: 'derivado',
        fonte: MODELO_DA_CASA,
      },
    ],
  },
  {
    id: 'ana-de-sagitario',
    nome: 'Galáxia anã de Sagitário',
    nomeEn: 'Sagittarius Dwarf Galaxy',
    pt: ['Galáxia anã de Sagitário', 'Anã de Sagitário', 'Sgr dSph'],
    en: ['Sagittarius Dwarf Galaxy', 'Sagittarius Dwarf Spheroidal', 'Sgr dSph'],
    alvo: { cena: 'anaDeSagitario' },
    categoria: 'galaxia',
    classe: 'galáxia anã',
    raioPc: 8_000,
    vista: 'abaixoDoDisco',
    distanciaPc: { valor: 26_300, fonte: 'Monaco et al. 2004' },
    oQueE: {
      pt: 'Uma galáxia satélite sendo desfeita pela Via Láctea: do outro lado do centro, abaixo do disco, ela perde estrelas numa corrente que dá a volta na galáxia. Descoberta em 1994.',
      en: 'A satellite galaxy being torn apart by the Milky Way: beyond the centre, below the disc, it is losing stars into a stream that wraps around the galaxy. Discovered in 1994.',
    },
    fatos: [
      {
        campo: 'nucleo',
        pt: 'o aglomerado globular M54 fica no seu núcleo',
        en: 'the globular cluster M54 sits at its core',
        procedencia: 'derivado',
        fonte: 'Ibata et al. 1994; Bellazzini et al. 2008',
      },
      {
        campo: 'naCena',
        pt: 'desenhada como uma nuvem de partículas alongada no lugar medido; a corrente de maré não está desenhada',
        en: 'drawn as an elongated cloud of particles at the measured place; the tidal stream is not drawn',
        procedencia: 'artistico',
        fonte: MODELO_DA_CASA,
      },
    ],
  },
  {
    id: 'grande-nuvem-de-magalhaes',
    nome: 'Grande Nuvem de Magalhães',
    nomeEn: 'Large Magellanic Cloud',
    pt: ['Grande Nuvem de Magalhães', 'Grande Nuvem', 'GNM', 'Nuvens de Magalhães', 'Nuvem de Magalhães'],
    en: ['Large Magellanic Cloud', 'LMC', 'Magellanic Clouds', 'Magellanic Cloud'],
    alvo: { vizinha: 'gnm' },
    categoria: 'galaxia',
    classe: 'galáxia satélite',
    raioPc: 9_300,
    // de perto: a barra, o braço e o 30 Dourado, sem a Via Láctea ao lado
    raioDePertoPc: 3_000,
    vista: 'comAViaLactea',
    distanciaPc: { valor: 49_590, fonte: 'Pietrzyński et al. 2019' },
    oQueE: {
      pt: 'A maior galáxia satélite da Via Láctea, a olho nu no céu do sul como um pedaço solto da faixa. Tem uma barra fora do centro, um braço dominante e o 30 Dourado (a Tarântula), o berçário de estrelas mais brilhante do Grupo Local. Daqui se vê a nossa galáxia de um lado e a Pequena Nuvem do outro.',
      en: 'The largest satellite galaxy of the Milky Way, seen with the naked eye in the southern sky as a loose piece of the band. It has an off-centre bar, one dominant arm and 30 Doradus (the Tarantula), the brightest stellar nursery in the Local Group. From here our galaxy is on one side and the Small Cloud on the other.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: 'cerca de 32 mil anos-luz de um lado a outro',
        en: 'about 32,000 light-years across',
        procedencia: 'derivado',
        fonte: { pt: 'de Vaucouleurs RC3 (10,75°) × distância', en: 'de Vaucouleurs RC3 (10.75°) × distance' },
      },
      {
        campo: 'massa',
        pt: 'estrelas: cerca de 3 bilhões de sóis; com a matéria escura, ~140 bilhões',
        en: 'stars: about 3 billion suns; with dark matter, ~140 billion',
        procedencia: 'medido',
        fonte: 'van der Marel et al. 2002; Erkal et al. 2019',
      },
      {
        campo: 'membros',
        pt: 'da ordem de 10 bilhões de estrelas',
        en: 'of the order of 10 billion stars',
        procedencia: 'derivado',
        fonte: MASSA_POR_ESTRELA,
      },
      {
        campo: 'luz',
        pt: 'há cerca de 160 mil anos',
        en: 'about 160,000 years ago',
        procedencia: 'derivado',
        fonte: TEMPO_DA_LUZ,
      },
      {
        campo: 'naCena',
        pt: 'posição, distância e inclinação medidas; barra, braço, 30 Dourado e poeira são partículas de um modelo — não é foto',
        en: 'position, distance and tilt are measured; bar, arm, 30 Doradus and dust are particles of a model — not a photograph',
        procedencia: 'artistico',
        fonte: MODELO_DAS_VIZINHAS,
      },
    ],
  },
  {
    id: 'pequena-nuvem-de-magalhaes',
    nome: 'Pequena Nuvem de Magalhães',
    nomeEn: 'Small Magellanic Cloud',
    pt: ['Pequena Nuvem de Magalhães', 'Pequena Nuvem', 'PNM'],
    en: ['Small Magellanic Cloud', 'SMC'],
    alvo: { vizinha: 'pnm' },
    categoria: 'galaxia',
    classe: 'galáxia satélite',
    raioPc: 4_500,
    raioDePertoPc: 2_000,
    vista: 'doSol',
    distanciaPc: { valor: 62_440, fonte: 'Graczyk et al. 2020' },
    oQueE: {
      pt: 'A companheira menor da Grande Nuvem, deformada pela maré das duas maiores: é comprida na direção da nossa visada, com a Asa voltada para a Grande Nuvem e uma ponte de gás e estrelas jovens entre as duas.',
      en: 'The smaller companion of the Large Cloud, bent out of shape by the tides of the two bigger galaxies: it is stretched along our line of sight, with its Wing pointing to the Large Cloud and a bridge of gas and young stars between the two.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: 'cerca de 19 mil anos-luz no céu, e mais ainda em profundidade',
        en: 'about 19,000 light-years on the sky, and more in depth',
        procedencia: 'derivado',
        fonte: {
          pt: 'de Vaucouleurs RC3 (5,3°) × distância; Scowcroft et al. 2016',
          en: 'de Vaucouleurs RC3 (5.3°) × distance; Scowcroft et al. 2016',
        },
      },
      {
        campo: 'massa',
        pt: 'estrelas: cerca de 300 milhões de sóis',
        en: 'stars: about 300 million suns',
        procedencia: 'medido',
        fonte: 'Stanimirović et al. 2004',
      },
      {
        campo: 'membros',
        pt: 'da ordem de 1 bilhão de estrelas',
        en: 'of the order of 1 billion stars',
        procedencia: 'derivado',
        fonte: MASSA_POR_ESTRELA,
      },
      {
        campo: 'luz',
        pt: 'há cerca de 200 mil anos',
        en: 'about 200,000 years ago',
        procedencia: 'derivado',
        fonte: TEMPO_DA_LUZ,
      },
      {
        campo: 'naCena',
        pt: 'posição e distância medidas; a forma alongada, a Asa e a ponte até a Grande Nuvem são partículas de um modelo — não é foto',
        en: 'position and distance are measured; the stretched shape, the Wing and the bridge to the Large Cloud are particles of a model — not a photograph',
        procedencia: 'artistico',
        fonte: MODELO_DAS_VIZINHAS,
      },
    ],
  },
  {
    id: 'andromeda',
    nome: 'Galáxia de Andrômeda',
    nomeEn: 'Andromeda Galaxy',
    pt: ['Galáxia de Andrômeda', 'Andrômeda', 'M31', 'Messier 31', 'NGC 224'],
    en: ['Andromeda Galaxy', 'Andromeda', 'M31', 'Messier 31', 'NGC 224'],
    alvo: { vizinha: 'm31' },
    categoria: 'galaxia',
    classe: 'galáxia espiral',
    raioPc: 40_000,
    // de perto: o disco (26 kpc de raio no modelo) enche o quadro e a
    // câmera fica a ~37 kpc do centro, do lado de fora dele
    raioDePertoPc: 15_000,
    vista: 'doSol',
    distanciaPc: { valor: 761_000, fonte: 'Li et al. 2021 (HST)' },
    oQueE: {
      pt: 'A grande espiral mais próxima, maior que a Via Láctea: vista daqui quase de lado, com o bojo amarelo, o anel de estrelas novas a 30 mil anos-luz do centro e faixas de poeira no lado mais perto. Ao lado dela, M32 e M110. É o objeto mais distante que se vê a olho nu.',
      en: 'The nearest big spiral, larger than the Milky Way: seen from here almost edge-on, with its yellow bulge, the ring of young stars 30,000 light-years from the centre and dust lanes on the near side. Beside it, M32 and M110. It is the most distant thing you can see with the naked eye.',
    },
    fatos: [
      {
        campo: 'tamanho',
        pt: 'cerca de 150 mil anos-luz de um lado a outro (o disco de estrelas)',
        en: 'about 150,000 light-years across (the stellar disc)',
        procedencia: 'derivado',
        fonte: { pt: 'de Vaucouleurs RC3 (190′) × distância', en: 'de Vaucouleurs RC3 (190′) × distance' },
      },
      {
        campo: 'massa',
        pt: 'estrelas: 100 a 150 bilhões de sóis; com a matéria escura, ~1,5 trilhão',
        en: 'stars: 100 to 150 billion suns; with dark matter, ~1.5 trillion',
        procedencia: 'medido',
        fonte: 'Tamm et al. 2012; Watkins et al. 2010',
      },
      {
        campo: 'membros',
        pt: 'da ordem de 300 bilhões de estrelas',
        en: 'of the order of 300 billion stars',
        procedencia: 'derivado',
        fonte: MASSA_POR_ESTRELA,
      },
      {
        campo: 'luz',
        pt: 'há cerca de 2,5 milhões de anos',
        en: 'about 2.5 million years ago',
        procedencia: 'derivado',
        fonte: TEMPO_DA_LUZ,
      },
      {
        campo: 'naCena',
        pt: 'posição, distância, inclinação (77°) e ângulo medidos; bojo, disco, anel, poeira, M32 e M110 são partículas de um modelo — não é foto',
        en: 'position, distance, tilt (77°) and angle are measured; bulge, disc, ring, dust, M32 and M110 are particles of a model — not a photograph',
        procedencia: 'artistico',
        fonte: MODELO_DAS_VIZINHAS,
      },
    ],
  },
];
