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
const { projectCorpos } = await import('./labels');

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
});
