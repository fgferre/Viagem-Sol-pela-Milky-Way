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
// ============================================================
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { MetaEfemerides } from '../lib/atlas/efemerides';
import { dateToTDB } from '../lib/atlas/time';
import { EPOCA_ISO, EPOCA_JD_TDB } from './world/planetas/retrato2026';
import {
  ANOS_DA_JANELA,
  AVISO_BUSCANDO,
  AVISO_FORA_DA_JANELA,
  AVISO_SEM_EFEMERIDE,
  DEGRAUS_DE_TEMPO,
  JANELA_EFEMERIDES,
  PALAVRA_DA_EPOCA,
  TAXAS_DE_TEMPO,
  degrauValido,
  estadoDoTempo,
  foraDaJanela,
  formatarInstante,
  formatarTaxa,
  grampearJd,
  lerPortaJd,
  taxaDoDegrau,
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
    expect(e.aviso).toBe(AVISO_FORA_DA_JANELA);
    expect(e.aviso).toContain(ANOS_DA_JANELA);
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
    expect(e.aviso).toBe(AVISO_SEM_EFEMERIDE);
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
    expect(e.aviso).toBe(AVISO_BUSCANDO);
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
describe('5. os rótulos são pt-BR e DERIVADOS do número', () => {
  it('a escada inteira, degrau a degrau', () => {
    expect(TAXAS_DE_TEMPO.map(formatarTaxa)).toEqual([
      'tempo real',
      '10 segundos por segundo',
      '1,7 minuto por segundo',
      '16,7 minutos por segundo',
      '2,8 horas por segundo',
      '1,2 dia por segundo',
      '11,6 dias por segundo',
      '115,7 dias por segundo',
    ]);
  });

  it('singular abaixo de dois, plural a partir de dois', () => {
    expect(formatarTaxa(90)).toBe('1,5 minuto por segundo');
    expect(formatarTaxa(120)).toBe('2 minutos por segundo');
    expect(formatarTaxa(86400 * 365.25 * 3)).toBe('3 anos por segundo');
  });

  it('taxa impossível não vira NaN na tela', () => {
    expect(formatarTaxa(Number.NaN)).toBe('parado');
    expect(formatarTaxa(0)).toBe('parado');
    expect(formatarTaxa(-5)).toBe('parado');
  });

  it('nenhum rótulo tem inglês nem número com ponto decimal', () => {
    for (const t of TAXAS_DE_TEMPO.map(formatarTaxa)) {
      expect(/\b(per|second|day|year|hour|real time)\b/i.test(t)).toBe(false);
      expect(/\d\.\d/.test(t)).toBe(false);
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
});
