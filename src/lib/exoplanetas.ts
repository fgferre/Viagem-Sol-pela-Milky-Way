// ============================================================
// OS PRIMEIROS EXOPLANETAS — dez sistemas famosos em volta de estrelas
// reais (pilar 2 do NORTE, "toda estrela é um lugar", 12/11/2026).
//
// O DADO é a tabela PSCompPars do NASA Exoplanet Archive, consultada em
// 12/11/2026 pela TAP (`select ... from pscomppars where hostname in
// (...)`), embutida aqui sem rede em tempo de execução. Cada número
// carrega a procedência no vocabulário do selo:
//   - período, excentricidade, método e ano: `medido`;
//   - semieixo: `derivado` (sai do período pela 3ª lei de Kepler e da
//     massa da estrela; na imagem direta, da órbita vista — `medido`).
//     O valor é o do arquivo, mesmo onde ele não fecha com a massa da
//     estrela da tabela (Kepler-186 b–e, de Quintana 2014, ficam 10–21 %
//     menores que a 3ª lei daria) — a tabela é a fonte, não esta casa;
//   - raio: `medido` nos planetas que passam à frente da estrela (e em
//     β Pic b, pela luz dele); nos outros o arquivo o CALCULA da massa
//     pela relação massa–raio (Chen & Kipping 2017) — `derivado`;
//   - massa: `medido` quando é a massa verdadeira; quando a velocidade
//     radial só dá M·sen i, é a massa MÍNIMA (`minima`); em Kepler-186 o
//     arquivo a calcula do raio — `derivado`;
//   - temperatura de equilíbrio: sempre `derivado` (luminosidade,
//     distância e um albedo suposto).
//
// A ÓRBITA NO ESPAÇO. Do céu se mede a inclinação i (o trânsito a dá
// perto de 90°; a astrometria e a imagem direta, o valor); o ângulo do
// nodo no céu (Ω) só se mede por imagem ou astrometria — aqui só em
// β Pictoris e no cinturão de Fomalhaut. Sem medida, o nodo é 0° (para o
// norte celeste) e, sem i, a inclinação é 60° — a mediana de órbitas
// orientadas ao acaso. As duas escolhas são CONVENCIONAIS e a ficha diz.
//
// A FASE na órbita: real só onde existe um instante de conjunção (Tc)
// publicado — o meio do trânsito, ou a conjunção ajustada pela
// velocidade radial. Sem Tc, a fase é arbitrária (anomalia média zero
// em J2000) e a ficha diz.
//
// O QUE NÃO SE SABE: a aparência. Nenhum destes planetas foi resolvido
// em disco; a única cor medida é a de HD 189733 b (albedo azul, Evans
// et al. 2013). Os outros são esferas neutras do tamanho medido.
// ============================================================
import type { NamedStar } from '../three/config';
import type { Numero } from './atlas/estrelasVisitaveis';
import { resolverKepler } from './atlas/kepler';

export const EXOPLANETAS_CONSULTADOS_EM = '2026-11-12';
// AS FONTES SÃO SÓ CITAÇÃO, iguais nas duas línguas (crítica de 12/11:
// "relação massa–raio" e "12/11/2026", que em inglês lê 11 de dezembro,
// apareciam assim na ficha inglesa). O método fica neste comentário: MR é
// o raio tirado da massa pela relação massa–raio de Chen & Kipping.
const ARQUIVO = `NASA Exoplanet Archive, PSCompPars (${EXOPLANETAS_CONSULTADOS_EM})`;
const MR = 'NASA Exoplanet Archive; Chen & Kipping 2017, ApJ 834, 17';

export type Metodo = 'transito' | 'velocidadeRadial' | 'imagem';
export type Bilingue = { readonly pt: string; readonly en: string };

export interface Exoplaneta {
  /** id estável, também a chave do `?foco=` ('trappist-1e') */
  readonly id: string;
  readonly nome: string;
  /** outros nomes que a busca reconhece ('Dimidium', '51 Peg b') */
  readonly apelidos: readonly string[];
  readonly periodoDias: number;
  readonly aUA: number;
  readonly e: number;
  /** inclinação no céu (graus); `null` = não medida (convenção: 60°) */
  readonly iGraus: number | null;
  /** argumento do periastro (graus) do arquivo; 0 quando ausente */
  readonly omegaGraus: number;
  readonly raioTerra: Numero;
  /** massa em Terras; `minima` = M·sen i (velocidade radial) */
  readonly massaTerra: Numero & { readonly minima?: boolean };
  readonly teqK: number | null;
  readonly metodo: Metodo;
  readonly ano: number;
  /** o instante de conjunção (BJD_TDB) — a fase real; `null` = arbitrária */
  readonly tc: number | null;
  /** de onde vem o Tc: o trânsito ou a conjunção da velocidade radial */
  readonly origemDoTc?: 'transito' | 'velocidadeRadial';
  /** o arquivo marca o planeta como controverso (`pl_controv_flag`) */
  readonly contestado: boolean;
  /**
   * A COR MEDIDA, só onde existe: albedo geométrico por canal (R, G, B).
   * Ausente = aparência desconhecida, esfera neutra.
   */
  readonly albedo?: { readonly rgb: readonly [number, number, number]; readonly fonte: string };
}

export interface Cinturao {
  readonly nome: Bilingue;
  readonly aUA: number;
  readonly e: number;
  readonly iGraus: number;
  readonly nodoGraus: number;
  readonly fonte: string;
}

export interface SistemaPlanetario {
  readonly id: string;
  /** o `n` da estrela na lista de nomeadas — o catálogo ou as acrescentadas */
  readonly estrela: string;
  /** o nome do sistema como o mundo o diz ('51 Pegasi') */
  readonly nome: string;
  /** o nodo no céu (graus, do norte para o leste), quando medido */
  readonly nodo: { readonly graus: number; readonly fonte: string } | null;
  readonly planetas: readonly Exoplaneta[];
  readonly cinturoes?: readonly Cinturao[];
  /** o que a ficha do sistema conta, com fonte */
  readonly nota: Bilingue & { readonly fonte: string };
}

const medido = (v: number, fonte = ARQUIVO): Numero => ({ v, p: 'medido', fonte });
const derivado = (v: number, fonte = MR): Numero => ({ v, p: 'derivado', fonte });
const minima = (v: number): Numero & { minima: true } => ({ v, p: 'medido', fonte: ARQUIVO, minima: true });

/** um planeta em trânsito com raio e massa da tabela */
function p(
  id: string,
  nome: string,
  c: {
    P: number;
    a: number;
    e: number;
    i: number | null;
    w?: number;
    R: Numero;
    M: Numero & { minima?: boolean };
    teq: number | null;
    metodo: Metodo;
    ano: number;
    tc?: number;
    origemDoTc?: 'transito' | 'velocidadeRadial';
    contestado?: boolean;
    apelidos?: readonly string[];
    albedo?: Exoplaneta['albedo'];
  }
): Exoplaneta {
  return {
    id,
    nome,
    apelidos: c.apelidos ?? [],
    periodoDias: c.P,
    aUA: c.a,
    e: c.e,
    iGraus: c.i,
    omegaGraus: c.w ?? 0,
    raioTerra: c.R,
    massaTerra: c.M,
    teqK: c.teq,
    metodo: c.metodo,
    ano: c.ano,
    tc: c.tc ?? null,
    origemDoTc: c.tc ? (c.origemDoTc ?? (c.metodo === 'transito' ? 'transito' : 'velocidadeRadial')) : undefined,
    contestado: c.contestado ?? false,
    albedo: c.albedo,
  };
}

const AGOL = 'Agol et al. 2021, PSJ 2, 1; NASA Exoplanet Archive';
const t1 = (letra: string, P: number, a: number, e: number, i: number, w: number, R: number, M: number, teq: number, ano: number, tc: number) =>
  p(`trappist-1${letra}`, `TRAPPIST-1 ${letra}`, {
    P, a, e, i, w, R: medido(R, AGOL), M: medido(M, AGOL), teq, metodo: 'transito', ano, tc,
    apelidos: [`TRAPPIST-1${letra}`, `Trappist 1 ${letra}`],
  });

export const SISTEMAS_PLANETARIOS: readonly SistemaPlanetario[] = [
  {
    id: 'trappist-1',
    estrela: 'TRAPPIST-1',
    nome: 'TRAPPIST-1',
    nodo: null,
    planetas: [
      t1('b', 1.510826, 0.01154, 0.00622, 89.728, 336.86, 1.116, 1.374, 397.6, 2016, 2457322.514193),
      t1('c', 2.421937, 0.0158, 0.00654, 89.778, 282.45, 1.097, 1.308, 339.7, 2016, 2457282.8113871),
      t1('d', 4.049219, 0.02227, 0.00837, 89.896, -8.73, 0.788, 0.388, 286.2, 2016, 2457670.1463014),
      t1('e', 6.101013, 0.02925, 0.0051, 89.793, 108.37, 0.92, 0.692, 249.7, 2017, 2457660.3676621),
      t1('f', 9.20754, 0.03849, 0.01007, 89.74, 368.81, 1.045, 1.039, 217.7, 2017, 2457671.3737299),
      t1('g', 12.352446, 0.04683, 0.00208, 89.742, 191.34, 1.129, 1.321, 197.3, 2017, 2457665.3628439),
      t1('h', 18.772866, 0.06189, 0.00567, 89.805, 338.92, 0.755, 0.326, 171.7, 2017, 2457662.5741486),
    ],
    nota: {
      pt: 'Sete planetas rochosos do tamanho da Terra, todos passando à frente da estrela: o raio vem da sombra de cada trânsito e a massa, de como um adianta e atrasa o outro.',
      en: 'Seven rocky, Earth-sized planets, all passing in front of the star: the radius comes from each transit’s shadow and the mass from how they speed up and delay one another.',
      fonte: 'Gillon et al. 2017, Nature 542, 456; Agol et al. 2021, PSJ 2, 1',
    },
  },
  {
    id: 'proxima',
    estrela: 'Proxima Centauri',
    nome: 'Proxima Centauri',
    nodo: null,
    planetas: [
      p('proxima-b', 'Proxima b', {
        P: 11.18465, a: 0.04848, e: 0, i: null, w: 3.3, R: derivado(1.02), M: minima(1.055), teq: 218,
        metodo: 'velocidadeRadial', ano: 2016, tc: 2457897.9, apelidos: ['Proxima Centauri b', 'Proxima Cen b', 'Próxima b'],
      }),
      p('proxima-d', 'Proxima d', {
        P: 5.12338, a: 0.02881, e: 0, i: null, w: 4, R: derivado(0.692), M: minima(0.26), teq: 282,
        metodo: 'velocidadeRadial', ano: 2025, apelidos: ['Proxima Centauri d', 'Proxima Cen d', 'Próxima d'],
      }),
    ],
    nota: {
      pt: 'A estrela mais perto do Sol tem dois planetas achados pelo balanço que eles causam nela. Proxima c, anunciada em 2020, não consta da tabela consultada.',
      en: 'The nearest star to the Sun has two planets found by the wobble they cause in it. Proxima c, announced in 2020, is not in the table consulted.',
      fonte: `Anglada-Escudé et al. 2016, Nature 536, 437; ${ARQUIVO}`,
    },
  },
  {
    id: '51-peg',
    estrela: 'Helvetios',
    nome: '51 Pegasi',
    nodo: null,
    planetas: [
      p('51-peg-b', '51 Pegasi b', {
        P: 4.2307966, a: 0.052, e: 0.0063, i: 49.8, w: 0, R: derivado(14.1), M: medido(193.875), teq: 1329,
        metodo: 'velocidadeRadial', ano: 1995, tc: 2456326.9323, apelidos: ['51 Peg b', 'Dimidium'],
      }),
    ],
    nota: {
      pt: 'O primeiro planeta achado em volta de uma estrela como o Sol: um gigante mais perto da estrela que Mercúrio do Sol — o “Júpiter quente” que mudou o que se esperava de um sistema planetário.',
      en: 'The first planet found around a Sun-like star: a giant closer to its star than Mercury is to the Sun — the “hot Jupiter” that changed what a planetary system was expected to be.',
      fonte: 'Mayor & Queloz 1995, Nature 378, 355',
    },
  },
  {
    id: '55-cnc',
    estrela: 'Copernicus',
    nome: '55 Cancri',
    nodo: null,
    planetas: [
      p('55-cnc-e', '55 Cancri e', {
        P: 0.7365474, a: 0.01544, e: 0.05, i: 83.59, w: 86, R: medido(1.875), M: medido(7.99), teq: 1958,
        metodo: 'velocidadeRadial', ano: 2004, tc: 2457063.2096, origemDoTc: 'transito', apelidos: ['55 Cnc e', 'Janssen'],
      }),
      p('55-cnc-b', '55 Cancri b', {
        P: 14.651552, a: 0.118, e: 0.0029, i: 89.73, w: 23, R: derivado(13.9), M: medido(263.9785), teq: 700,
        metodo: 'velocidadeRadial', ano: 1996, tc: 2455495.595, apelidos: ['55 Cnc b', 'Galileo'],
      }),
      p('55-cnc-c', '55 Cancri c', {
        P: 44.3936, a: 0.247, e: 0.088, i: 89.73, w: 31, R: derivado(8.51), M: medido(54.4738), teq: 499,
        metodo: 'velocidadeRadial', ano: 2004, tc: 2455491.23, apelidos: ['55 Cnc c', 'Brahe'],
      }),
      p('55-cnc-f', '55 Cancri f', {
        P: 260.58, a: 0.802, e: 0.063, i: 89.73, w: 100, R: derivado(7.59), M: medido(44.812), teq: 277,
        metodo: 'velocidadeRadial', ano: 2007, tc: 2455236.4, apelidos: ['55 Cnc f', 'Harriot'],
      }),
      p('55-cnc-d', '55 Cancri d', {
        P: 4799, a: 5.6, e: 0.0913, i: 89.73, w: -90, R: derivado(13), M: medido(1232.493), teq: 105,
        metodo: 'velocidadeRadial', ano: 2002, tc: 2451517.8, apelidos: ['55 Cnc d', 'Lipperhey'],
      }),
    ],
    nota: {
      pt: 'Cinco planetas, de um mundo de lava que dá a volta em 17,7 horas (e) a um gigante a 5,6 UA (d).',
      en: 'Five planets, from a lava world that goes round in 17.7 hours (e) to a giant at 5.6 AU (d).',
      fonte: ARQUIVO,
    },
  },
  {
    id: 'tau-cet',
    estrela: 'τ Cet',
    nome: 'Tau Ceti',
    nodo: null,
    planetas: [
      p('tau-cet-g', 'Tau Ceti g', {
        P: 20, a: 0.133, e: 0.06, i: null, w: 35.341, R: derivado(1.18), M: minima(1.75), teq: 640,
        metodo: 'velocidadeRadial', ano: 2017, contestado: true, apelidos: ['tau Cet g', 'τ Cet g'],
      }),
      p('tau-cet-h', 'Tau Ceti h', {
        P: 49.41, a: 0.243, e: 0.23, i: null, w: 7.45, R: derivado(1.19), M: minima(1.83), teq: 473,
        metodo: 'velocidadeRadial', ano: 2017, contestado: true, apelidos: ['tau Cet h', 'τ Cet h'],
      }),
      p('tau-cet-f', 'Tau Ceti f', {
        P: 636.13, a: 1.334, e: 0.16, i: null, w: 119.75, R: derivado(1.81), M: minima(3.93), teq: 202,
        metodo: 'velocidadeRadial', ano: 2017, contestado: true, apelidos: ['tau Cet f', 'τ Cet f'],
      }),
    ],
    nota: {
      pt: 'Sinais de poucos metros por segundo, no limite do que os instrumentos medem: o arquivo marca os três como controversos, e o quarto de 2017 (e) já não consta.',
      en: 'Signals of a few metres per second, at the limit of what instruments measure: the archive flags all three as controversial, and the fourth from 2017 (e) is no longer listed.',
      fonte: `Feng et al. 2017, AJ 154, 135; ${ARQUIVO}`,
    },
  },
  {
    id: 'eps-eri',
    estrela: 'Ran',
    nome: 'Epsilon Eridani',
    nodo: null,
    planetas: [
      p('eps-eri-b', 'Epsilon Eridani b', {
        P: 2680, a: 3.53, e: 0.06, i: 40, w: 268, R: derivado(13.8), M: medido(317.828), teq: 112,
        metodo: 'velocidadeRadial', ano: 2000, tc: 2457388, apelidos: ['eps Eri b', 'ε Eri b', 'AEgir', 'Aegir'],
      }),
    ],
    nota: {
      pt: 'Uma estrela jovem e próxima com um gigante do tamanho de Júpiter a 3,5 UA; a inclinação veio da astrometria, que mede o balanço da estrela no céu.',
      en: 'A young, nearby star with a Jupiter-sized giant at 3.5 AU; the inclination came from astrometry, which measures the star’s wobble on the sky.',
      fonte: `Hatzes et al. 2000, ApJ 544, L145; ${ARQUIVO}`,
    },
  },
  {
    id: 'kepler-186',
    estrela: 'Kepler-186',
    nome: 'Kepler-186',
    nodo: null,
    planetas: [
      ...(
        [
          ['b', 3.8867907, 0.0343, 0, 89.6, 1.07, 1.24, 571, 2454966.3304],
          ['c', 7.267302, 0.0451, 0, 89.9, 1.25, 2.1, 464, 2455007.3142],
          ['d', 13.342996, 0.0781, 0, 89.1, 1.4, 2.54, 379, 2455009.9045],
          ['e', 22.407704, 0.11, 0, 89.84, 1.27, 2.15, 319, 2454986.8006],
        ] as const
      ).map(([l, P, a, e, i, R, M, teq, tc]) =>
        p(`kepler-186${l}`, `Kepler-186 ${l}`, {
          P, a, e, i, R: medido(R, 'Quintana et al. 2014, Science 344, 277'), M: derivado(M), teq,
          metodo: 'transito', ano: 2014, tc, apelidos: [`Kepler-186${l}`],
        })
      ),
      p('kepler-186f', 'Kepler-186 f', {
        P: 129.9441, a: 0.432, e: 0.04, i: 89.96, R: medido(1.17, 'Torres et al. 2015, ApJ 800, 99'), M: derivado(1.71), teq: 177,
        metodo: 'transito', ano: 2014, tc: 2455789.494, contestado: true, apelidos: ['Kepler-186f'],
      }),
    ],
    nota: {
      pt: 'Kepler-186 f foi o primeiro planeta do tamanho da Terra achado na zona habitável de outra estrela; hoje o arquivo o marca como controverso. A 580 anos-luz, a estrela é fraca demais para o catálogo da casa e entrou pela posição medida.',
      en: 'Kepler-186 f was the first Earth-sized planet found in another star’s habitable zone; the archive now flags it as controversial. At 580 light-years the star is too faint for the house catalogue and was added from its measured position.',
      fonte: `Quintana et al. 2014, Science 344, 277; ${ARQUIVO}`,
    },
  },
  {
    id: 'hd-189733',
    estrela: 'HD 189733',
    nome: 'HD 189733',
    nodo: null,
    planetas: [
      p('hd-189733b', 'HD 189733 b', {
        P: 2.21857567, a: 0.03126, e: 0, i: 85.71, w: 20, R: medido(12.66617, 'Stassun et al. 2017, AJ 153, 136'),
        M: medido(359.1479, 'Stassun et al. 2017, AJ 153, 136'), teq: 1209, metodo: 'transito', ano: 2005,
        tc: 2453955.5255511, apelidos: ['HD 189733b', 'HD189733 b'],
        // albedo geométrico 0,40 ± 0,12 entre 290 e 450 nm e < 0,12 entre
        // 450 e 570 nm (HST/STIS no eclipse); o vermelho não foi medido —
        // tomado igual ao teto do verde, escolha declarada
        albedo: { rgb: [0.06, 0.08, 0.4], fonte: 'Evans et al. 2013, ApJL 772, L16 (HST/STIS)' },
      }),
    ],
    nota: {
      pt: 'O único planeta desta lista com cor medida: no eclipse, o Hubble viu que ele reflete o azul e quase nada do verde — um gigante quente azul-escuro.',
      en: 'The only planet on this list with a measured colour: during the eclipse, Hubble saw it reflect blue and almost no green — a hot, deep-blue giant.',
      fonte: 'Evans et al. 2013, ApJL 772, L16',
    },
  },
  {
    id: 'fomalhaut',
    estrela: 'Fomalhaut',
    nome: 'Fomalhaut',
    nodo: { graus: 337.9, fonte: 'MacGregor et al. 2017, ApJ 842, 8 (ALMA)' },
    planetas: [],
    cinturoes: [
      {
        nome: { pt: 'cinturão de poeira', en: 'dust belt' },
        aUA: 136.3,
        e: 0.12,
        iGraus: 65.6,
        nodoGraus: 337.9,
        fonte: 'MacGregor et al. 2017, ApJ 842, 8 (ALMA)',
      },
    ],
    nota: {
      pt: '“Fomalhaut b”, fotografado em 2008 como planeta, se revelou uma nuvem de poeira em expansão — provavelmente o resto de uma colisão — que se apagou. Não há planeta confirmado: o que se vê é o cinturão de poeira medido.',
      en: '“Fomalhaut b”, photographed in 2008 as a planet, turned out to be an expanding dust cloud — probably the debris of a collision — that faded away. There is no confirmed planet: what you see is the measured dust belt.',
      fonte: 'Kalas et al. 2008, Science 322, 1345; Gáspár & Rieke 2020, PNAS 117, 9712',
    },
  },
  {
    id: 'bet-pic',
    estrela: 'β Pic',
    nome: 'Beta Pictoris',
    // o nodo foi transcrito de memória — falta conferir nos artigos
    nodo: { graus: 31.8, fonte: 'Lagrange et al. 2019 / GRAVITY 2020' },
    planetas: [
      p('bet-pic-c', 'Beta Pictoris c', {
        P: 1202, a: 2.7, e: 0.307, i: 88.93, w: -114.9, R: derivado(12.5), M: medido(2765.107), teq: 1250,
        metodo: 'velocidadeRadial', ano: 2019, apelidos: ['bet Pic c', 'β Pic c'],
      }),
      p('bet-pic-b', 'Beta Pictoris b', {
        P: 8682, a: 10.07, e: 0.105, i: 88.993, w: 23.7, R: medido(18.49485, 'Currie et al. 2013, ApJ 776, 15'), M: medido(2765.107),
        teq: 1612, metodo: 'imagem', ano: 2008, apelidos: ['bet Pic b', 'β Pic b'],
      }),
      p('bet-pic-d', 'Beta Pictoris d', {
        P: 33200, a: 26, e: 0.44, i: 89, w: 191, R: medido(14.12331568), M: medido(762.788), teq: 600,
        metodo: 'imagem', ano: 2026, apelidos: ['bet Pic d', 'β Pic d'],
      }),
    ],
    nota: {
      pt: 'Uma estrela de 23 milhões de anos com planetas fotografados direto, dentro do disco de poeira que se vê de perfil.',
      en: 'A 23-million-year-old star with planets photographed directly, inside the dust disk we see edge-on.',
      fonte: `Lagrange et al. 2010, Science 329, 57; ${ARQUIVO}`,
    },
  },
];

/**
 * AS ESTRELAS QUE O CATÁLOGO DA CASA NÃO NOMEIA. TRAPPIST-1 (V = 17) e
 * Kepler-186 (V = 15) estão abaixo do limite de magnitude 10 de
 * `stars.bin`; HD 189733 (V = 7,7) está no binário, mas não entre as
 * 1.726 nomeadas. As três entram na lista de nomeadas pela posição
 * medida (AR, Dec e distância do arquivo, Gaia), no MESMO quadro da
 * cena: ICRS equatorial, parsecs, o Sol na origem.
 */
const ANFITRIAS: readonly {
  n: string; ra: number; dec: number; d: number; m: number; s: string; bv?: number; hd?: number; hip?: number;
}[] = [
  { n: 'TRAPPIST-1', ra: 346.6263919, dec: -5.0434618, d: 12.42988881, m: 17.02, s: 'M8.0 V' },
  { n: 'Kepler-186', ra: 298.652736, dec: 43.9549884, d: 177.594, m: 15.138, s: 'M1', bv: 16.867 - 15.138 },
  { n: 'HD 189733', ra: 300.1821223, dec: 22.7097759, d: 19.7638, m: 7.67, s: 'K2 V', bv: 8.607 - 7.67, hd: 189733, hip: 98505 },
];

const GRAU = Math.PI / 180;

/** As nomeadas do catálogo, mais as anfitriãs que faltam (uma vez, no boot). */
export function comAnfitrias(named: readonly NamedStar[]): NamedStar[] {
  const lista = [...named];
  for (const a of ANFITRIAS) {
    if (lista.some((s) => s.n === a.n)) continue;
    const cd = Math.cos(a.dec * GRAU);
    lista.push({
      n: a.n,
      x: a.d * cd * Math.cos(a.ra * GRAU),
      y: a.d * cd * Math.sin(a.ra * GRAU),
      z: a.d * Math.sin(a.dec * GRAU),
      m: a.m,
      s: a.s,
      d: a.d,
      // `t` = 1: sem nome próprio na lista do catálogo (a designação é o nome)
      t: 1,
      ...(a.bv === undefined ? {} : { ci: Math.round(a.bv * 1000) / 1000 }),
      ...(a.hd === undefined ? {} : { hd: a.hd }),
      ...(a.hip === undefined ? {} : { hip: a.hip }),
    });
  }
  return lista;
}

/** a estrela entrou na lista pela mão desta tabela (não é do catálogo)? */
export function ehAnfitriaAcrescentada(nome: string): boolean {
  return ANFITRIAS.some((a) => a.n === nome);
}

export function sistemaDaEstrela(nome: string | null | undefined): SistemaPlanetario | null {
  if (!nome) return null;
  return SISTEMAS_PLANETARIOS.find((s) => s.estrela === nome) ?? null;
}

export function exoplanetaPorId(id: string): { planeta: Exoplaneta; sistema: SistemaPlanetario } | null {
  for (const sistema of SISTEMAS_PLANETARIOS) {
    const planeta = sistema.planetas.find((pl) => pl.id === id);
    if (planeta) return { planeta, sistema };
  }
  return null;
}

export function exoplanetaPorNome(nome: string): { planeta: Exoplaneta; sistema: SistemaPlanetario } | null {
  for (const sistema of SISTEMAS_PLANETARIOS) {
    const planeta = sistema.planetas.find((pl) => pl.nome === nome);
    if (planeta) return { planeta, sistema };
  }
  return null;
}

// ─── A ZONA HABITÁVEL ────────────────────────────────────────────────────

/**
 * Kopparapu et al. 2014, ApJL 787, L29, tabela 1 (planeta de 1 M⊕):
 * S_eff = S☉ + a·T + b·T² + c·T³ + d·T⁴, T = Teff − 5780 K, e a distância
 * d = √(L/S_eff) UA. A borda de dentro é o efeito estufa descontrolado;
 * a de fora, o efeito estufa máximo — a zona "conservadora". Coeficientes
 * transcritos de memória (o PDF não abriu como texto); a validade é
 * 2.600–7.200 K, e fora dela a temperatura é presa na borda (declarado).
 */
const HZ_DENTRO = [1.107, 1.332e-4, 1.58e-8, -8.308e-12, -1.931e-15] as const;
const HZ_FORA = [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16] as const;
export const HZ_TEFF_VALIDA: readonly [number, number] = [2600, 7200];
export const FONTE_DA_ZONA_HABITAVEL = 'Kopparapu et al. 2014, ApJL 787, L29';

function sEff(c: readonly number[], teffK: number): number {
  const T = Math.min(HZ_TEFF_VALIDA[1], Math.max(HZ_TEFF_VALIDA[0], teffK)) - 5780;
  return c[0] + c[1] * T + c[2] * T * T + c[3] * T ** 3 + c[4] * T ** 4;
}

/** As bordas da zona habitável conservadora, em UA. */
export function zonaHabitavel(teffK: number, lumLsol: number): { dentroUA: number; foraUA: number; presa: boolean } {
  return {
    dentroUA: Math.sqrt(lumLsol / sEff(HZ_DENTRO, teffK)),
    foraUA: Math.sqrt(lumLsol / sEff(HZ_FORA, teffK)),
    presa: teffK < HZ_TEFF_VALIDA[0] || teffK > HZ_TEFF_VALIDA[1],
  };
}

// ─── A CLASSE: o que se mede decide que tipo de mundo é (13/11/2026) ─────

/**
 * As sete classes. A CLASSE é derivada dos números do arquivo; a
 * SUPERFÍCIE que a cena desenha a partir dela é imaginada (a ficha diz).
 */
export type ClasseDoExoplaneta =
  | 'lava'
  | 'rochosoQuente'
  | 'rochosoTemperado'
  | 'gelado'
  | 'subnetuno'
  | 'giganteQuente'
  | 'giganteFrio';

/** a estrela que a classe precisa — os números da ficha física dela */
export interface EstrelaDoClima {
  readonly teffK: number;
  readonly raioRsol: number;
  readonly massaMsol: number;
  readonly luminosidadeLsol: number;
}

export interface ClimaDoExoplaneta {
  readonly classe: ClasseDoExoplaneta;
  /** a temperatura de equilíbrio CALCULADA aqui: Teff·√(R⋆/2a), albedo 0, calor espalhado pelo globo */
  readonly teqK: number;
  /** o ponto embaixo da estrela sem atmosfera: Teff·√(R⋆/a) = √2·Teq */
  readonly subestelarK: number;
  /** a temperatura da atmosfera: a maior entre a irradiada e a do arquivo
   *  (nos gigantes jovens de β Pic o arquivo traz a temperatura MEDIDA no
   *  espectro, de quem ainda brilha do calor da formação) */
  readonly atmosferaK: number;
  /** (R⋆/a)² — quanto a luz da estrela se dilui até o planeta */
  readonly diluicao: number;
  /** o tempo de travar por maré é menor que 1 bilhão de anos */
  readonly travado: boolean;
  /** g/cm³, só onde raio e massa verdadeira são medidos */
  readonly densidade: number | null;
  /** a classe de nuvens de Sudarsky (1 a 5) pela temperatura da atmosfera */
  readonly sudarsky: 1 | 2 | 3 | 4 | 5;
}

/**
 * AS FRONTEIRAS, uma por linha, com a fonte (as de memória dizem):
 *  - GIGANTE: massa ≥ 0,3 M♃ (95 M⊕), a quebra da relação massa–densidade
 *    dos gigantes (Hatzes & Rauer 2015, ApJL 810, L25). A massa mínima da
 *    velocidade radial vale: se o mínimo passa, a verdadeira também passa.
 *  - ROCHOSO: raio ≤ 1,6 R⊕, acima do qual a maioria tem envelope de gás
 *    (Rogers 2015, ApJ 801, 41) — ou, com raio e massa verdadeira medidos,
 *    densidade ≥ 5,5 g/cm³, a da Terra: 1 % da massa em gás já a derruba
 *    (Lopez & Fortney 2014, ApJ 792, 1). É o caso de 55 Cnc e.
 *  - SUB-NETUNO / GIGANTE DE GELO: o que sobra entre os dois.
 *  - LAVA: o ponto embaixo da estrela passa de 1.400 K, a fusão do basalto
 *    (Léger et al. 2011, Icarus 213, 1 — de memória).
 *  - QUENTE / TEMPERADO / GELADO: dentro, entre ou além das bordas da zona
 *    habitável conservadora (Kopparapu et al. 2014, a mesma da ficha) —
 *    dentro da borda o efeito estufa dispara e a água se perde.
 *  - GIGANTE QUENTE: atmosfera ≥ 900 K, as classes IV e V de nuvens
 *    (Sudarsky, Burrows & Pinto 2000, ApJ 538, 885); abaixo, I a III.
 *  - TRAVADO: o tempo de despin de Gladman et al. 1996 (Icarus 122, 166)
 *    com Q = 100, k₂ = 0,3, momento de inércia 0,33·MR² e dia inicial de
 *    24 h, abaixo de 1 bilhão de anos. Os parâmetros são suposições
 *    comuns; o resultado é derivado, não medido.
 */
export const FRONTEIRAS_DA_CLASSE = {
  giganteMassaTerra: 95,
  rochosoRaioTerra: 1.6,
  rochosoDensidade: 5.5,
  lavaSubestelarK: 1400,
  giganteQuenteK: 900,
  sudarskyK: [150, 350, 900, 1500] as const,
  travaAnos: 1e9,
} as const;

export const FONTES_DA_CLASSE =
  'Hatzes & Rauer 2015, ApJL 810, L25; Rogers 2015, ApJ 801, 41; Lopez & Fortney 2014, ApJ 792, 1; ' +
  'Léger et al. 2011, Icarus 213, 1; Kopparapu et al. 2014, ApJL 787, L29; ' +
  'Sudarsky, Burrows & Pinto 2000, ApJ 538, 885; Gladman et al. 1996, Icarus 122, 166';

const RSOL_UA = 0.00465047;
const ANO_S = 3.156e7;

/** o tempo (anos) de Gladman et al. 1996 para o giro cair no síncrono */
export function anosParaTravar(planeta: Exoplaneta, massaEstrelaMsol: number): number {
  const G = 6.674e-11;
  const a = planeta.aUA * 1.496e11;
  const mp = planeta.massaTerra.v * 5.972e24;
  const r = planeta.raioTerra.v * 6.371e6;
  const ms = massaEstrelaMsol * 1.989e30;
  const omega = (2 * Math.PI) / 86400;
  return (omega * a ** 6 * 0.33 * mp * 100) / (3 * G * ms * ms * 0.3 * r ** 3) / ANO_S;
}

/** a classe de nuvens de Sudarsky pela temperatura da atmosfera */
function classeDeSudarsky(tK: number): 1 | 2 | 3 | 4 | 5 {
  const [a, b, c, d] = FRONTEIRAS_DA_CLASSE.sudarskyK;
  return tK < a ? 1 : tK < b ? 2 : tK < c ? 3 : tK < d ? 4 : 5;
}

/** O CLIMA E A CLASSE de um planeta, só dos números (função pura). */
export function climaDoExoplaneta(planeta: Exoplaneta, estrela: EstrelaDoClima): ClimaDoExoplaneta {
  const F = FRONTEIRAS_DA_CLASSE;
  const raioUA = estrela.raioRsol * RSOL_UA;
  const subestelarK = estrela.teffK * Math.sqrt(raioUA / planeta.aUA);
  const teqK = subestelarK / Math.SQRT2;
  const atmosferaK = Math.max(teqK, planeta.teqK ?? 0);
  const R = planeta.raioTerra;
  const M = planeta.massaTerra;
  const densidade = R.p === 'medido' && M.p === 'medido' && !M.minima ? (5.513 * M.v) / R.v ** 3 : null;
  const hz = zonaHabitavel(estrela.teffK, estrela.luminosidadeLsol);
  let classe: ClasseDoExoplaneta;
  if (M.v >= F.giganteMassaTerra) {
    classe = atmosferaK >= F.giganteQuenteK ? 'giganteQuente' : 'giganteFrio';
  } else if (R.v <= F.rochosoRaioTerra || (densidade !== null && densidade >= F.rochosoDensidade)) {
    classe =
      subestelarK >= F.lavaSubestelarK
        ? 'lava'
        : planeta.aUA < hz.dentroUA
          ? 'rochosoQuente'
          : planeta.aUA > hz.foraUA
            ? 'gelado'
            : 'rochosoTemperado';
  } else {
    classe = 'subnetuno';
  }
  return {
    classe,
    teqK,
    subestelarK,
    atmosferaK,
    diluicao: (raioUA / planeta.aUA) ** 2,
    travado: anosParaTravar(planeta, estrela.massaMsol) < F.travaAnos,
    densidade,
    sudarsky: classeDeSudarsky(atmosferaK),
  };
}

/**
 * A SEMENTE de um planeta: o id em FNV-1a, três números em [0, 100) —
 * o mesmo planeta tem sempre a mesma cara.
 */
export function sementeDoExoplaneta(id: string): [number, number, number] {
  let h = 0x811c9dc5;
  const out: number[] = [];
  for (let k = 0; k < 3; k++) {
    for (const ch of `${id}#${k}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out.push((h % 100000) / 1000);
  }
  return [out[0]!, out[1]!, out[2]!];
}

// ─── A ÓRBITA NO ESPAÇO ──────────────────────────────────────────────────

/** inclinação convencional quando ela não foi medida (mediana isotrópica) */
export const INCLINACAO_CONVENCIONAL_GRAUS = 60;
const J2000 = 2451545.0;

type V3 = [number, number, number];
const cruz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function unit(a: V3): V3 {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}

/** a base da órbita: `u` aponta o nodo, `q` 90° adiante, `polo` a normal */
export interface BaseDaOrbita {
  readonly u: V3;
  readonly q: V3;
  readonly polo: V3;
}

/**
 * A BASE DE UMA ÓRBITA vista do Sol. `w` aponta da estrela para nós; o
 * norte e o leste são os do céu. O nodo `u` está a Ω do norte para o
 * leste; com a inclinação i, `q = cos i·v + sen i·w` — então o ponto
 * θ = ω + ν = 90° é o mais perto de nós: a CONJUNÇÃO (o trânsito), a
 * mesma convenção de f = 90° − ω das efemérides de trânsito.
 */
export function baseDaOrbita(posDaEstrela: readonly number[], iGraus: number, nodoGraus: number): BaseDaOrbita {
  const dir = unit([posDaEstrela[0], posDaEstrela[1], posDaEstrela[2]]);
  const w: V3 = [-dir[0], -dir[1], -dir[2]];
  let norte: V3 = [-dir[2] * dir[0], -dir[2] * dir[1], 1 - dir[2] * dir[2]];
  if (Math.hypot(...norte) < 1e-9) norte = [1, 0, 0];
  norte = unit(norte);
  const leste = unit(cruz([0, 0, 1], dir));
  const O = nodoGraus * GRAU;
  const i = iGraus * GRAU;
  const u = unit([
    Math.cos(O) * norte[0] + Math.sin(O) * leste[0],
    Math.cos(O) * norte[1] + Math.sin(O) * leste[1],
    Math.cos(O) * norte[2] + Math.sin(O) * leste[2],
  ]);
  const v = cruz(w, u);
  const q = unit([Math.cos(i) * v[0] + Math.sin(i) * w[0], Math.cos(i) * v[1] + Math.sin(i) * w[1], Math.cos(i) * v[2] + Math.sin(i) * w[2]]);
  return { u, q, polo: cruz(u, q) };
}

/** a inclinação e o nodo que a cena usa, e se cada um é medido */
export function geometriaDoPlaneta(planeta: Exoplaneta, sistema: SistemaPlanetario) {
  return {
    iGraus: planeta.iGraus ?? INCLINACAO_CONVENCIONAL_GRAUS,
    iMedida: planeta.iGraus !== null,
    nodoGraus: sistema.nodo?.graus ?? 0,
    nodoMedido: sistema.nodo !== null,
  };
}

/** a anomalia média no instante, pela conjunção quando ela existe */
export function anomaliaMedia(planeta: Exoplaneta, jd: number): number {
  const n = (2 * Math.PI) / planeta.periodoDias;
  if (planeta.tc === null) return n * (jd - J2000);
  const e = planeta.e;
  const nuT = Math.PI / 2 - planeta.omegaGraus * GRAU;
  const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nuT / 2));
  return E - e * Math.sin(E) + n * (jd - planeta.tc);
}

/** o ponto da elipse na anomalia excêntrica E, em UA, na base dada */
export function pontoDaOrbita(planeta: Exoplaneta, base: BaseDaOrbita, E: number): V3 {
  const { e, aUA } = planeta;
  const xp = aUA * (Math.cos(E) - e);
  const yp = aUA * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = planeta.omegaGraus * GRAU;
  // perifocal → (u, q): o periastro está a ω do nodo
  const cu = xp * Math.cos(w) - yp * Math.sin(w);
  const cq = xp * Math.sin(w) + yp * Math.cos(w);
  return [cu * base.u[0] + cq * base.q[0], cu * base.u[1] + cq * base.q[1], cu * base.u[2] + cq * base.q[2]];
}

/** onde o planeta está (UA, relativo à estrela, quadro da cena) no instante */
export function posicaoDoExoplaneta(planeta: Exoplaneta, base: BaseDaOrbita, jd: number): V3 {
  return pontoDaOrbita(planeta, base, resolverKepler(anomaliaMedia(planeta, jd), planeta.e));
}
