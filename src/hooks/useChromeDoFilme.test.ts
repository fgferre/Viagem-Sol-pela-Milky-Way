// ============================================================
// O CHROME DO FILME SOME SOZINHO (item 61, 22/08) — as três leis que a
// tela tem de obedecer, cobradas onde elas moram: no CSS e no App.
//
// Não é teste de render: quem julga o comportamento é o `a11y.mjs`, em
// navegador real (3 s parado, opacidade 0, `pointer-events: none`, o
// gesto que traz de volta, e pausado nunca some). O que se pina aqui é o
// que uma corrida de navegador NÃO mostraria como regressão de desenho:
// o dia em que alguém trocar a opacidade por `display: none` a tela
// continua "escondendo o chrome" — e a geometria do HUD passa a dar um
// pulo no meio do filme, sem um gate vermelho em lugar nenhum.
// ============================================================
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ESPERA_DO_CHROME_MS } from './useChromeDoFilme';

const HUD = (fatia: string) =>
  readFileSync(new URL(`../hud/${fatia}`, import.meta.url), 'utf8');
const CONTROLES = HUD('03-controles.css');
const FILME = HUD('02-filme.css');
// O QUE O APP DESENHA são DOIS arquivos desde 23/08: a barra de
// controles e a fileira de alças saíram do `App.tsx` para
// `components/BarraOuAlcas.tsx` (§11 do AGENTS), e as duas continuam
// sendo o mesmo assunto para quem lê daqui. Ler só um deles faria estas
// provas passarem a acusar a MUDANÇA DE ENDEREÇO em vez do defeito.
const APP =
  readFileSync(new URL('../App.tsx', import.meta.url), 'utf8') +
  readFileSync(new URL('../components/BarraOuAlcas.tsx', import.meta.url), 'utf8');

/** a regra `.hud-sumido { … }` sozinha, sem o seletor dos filhos */
const REGRA_SUMIDO = CONTROLES.slice(
  CONTROLES.indexOf('.hud-sumido {'),
  CONTROLES.indexOf('}', CONTROLES.indexOf('.hud-sumido {'))
);

describe('o chrome do filme some sozinho (item 61)', () => {
  it('a espera é a que o dono pediu — três segundos', () => {
    expect(ESPERA_DO_CHROME_MS).toBe(3000);
  });

  it('some por OPACIDADE, e a CAIXA fica onde estava', () => {
    // A altura da barra alimenta `--barra-fim` (o App a MEDE) e o
    // retângulo que o canvas dos rótulos contorna. Tirá-la do fluxo
    // encolheria os dois no meio do filme — é a mesma lição da dica do
    // rodapé do Atlas (`3f2a290`, `.free-hint.apagada`).
    expect(REGRA_SUMIDO).toContain('opacity: 0');
    for (const proibido of ['display: none', 'visibility: hidden']) {
      expect(REGRA_SUMIDO, `.hud-sumido tira a caixa do lugar`).not.toContain(proibido);
    }
  });

  it('invisível NÃO come o clique — nem pelos filhos', () => {
    // a barra é uma caixa `fixed` que recebe ponteiro em toda a área
    // mesmo transparente, e `.hud-btn` religa o ponteiro por conta
    // própria: sem o seletor dos filhos, um botão invisível continuaria
    // engolindo o arrasto no céu
    expect(CONTROLES).toMatch(/\.hud-sumido,\s*\n\.hud-sumido \* \{\s*\n\s*pointer-events: none;/);
  });

  it('a regra vence a cascata — vem DEPOIS de quem declara o contrário', () => {
    // `.progress-wrap { pointer-events: auto }` mora na fatia 2 e
    // `.hud-btn { pointer-events: auto }` na 3, as duas com a mesma
    // especificidade de `.hud-sumido`: entre iguais decide a ORDEM. A
    // fatia 3 é lida depois da 2 (o App importa por número), e dentro da
    // 3 a regra tem de vir depois do `.hud-btn`.
    expect(FILME).toContain('.progress-wrap {');
    expect(CONTROLES.indexOf('.hud-sumido')).toBeGreaterThan(
      CONTROLES.indexOf('.hud-btn {')
    );
  });

  it('só o FILME CORRENDO arma o relógio — pausado o chrome fica', () => {
    // quem pausou parou para usar alguma coisa; esconder o botão de
    // retomar de quem acabou de apertar pausa seria esconder o que ele
    // vai procurar
    expect(APP).toContain('useChromeDoFilme(inJourney && !paused)');
  });

  it('some o CHROME, não o conteúdo: a legenda e a linha de rumo ficam', () => {
    // a classe entra na barra de controles e na barra de capítulos, e em
    // mais nada — o rodapé do filme (legenda + dicas) e a linha de rumo
    // são o que o visitante está lendo
    expect(APP).toContain('`controls-bar${chromeSumido}`');
    expect(APP).toContain('chromeVisivel={chromeVisivel}');
    expect(APP).not.toContain('`filme-rodape${');
    expect(APP).not.toContain('`dest-line${');
  });
});
