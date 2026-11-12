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
 *   Sagitário no centro e a galáxia ao lado dela.
 */
export type VistaDoLugar = 'doSol' | 'deCimaDoDisco' | 'sobreOSol' | 'abaixoDoDisco';

/** uma linha da ficha de um lugar — as palavras nas duas línguas */
export interface FatoDoLugar {
  campo: 'tamanho' | 'idade' | 'membros' | 'orbita' | 'nucleo' | 'noCatalogo' | 'naCena';
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
    | { cena: 'centroGalactico' | 'rumoAoCentro' | 'anaDeSagitario' };
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

export const LUGARES_DO_FILME: ReadonlyArray<LugarDoCeu> = [
  {
    id: 'sagittarius-a',
    nome: 'Sagittarius A✱',
    pt: ['Sagittarius A*', 'Sgr A*', 'Buraco negro', 'Centro da galáxia', 'Centro galáctico'],
    en: ['Sagittarius A*', 'Sgr A*', 'Black hole', 'Galactic center', 'Galactic centre'],
    alvo: { centroGalactico: true },
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
        pt: 'as nove nomeadas se espalham de 342 a 462 anos-luz na linha de visada: é o erro das paralaxes da era Hipparcos, não o aglomerado. Vistas do lado do Sol a forma é a do céu; de lado, viram um risco.',
        en: 'the nine named stars spread from 342 to 462 light-years along the line of sight: that is the error of Hipparcos-era parallaxes, not the cluster. Seen from the Sun’s side the shape is the one in the sky; from the side, they become a streak.',
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
        pt: '≈ 400 estrelas dentro do raio de maré',
        en: '≈ 400 stars within the tidal radius',
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
      pt: 'Um berçário de estrelas: uma nuvem de hidrogênio acesa por dentro pelas estrelas jovens do Trapézio. É a região de formação de estrelas de grande massa mais próxima do Sol, visível a olho nu na espada de Órion.',
      en: 'A stellar nursery: a hydrogen cloud lit from inside by the young stars of the Trapezium. It is the nearest region forming massive stars, visible to the naked eye in Orion’s sword.',
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
        pt: '≈ 2.000 estrelas jovens no aglomerado da nebulosa',
        en: '≈ 2,000 young stars in the nebula’s cluster',
        procedencia: 'derivado',
        fonte: 'Hillenbrand 1997',
      },
      {
        campo: 'naCena',
        pt: 'a nebulosa em si ainda não está desenhada: o gás do app perto de Órion é genérico e a nuvem dele mais próxima fica a ~200 anos-luz daqui. O lugar e a distância são reais; o brilho que se vê não é o de M42.',
        en: 'the nebula itself is not drawn yet: the app’s gas near Orion is generic and its nearest cloud is ~200 light-years from here. The place and the distance are real; the glow you see is not M42’s.',
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
    raioPc: 10_000,
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
        pt: 'uma volta do Sol em torno do centro leva ≈ 230 milhões de anos',
        en: 'one lap of the Sun around the centre takes ≈ 230 million years',
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
        fonte: 'Ibata, Gilmore & Irwin 1994',
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
];
