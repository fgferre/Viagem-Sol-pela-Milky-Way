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
    const pequenas = rgb(variavel(corpo(FILME, '.veu-legivel > .veu-sombra *'), '--teto'));
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

  it('a legenda entra pelo tempo do filme: a regra dela não usa a animação de relógio de parede', () => {
    const legenda = corpo(FILME, '.caption-wrap.show');
    expect(legenda).not.toMatch(/animation:\s*captionIn/);
    expect(legenda).toMatch(/opacity:\s*var\(--legenda-opacidade/);
    expect(legenda).toMatch(/translateY\(var\(--legenda-subida/);
  });
});

describe('o véu do topo do filme', () => {
  // a barra de cima é camada própria (fixed, z-index, opacidade, máscara no
  // celular): a cópia muda é uma barra IRMÃ, e quebra calada se perder o
  // darken, subir acima da barra, ou esmaecer num compasso diferente
  const BARRA = readFileSync(new URL('../components/BarraOuAlcas.tsx', import.meta.url), 'utf8');
  const CONTROLES = ler('03-controles.css');

  it('mistura por darken logo abaixo da barra', () => {
    const veu = corpo(FILME, '.controls-bar.veu-sombra');
    expect(veu).toMatch(/mix-blend-mode:\s*darken/);
    const zVeu = Number(/z-index:\s*(\d+)/.exec(veu)![1]);
    const zBarra = Number(/z-index:\s*(\d+)/.exec(corpo(CONTROLES, '.controls-bar'))![1]);
    expect(zVeu).toBe(zBarra - 1);
  });

  // 13/11: o dono achou a mancha pesada, depois a fita dura um adesivo — o
  // meio-termo é penumbra macia, mais clara e com metade do alcance da
  // legenda, sem baixar o piso de 4,5:1 dos rótulos cinza
  it('teto próprio: 4,5:1 ao cinza dos rótulos, mais claro que o da legenda', () => {
    const topo = rgb(variavel(corpo(FILME, '.controls-bar.veu-sombra *'), '--teto'));
    const legenda = rgb(variavel(corpo(FILME, '.veu-legivel > .veu-sombra *'), '--teto'));
    expect(contraste(hex(variavel(BASE, '--texto-2')), topo)).toBeGreaterThanOrEqual(4.5);
    expect(topo[0]).toBeGreaterThan(legenda[0]);
  });

  it('forma macia e curta: miolo no traço e cadeia de sombras com metade do alcance da legenda', () => {
    const botao = corpo(FILME, '.controls-bar.veu-sombra .hud-btn');
    expect(botao).toMatch(/-webkit-text-stroke:\s*\d+px/);
    const raios = (css: string) => [...css.matchAll(/drop-shadow\(0 0 (\d+)px/g)].map((m) => Number(m[1]));
    const topo = raios(botao);
    expect(topo.length).toBeGreaterThanOrEqual(3);
    const cadeia = FILME.indexOf('.veu-legivel > .veu-sombra:not(.caption-wrap),');
    const legenda = raios(FILME.slice(cadeia, FILME.indexOf('}', cadeia)));
    const soma = (r: number[]) => r.reduce((a, b) => a + b, 0);
    expect(soma(topo)).toBeLessThanOrEqual(soma(legenda) / 2);
    expect(cadeia).toBeGreaterThan(0);
    expect(FILME.slice(cadeia, FILME.indexOf('{', cadeia))).not.toMatch(/controls-bar/);
  });

  it('esmaece com a barra: mesmas classes e o mesmo chromeSumido, depois dela no documento', () => {
    const real = BARRA.indexOf('className={`controls-bar${chromeSumido}`}');
    const copia = BARRA.indexOf('className={`controls-bar veu-sombra${chromeSumido}`}');
    expect(real).toBeGreaterThan(0);
    expect(copia).toBeGreaterThan(real);
  });
});
