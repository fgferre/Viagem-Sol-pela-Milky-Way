// ============================================================
// A CÂMERA SÓ SOBE PARA O REACT COM QUEM A LEIA (item 78).
//
// O destino de `onCamera` é um `setState`, e a ficha do objeto é a única
// que lê a posição. Com a ficha FECHADA, publicar a 4 Hz durante um
// arrasto no Atlas re-renderizava o HUD inteiro por um painel que
// ninguém abriu. Aqui se prova o contrato dos dois lados: calado sem
// leitor, e vivo — com a posição de AGORA — no quadro seguinte ao
// pedido.
//
// `Rotulos` puxa `world/galaxy`, que lê `window.location.search` na
// avaliação do módulo; o runner da casa é `node`, então o `window` falso
// precede o import dinâmico.
// ============================================================
import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import type { JourneyMeta } from '../cinematic/journey';
import type { Rotulos as TipoRotulos, QuadroDeRotulos } from './rotulos';

let Rotulos: typeof TipoRotulos;

beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = { location: { search: '' } };
  ({ Rotulos } = await import('./rotulos'));
});

type Publicada = readonly [number, number, number] | null;

/** um produtor de rótulos mudo em tudo menos na câmera */
function bancada() {
  const publicadas: Publicada[] = [];
  const rotulos = new Rotulos({
    onLabels: () => {},
    onDest: () => {},
    onSol: () => {},
    onCamera: (posUA) => publicadas.push(posUA),
    beatDaViagem: () => ({}) as JourneyMeta,
  });
  const cam = new THREE.PerspectiveCamera();
  // `named: null` mata o ramo dos rótulos: o que se julga aqui é o fio
  // da câmera, e ele roda em todo quadro, depois do ramo
  const quadro: QuadroDeRotulos = {
    fase: 'atlas', named: null, dHome: 0, planetas: null, foco: null,
  };
  /** um quadro do Atlas com a câmera em `x` (pc de cena) */
  const passo = (x: number) => {
    cam.position.set(x, 0, 0);
    rotulos.tique(0.5); // > 0,25 s: o remédio de 4 Hz não segura nada aqui
    rotulos.projetar(cam, quadro);
  };
  return { rotulos, publicadas, passo };
}

describe('a câmera só sobe para o React com quem a leia', () => {
  it('sem leitor, a câmera anda e NADA é publicado', () => {
    const { publicadas, passo } = bancada();
    for (let i = 1; i <= 5; i++) passo(i);
    expect(publicadas).toEqual([]);
  });

  it('com leitor, cada movimento publica a posição', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    passo(2);
    expect(publicadas).toHaveLength(2);
    expect(publicadas[0]).not.toEqual(publicadas[1]);
    expect(publicadas[1]?.every(Number.isFinite)).toBe(true);
  });

  it('a ficha que FECHA apaga a posição uma vez e cala', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    rotulos.lerCamera(false);
    for (let i = 2; i <= 5; i++) passo(i);
    expect(publicadas).toHaveLength(2);
    expect(publicadas[1]).toBeNull();
  });

  it('a ficha que REABRE nasce com a posição de agora, com a câmera parada', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    rotulos.lerCamera(false);
    passo(7); // andou às escondidas: ninguém lia
    rotulos.lerCamera(true);
    passo(7); // MESMO ponto, e mesmo assim tem de sair
    expect(publicadas).toHaveLength(3);
    expect(publicadas[2]).not.toBeNull();
    expect(publicadas[2]).not.toEqual(publicadas[0]);
  });

  it('fora do Atlas ninguém publica, nem com a ficha aberta', () => {
    const { rotulos, publicadas, passo } = bancada();
    rotulos.lerCamera(true);
    passo(1);
    expect(publicadas).toHaveLength(1);
    // a mesma bancada, agora no voo livre
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(9, 0, 0);
    rotulos.tique(0.5);
    rotulos.projetar(cam, {
      fase: 'free', named: null, dHome: 0, planetas: null, foco: null,
    });
    expect(publicadas).toEqual([publicadas[0], null]);
  });
});
