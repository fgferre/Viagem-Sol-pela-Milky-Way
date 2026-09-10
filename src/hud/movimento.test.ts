// Serve: chão — o movimento novo fala UM vocabulário nas três famílias e desliga inteiro em movimento reduzido
// ============================================================
// A POLÍTICA DO MOVIMENTO (M2, docs/PLANO-MOTION-UI.md §4).
//
// As três provas são sobre o ARQUIVO, e não sobre um seletor: uma lista
// de seletores envelhece calada na próxima regra que alguém escrever, e
// uma regra alcança as que ainda não existem. É o mesmo feitio da prova
// da escala do texto (`lib/uiScale.test.ts`).
//
// 1. OS TOKENS DE DESLOCAMENTO ZERAM em `prefers-reduced-motion`. Foi
//    assim que a preferência deixou de ser sete exceções espalhadas por
//    sete fatias: quem constrói sobre os tokens obedece de graça.
// 2. QUEM AFUNDA SOB O DEDO SABE VOLTAR. Pôr uma família na lista da
//    pressão sem lhe dar a transição de `transform` faz o botão saltar
//    sem tempo nenhum — o defeito não aparece em foto, só ao vivo.
// 3. AS TRÊS FAMÍLIAS QUE MARCAM ESCOLHA acendem com o MESMO filete: a
//    aba da régua de mesa, a alça do telefone e o segmento. Se uma delas
//    ganhar um movimento próprio, é aqui que se descobre.
// ============================================================
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const HUD_DIR = new URL('./', import.meta.url);
const CSS = readdirSync(HUD_DIR)
  .filter((nome) => nome.endsWith('.css'))
  .sort()
  .map((fatia) => readFileSync(new URL(fatia, HUD_DIR), 'utf8'))
  .join('\n');
const BASE = readFileSync(new URL('./01-base.css', HUD_DIR), 'utf8');

/** Os tokens que descrevem DESLOCAMENTO. `--t-rapido` e `--t-normal`
 *  ficam de fora de propósito: eles cronometram cor e presença, que
 *  continuam suaves em movimento reduzido. `--t-folha` ENTROU quando o
 *  painel da mesa passou a percorrer a própria largura com ela — a mesma
 *  superfície entrando pela própria borda, nos dois arranjos. */
const TOKENS_DE_MOVIMENTO = [
  '--t-pressao',
  '--t-assenta',
  '--t-entrada',
  '--t-folha',
  '--t-reflexo',
  '--escala-pressao',
];

/** o corpo da PRIMEIRA regra de um seletor, para perguntar o que ela
 *  declara. O `\s*` da frente não é enfeite: metade das regras do
 *  telefone vive INDENTADA dentro de um `@media`. */
const corpoDaRegra = (seletor: string): string => {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const abre = new RegExp(`\\n\\s*${escapado} \\{`).exec(CSS)?.index ?? -1;
  if (abre < 0) return '';
  return CSS.slice(abre, CSS.indexOf('}', abre));
};

describe('1. movimento reduzido: a política mora nos tokens', () => {
  const politica =
    /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{([^}]*)\}/.exec(BASE)?.[1] ??
    '';

  it('existe uma política única, na fatia que DECLARA os tokens', () => {
    expect(politica).not.toBe('');
  });

  it('os quatro tokens de deslocamento zeram lá dentro', () => {
    for (const token of TOKENS_DE_MOVIMENTO) {
      // tempo vai a 0,01 ms; a escala da pressão volta a 1 (sem recuo)
      expect(politica, token).toMatch(new RegExp(`${token}:\\s*(0\\.01ms|1);`));
    }
  });

  it('nenhum token de deslocamento é declarado numa terceira casa', () => {
    for (const token of TOKENS_DE_MOVIMENTO) {
      // duas e só duas: a declaração em `:root` e o zero da política
      const declaracoes = CSS.match(new RegExp(`${token}:`, 'g')) ?? [];
      expect(declaracoes.length, token).toBe(2);
    }
  });
});

describe('2. a pressão é uma só, e toda família dela sabe voltar', () => {
  const lista = /\.hud-root\s*\n?\s*:is\(([^)]*)\):active/.exec(CSS)?.[1] ?? '';
  const familias = lista
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  it('há UMA lista de famílias que afundam sob o dedo', () => {
    expect(familias.length).toBeGreaterThan(0);
    // um único consumidor do recuo: duas regras de pressão seriam duas
    // chances de discordarem no dia em que o número mudar
    expect(CSS.match(/var\(--escala-pressao\)/g)?.length).toBe(1);
  });

  it('cada família da lista cronometra o `transform` com --t-pressao', () => {
    for (const familia of familias) {
      expect(corpoDaRegra(familia), familia).toContain(
        'transform var(--t-pressao)'
      );
    }
  });
});

describe('3. a marca da escolha é a mesma em toda a casa', () => {
  const crescem = [
    ".atlas-regua > .hud-btn[aria-expanded='true']::before",
    ".atlas-alcas > .hud-btn[aria-expanded='true']::before",
  ];

  it('a aba da mesa e a alça do telefone ACENDEM, do meio para as pontas', () => {
    for (const familia of crescem) {
      const corpo = corpoDaRegra(familia);
      expect(corpo, familia).toMatch(/animation: acendeFilete(Vertical|Horizontal)/);
      expect(corpo, familia).toContain('var(--t-entrada)');
    }
  });

  it('o segmentado ANDA: um filete por moldura, e nenhum por botão', () => {
    const moldura = corpoDaRegra('.ajustes-seg::after');
    expect(moldura).toContain('left: var(--seg-x');
    expect(moldura).toContain('width: var(--seg-w');
    // um filete por BOTÃO não desliza: apaga aqui e acende ali
    expect(CSS).not.toContain('.ajustes-seg button.on::after');
    expect(corpoDaRegra('.ajustes-seg button.on')).not.toContain('box-shadow');
  });

  it('o reflexo da borda é INVISÍVEL em repouso — a captura desliga a animação', () => {
    // `.shot-mode *` (fatia 7) zera toda animação; o que sobra é o
    // repouso. Sem o `opacity: 0` aqui, toda foto determinística da casa
    // ganhava uma faixa âmbar parada na borda de todo painel aberto.
    expect(corpoDaRegra('.hud-cabecalho::after')).toContain('opacity: 0;');
  });

  it('e os dois @keyframes do filete são declarados uma vez só, na fatia da base', () => {
    for (const nome of ['acendeFileteVertical', 'acendeFileteHorizontal']) {
      expect(CSS.match(new RegExp(`@keyframes ${nome}`, 'g'))?.length, nome).toBe(1);
      expect(BASE, nome).toContain(`@keyframes ${nome}`);
    }
  });
});

describe('4. TODA moldura de segmentado passa pelo mesmo mecanismo', () => {
  // A regra que impede o desenho de se partir em dois: um `.ajustes-seg`
  // desenhado à mão sem o hook ficaria SEM filete nenhum — e ele convive
  // na mesma tela com os que têm (o rodapé do tempo e o painel de
  // Ajustes, na mesa, ao mesmo tempo).
  const COMPONENTES = readdirSync(new URL('../components/', import.meta.url))
    .filter((nome) => nome.endsWith('.tsx'))
    .map((nome) => readFileSync(new URL(`../components/${nome}`, import.meta.url), 'utf8'))
    .join('\n');

  it('cada `.ajustes-seg` do JSX recebe o ref de `useFileteDoSegmentado`', () => {
    const molduras = [...COMPONENTES.matchAll(/className="ajustes-seg[^"]*"[^>]*>/g)];
    expect(molduras.length).toBeGreaterThan(0);
    for (const m of molduras) expect(m[0]).toContain('ref={');
  });
});
