// Serve: chão — a escada de tempo é log de verdade, o grampo nunca deixa o motor sair da janela real, e o mostrador só repinta quando o que o relógio escreve muda
// ============================================================
// A MÁQUINA DO TEMPO, parte pura (Onda 5, F4/D2). Cinco assuntos:
//
//  1. A ESCADA é log de verdade — razão CONSTANTE entre degraus, não
//     uma lista à mão que por acaso cresce. É o teste que separa esta
//     escada dos 44 degraus digitados do doador.
//  2. A JANELA é a da tabela REAL — os dois literais são conferidos
//     contra `public/data/atlas/efemerides_meta.json`. Regenerar a
//     tabela com outra janela quebra aqui, não no meio de um salto.
//  3. O GRAMPO nunca deixa o motor ser chamado fora da janela (lá ele
//     LANÇA, adaptação b), e o pedido fora da janela vira AVISO.
//  4. A PORTA `?jd=` lê a palavra e o número, e recusa o resto.
//  5. OS RÓTULOS são pt-BR e derivados do número — nenhum deles é
//     digitado ao lado de um degrau.
//  6. O MOSTRADOR SÓ FALA QUANDO TEM O QUE DIZER — a guarda que tirou o
//     re-render do App de 4 Hz enquanto o relógio anda ao vivo.
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from '../lib/atlas/efemerides';
import { dateToTDB, tdbToDate } from '../lib/atlas/time';
import { definirIdioma } from '../lib/idioma';
import { EPOCA_ISO, EPOCA_JD_TDB } from './world/planetas/retrato2026';
import {
  ANOS_DA_JANELA,
  DEGRAUS_DE_TEMPO,
  JANELA_EFEMERIDES,
  PALAVRA_DA_EPOCA,
  TAXAS_DE_TEMPO,
  degrauValido,
  estadoDoTempo,
  foraDaJanela,
  formatarInstante,
  formatarEtapa,
  grampearJd,
  instanteDoMostrador,
  lerPortaJd,
  mesmoMostrador,
  numeroDoIdioma,
  regimeDoMostrador,
  taxaDoDegrau,
  textosDoAviso,
} from './tempoDoAtlas';

const meta = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../public/data/atlas/efemerides_meta.json', import.meta.url)),
    'utf8'
  )
) as MetaEfemerides;

// ============================================================
// 1. A escada
// ============================================================
describe('1. a escada de taxas é log contínua, não uma lista à mão', () => {
  it('tem os oito degraus e começa no tempo real', () => {
    expect(TAXAS_DE_TEMPO).toHaveLength(DEGRAUS_DE_TEMPO);
    expect(DEGRAUS_DE_TEMPO).toBe(8);
    expect(TAXAS_DE_TEMPO[0]).toBe(1);
  });

  it('a RAZÃO entre degraus vizinhos é a mesma em toda a escada', () => {
    const razoes = TAXAS_DE_TEMPO.slice(1).map((v, i) => v / TAXAS_DE_TEMPO[i]);
    for (const r of razoes) expect(r).toBeCloseTo(razoes[0], 12);
    // e a razão é a década declarada: é isso que faz a escada ser log
    expect(razoes[0]).toBeCloseTo(10, 12);
  });

  it('o topo cobre o sistema solar em tempo humano', () => {
    const topo = TAXAS_DE_TEMPO[DEGRAUS_DE_TEMPO - 1];
    // um ano da Terra em poucos segundos; uma volta de Netuno em minutos
    expect((365.25 * 86400) / topo).toBeLessThan(5);
    expect((164.8 * 365.25 * 86400) / topo).toBeLessThan(15 * 60);
  });

  it('o índice do degrau é grampeado nas duas pontas, e NaN vira 0', () => {
    expect(degrauValido(-3)).toBe(0);
    expect(degrauValido(99)).toBe(DEGRAUS_DE_TEMPO - 1);
    expect(degrauValido(Number.NaN)).toBe(0);
    expect(taxaDoDegrau(-1)).toBe(TAXAS_DE_TEMPO[0]);
    expect(taxaDoDegrau(99)).toBe(TAXAS_DE_TEMPO[DEGRAUS_DE_TEMPO - 1]);
  });
});

// ============================================================
// 2. A janela é a da tabela real
// ============================================================
describe('2. a janela declarada é a do manifesto embarcado', () => {
  it('os dois literais batem com efemerides_meta.json', () => {
    expect(JANELA_EFEMERIDES.jdInicio).toBe(meta.janela.jdInicio);
    expect(JANELA_EFEMERIDES.jdFim).toBe(meta.janela.jdFim);
  });

  it('os anos que o badge diz são os do manifesto', () => {
    expect(ANOS_DA_JANELA).toBe('1950–2050');
    expect(meta.escalaTempo).toBe('TDB');
  });

  it('a época do retrato mora DENTRO da janela, com folga', () => {
    expect(foraDaJanela(EPOCA_JD_TDB)).toBe(false);
    expect(grampearJd(EPOCA_JD_TDB)).toBe(EPOCA_JD_TDB);
  });
});

// ============================================================
// 3. O grampo
// ============================================================
describe('3. o grampo protege o motor, e o pedido fora vira aviso', () => {
  it('grampeia nas duas pontas e trata NaN', () => {
    expect(grampearJd(JANELA_EFEMERIDES.jdInicio - 1000)).toBe(JANELA_EFEMERIDES.jdInicio);
    expect(grampearJd(JANELA_EFEMERIDES.jdFim + 1000)).toBe(JANELA_EFEMERIDES.jdFim);
    expect(grampearJd(Number.NaN)).toBe(JANELA_EFEMERIDES.jdInicio);
    expect(foraDaJanela(Number.NaN)).toBe(true);
  });

  it('nas bordas exatas ainda está DENTRO', () => {
    expect(foraDaJanela(JANELA_EFEMERIDES.jdInicio)).toBe(false);
    expect(foraDaJanela(JANELA_EFEMERIDES.jdFim)).toBe(false);
  });

  it('pedir além da tabela mostra a borda E declara o desvio', () => {
    const e = estadoDoTempo({
      jdPedido: JANELA_EFEMERIDES.jdFim + 5000,
      jdDaEpoca: EPOCA_JD_TDB,
      degrau: 0,
      sentido: 1,
      aoVivo: false,
      efemeride: 'viva',
    });
    expect(e.jd).toBe(JANELA_EFEMERIDES.jdFim);
    expect(e.aviso).toBe('limite');
    expect(textosDoAviso(e.aviso)?.faixa).toContain(ANOS_DA_JANELA);
  });

  it('sem efeméride o aviso é o da camada congelada, e ele GANHA da janela', () => {
    const e = estadoDoTempo({
      jdPedido: JANELA_EFEMERIDES.jdFim + 5000,
      jdDaEpoca: EPOCA_JD_TDB,
      degrau: 3,
      sentido: 0,
      aoVivo: false,
      efemeride: 'indisponivel',
    });
    expect(e.aviso).toBe('semEfemeride');
  });

  it('enquanto busca, o aviso diz que está buscando', () => {
    const e = estadoDoTempo({
      jdPedido: EPOCA_JD_TDB,
      jdDaEpoca: EPOCA_JD_TDB,
      degrau: 0,
      sentido: 0,
      aoVivo: false,
      efemeride: 'buscando',
    });
    expect(e.aviso).toBe('buscando');
  });

  it('o aviso é CÓDIGO: em PT e em EN a máquina publica o mesmo, e a tela traduz ao desenhar (A2)', () => {
    const pedidos = [
      { efemeride: 'indisponivel' as const, jdPedido: EPOCA_JD_TDB },
      { efemeride: 'buscando' as const, jdPedido: EPOCA_JD_TDB },
      { efemeride: 'viva' as const, jdPedido: JANELA_EFEMERIDES.jdFim + 5000 },
      { efemeride: 'viva' as const, jdPedido: EPOCA_JD_TDB },
    ];
    const publicar = () =>
      pedidos.map(
        (p) => estadoDoTempo({ ...p, jdDaEpoca: EPOCA_JD_TDB, degrau: 0, sentido: 0, aoVivo: false }).aviso
      );
    const emPt = publicar();
    expect(emPt).toEqual(['semEfemeride', 'buscando', 'limite', '']);
    expect(textosDoAviso('')).toBeNull();
    expect(textosDoAviso('semEfemeride')).toEqual({
      rotulo: 'Retrato',
      faixa: 'sem efeméride: a camada está congelada no retrato',
    });
    expect(textosDoAviso('buscando')).toEqual({ rotulo: 'Carregando', faixa: 'buscando a efeméride…' });
    expect(textosDoAviso('limite')).toEqual({
      rotulo: 'Limite',
      faixa: `fora de ${ANOS_DA_JANELA} TDB: a tabela embarcada para aqui`,
    });
    definirIdioma('en');
    try {
      expect(publicar()).toEqual(emPt);
      expect(textosDoAviso('semEfemeride')).toEqual({
        rotulo: 'Portrait',
        faixa: 'no ephemeris: the layer is frozen at the portrait',
      });
      expect(textosDoAviso('buscando')).toEqual({ rotulo: 'Loading', faixa: 'fetching the ephemeris…' });
      expect(textosDoAviso('limite')).toEqual({
        rotulo: 'Limit',
        faixa: `outside ${ANOS_DA_JANELA} TDB: the embedded table stops here`,
      });
    } finally {
      definirIdioma('pt-BR');
    }
  });

  it('na época, com efeméride, não há aviso nenhum — e `naEpoca` é verdade', () => {
    const e = estadoDoTempo({
      jdPedido: EPOCA_JD_TDB,
      jdDaEpoca: EPOCA_JD_TDB,
      degrau: 0,
      sentido: 0,
      aoVivo: false,
      efemeride: 'retrato',
    });
    expect(e.aviso).toBe('');
    expect(e.naEpoca).toBe(true);
    expect(e.jd).toBe(EPOCA_JD_TDB);
  });
});

// ============================================================
// 4. A porta ?jd=
// ============================================================
describe('4. a porta ?jd= lê a palavra e o número', () => {
  it('a palavra da época devolve a época — com ou sem acento, em qualquer caixa', () => {
    for (const forma of ['EPOCA', 'epoca', 'Época', 'época', ' EPOCA ']) {
      expect(lerPortaJd(forma, EPOCA_JD_TDB), forma).toBe(EPOCA_JD_TDB);
    }
    expect(PALAVRA_DA_EPOCA).toBe('EPOCA');
  });

  it('número finito passa como está — inclusive fora da janela (quem grampeia é o grampo)', () => {
    expect(lerPortaJd('2451545', EPOCA_JD_TDB)).toBe(2451545);
    expect(lerPortaJd('2500000', EPOCA_JD_TDB)).toBe(2500000);
  });

  it('ausência e lixo devolvem null — o céu nunca vai a NaN por uma porta', () => {
    for (const ruim of [null, undefined, '', 'ontem', 'NaN', '1e']) {
      expect(lerPortaJd(ruim, EPOCA_JD_TDB), String(ruim)).toBeNull();
    }
  });
});

// ============================================================
// 5. Os rótulos
// ============================================================
describe('5. os rótulos são DERIVADOS do número', () => {
  const escada = (porExtenso: boolean) =>
    TAXAS_DE_TEMPO.map((_, i) => formatarEtapa(i, porExtenso));

  it('a escada inteira, degrau a degrau, curta e por extenso', () => {
    expect(escada(false)).toEqual([
      '1 s', '10 s', '1,7 min', '16,7 min', '2,8 h', '1,2 d', '11,6 d', '115,7 d',
    ]);
    expect(escada(true)).toEqual([
      '1 segundo', '10 segundos', '1,7 minuto', '16,7 minutos',
      '2,8 horas', '1,2 dia', '11,6 dias', '115,7 dias',
    ]);
  });

  it('o inglês tem ponto decimal e plural fora do 1 exato', () => {
    definirIdioma('en');
    try {
      expect(formatarEtapa(0, true)).toBe('1 second');
      expect(formatarEtapa(5, true)).toBe('1.2 days');
      expect(formatarEtapa(7)).toBe('115.7 d');
    } finally {
      definirIdioma('pt-BR');
    }
  });

  it('o instante da época é o que o ISO dela diz', () => {
    expect(formatarInstante(EPOCA_JD_TDB)).toBe('1 de janeiro de 2026, 00:00');
    expect(EPOCA_ISO).toBe('2026-01-01T00:00:00Z');
    // e a ida-e-volta passa pelo conversor único da casa (M6)
    expect(formatarInstante(dateToTDB(new Date('1969-07-20T20:17:00Z')))).toBe(
      '20 de julho de 1969, 20:17'
    );
  });

  it('as duas bordas da janela se leem em pt-BR — e a de cima cai em 2049', () => {
    expect(formatarInstante(JANELA_EFEMERIDES.jdInicio)).toContain('de 1950');
    // A ARMADILHA DE ~80 s, medida e declarada (a mesma que
    // `retrato.test.ts` cita): a janela é dada em TDB e o calendário que
    // o visitante lê é UT, e ΔT em 2050 vale ~80 s. A borda de cima, que
    // no manifesto é "2050-01-01T00:00:00 TDB", se lê como os últimos
    // minutos de 2049. Não é defeito de formatação: é a diferença de
    // escala aparecendo onde ela existe, e por isso o badge fala em
    // "1950–2050 TDB" com a escala DITA.
    expect(formatarInstante(JANELA_EFEMERIDES.jdFim)).toBe('31 de dezembro de 2049, 23:58');
  });

  it('instante impossível não vira NaN na tela', () => {
    expect(formatarInstante(Number.NaN)).toBe('instante indefinido');
  });

  it('número impossível não derruba a ficha nem vira NaN na tela', () => {
    expect(numeroDoIdioma(Number.NaN)).toBe('—');
    expect(numeroDoIdioma(Number.POSITIVE_INFINITY)).toBe('—');
    expect(numeroDoIdioma(3237.04)).toBe('3.237');
  });
});

// ============================================================
// 6. O mostrador só fala quando tem o que dizer
// ============================================================
describe('6. mesmoMostrador cala o que já foi dito', () => {
  // LONGE DA ÉPOCA de propósito: é onde o relógio ao vivo vive (o "agora"
  // do visitante não é 2026-08-16), e é a condição em que `naEpoca` fica
  // parado enquanto o resto anda.
  const T0 = EPOCA_JD_TDB + 10;
  const base = {
    jdPedido: T0,
    jdDaEpoca: EPOCA_JD_TDB,
    degrau: 0,
    sentido: 0 as const,
    aoVivo: true,
    efemeride: 'viva' as const,
  };
  const em = (jd: number) => estadoDoTempo({ ...base, jdPedido: jd });

  it('o mesmo instante duas vezes é a MESMA fala', () => {
    expect(mesmoMostrador(em(T0), em(T0))).toBe(true);
  });

  /**
   * O RELÓGIO DE 20/11 ESCREVE O QUE O REGIME PEDE, e a publicação segue o
   * que ele escreve: ao vivo, parado e nos degraus lentos, o SEGUNDO; a
   * partir de 1.000 s/s, o MINUTO; com dias por segundo, a data com hora e
   * minuto. Um `jd` que andou menos que a resolução do regime continua
   * calado — o caso que pagou o conserto de 24/08 (3,5 ms por publicação).
   */
  it('o regime decide a fala: segundo ao vivo, minuto rápido, data com dias por segundo', () => {
    // o instante de partida cai no segundo :15 de um minuto, longe das
    // duas viradas (a do segundo arredondado e a do minuto da `data`)
    const ms = tdbToDate(T0).getTime();
    const T = T0 + (Math.floor(ms / 60000) * 60000 + 15000 - ms) / 86400000;
    const s = 1 / 86400;
    const viagem = (degrau: number, jd: number) =>
      estadoDoTempo({ ...base, aoVivo: false, sentido: 1, degrau, jdPedido: jd });

    expect(regimeDoMostrador(em(T))).toBe('segundos');
    expect(mesmoMostrador(em(T), em(T + 0.3 * s))).toBe(true);
    expect(mesmoMostrador(em(T), em(T + 2 * s))).toBe(false);

    expect(regimeDoMostrador(viagem(3, T))).toBe('minutos');
    expect(mesmoMostrador(viagem(3, T), viagem(3, T + 8 * s))).toBe(true);
    expect(mesmoMostrador(viagem(3, T), viagem(3, T + 120 * s))).toBe(false);

    expect(regimeDoMostrador(viagem(5, T))).toBe('data');
    expect(instanteDoMostrador(viagem(5, T))).toHaveLength(16);
    expect(mesmoMostrador(viagem(5, T), viagem(5, T + 8 * s))).toBe(true);
  });

  it('o MINUTO virando é fala nova — é o que o visitante vê mudar', () => {
    const depois = em(T0 + 120 / 86400);
    expect(depois.data).not.toBe(em(T0).data);
    expect(mesmoMostrador(em(T0), depois)).toBe(false);
  });

  /**
   * `naEpoca` ENTRA na comparação, e este é o caso que obriga: 30 s depois
   * da época o MINUTO ainda é o mesmo, mas o instante deixou de ser o do
   * retrato congelado — e é `naEpoca` que acende o botão "voltar à época".
   * Sem este termo o botão ficaria mentindo por até um minuto.
   */
  it('sair da época é fala nova mesmo dentro do mesmo minuto', () => {
    const naEpoca = estadoDoTempo({ ...base, jdPedido: EPOCA_JD_TDB });
    const logoDepois = estadoDoTempo({ ...base, jdPedido: EPOCA_JD_TDB + 30 / 86400 });
    expect(logoDepois.data).toBe(naEpoca.data);
    expect(naEpoca.naEpoca).toBe(true);
    expect(logoDepois.naEpoca).toBe(false);
    expect(mesmoMostrador(naEpoca, logoDepois)).toBe(false);
  });

  it('cada gesto do visitante é fala nova: degrau, sentido, ao vivo', () => {
    const mudou = [
      { ...base, degrau: 3 },
      { ...base, sentido: 1 as const },
      { ...base, aoVivo: false },
    ];
    for (const e of mudou) {
      expect(mesmoMostrador(em(T0), estadoDoTempo(e))).toBe(false);
    }
  });

  it('o AVISO que chega e o que sai são fala nova — a honestidade não pode calar', () => {
    const buscando = estadoDoTempo({ ...base, efemeride: 'buscando' });
    const indisponivel = estadoDoTempo({ ...base, efemeride: 'indisponivel' });
    expect(buscando.aviso).toBe('buscando');
    expect(indisponivel.aviso).toBe('semEfemeride');
    expect(mesmoMostrador(em(T0), buscando)).toBe(false);
    expect(mesmoMostrador(buscando, indisponivel)).toBe(false);
    expect(mesmoMostrador(buscando, em(T0))).toBe(false);
  });
});
