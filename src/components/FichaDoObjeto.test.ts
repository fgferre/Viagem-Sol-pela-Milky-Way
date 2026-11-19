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
import { NOMES_DOS_CORPOS } from '../three/atlasConfig';
import { ID_DO_PONTO_DO_ANEL, temVistaDosAneis } from '../three/world/pontoDoAnel';
import { lerPortaVer } from '../three/selo';
import { PT } from '../lib/idioma/pt';
import { EN } from '../lib/idioma/en';

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

  it('no celular o tipo e o nome quebram em vez de cortar, nos dois estados (13/11)', () => {
    const regra = CELULAR_CSS.match(
      /\.atlas-ficha :is\(\.hud-cabecalho-eyebrow, \.hud-cabecalho-titulo--nome, \.atlas-ficha-nome\),\s*\.atlas-ficha :is\(\.atlas-ficha-classe, \.atlas-ficha-nome\) > span \{([^}]*)\}/
    )?.[1];
    expect(regra).toContain('white-space: normal;');
    expect(regra).toContain('text-overflow: clip;');
  });
});

// O "APROXIMAR" TEM UMA REGRA SÓ (crítica de 13/11): em TRAPPIST-1 o botão
// continuava na ficha depois de usado, porque a ficha somava à regra da
// escada (`podeAproximar`, que já sabe da estrela com corpo e some no
// degrau de perto) uma segunda regra própria, "toda estrela visitável".
describe('o botão "Aproximar" segue só a escada', () => {
  it('a ficha não soma uma segunda regra à `podeAproximar`', () => {
    expect(FONTE).toContain('{podeAproximar && (');
    expect(FONTE).not.toContain('estrelaVisitavelPorNome(estrelaEmFoco)');
  });
});

// O BOTÃO "ANÉIS" (15/11; vista do corpo desde 16/11): o anel não é um
// lugar, é Saturno — o botão leva à vista dos anéis do corpo em foco, pelo
// mesmo caminho do `?ver=aneis`, e some dentro dela.
describe('os botões da escada que somem ao clicar deixam o foco na ficha', () => {
  it('"Aproximar", "Anéis" e "Sistema": sem isto o foco ia ao corpo da página e o Esc morria com a ficha aberta', () => {
    const escada = FONTE.slice(FONTE.indexOf('className="atlas-ficha-escada"'), FONTE.indexOf('A COMPACTA PARA AQUI'));
    const devolve = 'refDaFicha.current?.focus({ preventScroll: true });';
    for (const acao of ['onAproximar();', 'onAneis();', 'onSistema();']) {
      const depois = escada.slice(escada.indexOf(acao));
      expect(escada, acao).toContain(acao);
      expect(depois.indexOf(devolve), acao).toBeLessThan(depois.indexOf('</button>'));
      expect(depois.indexOf(devolve), acao).toBeGreaterThan(0);
    }
  });
});

describe('o botão "Anéis" leva à vista dos anéis do corpo em foco', () => {
  const APP = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const BOOT = readFileSync(new URL('../hooks/useDirector.ts', import.meta.url), 'utf8');

  it('a ficha só o desenha com `onAneis`, e o App só o passa fora da vista dos anéis', () => {
    expect(FONTE).toContain('{onAneis && (');
    expect(APP).toContain(
      "const vistaDosAneis = temVistaDosAneis(escada.corpoId) && escada.degrau !== 'aneis' ? escada.corpoId : null;"
    );
    expect(APP).toContain(
      "onAneis={vistaDosAneis ? () => directorRef.current?.focarNoCorpo(vistaDosAneis, 'aneis') : null}"
    );
    // a ficha nos anéis é a do corpo: nenhuma ficha nem volta próprias
    expect(FONTE).not.toContain('voltarAoPlaneta');
    expect(APP).not.toContain("degrau === 'anel'");
  });

  it('dos corpos do Atlas, só Saturno tem a vista', () => {
    const comAnel = Object.keys(NOMES_DOS_CORPOS).filter((id) => temVistaDosAneis(id));
    expect(comAnel).toEqual(['saturn']);
    expect(temVistaDosAneis(null)).toBe(false);
  });

  it('os dois links abrem a vista: `?ver=aneis` e o atalho `?foco=aneis-de-saturno`', () => {
    expect(lerPortaVer('aneis')).toBe('aneis');
    expect(BOOT).toContain('const atalhoDosAneis = foco === ID_DO_PONTO_DO_ANEL;');
    expect(BOOT).toContain('atalhoDosAneis ? PLANETA_DO_PONTO_DO_ANEL : foco,');
    expect(BOOT).toContain("const ver = atalhoDosAneis ? 'aneis' : (lerPortaVer(query.get('ver')) ?? 'orbita');");
    expect(ID_DO_PONTO_DO_ANEL).toBe('aneis-de-saturno');
  });

  it('as frases existem nas duas línguas', () => {
    for (const chave of ['ficha.aneis', 'ficha.aneisAria', 'ficha.secao.aneis'] as const) {
      expect(PT[chave]).toBeTruthy();
      expect(EN[chave]).toBeTruthy();
    }
  });
});
