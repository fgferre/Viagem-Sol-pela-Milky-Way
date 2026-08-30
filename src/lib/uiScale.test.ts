// Serve: chão — todo font-size do HUD reage à raiz e a quebra do celular usa o mesmo número do TypeScript; os dois já divergiram
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
  LARGURA_DO_CELULAR_PX,
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

// ============================================================
// A QUEBRA DO CELULAR (item 62, 23/08). O `@media` não lê `var()`: o
// número 760 é escrito no CSS como literal e em `LARGURA_DO_CELULAR_PX`
// como constante, e nada no navegador cobra que os dois digam o mesmo.
// Um dos dois mudando sozinho abre uma faixa de larguras em que o CSS
// veste o telefone e o TypeScript continua desenhando a mesa — as alças
// no pé e os botões na barra ao mesmo tempo, dois gatilhos com o mesmo
// `data-abre-dialogo` no documento.
//
// A COBRANÇA É UMA REGRA, não uma lista de seletores: TODA condição de
// media do HUD que fale em `max-width` fala nesta largura. Uma segunda
// fronteira de largura no HUD passa a exigir uma decisão escrita aqui,
// em vez de nascer calada no meio de uma fatia.
// ============================================================
describe('3. a quebra do celular: o CSS e o TypeScript dizem o mesmo número', () => {
  const CONDICOES = [...HUD_CSS.matchAll(/@media([^{]+)\{/g)].map((m) => m[1]);
  const LARGURAS = CONDICOES.flatMap((c) =>
    [...c.matchAll(/max-width:\s*(\d+)px/g)].map((m) => Number(m[1]))
  );

  it('a varredura acha as condições de verdade — um regex quebrado passaria calado', () => {
    expect(CONDICOES.length).toBeGreaterThan(3);
    expect(LARGURAS.length).toBeGreaterThan(2);
  });

  it('TODA quebra de largura do HUD é LARGURA_DO_CELULAR_PX', () => {
    expect([...new Set(LARGURAS)]).toEqual([LARGURA_DO_CELULAR_PX]);
  });

  it('o número é 760, e a fresta 761–767 até o piso da câmera é declarada', () => {
    // `LARGURA_UTIL_MINIMA_PX` (768) é fronteira de CÂMERA e não de CSS —
    // a derivação inteira está no comentário da constante
    expect(LARGURA_DO_CELULAR_PX).toBe(760);
    expect(LARGURA_DO_CELULAR_PX).toBeLessThan(768);
  });

  // ============================================================
  // …E A MESMA VARREDURA DO LADO DO TYPESCRIPT. A regra sobre o CSS não
  // via o defeito de 23/08: `ehCompacto` (`components/Hud.tsx`) era um
  // TERCEIRO leitor de largura, com o 760 cru e um `<` — em 760 px
  // exatos o `@media` já vestia o telefone e ele ainda dizia mesa. O
  // literal repetido é o que faz duas leituras da mesma fronteira
  // discordarem sem ninguém ver.
  //
  // O CSS TEM DIREITO AO LITERAL (media query não lê `var()`); o
  // TypeScript não tem — ele importa a constante. Os dois arquivos de
  // fora são os donos do número: quem o DECLARA e quem o PINA.
  // ============================================================
  const SRC = new URL('../', import.meta.url);
  const DONOS = ['lib/uiScale.ts', 'lib/uiScale.test.ts'];
  const varrer = (dir: URL, prefixo = ''): { arquivo: string; codigo: string }[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? varrer(new URL(`${e.name}/`, dir), `${prefixo}${e.name}/`)
        : /\.tsx?$/.test(e.name)
          ? [{
              arquivo: `${prefixo}${e.name}`,
              // comentário não é código: o 760 citado em prosa é
              // documentação da fronteira, e é bem-vindo
              codigo: readFileSync(new URL(e.name, dir), 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\/\/[^\n]*/g, ''),
            }]
          : []
    );
  const FONTES = varrer(SRC).filter((f) => !DONOS.includes(f.arquivo));
  // `760.` e `1760` não são a fronteira: as bordas excluem ponto e dígito
  const CRU = /(?<![\w.])760(?![\w.])/;

  it('a varredura acha os arquivos e o código de verdade — um walker quebrado passaria calado', () => {
    expect(FONTES.length).toBeGreaterThan(100);
    expect(FONTES.some((f) => f.arquivo === 'hooks/useCelular.ts')).toBe(true);
    // o corte de comentários não pode ter comido o código junto
    expect(
      FONTES.filter((f) => f.codigo.includes('LARGURA_DO_CELULAR_PX')).map((f) => f.arquivo)
    ).toContain('hooks/useCelular.ts');
    expect(CRU.test('const x = 760;')).toBe(true);
  });

  it('nenhum TS/TSX repete o 760 cru — quem lê a fronteira importa a constante', () => {
    expect(FONTES.filter((f) => CRU.test(f.codigo)).map((f) => f.arquivo)).toEqual([]);
  });
});
