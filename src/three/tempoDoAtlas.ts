// ============================================================
// A MÁQUINA DO TEMPO do Atlas — a parte PURA (Onda 5, decisão D2).
//
// Aqui moram a escada de taxas, a janela da tabela embarcada, o
// grampo, a leitura da porta `?jd=`, o instante por extenso e a conta do
// que o relógio do Atlas escreve (`instanteDoMostrador`).
// O Director é o dono do `jd`; este módulo é o que ele consulta para
// saber o que a escada oferece e o que o HUD deve dizer.
//
// A ESCADA NÃO É UMA TABELA À MÃO. O doador tinha 44 degraus digitados
// um a um, com rótulo escrito ao lado de cada um — uma lista que
// envelhece calada e em que ninguém consegue dizer por que 30 min/s
// existe e 45 não. Aqui a escada é uma ESCALA LOG CONTÍNUA amostrada:
// `taxa(i) = 10^i` segundos de céu por segundo de relógio, oito
// degraus, e o rótulo é DERIVADO do número (o relógio, HudDoAtlas.tsx). Degrau
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
import { decimalDoIdioma, idiomaAtual, t } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';

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

// ---- os números e o instante, na língua do app ---------------------

/**
 * O NOME DO MÊS vem do dicionário (item 130): `tempo.mes.0`…`tempo.mes.11`.
 * A lista de doze literais que morava aqui virou doze chaves, e a ORDEM
 * da data por extenso — que em inglês é "January 1, 2026" e não "1 de
 * janeiro de 2026" — é ela própria uma chave (`tempo.data`), porque
 * traduzir só as palavras deixaria a data em inglês com a sintaxe
 * portuguesa.
 */
const MES = (i: number) => t(`tempo.mes.${i}` as ChaveDeTexto);

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

/**
 * O MESMO NÚMERO, na grafia da LÍNGUA DE AGORA (item 130): vírgula em
 * pt-BR, ponto em inglês. É este que a tela chama; `numeroPtBr` fica
 * sendo a grafia pt-BR pura, que as guardas comparam e que
 * `decimalDoIdioma` não pode mexer.
 */
export function numeroDoIdioma(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const [, inteiro, resto] = /^(-?\d+)(.*)$/.exec(decimalDoIdioma(v.toFixed(1).replace(/\.0$/, '')))!;
  // separador de MILHAR da língua (3.237 · 3,237) a partir de quatro algarismos
  return inteiro!.replace(/\B(?=(\d{3})+$)/g, idiomaAtual() === 'en' ? ',' : '.') + resto;
}

/** as quatro unidades da régua do relógio: o símbolo curto e o nome por extenso */
const UNIDADES: readonly [number, string, ChaveDeTexto, ChaveDeTexto][] = [
  [86400, 'd', 'tempo.dia', 'tempo.dias'],
  [3600, 'h', 'tempo.hora', 'tempo.horas'],
  [60, 'min', 'tempo.minuto', 'tempo.minutos'],
  [1, 's', 'tempo.segundo', 'tempo.segundos'],
];

/**
 * A TAXA DO DEGRAU, derivada do número: "1,2 d" curto (a régua e o
 * mostrador), ou "1,2 dia" / "1.2 days" por extenso (o painel e o leitor
 * de tela). A maior unidade em que o valor ainda é ≥ 1. Plural: em pt-BR
 * a partir de 2 ("1,5 dia"), em inglês fora do 1 exato ("1.2 days").
 */
export function formatarEtapa(degrau: number, porExtenso = false): string {
  const taxa = taxaDoDegrau(degrau);
  const [divisor, simbolo, um, varios] = UNIDADES.find(([d]) => taxa >= d) ?? UNIDADES[3];
  const valor = taxa / divisor;
  const numero = numeroDoIdioma(valor);
  if (!porExtenso) return `${numero} ${simbolo}`;
  const singular = idiomaAtual() === 'en' ? numero === '1' : valor < 2;
  return `${numero} ${t(singular ? um : varios)}`;
}

/**
 * O INSTANTE em pt-BR, arredondado ao minuto: "1 de janeiro de 2026,
 * 00:00". A conversão de JD TDB para calendário passa pelo conversor
 * único da casa (`tdbToDate`, regra M6) — este arquivo não constrói
 * data nenhuma a partir de milissegundos crus.
 */
export function formatarInstante(jdTdb: number): string {
  if (!Number.isFinite(jdTdb)) return t('tempo.instanteIndefinido');
  const cru = tdbToDate(jdTdb);
  const d = new Date(Math.round(cru.getTime() / 60000) * 60000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return t('tempo.data', {
    dia: d.getUTCDate(),
    mes: MES(d.getUTCMonth()),
    ano: d.getUTCFullYear(),
    hh,
    mm,
  });
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
  sentido: SentidoDoTempo;
  /** o relógio segue o tempo real do visitante */
  aoVivo: boolean;
  /** o instante mostrado é o do retrato congelado */
  naEpoca: boolean;
  /**
   * O AVISO HONESTO, como CÓDIGO, ou `''` (sem aviso). É aqui que a
   * máquina do tempo conta o que não pode fazer: a tabela embarcada
   * acabou, ou ela nem chegou (sem rede) e o que está na tela é o
   * retrato de sempre. A tela traduz ao desenhar (`textosDoAviso`).
   */
  aviso: AvisoDoTempo;
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
 * DESDE O RELÓGIO NOVO (20/11) a comparação é a do que ELE escreve
 * (`instanteDoMostrador`): ao vivo isso é o segundo, então o ao vivo fala
 * uma vez por segundo; na viagem rápida, o minuto. O teto de 4 por segundo
 * continua sendo a amostragem da máquina (`PASSO_DO_MOSTRADOR_S`).
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
    instanteDoMostrador(a) === instanteDoMostrador(b)
    && a.data === b.data
    && a.degrau === b.degrau
    && a.sentido === b.sentido
    && a.aoVivo === b.aoVivo
    && a.naEpoca === b.naEpoca
    && a.aviso === b.aviso
  );
}

/**
 * O QUE O RELÓGIO DO ATLAS ESCREVE (o relógio aprovado em 20/11): segundos
 * ao vivo, parado e nos degraus lentos; minutos a partir de 1.000 s/s, onde
 * os segundos virariam borrão; a DATA quando o céu anda dias por segundo
 * (com a hora e o minuto ao lado). Uma conta só, lida pelo relógio, pela
 * alça do telefone e por `mesmoMostrador` — a publicação fala exatamente
 * quando o que está escrito na tela muda.
 */
export type RegimeDoMostrador = 'segundos' | 'minutos' | 'data';

/** o primeiro degrau em que o relógio deixa de escrever os segundos */
const DEGRAU_DOS_MINUTOS = 3;

export function regimeDoMostrador(
  e: Pick<EstadoDoTempo, 'aoVivo' | 'sentido' | 'degrau'>
): RegimeDoMostrador {
  if (e.aoVivo || e.sentido === 0) return 'segundos';
  if (taxaDoDegrau(e.degrau) >= 86400) return 'data';
  return e.degrau >= DEGRAU_DOS_MINUTOS ? 'minutos' : 'segundos';
}

/** o instante civil (UTC) do mostrador, arredondado ao segundo */
export function instanteCivil(jd: number): Date {
  return new Date(Math.round(tdbToDate(jd).getTime() / 1000) * 1000);
}

/**
 * O instante na resolução que o relógio escreve, em ISO UTC: até o segundo
 * (`2026-11-20T22:56:54`) ou até o minuto (`2026-11-20T22:56`).
 */
export function instanteDoMostrador(e: EstadoDoTempo): string {
  const iso = instanteCivil(e.jd).toISOString();
  return iso.slice(0, regimeDoMostrador(e) === 'segundos' ? 19 : 16);
}

/** De onde vem a efeméride agora — o que decide o aviso. */
export type FaseDaEfemeride = 'retrato' | 'buscando' | 'viva' | 'indisponivel';

/**
 * O AVISO É CÓDIGO, NÃO TEXTO (A2, rodada 3): a máquina publica o que
 * aconteceu e a tela traduz ao desenhar. Texto pronto congelava na
 * língua da publicação — trocar a língua com o relógio parado deixava a
 * faixa na língua velha e o rótulo errado até o próximo gesto.
 */
export type AvisoDoTempo = '' | 'semEfemeride' | 'buscando' | 'limite';

/**
 * O RÓTULO E A FAIXA DE UM AVISO, na língua de AGORA — lidos a cada
 * desenho, então a troca de língua chega sem ninguém republicar.
 * Sem aviso, `null`: o rótulo é o do relógio (ao vivo, pausado…).
 */
export function textosDoAviso(aviso: AvisoDoTempo): { rotulo: string; faixa: string } | null {
  switch (aviso) {
    case 'semEfemeride':
      return { rotulo: t('relogio.retrato'), faixa: t('tempo.semEfemeride') };
    case 'buscando':
      return { rotulo: t('relogio.carregando'), faixa: t('tempo.buscando') };
    case 'limite':
      return { rotulo: t('relogio.limite'), faixa: t('tempo.foraDaJanela', { anos: ANOS_DA_JANELA }) };
    case '':
      return null;
  }
}

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
  const aviso: AvisoDoTempo =
    entrada.efemeride === 'indisponivel'
      ? 'semEfemeride'
      : entrada.efemeride === 'buscando'
        ? 'buscando'
        : entrada.naParede === true || foraDaJanela(entrada.jdPedido)
          ? 'limite'
          : '';
  return {
    jd,
    data: formatarInstante(jd),
    degrau: degrauValido(entrada.degrau),
    sentido: entrada.sentido,
    aoVivo: entrada.aoVivo,
    naEpoca: jd === entrada.jdDaEpoca,
    aviso,
  };
}
