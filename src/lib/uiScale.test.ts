// ============================================================
// A ESCALA DA UI — a leitura da porta e A REGRA DO CSS.
//
// A segunda parte é o teste que importa, e ele é do mesmo feitio do de
// completude do selo: varre o `hud.css` INTEIRO e cobra que TODA
// declaração de `font-size` seja reativa à raiz. É a tranca do defeito
// achado do painel de UI: nove `clamp(rem, vw, rem)` nos títulos mais
// proeminentes, onde
// o termo do meio é fração da JANELA e ignora o `font-size` da raiz: o
// visitante subia o tamanho do texto e justamente os títulos ficavam
// onde estavam.
//
// Por que uma REGRA sobre o arquivo e não uma lista de nove seletores:
// uma lista envelhece calada na próxima regra de CSS que alguém
// escrever. A regra alcança as que ainda não existem.
// ============================================================
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEGRAUS_DA_UI,
  ESCALA_MAX,
  ESCALA_MIN,
  ESCALA_PADRAO,
  lerEscalaDaUi,
  rotuloDaEscala,
} from './uiScale';

const HUD_DIR = new URL('../hud/', import.meta.url);
const HUD_CSS = readdirSync(HUD_DIR)
  .sort()
  .map((fatia) => readFileSync(new URL(fatia, HUD_DIR), 'utf8'))
  .join('\n');
const INDEX_CSS = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const DECLARACOES = [...HUD_CSS.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim());

describe('1. a porta ?ui=', () => {
  it('ausente ou lixo é o tamanho de sempre — nunca NaN na raiz', () => {
    for (const cru of [null, '', '  ', 'abc', 'NaN', 'Infinity']) {
      expect(lerEscalaDaUi(cru), `?ui=${cru}`).toBe(ESCALA_PADRAO);
    }
  });

  it('valor da faixa passa inteiro', () => {
    expect(lerEscalaDaUi('1.2')).toBe(1.2);
    expect(lerEscalaDaUi(String(ESCALA_MIN))).toBe(ESCALA_MIN);
    expect(lerEscalaDaUi(String(ESCALA_MAX))).toBe(ESCALA_MAX);
  });

  it('fora da faixa é GRAMPEADO, não descartado — quem pediu o maior quer o maior', () => {
    expect(lerEscalaDaUi('9')).toBe(ESCALA_MAX);
    expect(lerEscalaDaUi('0.1')).toBe(ESCALA_MIN);
    expect(lerEscalaDaUi('-3')).toBe(ESCALA_MIN);
  });

  it('os degraus do painel cabem na faixa que o gate prova, e incluem o padrão', () => {
    expect(DEGRAUS_DA_UI).toContain(ESCALA_PADRAO);
    for (const f of DEGRAUS_DA_UI) {
      expect(f).toBeGreaterThanOrEqual(ESCALA_MIN);
      expect(f).toBeLessThanOrEqual(ESCALA_MAX);
      expect(lerEscalaDaUi(String(f)), `degrau ${f} sobrevive à ida e volta pela URL`).toBe(f);
    }
    // ordenados: uma fileira de botões que não cresce da esquerda para a
    // direita é uma fileira que ninguém lê
    expect([...DEGRAUS_DA_UI]).toEqual([...DEGRAUS_DA_UI].sort((a, b) => a - b));
    expect(rotuloDaEscala(1)).toBe('100%');
    expect(rotuloDaEscala(0.85)).toBe('85%');
  });
});

describe('2. a regra do CSS: nenhum texto do HUD ignora a raiz', () => {
  it('a raiz declara --ui e o font-size sai dele', () => {
    expect(INDEX_CSS).toMatch(/--ui:\s*1;/);
    expect(INDEX_CSS).toMatch(/font-size:\s*calc\(100%\s*\*\s*var\(--ui\)\)/);
    // 100% e não px: o fator multiplica a preferência de fonte de quem
    // visita em vez de apagá-la
    expect(INDEX_CSS).not.toMatch(/font-size:\s*calc\(\d+px/);
  });

  it('a varredura acha as declarações de verdade — um regex quebrado passaria calado', () => {
    expect(DECLARACOES.length).toBeGreaterThan(30);
    expect(DECLARACOES.filter((d) => d.includes('clamp(')).length).toBeGreaterThanOrEqual(9);
  });

  it('TODA declaração de font-size é rem, em, ou clamp com o vw multiplicado por var(--ui)', () => {
    const fora = DECLARACOES.filter((d) => {
      // o termo fluido (vw/vh/vmin/vmax) só vale acompanhado do fator
      const termos = [...d.matchAll(/[\d.]+v(?:w|h|min|max)/g)].map((m) => m[0]);
      if (termos.length === 0) return !/^(clamp\(.*\)|[\d.]+r?em)$/.test(d);
      return !termos.every((t) =>
        new RegExp(`calc\\(\\s*${t.replace('.', '\\.')}\\s*\\*\\s*var\\(--ui\\)\\s*\\)`).test(d)
      );
    });
    expect(fora, 'font-size que não reage ao tamanho do texto do HUD').toEqual([]);
  });

  it('nenhum texto do HUD é cravado em px — px não reage à raiz nem ao zoom de fonte', () => {
    expect(DECLARACOES.filter((d) => /[\d.]+px/.test(d))).toEqual([]);
  });
});
