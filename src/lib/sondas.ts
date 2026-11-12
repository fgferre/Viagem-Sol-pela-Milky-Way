// ============================================================
// AS SONDAS — a tabela das cinco que estão saindo do sistema solar
// (pilar 4 do NORTE, "as sondas com trajetória real", 12/11/2026) e a
// conta que as põe no lugar em qualquer data da janela.
//
// O DADO são os nós de `sondasNos.ts` (JPL Horizons, consultado em
// 2026-11-12; o pedido inteiro está no cabeçalho de lá). Nada de rede em
// tempo de execução e nada em `public/data`.
//
// A CONTA (`posicaoNoTrecho`): entre dois nós, a sonda segue o Sol sob
// dois corpos (Kepler em variáveis universais, que serve à elipse e à
// hipérbole) a partir do nó de partida, e o que os planetas e o
// bamboleio do Sol acrescentam é uma correção cúbica de Hermite que
// zera no nó de partida e reproduz o nó de chegada em posição E
// velocidade. Depois do último sobrevoo a correção é minúscula; nos
// sobrevoos a tabela tem nós de minutos.
//
// O ERRO, medido contra o Horizons em 60 instantes sorteados por sonda
// que NÃO são nós nem estão na grade (2026-11-12): no pior caso 2,0e-4 UA
// (Voyager 1, a ~160 UA: 30 mil km, 1e-4 %); em todo instante da grade
// densa que não virou nó o erro fica abaixo de max(1e-5 UA, 1e-6 × r).
//
// HONESTIDADE DA TRAJETÓRIA, como o próprio Horizons declara: antes de
// 1981-01-01 (Voyager 1) e de 1989-08-29 (Voyager 2) a trajetória é a
// de projeto da missão, com cônicas ajustadas aos encontros ("precisão
// grosseira"); depois, o reajuste de 2022 dos dados de rastreio, que
// acabaram em 1992 — o que vem depois é previsão. As Pioneer usam as
// soluções da navegação da época (DE118). A ficha diz isso.
// ============================================================
import { NOS_DAS_SONDAS } from './sondasNos';

/** μ do Sol em UA³/dia² — k², a constante gaussiana */
const MU_SOL = 0.01720209895 ** 2;
const RAIZ_MU = Math.sqrt(MU_SOL);

/** o dia em que os nós e os fatos foram consultados */
export const CONSULTADO_EM = '2026-11-12';

export interface Bilingue {
  pt: string;
  en: string;
}

export interface SobrevooDaSonda {
  /** o corpo — id do Atlas quando ele existe aqui, para o nome */
  corpo: string;
  /** o nome quando o corpo não é do Atlas (Arrokoth) */
  nome?: Bilingue;
  /** a data da maior aproximação, UTC (AAAA-MM-DD) */
  data: string;
  fonte: string;
}

export interface Sonda {
  /** a chave do link (`?foco=voyager-1`) */
  id: string;
  /** o nome é o mesmo nas duas línguas */
  nome: string;
  /** o que a busca reconhece além do nome */
  apelidos: readonly string[];
  lancamento: { data: string; fonte: string };
  sobrevoos: readonly SobrevooDaSonda[];
  /** só as Voyager cruzaram — as outras não têm a linha */
  heliopausa?: { data: string; fonte: string };
  estado: { operando: boolean; texto: Bilingue; fonte: string };
  /** a confissão do trecho da trajetória que é de projeto, não medido */
  notaDaTrajetoria: Bilingue;
}

const NASA_V1 = 'NASA, science.nasa.gov/mission/voyager/voyager-1';
const NASA_V2 = 'NASA, science.nasa.gov/mission/voyager/voyager-2';
const NASA_P10 = 'NASA, science.nasa.gov/mission/pioneer-10';
const NASA_P11 = 'NASA, science.nasa.gov/mission/pioneer-11';
const NASA_NH = 'NASA, science.nasa.gov/mission/new-horizons';

export const SONDAS: readonly Sonda[] = [
  {
    id: 'voyager-1',
    nome: 'Voyager 1',
    apelidos: ['Voyager', 'V1'],
    lancamento: { data: '1977-09-05', fonte: NASA_V1 },
    sobrevoos: [
      { corpo: 'jupiter', data: '1979-03-05', fonte: NASA_V1 },
      { corpo: 'saturn', data: '1980-11-12', fonte: NASA_V1 },
    ],
    heliopausa: { data: '2012-08-25', fonte: NASA_V1 },
    estado: {
      operando: true,
      texto: {
        pt: 'operando; instrumentos sendo desligados para poupar energia',
        en: 'operating; instruments being switched off to save power',
      },
      fonte: NASA_V1,
    },
    notaDaTrajetoria: {
      pt: 'até 1981, trajetória de projeto da missão (precisão grosseira); depois, reajuste de 2022 do rastreio, que acabou em 1992 — o resto é previsão',
      en: 'until 1981, the mission-design trajectory (rough accuracy); after that, the 2022 refit of the tracking that ended in 1992 — the rest is prediction',
    },
  },
  {
    id: 'voyager-2',
    nome: 'Voyager 2',
    apelidos: ['Voyager', 'V2'],
    lancamento: { data: '1977-08-20', fonte: NASA_V2 },
    sobrevoos: [
      { corpo: 'jupiter', data: '1979-07-09', fonte: NASA_V2 },
      { corpo: 'saturn', data: '1981-08-26', fonte: NASA_V2 },
      { corpo: 'uranus', data: '1986-01-24', fonte: NASA_V2 },
      { corpo: 'neptune', data: '1989-08-25', fonte: NASA_V2 },
    ],
    heliopausa: { data: '2018-11-05', fonte: 'NASA/JPL, nota de 10/12/2018' },
    estado: {
      operando: true,
      texto: {
        pt: 'operando; missão estendida, com energia racionada',
        en: 'operating; extended mission, on rationed power',
      },
      fonte: NASA_V2,
    },
    notaDaTrajetoria: {
      pt: 'até o fim de agosto de 1989, trajetória de projeto da missão (precisão grosseira); depois, reajuste de 2022 do rastreio, que acabou em 1992 — o resto é previsão',
      en: 'until late August 1989, the mission-design trajectory (rough accuracy); after that, the 2022 refit of the tracking that ended in 1992 — the rest is prediction',
    },
  },
  {
    id: 'pioneer-10',
    nome: 'Pioneer 10',
    apelidos: ['Pioneer'],
    // 2 de março na hora da Flórida; 3 de março em UTC, a régua da casa
    lancamento: { data: '1972-03-03', fonte: 'JPL Horizons (cabeçalho da −23)' },
    sobrevoos: [{ corpo: 'jupiter', data: '1973-12-04', fonte: NASA_P10 }],
    estado: {
      operando: false,
      texto: {
        pt: 'em silêncio desde 23/01/2003, o último sinal recebido',
        en: 'silent since 23 Jan 2003, the last signal received',
      },
      fonte: NASA_P10,
    },
    notaDaTrajetoria: {
      pt: 'soluções da navegação da época (efeméride DE118); sem rastreio desde 2003 — a posição de hoje é previsão',
      en: 'navigation solutions of the time (DE118 ephemeris); no tracking since 2003 — today’s position is a prediction',
    },
  },
  {
    id: 'pioneer-11',
    nome: 'Pioneer 11',
    apelidos: ['Pioneer'],
    lancamento: { data: '1973-04-06', fonte: NASA_P11 },
    sobrevoos: [
      { corpo: 'jupiter', data: '1974-12-03', fonte: NASA_P11 },
      { corpo: 'saturn', data: '1979-09-01', fonte: NASA_P11 },
    ],
    estado: {
      operando: false,
      texto: {
        pt: 'em silêncio desde 24/11/1995, o último contato',
        en: 'silent since 24 Nov 1995, the last contact',
      },
      fonte: NASA_P11,
    },
    notaDaTrajetoria: {
      pt: 'soluções da navegação da época (efeméride DE118); sem rastreio desde 1995 — a posição de hoje é previsão',
      en: 'navigation solutions of the time (DE118 ephemeris); no tracking since 1995 — today’s position is a prediction',
    },
  },
  {
    id: 'new-horizons',
    nome: 'New Horizons',
    apelidos: ['NH', 'Novos Horizontes'],
    lancamento: { data: '2006-01-19', fonte: NASA_NH },
    sobrevoos: [
      { corpo: 'jupiter', data: '2007-02-28', fonte: NASA_NH },
      { corpo: 'pluto', data: '2015-07-14', fonte: NASA_NH },
      { corpo: 'arrokoth', nome: { pt: 'Arrokoth', en: 'Arrokoth' }, data: '2019-01-01', fonte: NASA_NH },
    ],
    estado: {
      operando: true,
      texto: { pt: 'operando; missão estendida', en: 'operating; extended mission' },
      fonte: NASA_NH,
    },
    notaDaTrajetoria: {
      pt: 'navegação da missão (KinetX), rastreio até julho de 2026 — depois, previsão',
      en: 'mission navigation (KinetX), tracking until July 2026 — after that, prediction',
    },
  },
];

export function sondaPorId(id: string): Sonda | undefined {
  return SONDAS.find((s) => s.id === id);
}

/** o primeiro e o último instante da tabela (JD TDB) — fora dele a sonda
 *  não está desenhada (antes do lançamento ela não existe) */
export function janelaDaSonda(id: string): [number, number] | null {
  const nos = NOS_DAS_SONDAS[id];
  if (!nos || nos.length < 2) return null;
  return [nos[0][0], nos[nos.length - 1][0]];
}

/** os instantes dos nós — a linha da trajetória se amostra entre eles */
export function nosDaSonda(id: string): readonly (readonly number[])[] {
  return NOS_DAS_SONDAS[id] ?? [];
}

function stumpff(z: number): [number, number] {
  if (z > 1e-8) {
    const s = Math.sqrt(z);
    return [(s - Math.sin(s)) / (s * z), (1 - Math.cos(s)) / z];
  }
  if (z < -1e-8) {
    const s = Math.sqrt(-z);
    return [(Math.sinh(s) - s) / (s * -z), (Math.cosh(s) - 1) / -z];
  }
  return [1 / 6 - z / 120, 1 / 2 - z / 24];
}

/**
 * Dois corpos em torno do Sol, de um estado [jd, r, v] até `jd` —
 * variáveis universais (Curtis, algoritmos 3.3 e 3.4). Devolve
 * [x, y, z, vx, vy, vz].
 */
export function propagarKepler(e: readonly number[], jd: number): number[] {
  const dt = jd - e[0];
  const r0 = Math.hypot(e[1], e[2], e[3]);
  const v2 = e[4] * e[4] + e[5] * e[5] + e[6] * e[6];
  const vr0 = (e[1] * e[4] + e[2] * e[5] + e[3] * e[6]) / r0;
  const alfa = 2 / r0 - v2 / MU_SOL;
  let x = RAIZ_MU * Math.abs(alfa) * dt;
  if (Math.abs(alfa) < 1e-6 || !Number.isFinite(x)) x = (RAIZ_MU * dt) / r0;
  for (let i = 0; i < 60; i++) {
    const z = alfa * x * x;
    const [S, C] = stumpff(z);
    const F = ((r0 * vr0) / RAIZ_MU) * x * x * C + (1 - alfa * r0) * x * x * x * S + r0 * x - RAIZ_MU * dt;
    const dF = ((r0 * vr0) / RAIZ_MU) * x * (1 - z * S) + (1 - alfa * r0) * x * x * C + r0;
    const passo = F / dF;
    x -= passo;
    if (Math.abs(passo) < 1e-13 * Math.max(1, Math.abs(x))) break;
  }
  const z = alfa * x * x;
  const [S, C] = stumpff(z);
  const f = 1 - ((x * x) / r0) * C;
  const g = dt - (x * x * x * S) / RAIZ_MU;
  const rx = f * e[1] + g * e[4];
  const ry = f * e[2] + g * e[5];
  const rz = f * e[3] + g * e[6];
  const r = Math.hypot(rx, ry, rz);
  const fd = (RAIZ_MU / (r * r0)) * (z * x * S - x);
  const gd = 1 - ((x * x) / r) * C;
  return [rx, ry, rz, fd * e[1] + gd * e[4], fd * e[2] + gd * e[5], fd * e[3] + gd * e[6]];
}

/**
 * O ESTADO entre dois nós: Kepler a partir de `a` mais a correção de
 * Hermite que leva o resíduo de zero (em `a`) ao resíduo medido em `b`,
 * em posição e velocidade. Devolve [x, y, z, vx, vy, vz] (UA, UA/dia).
 */
export function posicaoNoTrecho(a: readonly number[], b: readonly number[], jd: number): number[] {
  const h = b[0] - a[0];
  const s = (jd - a[0]) / h;
  const ka = propagarKepler(a, jd);
  const kb = propagarKepler(a, b[0]);
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  // as derivadas em s, divididas por h, dão a correção da velocidade
  const d01 = (-6 * s * s + 6 * s) / h;
  const d11 = (3 * s * s - 2 * s) / h;
  const out = new Array<number>(6);
  for (let k = 0; k < 3; k++) {
    const ep = b[1 + k] - kb[k];
    const ev = b[4 + k] - kb[3 + k];
    out[k] = ka[k] + h01 * ep + h11 * h * ev;
    out[3 + k] = ka[3 + k] + d01 * ep + d11 * h * ev;
  }
  return out;
}

/**
 * ONDE ESTÁ A SONDA no instante `jd` (JD TDB): posição e velocidade
 * heliocêntricas, eclíptica J2000, UA e UA/dia — o frame das efemérides
 * dos corpos. `null` fora da tabela: antes do lançamento ela não existe.
 */
export function estadoDaSonda(id: string, jd: number): number[] | null {
  const nos = NOS_DAS_SONDAS[id];
  if (!nos || !Number.isFinite(jd) || jd < nos[0][0] || jd > nos[nos.length - 1][0]) return null;
  let lo = 0;
  let hi = nos.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (nos[m][0] <= jd) lo = m;
    else hi = m;
  }
  return posicaoNoTrecho(nos[lo], nos[hi], jd);
}
