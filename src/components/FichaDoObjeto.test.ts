// Serve: chão — a ficha abre COMPACTA (não só a cheia) numa janela BAIXA
// da mesa, não só no celular — item B2, 09/09
// ============================================================
// O runner da casa é `node`, sem DOM (`vitest.config.ts`): um
// `<FichaDoObjeto>` não se monta aqui, e por isso o arquivo é `.test.ts`
// — a mesma régua de `components/Ajuda.test.ts`, que lê o FONTE em vez
// de renderizar. O que se pina aqui é só o GATE novo (B2): a compacta
// deixa de depender só de `celular` e passa a valer também numa janela
// baixa da mesa, pelo mesmo limiar que a paisagem baixa já usa em
// `06-responsivo.css` (480px).
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTE = readFileSync(new URL('./FichaDoObjeto.tsx', import.meta.url), 'utf8');

describe('a ficha compacta também abre numa janela BAIXA da mesa (item B2, 09/09)', () => {
  it('detecta a janela baixa com o MESMO limiar da paisagem baixa (480px), por matchMedia com ouvinte', () => {
    // o mesmo padrão de `larguraEstreita`/`useCelular.ts`: leitura inicial
    // por matchMedia e um ouvinte de 'change' — nunca innerHeight solto,
    // que ficaria preso no tamanho do boot (o juiz de a11y redimensiona a
    // janela no meio da sessão).
    expect(FONTE).toContain("window.matchMedia?.('(max-height: 480px)').matches ?? false");
    expect(FONTE).toContain("window.matchMedia('(max-height: 480px)')");
    expect(FONTE).toContain("consulta.addEventListener('change', ouvir)");
  });

  it('a compacta e o atributo de estado dependem de celular OU janela baixa, não só de celular', () => {
    expect(FONTE).toContain('const compactavel = celular || janelaBaixa;');
    expect(FONTE).toContain('const compacta = compactavel && !fichaExpandida;');
    expect(FONTE).toContain(
      "data-ficha-estado={compactavel ? (fichaExpandida ? 'expandida' : 'compacta') : undefined}"
    );
    // o botão "Detalhes"/"Recolher" (`acoes`) segue o mesmo gate — antes
    // só nascia com `celular`, agora nasce sempre que a ficha é `compactavel`
    expect(FONTE).toMatch(/acoes=\{\s*compactavel \? \(/);
  });
});

// O CABEÇALHO DA COMPACTA NO CELULAR (12/11, crítica de visitante: o nome
// saía "Galáxi…" e o botão "De…"). O espaço do nome se mede no próprio
// cabeçalho (`@container`), em `rem` da raiz viva — que cresce com o `ui`
// —, e não por uma segunda largura de janela no JavaScript.
const CELULAR_CSS = readFileSync(new URL('../hud/09-celular.css', import.meta.url), 'utf8');

describe('o cabeçalho da compacta no celular mede o espaço do nome no próprio cabeçalho (12/11)', () => {
  it('não há mais régua de janela estreita na ficha', () => {
    expect(FONTE).not.toContain('max-width: 360px');
    expect(FONTE).not.toContain('data-ficha-largura');
    expect(CELULAR_CSS).not.toContain('data-ficha-largura');
  });

  it('as duas réguas de largura são de contêiner e em rem: sem eyebrow abaixo de 13,5rem, sem "?" abaixo de 12rem', () => {
    expect(CELULAR_CSS).toContain('container: cabecalho-da-ficha / inline-size;');
    const regras = [...CELULAR_CSS.matchAll(/@container cabecalho-da-ficha \(max-width: ([\d.]+)rem\) \{([\s\S]*?)\n {2}\}/g)];
    expect(regras.map((r) => [r[1], /hud-cabecalho-eyebrow \{\s*display: none/.test(r[2]), /hud-ajuda \{\s*display: none/.test(r[2])]))
      .toEqual([['13.5', true, false], ['12', false, true]]);
  });
});
