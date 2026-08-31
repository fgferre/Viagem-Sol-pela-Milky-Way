// ============================================================
// A MÁQUINA DO TEMPO do Atlas — a parte PURA (Onda 5, decisão D2).
//
// Aqui moram a escada de taxas, a janela da tabela embarcada, o
// grampo, a leitura da porta `?jd=` e os dois formatadores em pt-BR.
// O Director é o dono do `jd`; este módulo é o que ele consulta para
// saber o que a escada oferece e o que o HUD deve dizer.
//
// A ESCADA NÃO É UMA TABELA À MÃO. O doador tinha 44 degraus digitados
// um a um, com rótulo escrito ao lado de cada um — uma lista que
// envelhece calada e em que ninguém consegue dizer por que 30 min/s
// existe e 45 não. Aqui a escada é uma ESCALA LOG CONTÍNUA amostrada:
// `taxa(i) = 10^i` segundos de céu por segundo de relógio, oito
// degraus, e o rótulo é DERIVADO do número por um formatador. Degrau
// novo é mudar um `8`; rótulo novo não existe, porque rótulo não é
// dado.
//
// A JANELA É DA TABELA, NÃO DESTE ARQUIVO. `efemerides.bin` cobre
// 1950–2050 TDB e o `MotorEfemerides` LANÇA fora dela (adaptação b do
// motor). Os dois literais abaixo são conferidos contra o manifesto
// real em `tempoDoAtlas.test.ts` — se a tabela for regenerada com
// outra janela, o teste quebra aqui antes de o visitante encontrar o
// erro no meio de um salto.
//
// Módulo PURO: sem window, sem three, sem React. A única dependência é
// o conversor de tempo da casa (regra M6: jd TDB passa por `time.ts`,
// nunca por Date/UT cru).
// ============================================================
import { tdbToDate } from '../lib/atlas/time';

// ---- a escada -----------------------------------------------------

/** Quantos degraus a escada tem. */
export const DEGRAUS_DE_TEMPO = 8;

/** Quantas décadas separam um degrau do seguinte (a escala é log). */
export const DECADAS_POR_DEGRAU = 1;

/**
 * As taxas, em SEGUNDOS DE CÉU POR SEGUNDO DE RELÓGIO. O degrau 0 é o
 * tempo real (1 s/s) e o último é 10⁷ s/s ≈ 115,7 dias por segundo —
 * um ano da Terra em 3,2 s, uma volta de Netuno em 8,7 min. Nenhum
 * número desta lista foi escolhido: todos saem da mesma potência.
 */
export const TAXAS_DE_TEMPO: readonly number[] = Array.from(
  { length: DEGRAUS_DE_TEMPO },
  (_, i) => 10 ** (i * DECADAS_POR_DEGRAU)
);

/** O sentido em que o relógio anda; 0 é parado. */
export type SentidoDoTempo = -1 | 0 | 1;

/** Índice de degrau grampeado na escada — nunca sai dela. */
export function degrauValido(indice: number): number {
  if (!Number.isFinite(indice)) return 0;
  return Math.min(Math.max(Math.round(indice), 0), DEGRAUS_DE_TEMPO - 1);
}

/** A taxa do degrau, em segundos de céu por segundo de relógio. */
export function taxaDoDegrau(indice: number): number {
  return TAXAS_DE_TEMPO[degrauValido(indice)];
}

// ---- a janela da tabela embarcada ---------------------------------

/**
 * A janela de `public/data/atlas/efemerides.bin`, em JD TDB —
 * 1950-01-01 a 2050-01-01. Literais, e conferidos contra o manifesto
 * real por teste: o HUD precisa saber grampear ANTES de o binário
 * chegar (senão o primeiro passo do visitante mandaria o motor lançar),
 * e uma segunda cópia que possa divergir em silêncio é pior que a
 * duplicação declarada.
 */
export const JANELA_EFEMERIDES = { jdInicio: 2433282.5, jdFim: 2469807.5 } as const;

/** Os dois anos da janela, como o badge os diz ao visitante. */
export const ANOS_DA_JANELA = '1950–2050';

/** O instante mostrado nunca sai da tabela — fora dela o motor lança. */
export function grampearJd(jd: number): number {
  if (!Number.isFinite(jd)) return JANELA_EFEMERIDES.jdInicio;
  return Math.min(Math.max(jd, JANELA_EFEMERIDES.jdInicio), JANELA_EFEMERIDES.jdFim);
}

/** O instante PEDIDO caiu fora do que a tabela cobre? */
export function foraDaJanela(jd: number): boolean {
  return !Number.isFinite(jd) || jd !== grampearJd(jd);
}

/**
 * O PEDIDO ANDA CONTRA A BORDA EM QUE JÁ SE ESTÁ? Estar em cima do
 * `jdFim` e pedir ⏵ é isso; estar lá e pedir ⏴ não é.
 *
 * Existe porque o relógio PISCAVA (item 115): `andarNoTempo` limpava a
 * parede sem olhar o sentido, então o aperto contra ela publicava um
 * quadro de mentira — o aviso sumia, o botão virava ⏸ — e o quadro
 * seguinte grampeava, repunha a parede e devolvia o ⏵. Com esta
 * pergunta o pedido impossível nunca chega a "despausar".
 */
export function contraAParede(jd: number, sentido: SentidoDoTempo): boolean {
  if (sentido === 0 || !Number.isFinite(jd)) return false;
  return sentido > 0 ? jd >= JANELA_EFEMERIDES.jdFim : jd <= JANELA_EFEMERIDES.jdInicio;
}

// ---- a porta `?jd=` -----------------------------------------------

/**
 * A palavra que a porta aceita no lugar de um número: `?jd=EPOCA` pede
 * o instante do retrato congelado. É com ela que o A/B da onda se faz
 * — as três vistas profundas com a porta ligada têm de sair BIT a BIT
 * iguais às sem ela, com o MESMO binário dos dois lados (precedente
 * `?corpos/?nocorpos`).
 */
export const PALAVRA_DA_EPOCA = 'EPOCA';

/**
 * Lê o valor de `?jd=`. Devolve `null` quando não há porta ou quando o
 * valor não é legível — quem chama avisa e segue com a época, em vez
 * de mostrar um céu em NaN.
 */
export function lerPortaJd(valor: string | null | undefined, jdDaEpoca: number): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const limpo = valor.trim();
  // NFD + corte dos diacríticos: `?jd=época` escrito com acento é o
  // mesmo pedido que `?jd=EPOCA` (o mesmo tratamento que a busca da F3
  // dá aos nomes das estrelas).
  const semAcento = limpo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (semAcento === PALAVRA_DA_EPOCA) return jdDaEpoca;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

// ---- os dois formatadores, em pt-BR --------------------------------

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Número em pt-BR com no máximo uma casa, sem a casa quando ela é
 * zero: `10`, `1,7`, `115,7`. Vírgula decimal, como se escreve aqui —
 * e não `Intl`, que depende do ICU que o Node foi compilado com.
 *
 * EXPORTADA desde a F3: a paleta da busca escreve distâncias em
 * anos-luz e precisa da mesma vírgula. Duas casas com a mesma regra
 * escrita duas vezes é como um "8,6" e um "8.6" aparecem na mesma tela.
 */
export function numeroPtBr(v: number): string {
  return v.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

const UNIDADES: readonly [number, string, string][] = [
  [1, 'segundo', 'segundos'],
  [60, 'minuto', 'minutos'],
  [3600, 'hora', 'horas'],
  [86400, 'dia', 'dias'],
  [86400 * 365.25, 'ano', 'anos'],
];

/**
 * O RÓTULO DA TAXA, derivado do número. Escolhe a maior unidade em que
 * o valor ainda é ≥ 1 e escreve "X <unidade> por segundo"; o tempo real
 * tem nome próprio porque "1 segundo por segundo" é uma charada, não
 * uma informação.
 *
 * Plural a partir de 2 (em pt-BR "1,5 dia" é singular e "2,8 horas" é
 * plural) — a mesma regra que a casa usa ao falar de distância.
 */
export function formatarTaxa(segPorSeg: number): string {
  if (!Number.isFinite(segPorSeg) || segPorSeg <= 0) return 'parado';
  if (segPorSeg === 1) return 'tempo real';
  let escolhida = UNIDADES[0];
  for (const u of UNIDADES) {
    if (segPorSeg >= u[0]) escolhida = u;
  }
  const valor = segPorSeg / escolhida[0];
  return `${numeroPtBr(valor)} ${valor >= 2 ? escolhida[2] : escolhida[1]} por segundo`;
}

/**
 * O INSTANTE em pt-BR, arredondado ao minuto: "1 de janeiro de 2026,
 * 00:00". A conversão de JD TDB para calendário passa pelo conversor
 * único da casa (`tdbToDate`, regra M6) — este arquivo não constrói
 * data nenhuma a partir de milissegundos crus.
 */
export function formatarInstante(jdTdb: number): string {
  if (!Number.isFinite(jdTdb)) return 'instante indefinido';
  const cru = tdbToDate(jdTdb);
  const d = new Date(Math.round(cru.getTime() / 60000) * 60000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}, ${hh}:${mm}`;
}

// ---- o estado que o HUD lê ----------------------------------------

/** O que o Director sabe do tempo e o HUD precisa desenhar. */
export interface EstadoDoTempo {
  /** o instante MOSTRADO, já grampeado na janela da tabela */
  jd: number;
  /** o instante formatado em pt-BR */
  data: string;
  /** índice do degrau na escada */
  degrau: number;
  /** o rótulo da taxa do degrau */
  taxa: string;
  sentido: SentidoDoTempo;
  /** o relógio segue o tempo real do visitante */
  aoVivo: boolean;
  /** o instante mostrado é o do retrato congelado */
  naEpoca: boolean;
  /**
   * O AVISO HONESTO, ou string vazia. É aqui que a máquina do tempo
   * conta o que não pode fazer: a tabela embarcada acabou, ou ela nem
   * chegou (sem rede) e o que está na tela é o retrato de sempre.
   */
  aviso: string;
}

/**
 * AS DUAS LEITURAS MOSTRAM A MESMA COISA? — a pergunta que decide se o
 * mostrador vai ao React ou fica calado.
 *
 * `jd` FICA DE FORA, e é a linha inteira deste conserto. No AO VIVO o
 * instante anda a cada segundo, mas `data` tem resolução de MINUTO
 * (`formatarInstante` arredonda), e nenhum outro campo se mexe: o mostrador
 * publicava quatro vezes por segundo um estado que, das duas uma, era
 * BIT A BIT o anterior (3 de cada 4) ou diferia só num número que ninguém
 * tem na tela (as outras). Medido: 13,8 ms/s de JS com a ficha fechada e
 * 16,7 ms/s com ela aberta, ~3,5 ms por publicação — o re-render do App
 * inteiro, que no M1 divide a thread com o WebGL.
 *
 * QUEM PRECISA DO `jd` EXATO não o recebe empurrado: lê `director.tempo` na
 * hora do gesto. É o caso do `?jd=` do "copiar link" (`useEspelhoDaUrl`),
 * que assim passou a sair EXATO em vez de até 250 ms atrasado.
 *
 * QUEM MOSTRA O `jd` — a ficha do objeto, no "AGORA" — passa a relê-lo
 * quando o MINUTO vira, que é a mesma cadência do relógio na tela: a ficha
 * e o mostrador deixaram de contar minutos diferentes.
 */
export function mesmoMostrador(a: EstadoDoTempo, b: EstadoDoTempo): boolean {
  return (
    a.data === b.data
    && a.degrau === b.degrau
    && a.taxa === b.taxa
    && a.sentido === b.sentido
    && a.aoVivo === b.aoVivo
    && a.naEpoca === b.naEpoca
    && a.aviso === b.aviso
  );
}

/** De onde vem a efeméride agora — o que decide o aviso. */
export type FaseDaEfemeride = 'retrato' | 'buscando' | 'viva' | 'indisponivel';

export const AVISO_SEM_EFEMERIDE = 'sem efeméride: a camada está congelada no retrato';
export const AVISO_BUSCANDO = 'buscando a efeméride…';
export const AVISO_FORA_DA_JANELA =
  `fora de ${ANOS_DA_JANELA} TDB: a tabela embarcada para aqui`;

/**
 * O ESTADO COMPLETO, puro — a mesma conta que o teste julga e que o
 * HUD desenha. `jdPedido` é o que o visitante (ou a porta) pediu; `jd`
 * é o que a tabela consegue mostrar.
 */
export function estadoDoTempo(entrada: {
  jdPedido: number;
  jdDaEpoca: number;
  degrau: number;
  sentido: SentidoDoTempo;
  aoVivo: boolean;
  efemeride: FaseDaEfemeride;
  /**
   * O relógio andou até a borda da tabela e PAROU lá. Sem este termo o
   * aviso sumiria justamente no caso mais comum: quem caminha até o
   * fim da janela fica com `jdPedido` EM CIMA da borda, que é um
   * instante perfeitamente dentro dela.
   */
  naParede?: boolean;
}): EstadoDoTempo {
  const jd = grampearJd(entrada.jdPedido);
  const aviso =
    entrada.efemeride === 'indisponivel'
      ? AVISO_SEM_EFEMERIDE
      : entrada.efemeride === 'buscando'
        ? AVISO_BUSCANDO
        : entrada.naParede === true || foraDaJanela(entrada.jdPedido)
          ? AVISO_FORA_DA_JANELA
          : '';
  return {
    jd,
    data: formatarInstante(jd),
    degrau: degrauValido(entrada.degrau),
    taxa: formatarTaxa(taxaDoDegrau(entrada.degrau)),
    sentido: entrada.sentido,
    aoVivo: entrada.aoVivo,
    naEpoca: jd === entrada.jdDaEpoca,
    aviso,
  };
}
