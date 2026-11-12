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
    | 'luz';
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
  vista?: VistaDoLugar;
  /** uma VISTA, não um objeto (a galáxia de cima, o endereço do Sol):
   *  não ganha nome na cena — quem marca o lugar é o rótulo do Sol */
  semRotulo?: true;
  /** a distância da LITERATURA ao Sol, em pc (a ficha a escreve em
   *  anos-luz — parsec não aparece na tela) */
  distanciaPc?: { valor: number; fonte: string; doSolAoCentro?: true };
  oQueE?: { pt: string; en: string };
  fatos?: readonly FatoDoLugar[];
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
    distanciaPc: { valor: 8150, fonte: 'Reid et al. 2019 (VLBI)', doSolAoCentro: true },
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
        pt: 'de perto, a sombra e o disco têm o tamanho real, e a luz das estrelas e do gás atrás deles é desviada pela relatividade geral, calculada aqui raio a raio (buraco sem rotação). O disco de acreção é o “Gargantua”, inspirado no filme Interstellar, e o brilho dele é artístico: o gás que cai em Sgr A✱ é ralo e brilha em rádio e raios X, quase nada em luz visível. De longe o disco é desenhado muito maior que o real (até 125.884 vezes), para ser visto, e encolhe até o tamanho verdadeiro a 8,5 UA do buraco. Onde a luz desviada viria de fora da tela, mostra-se a cena sem desvio — uma aproximação.',
        en: 'up close, the shadow and the disc are true to size, and the light of the stars and gas behind them is bent by general relativity, computed here ray by ray (non-rotating hole). The accretion disc is the “Gargantua”, inspired by the film Interstellar, and its brightness is artistic: the gas falling into Sgr A✱ is thin and shines in radio and X-rays, hardly at all in visible light. From afar the disc is drawn far larger than real (up to 125,884 times) so it can be seen, and it shrinks to its true size 8.5 AU from the hole. Where the bent light would come from outside the screen, the unbent scene is shown — an approximation.',
        procedencia: 'derivado',
        fonte: {
          pt: 'relatividade geral (Schwarzschild 1916)',
          en: 'general relativity (Schwarzschild 1916)',
        },
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
    alvo: { pc: [64.28, 97.63, 52.59] },
    membros: ['Alcyone', 'Atlas', 'Electra', 'Maia', 'Merope', 'Taygeta', 'Pleione', 'Celaeno', 'Asterope'],
    categoria: 'aglomerado',
    classe: 'aglomerado aberto',
    // 7 pc põem a câmera a ~45 pc do centro, do lado do Sol: perto o
    // bastante para as nove encherem o miolo do quadro, longe o bastante
    // para o erro de profundidade do catálogo (ver `naCena`) não desfazer
    // a forma que se conhece do céu
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
        fonte: 'Dahm 2015 (lithium depletion boundary)',
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
        pt: 'as distâncias do catálogo para estas estrelas são medidas antigas e espalham o aglomerado ao longo da linha de visada (de 342 a 462 anos-luz); por isso a vista é do lado do Sol, onde a forma é a do céu.',
        en: 'the catalogue’s distances for these stars are older measurements and spread the cluster along the line of sight (342 to 462 light-years); that is why the view is from the Sun’s side, where the shape is the one in the sky.',
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
    alvo: { pc: [17.33, 39.96, 14.46] },
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
        pt: 'as distâncias do catálogo para estas estrelas são medidas antigas e espalham um pouco o aglomerado ao longo da linha de visada.',
        en: 'the catalogue’s distances for these stars are older measurements and spread the cluster a little along the line of sight.',
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
    // a posição da literatura (RA 5h35m17s, Dec −5°23′28″) a 414 pc —
    // nenhuma nomeada do catálogo é membro do aglomerado da nebulosa
    alvo: { pc: [44.39, 409.82, -38.89] },
    categoria: 'nebulosa',
    classe: 'nebulosa de emissão',
    raioPc: 4,
    vista: 'doSol',
    distanciaPc: { valor: 414, fonte: 'Menten et al. 2007 (VLBA)' },
    oQueE: {
      pt: 'O gás da nebulosa ainda não está desenhado: o que se vê aqui são as estrelas da espada e do cinturão de Órion. A nebulosa de verdade é um berçário de estrelas: uma nuvem de hidrogênio acesa por dentro pelas estrelas jovens do Trapézio. É a região de formação de estrelas de grande massa mais próxima do Sol, visível a olho nu na espada de Órion.',
      en: 'The nebula’s gas is not drawn yet: what you see here are the stars of Orion’s sword and belt. The real nebula is a stellar nursery: a hydrogen cloud lit from inside by the young stars of the Trapezium. It is the nearest region forming massive stars, visible to the naked eye in Orion’s sword.',
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
        campo: 'naCena',
        pt: 'o gás da nebulosa ainda não está desenhado; o que se vê são as estrelas da espada e do cinturão de Órion. O lugar e a distância são reais.',
        en: 'the nebula’s gas is not drawn yet; what you see are the stars of Orion’s sword and belt. The place and the distance are real.',
        procedencia: 'artistico',
        fonte: MODELO_DA_CASA,
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
        pt: 'braços, barra, gás e poeira são partículas de um modelo; o desenho segue as medidas, não uma foto',
        en: 'arms, bar, gas and dust are particles of a model; the drawing follows measurements, not a photograph',
        procedencia: 'artistico',
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
        pt: 'a posição do Sol é medida; o desenho dos braços em volta dele é um modelo de partículas',
        en: 'the Sun’s position is measured; the arms drawn around it are a particle model',
        procedencia: 'artistico',
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
