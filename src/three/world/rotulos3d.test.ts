// Serve: chão — os consertos de 30/08 do rótulo 3D (profundidade, lado e descarte) não voltam em silêncio
// ============================================================
// O PINTOR 3D DA BETA (item 109) — o espelho que NÃO decide nada.
//
// O troika de verdade abre worker e busca a fonte embarcada, e o runner
// da casa é `node`: o `Text` aqui é um dublê com a superfície exata que
// o pintor usa (o vi.mock troca o módulo antes do import). O que se
// julga são os consertos de 30/08:
//  · o material do texto nasce SEM teste de profundidade — o glifo mora
//    no CENTRO do corpo e as superfícies resolvidas escrevem depth
//    (corpos.ts); com o teste ligado, a casca frontal engolia o nome em
//    vista próxima, e a beta ligada já apagou o texto 2D;
//  · a ordem de pintura carrega o LADO que o 2D escolheu — caixa
//    reservada à esquerda ⇒ âncora 'right' e o vão do outro lado — e o
//    re-`sync()` só acontece quando o lado TROCA;
//  · `dispose()` descarta TODOS os textos (o passo novo do teardown do
//    Director depende disto para não vazar geometria do troika).
// ============================================================
import * as THREE from 'three';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rotulos3d as TipoRotulos3d, RotuloComVaga } from './rotulos3d';

/** a cara do dublê — o que os vereditos leem de cada texto criado */
interface TextoFalso {
  text: string;
  anchorX: string;
  anchorY: string;
  visible: boolean;
  renderOrder: number;
  material: { depthTest: boolean; depthWrite: boolean };
  sincronizacoes: number;
  descartado: boolean;
}

const criados: TextoFalso[] = [];

vi.mock('troika-three-text', async () => {
  const THREE = await import('three');
  class Text extends THREE.Object3D {
    text = '';
    font = '';
    fontSize = 0;
    color = '';
    outlineColor = '';
    outlineWidth = 0;
    anchorX = 'left';
    anchorY = 'top';
    material = { depthTest: true, depthWrite: true };
    sincronizacoes = 0;
    descartado = false;
    constructor() {
      super();
      criados.push(this as unknown as TextoFalso);
    }
    sync(cb?: () => void) {
      this.sincronizacoes++;
      cb?.();
    }
    dispose() {
      this.descartado = true;
    }
  }
  return { Text };
});

let Rotulos3d: typeof TipoRotulos3d;

beforeAll(async () => {
  ({ Rotulos3d } = await import('./rotulos3d'));
});

beforeEach(() => {
  criados.length = 0;
});

/** um alvo de corpo DESENHADO pelo 2D — o caso que o espelho pinta */
function alvo(key: string, name: string, extras: Partial<RotuloComVaga> = {}): RotuloComVaga {
  return {
    name,
    spect: '',
    distPc: 0,
    x: 0.5,
    y: 0.5,
    opacity: 1,
    key,
    desenhado: true,
    ...extras,
  };
}

const posicaoDe = (): readonly [number, number, number] => [1, 2, 3];

function bancada() {
  const cena = new THREE.Scene();
  const pintor = new Rotulos3d(cena);
  const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 100);
  cam.position.set(0, 0, 5);
  cam.updateMatrixWorld();
  return { cena, pintor, cam };
}

describe('o texto do corpo nunca é engolido pelo globo', () => {
  it('o material nasce sem depthTest/depthWrite e acima das camadas do corpo', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], posicaoDe);
    expect(criados).toHaveLength(1);
    const t = criados[0];
    // a lei do clarão (§5.15), espelhada: profundidade desligada aqui,
    // não deixada ao acaso do material do troika
    expect(t.material.depthTest).toBe(false);
    expect(t.material.depthWrite).toBe(false);
    // e depois da fita das órbitas (8) e da atmosfera da Terra (9) —
    // senão as camadas transparentes do próprio corpo pintam por cima
    expect(t.renderOrder).toBeGreaterThan(9);
  });
});

describe('o 3D pinta na vaga do 2D — inclusive no LADO dela', () => {
  it('vaga à esquerda ⇒ âncora à direita, e o vão troca de lado junto', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra'), alvo('corpo:mars', 'Marte', { ladoEsquerdo: true })],
      posicaoDe
    );
    const [terra, marte] = criados;
    // sem lado declarado, o desenho de sempre: cresce para a direita
    expect(terra.anchorX).toBe('left');
    expect(terra.text).toBe(' TERRA');
    // caixa reservada à esquerda da âncora: cresce para a esquerda
    expect(marte.anchorX).toBe('right');
    expect(marte.text).toBe('MARTE ');
  });

  it('o lado que TROCA re-sincroniza uma vez; o lado parado não re-layouta', () => {
    const { pintor, cam } = bancada();
    const corpo = alvo('corpo:earth', 'Terra');
    pintor.sincronizar(true, cam, [corpo], posicaoDe);
    const t = criados[0];
    const aposCriar = t.sincronizacoes;
    // quadros seguintes com o MESMO lado: zero re-layout (o contrato do
    // desenho original — sync roda na criação, não por quadro)
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], posicaoDe);
    expect(t.sincronizacoes).toBe(aposCriar);
    // o corpo cruzou a borda dos 72%: o 2D trocou o lado da vaga
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra', { ladoEsquerdo: true })],
      posicaoDe
    );
    expect(t.sincronizacoes).toBe(aposCriar + 1);
    expect(t.anchorX).toBe('right');
    expect(t.text).toBe('TERRA ');
  });

  it('o espelho não decide nada: só corpo DESENHADO e com texto entra', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(
      true,
      cam,
      [
        alvo('star:vega', 'Vega'), // estrela: o texto dela é do 2D
        alvo('corpo:earth', 'Terra', { desenhado: false }), // perdeu a vaga
        alvo('corpo:mars', 'Marte', { icone: true }), // só-ícone: sem texto
      ],
      posicaoDe
    );
    expect(criados).toHaveLength(0);
  });
});

describe('dispose descarta todos os textos — o passo do teardown', () => {
  it('cada Text é descartado e o grupo sai da cena', () => {
    const { cena, pintor, cam } = bancada();
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra'), alvo('corpo:mars', 'Marte')],
      posicaoDe
    );
    expect(criados).toHaveLength(2);
    pintor.dispose();
    expect(criados.every((t) => t.descartado)).toBe(true);
    expect(cena.children).toHaveLength(0);
  });
});
