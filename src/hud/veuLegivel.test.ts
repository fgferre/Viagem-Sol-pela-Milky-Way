// Serve: chão — a legenda do filme lê sobre fundo claro sem mudar o fundo escuro; o teto do véu e o caminho até a cena são o que garante isso
// ============================================================
// O VÉU DE LEGIBILIDADE (02-filme.css, 12/11). Duas coisas o quebram
// CALADAS, sem nada aparecer num teste de unidade:
// 1. o TETO subir acima do que a régua WCAG aceita para a cor do texto —
//    a legenda volta a sumir sobre o Sol, e só a foto conta;
// 2. um ancestral do véu virar camada própria (`fixed`, `z-index`) — o
//    `darken` passa a misturar com o nada e o véu vira um halo cinza
//    também sobre o espaço preto.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (fatia: string) => readFileSync(new URL(`./${fatia}`, import.meta.url), 'utf8');
const BASE = ler('01-base.css');
const FILME = ler('02-filme.css');

const corpo = (css: string, seletor: string): string => {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const abre = new RegExp(`\\n\\s*${escapado}\\s*\\{`).exec(css)?.index ?? -1;
  if (abre < 0) throw new Error(`regra não achada: ${seletor}`);
  return css.slice(abre, css.indexOf('}', abre));
};

const hex = (v: string) => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
const rgb = (v: string) => v.match(/\d+/g)!.slice(0, 3).map(Number);
const luminancia = ([r, g, b]: number[]) => {
  const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contraste = (a: number[], b: number[]) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const variavel = (css: string, nome: string) => new RegExp(`${nome}:\\s*([^;]+);`).exec(css)![1].trim();

describe('o véu de legibilidade', () => {
  it('o teto das linhas pequenas dá 4,5:1 ao cinza delas, e o do título dá 3:1', () => {
    const pequenas = rgb(variavel(corpo(FILME, '.controls-bar.veu-sombra *'), '--teto'));
    const titulo = rgb(variavel(corpo(FILME, '.veu-legivel > .veu-sombra .caption-title'), '--teto'));
    expect(contraste(hex(variavel(BASE, '--texto-2')), pequenas)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(hex(variavel(BASE, '--texto')), titulo)).toBeGreaterThanOrEqual(3);
  });

  it('é teto e não tinta: a cópia mistura por darken', () => {
    expect(corpo(FILME, '.veu-legivel > .veu-sombra')).toMatch(/mix-blend-mode:\s*darken/);
  });

  it('nenhum ancestral do véu vira camada própria: a coluna do rodapé é absolute sem z-index', () => {
    const rodape = corpo(FILME, '.filme-rodape');
    expect(rodape).toMatch(/position:\s*absolute/);
    expect(rodape).not.toMatch(/z-index/);
    expect(corpo(FILME, '.dest-line.veu-legivel')).toMatch(/z-index:\s*auto/);
  });
});

describe('o véu do topo do filme', () => {
  // a barra de cima é camada própria (fixed, z-index, opacidade, máscara no
  // celular): a cópia muda é uma barra IRMÃ, e quebra calada se perder o
  // darken, subir acima da barra, ou esmaecer num compasso diferente
  const BARRA = readFileSync(new URL('../components/BarraOuAlcas.tsx', import.meta.url), 'utf8');
  const CONTROLES = ler('03-controles.css');

  it('mistura por darken logo abaixo da barra e veste o mesmo teto da legenda', () => {
    const veu = corpo(FILME, '.controls-bar.veu-sombra');
    expect(veu).toMatch(/mix-blend-mode:\s*darken/);
    const zVeu = Number(/z-index:\s*(\d+)/.exec(veu)![1]);
    const zBarra = Number(/z-index:\s*(\d+)/.exec(corpo(CONTROLES, '.controls-bar'))![1]);
    expect(zVeu).toBe(zBarra - 1);
    expect(FILME).toMatch(/\.veu-legivel > \.veu-sombra \*,\s*\.controls-bar\.veu-sombra \*\s*\{\s*--teto/);
  });

  it('esmaece com a barra: mesmas classes e o mesmo chromeSumido, depois dela no documento', () => {
    const real = BARRA.indexOf('className={`controls-bar${chromeSumido}`}');
    const copia = BARRA.indexOf('className={`controls-bar veu-sombra${chromeSumido}`}');
    expect(real).toBeGreaterThan(0);
    expect(copia).toBeGreaterThan(real);
  });
});
