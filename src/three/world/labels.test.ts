// ============================================================
// OS RÓTULOS DOS DEZ CORPOS (Onda 5, conserto da revisão de olhos
// frescos). O que se julga aqui é a única coisa que o produtor promete
// e que o navegador não consegue provar barato: que o rótulo lê a
// posição VIVA do atributo — a mesma que a GPU desenha e que a máquina
// do tempo reescreve —, na ordem certa, e que a chave dele é a que o
// hit-test do Director reconhece.
//
// A prova de que o clique enquadra mora no `busca-smoke`, em navegador
// real. Esta aqui é a que impede o defeito silencioso: o nome de Marte
// sobre o ponto de Júpiter no dia em que alguém redigitar a ordem.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHAVE_DE_CORPO, CORPOS_DO_SISTEMA } from '../atlasConfig';
import { IDS_FOTOMETRIA } from './planetas/fotometria';

// O RUNNER DA CASA É `node` (vitest.config.ts) e `labels.ts` puxa
// `galaxy.ts`, que lê `window.location.search` no topo do módulo para as
// portas de afinação da galáxia. Duas linhas de `window` mínimo e um
// import dinâmico resolvem sem trocar o ambiente de TODOS os testes por
// um jsdom que nenhum outro precisa — e sem partir o módulo em dois só
// para agradar ao runner.
(globalThis as { window?: unknown }).window = { location: { search: '' } };
const {
  projectCorpos,
  prioridadeDeCorpo,
  prioridadeDeEstrela,
  pesoDoRotulo,
  PRIORIDADE_DO_ROTULO,
  BONUS_DE_HISTERESE,
  CORPO_FADE_COMECA_PC,
  CORPO_FADE_TERMINA_PC,
} = await import('./labels');

/** uma câmera olhando a origem de 10 unidades no eixo z */
function camera() {
  const c = new THREE.PerspectiveCamera(60, 1.6, 0.001, 1000);
  c.position.set(0, 0, 10);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld(true);
  return c;
}

/** posições de brinquedo: dez corpos em fila, todos no quadro */
function posicoes(): Float32Array {
  const p = new Float32Array(30);
  for (let i = 0; i < 10; i++) p[i * 3] = (i - 4.5) * 0.4;
  return p;
}

describe('a tabela dos dez', () => {
  it('é a ORDEM da camada, derivada e não redigitada', () => {
    expect(CORPOS_DO_SISTEMA.map((c) => c.id)).toEqual([...IDS_FOTOMETRIA]);
    expect(CORPOS_DO_SISTEMA.length).toBe(10);
  });

  it('todo corpo tem nome pt-BR, classe e chave com o prefixo do hit-test', () => {
    for (const c of CORPOS_DO_SISTEMA) {
      expect(c.nome, c.id).toMatch(/^[A-ZÁÂÃÉÊÍÓÔÕÚÜÇ]/);
      expect(c.classe, c.id).toBeTruthy();
      expect(c.chave, c.id).toBe(`${CHAVE_DE_CORPO}${c.id}`);
    }
    // e a classe conta a verdade: Plutão não é planeta desde 2006
    const pluto = CORPOS_DO_SISTEMA.find((c) => c.id === 'pluto');
    expect(pluto?.classe).toBe('planeta anão');
    expect(CORPOS_DO_SISTEMA.find((c) => c.id === 'sun')?.classe).toBe('estrela');
  });
});

describe('projectCorpos', () => {
  it('lê a posição VIVA do atributo, na ordem da tabela', () => {
    const cam = camera();
    const p = posicoes();
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(rotulos.length).toBe(10);
    expect(rotulos.map((l) => l.key)).toEqual(CORPOS_DO_SISTEMA.map((c) => c.chave));
    // o x na tela cresce com o x da cena: o rótulo segue o ponto
    for (let i = 1; i < rotulos.length; i++) {
      expect(rotulos[i].x).toBeGreaterThan(rotulos[i - 1].x);
    }
    // e MOVER o atributo move o rótulo — é a promessa da máquina do
    // tempo: ler o retrato congelado aqui deixaria o nome para trás
    p[3 * 3] += 1.5;
    const depois = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(depois[3].x).toBeGreaterThan(rotulos[3].x);
    expect(depois[0].x).toBe(rotulos[0].x);
  });

  it('a distância é a do OBSERVADOR, e a classe entra no lugar do tipo espectral', () => {
    const cam = camera();
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, posicoes());
    for (const l of rotulos) {
      expect(l.distPc).toBeGreaterThan(9);
      expect(l.distPc).toBeLessThan(12);
      // corpo do sistema não tem tipo espectral: o detalhe é a classe
      expect(l.spect).toBe('');
      expect(l.detalhe).toBeTruthy();
    }
    expect(rotulos[0].detalhe).toBe('estrela');
    expect(rotulos.at(-1)?.detalhe).toBe('planeta anão');
  });

  it('quem está fora do quadro não vira rótulo', () => {
    const cam = camera();
    const p = posicoes();
    // atrás da câmera
    p[0] = 0;
    p[2] = 100;
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    expect(rotulos.length).toBe(9);
    expect(rotulos.some((l) => l.key === `${CHAVE_DE_CORPO}sun`)).toBe(false);
  });

  it('array curta não estoura: lê só o que existe', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, new Float32Array(9));
    expect(rotulos.length).toBeLessThanOrEqual(3);
    for (const l of rotulos) expect(Number.isFinite(l.x)).toBe(true);
  });

  it('posição NaN não vira rótulo — o slot vazio das luas sem efeméride', () => {
    const p = posicoes();
    p[0] = Number.NaN;
    p[1] = Number.NaN;
    p[2] = Number.NaN;
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, p);
    expect(rotulos.some((l) => l.key === `${CHAVE_DE_CORPO}sun`)).toBe(false);
    expect(rotulos.length).toBe(9);
    for (const l of rotulos) expect(Number.isFinite(l.x)).toBe(true);
  });
});


// ============================================================
// A HIERARQUIA DOS NOMES (item 73, plano §3) — a tabela do doador
// (`OverlayPositionTracker`), reimplementada. Antes dela quem chegava
// primeiro na lista ocupava a vaga, e o resultado medido era Saturno
// nascendo `desenhado: false` por colidir com "SOL".
// ============================================================
describe('prioridade — quem ganha a vaga', () => {
  it('a hierarquia é a que o plano declara, e ela DERIVA da classe', () => {
    expect(prioridadeDeCorpo('estrela')).toBe(PRIORIDADE_DO_ROTULO.sol);
    expect(prioridadeDeCorpo('planeta')).toBe(PRIORIDADE_DO_ROTULO.planeta);
    expect(prioridadeDeCorpo('planeta anão')).toBe(PRIORIDADE_DO_ROTULO.anao);
    expect(prioridadeDeCorpo('asteroide')).toBe(PRIORIDADE_DO_ROTULO.anao);
    expect(prioridadeDeCorpo('lua')).toBe(PRIORIDADE_DO_ROTULO.lua);
    // classe que ninguém previu não vira exceção: cai no piso
    expect(prioridadeDeCorpo('cometa')).toBe(PRIORIDADE_DO_ROTULO.outros);
    // e a ordem é a que a queixa do dono pede: planeta acima de lua
    expect(PRIORIDADE_DO_ROTULO.foco).toBeGreaterThan(PRIORIDADE_DO_ROTULO.sol);
    expect(PRIORIDADE_DO_ROTULO.sol).toBeGreaterThan(PRIORIDADE_DO_ROTULO.planeta);
    expect(PRIORIDADE_DO_ROTULO.planeta).toBeGreaterThan(PRIORIDADE_DO_ROTULO.anao);
    expect(PRIORIDADE_DO_ROTULO.anao).toBeGreaterThan(PRIORIDADE_DO_ROTULO.lua);
    expect(PRIORIDADE_DO_ROTULO.lua).toBeGreaterThan(PRIORIDADE_DO_ROTULO.estrelaPropria);
  });

  it('a estrela entra pelo TIER: nome próprio acima de designação', () => {
    expect(prioridadeDeEstrela(0)).toBe(PRIORIDADE_DO_ROTULO.estrelaPropria);
    expect(prioridadeDeEstrela(1)).toBe(PRIORIDADE_DO_ROTULO.estrelaBayer);
    expect(prioridadeDeEstrela(undefined)).toBe(PRIORIDADE_DO_ROTULO.estrelaPropria);
  });

  it('a projeção dos corpos PUBLICA a prioridade — o desenho não a recalcula', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const porChave = new Map(rotulos.map((l) => [l.key, l]));
    expect(porChave.get(`${CHAVE_DE_CORPO}sun`)?.prioridade).toBe(PRIORIDADE_DO_ROTULO.sol);
    expect(porChave.get(`${CHAVE_DE_CORPO}earth`)?.prioridade).toBe(
      PRIORIDADE_DO_ROTULO.planeta
    );
    expect(porChave.get(`${CHAVE_DE_CORPO}pluto`)?.prioridade).toBe(
      PRIORIDADE_DO_ROTULO.anao
    );
  });

  it('a HISTERESE vale 20% e é multiplicação, não caso novo', () => {
    const rotulos = projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes());
    const terra = rotulos.find((l) => l.key === `${CHAVE_DE_CORPO}earth`)!;
    expect(pesoDoRotulo(terra)).toBe(PRIORIDADE_DO_ROTULO.planeta);
    expect(pesoDoRotulo(terra, new Set([terra.key]))).toBe(
      PRIORIDADE_DO_ROTULO.planeta * BONUS_DE_HISTERESE
    );
    expect(BONUS_DE_HISTERESE).toBe(1.2);
    // ...e ela NÃO inverte a hierarquia: uma lua que estava na tela
    // continua abaixo de um planeta que não estava
    const lua = { ...terra, prioridade: PRIORIDADE_DO_ROTULO.lua };
    expect(pesoDoRotulo(lua, new Set([lua.key]))).toBeLessThan(pesoDoRotulo(terra));
  });

  it('sem prioridade vale o piso — é o rótulo do FILME, que não é tocado', () => {
    expect(pesoDoRotulo({ ...projectCorpos(camera(), CORPOS_DO_SISTEMA, posicoes())[0], prioridade: undefined }))
      .toBe(PRIORIDADE_DO_ROTULO.outros);
  });
});

describe('o fade dos corpos — dentro do sistema nada muda', () => {
  it('na vista de abertura a opacidade é a de sempre, 0,95', () => {
    // a câmera de brinquedo está a 10 unidades, mas a régua do fade é a
    // distância em pc, e ela só começa a morder a 0,01 pc: aqui a
    // distância É 10 pc, então o teste usa a escala real
    const cam = camera();
    cam.position.set(0, 0, 0.001); // 0,001 pc — 9× mais perto que o começo
    cam.updateMatrixWorld(true);
    const p = new Float32Array(30);
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, p);
    for (const l of rotulos) expect(l.opacity).toBeCloseTo(0.95, 12);
  });

  it('e some quando a casa vira um ponto — visitar uma estrela apaga os dez', () => {
    const cam = camera();
    cam.position.set(0, 0, CORPO_FADE_TERMINA_PC * 2);
    cam.updateMatrixWorld(true);
    const rotulos = projectCorpos(cam, CORPOS_DO_SISTEMA, new Float32Array(30));
    for (const l of rotulos) expect(l.opacity).toBe(0);
    // e a faixa é declarada, com o começo bem além da vista de abertura
    // (0,0011 pc): o fade nunca morde dentro do sistema
    expect(CORPO_FADE_COMECA_PC).toBeGreaterThan(0.005);
    expect(CORPO_FADE_TERMINA_PC).toBeGreaterThan(CORPO_FADE_COMECA_PC);
  });
});
