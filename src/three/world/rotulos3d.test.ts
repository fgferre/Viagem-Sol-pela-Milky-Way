// Serve: chão — a folga da vaga, o halo escuro, o lado e o descarte do rótulo 3D não voltam em silêncio
// ============================================================
// O PINTOR 3D DA BETA (item 109) — o espelho que NÃO decide nada.
//
// O troika de verdade abre worker e busca a fonte embarcada, e o runner
// da casa é `node`: o `Text` aqui é um dublê com a superfície exata que
// o pintor usa (o vi.mock troca o módulo antes do import). E o dublê
// devolve `material` como o troika devolve — um ARRAY CONGELADO
// [contorno, preenchimento] quando há contorno. Isso é guarda, não
// fidelidade de enfeite: até 30/08 o pintor escrevia
// `t.material.depthTest = false` e a escrita morria na lista sem tocar
// material nenhum (medido na página viva: `depthTest: [true, true]`),
// enquanto o dublê antigo — um objeto simples — dizia que tinha
// funcionado. Congelado, o mesmo erro passa a EXPLODIR no teste.
//
// O que se julga:
//  · a FOLGA da vaga: o nome sai da âncora `RECUO_DO_TEXTO`/corpo do
//    nome (18/13 em) para o lado da vaga, medida na tela — era um
//    espaço no texto (~0,26 em) e o nome nascia colado no corpo, que é
//    o que engolia o "SOL" dentro do clarão;
//  · o HALO ESCURO que o 2D põe atrás de cada nome (`shadowBlur 7` sobre
//    corpo 13) — sem ele o nome dentro do clarão é branco sobre branco;
//  · o AVANÇO sobre a casca do próprio corpo (31/08): o nome anda sobre
//    a linha câmera→corpo até passar à frente da superfície — o mesmo
//    ponto na tela, outro Z —, com teto no plano near;
//  · a ordem de pintura e o LADO que o 2D escolheu — caixa reservada à
//    esquerda ⇒ âncora 'right' — e o re-`sync()` só quando o lado TROCA;
//  · `dispose()` descarta TODOS os textos (o passo do teardown do
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
  outlineColor: string;
  outlineWidth: number;
  outlineBlur: number;
  outlineOpacity: number;
  position: THREE.Vector3;
  scale: THREE.Vector3;
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
    outlineBlur = 0;
    outlineOpacity = 1;
    anchorX = 'left';
    anchorY = 'top';
    sincronizacoes = 0;
    descartado = false;
    /** o array congelado do troika — ver o cabeçalho */
    private readonly materiais = Object.freeze([
      { depthTest: true, depthWrite: false },
      { depthTest: true, depthWrite: true },
    ]);
    get material() {
      return this.hasOutline() ? this.materiais : this.materiais[1];
    }
    hasOutline() {
      return !!(this.outlineWidth || this.outlineBlur);
    }
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

/** o corpo na ORIGEM: a folga fica sendo a própria posição do texto */
const naOrigem = (): readonly [number, number, number] => [0, 0, 0];

/**
 * O CORPO SEM RAIO CONHECIDO — o espelho põe o nome no centro, como
 * fazia antes de 31/08. Os vereditos da folga usam este, para medirem
 * só a folga: com raio o nome também ANDA para a câmera, e a conta da
 * escala muda junto (é disso que trata o bloco do avanço, abaixo).
 */
const semRaio = () => null;

function bancada(distancia = 5) {
  const cena = new THREE.Scene();
  const pintor = new Rotulos3d(cena);
  const cam = new THREE.PerspectiveCamera(58, 1.6, 0.001, 100);
  cam.position.set(0, 0, distancia);
  cam.updateMatrixWorld();
  return { cena, pintor, cam };
}

describe('a folga da vaga é a do 2D, medida na tela', () => {
  it('o nome sai da âncora 18/13 corpos para o lado da vaga', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra'), alvo('corpo:mars', 'Marte', { ladoEsquerdo: true })],
      naOrigem,
      semRaio
    );
    const [terra, marte] = criados;
    // a câmera olha para −Z sem rolagem: "para o lado" na tela é o X do
    // mundo, e o texto sai da origem do corpo em CORPOS DA FONTE (a
    // escala do mesh é o em). 18 px de folga sobre 13 px de nome — os
    // dois números são do `LabelCanvas`.
    expect(terra.position.x / terra.scale.x).toBeCloseTo(18 / 13, 6);
    expect(terra.position.y).toBeCloseTo(0, 9);
    // a vaga do outro lado espelha a folga, não a encolhe
    expect(marte.position.x / marte.scale.x).toBeCloseTo(-18 / 13, 6);
  });

  it('a folga é CONSTANTE NA TELA: dobrar a distância dobra o mundo', () => {
    const perto = bancada(5);
    perto.pintor.sincronizar(true, perto.cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    const a = criados[0];
    criados.length = 0;
    const longe = bancada(10);
    longe.pintor.sincronizar(true, longe.cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    const b = criados[0];
    // o dobro de distância, o dobro de mundo por pixel — e a MESMA folga
    // na tela, que é o que o visitante vê
    expect(b.position.x / a.position.x).toBeCloseTo(2, 6);
    expect(b.position.x / b.scale.x).toBeCloseTo(a.position.x / a.scale.x, 6);
  });

  it('o texto não carrega mais o espaço que fazia as vezes da folga', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    expect(criados[0].text).toBe('TERRA');
  });
});

describe('o halo escuro do 2D atrás do nome', () => {
  it('o contorno é preto e alcança o borrão do canvas (7 sobre 13)', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    const t = criados[0];
    expect(t.outlineColor).toBe('#000000');
    expect(t.outlineOpacity).toBeGreaterThan(0.9);
    // o `shadowBlur 7` do `LabelCanvas` sobre o corpo de 13 px: é ele que
    // cava o buraco escuro em que o nome se lê dentro do clarão
    expect(t.outlineWidth + t.outlineBlur).toBeGreaterThanOrEqual(7 / 13);
  });

  it('o nome pinta depois das camadas do corpo', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    // depois da fita das órbitas (8) e da atmosfera da Terra (9) — senão
    // as camadas transparentes do próprio corpo pintam por cima
    expect(criados[0].renderOrder).toBeGreaterThan(9);
  });
});

describe('o 3D pinta na vaga do 2D — inclusive no LADO dela', () => {
  it('vaga à esquerda ⇒ âncora à direita', () => {
    const { pintor, cam } = bancada();
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra'), alvo('corpo:mars', 'Marte', { ladoEsquerdo: true })],
      naOrigem,
      semRaio
    );
    const [terra, marte] = criados;
    // sem lado declarado, o desenho de sempre: cresce para a direita
    expect(terra.anchorX).toBe('left');
    // caixa reservada à esquerda da âncora: cresce para a esquerda
    expect(marte.anchorX).toBe('right');
  });

  it('o lado que TROCA re-sincroniza uma vez; o lado parado não re-layouta', () => {
    const { pintor, cam } = bancada();
    const corpo = alvo('corpo:earth', 'Terra');
    pintor.sincronizar(true, cam, [corpo], naOrigem, semRaio);
    const t = criados[0];
    const aposCriar = t.sincronizacoes;
    // quadros seguintes com o MESMO lado: zero re-layout (o contrato do
    // desenho original — sync roda na criação, não por quadro)
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    expect(t.sincronizacoes).toBe(aposCriar);
    // o corpo cruzou a borda dos 72%: o 2D trocou o lado da vaga
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra', { ladoEsquerdo: true })],
      naOrigem,
      semRaio
    );
    expect(t.sincronizacoes).toBe(aposCriar + 1);
    expect(t.anchorX).toBe('right');
    // e a folga vira de lado no MESMO quadro
    expect(t.position.x / t.scale.x).toBeCloseTo(-18 / 13, 6);
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
      naOrigem,
      semRaio
    );
    expect(criados).toHaveLength(0);
  });
});

describe('a casca do PRÓPRIO corpo não engole mais o nome', () => {
  // A reprovação dele em 31/08: "quando aproximo o corpo o objeto engole
  // o texto". O nome era posto no CENTRO do corpo — dentro do globo —, e
  // o globo escreve profundidade: de perto o disco toma a tela e o nome
  // sumia inteiro. Medido na página viva antes do conserto
  // (`?atlas=1&foco=terra&ver=corpo&d=3&r3d=1`): "TERRA" existia,
  // `visible: true`, a 3,0 raios da câmera, com a superfície a 2,0.
  it('com raio, o nome nasce À FRENTE da superfície, não no centro', () => {
    const { pintor, cam } = bancada(5);
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, () => 1);
    const t = criados[0];
    // a superfície de um corpo de raio 1 na origem está a 4 da câmera: o
    // nome tem de estar MAIS PERTO que ela, que é a única leitura que o
    // teste de profundidade faz
    expect(t.position.distanceTo(cam.position)).toBeLessThan(4);
    // o avanço é o raio com os 5% que tiram o z-fighting do polo
    expect(t.position.z).toBeCloseTo(1.05, 6);
  });

  it('sem raio o nome fica no centro — o espelho não inventa geometria', () => {
    const { pintor, cam } = bancada(5);
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    expect(criados[0].position.z).toBeCloseTo(0, 9);
  });

  it('o avanço não mexe no ponto da TELA: anda sobre a linha câmera→corpo', () => {
    const { pintor, cam } = bancada(5);
    const centro: readonly [number, number, number] = [2, 1, 0];
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:mars', 'Marte')],
      () => centro,
      () => 0.5
    );
    const t = criados[0];
    // tira a folga da vaga (a direita da câmera é +X, quaternion
    // identidade): o que sobra é o avanço puro
    const semFolga = t.position
      .clone()
      .sub(new THREE.Vector3((18 / 13) * t.scale.x, 0, 0))
      .sub(cam.position);
    const aoCorpo = new THREE.Vector3(centro[0], centro[1], centro[2]).sub(cam.position);
    // colinear com câmera→corpo ⇒ mesmo ponto projetado, outro Z
    expect(semFolga.clone().cross(aoCorpo).length()).toBeCloseTo(0, 9);
    expect(semFolga.length()).toBeLessThan(aoCorpo.length());
  });

  it('o tamanho na tela não muda: a escala é a da distância NOVA', () => {
    const a = bancada(5);
    a.pintor.sincronizar(true, a.cam, [alvo('corpo:earth', 'Terra')], naOrigem, semRaio);
    const semR = criados[0];
    criados.length = 0;
    const b = bancada(5);
    b.pintor.sincronizar(true, b.cam, [alvo('corpo:earth', 'Terra')], naOrigem, () => 1);
    const comR = criados[0];
    // 13 px continuam 13 px: o em cai na MESMA proporção da distância
    expect(comR.scale.x / semR.scale.x).toBeCloseTo((5 - 1.05) / 5, 6);
  });

  it('o TETO do near: perto demais, o avanço para antes do plano', () => {
    const { pintor, cam } = bancada(1.2);
    // o near do palco local com corpo em quadro: meio raio (`nearPlanePc`)
    cam.near = 0.5;
    pintor.sincronizar(true, cam, [alvo('corpo:earth', 'Terra')], naOrigem, () => 1);
    const t = criados[0];
    // o avanço cheio (1,05) deixaria o nome a 0,15 da câmera, dentro do
    // near — cortado. O teto o para em d − 1,2·near.
    expect(t.position.z).toBeCloseTo(1.2 - 0.6, 6);
    expect(t.position.distanceTo(cam.position)).toBeGreaterThan(cam.near);
  });
});

describe('dispose descarta todos os textos — o passo do teardown', () => {
  it('cada Text é descartado e o grupo sai da cena', () => {
    const { cena, pintor, cam } = bancada();
    pintor.sincronizar(
      true,
      cam,
      [alvo('corpo:earth', 'Terra'), alvo('corpo:mars', 'Marte')],
      naOrigem,
      semRaio
    );
    expect(criados).toHaveLength(2);
    pintor.dispose();
    expect(criados.every((t) => t.descartado)).toBe(true);
    expect(cena.children).toHaveLength(0);
  });
});
