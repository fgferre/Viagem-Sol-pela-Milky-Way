// ============================================================
// UMA LISTA SÓ — o desenho dos rótulos e o alvo do clique (pendência 30,
// fechada em 2026-08-14; sintoma: o defeito 1 do commit `51d7777`,
// "o rótulo do Sol diz FOBOS").
//
// Quem DESENHA joga fora quase tudo na vista de abertura do Atlas: os
// dez corpos e as 21 luas projetam a menos de 1% de tela uns dos outros
// e só o vencedor de cada colisão fica. Quem RECEBIA o clique lia a
// lista inteira, inclusive o que nunca foi desenhado — e no ponto exato
// onde está escrito "SOL" o rótulo invisível de Fobos ficava mais perto
// do ponteiro.
//
// AS COORDENADAS DESTE TESTE FORAM MEDIDAS, não inventadas: são as que
// `window.__director.lastLabels` devolveu em `?atlas=1`, 1200×1200, na
// época (Sol em 0,5000/0,4575; Marte, Fobos e Deimos empilhados em
// 0,5033/0,4525). O teste prova as duas metades: que a armadilha é real
// (o rótulo mais PERTO é o de Fobos) e que a marca a desarma (o mais
// perto entre os DESENHADOS é o do Sol).
//
// O runner da casa é `node`: o canvas 2D é um duplo mínimo — o que se
// julga aqui é a decisão de colisão, que é aritmética, não pintura.
// ============================================================
import { describe, expect, it } from 'vitest';
import type { StarLabel } from '../three/world/labels';

(globalThis as { window?: unknown }).window = { devicePixelRatio: 1 };

const { LabelCanvas } = await import('./LabelCanvas');

/** contexto 2D de mentira: mede texto por caractere e não pinta nada. */
function contextoFalso() {
  const nada = () => {};
  return {
    measureText: (t: string) => ({ width: t.length * 7 }),
    setTransform: nada,
    clearRect: nada,
    beginPath: nada,
    moveTo: nada,
    lineTo: nada,
    stroke: nada,
    fillText: nada,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    textAlign: '',
    textBaseline: '',
    lineCap: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    globalAlpha: 1,
  };
}

function canvasFalso(lado = 1200) {
  return {
    clientWidth: lado,
    clientHeight: lado,
    width: 0,
    height: 0,
    getContext: () => contextoFalso(),
  } as unknown as HTMLCanvasElement;
}

function rotulo(key: string, name: string, x: number, y: number): StarLabel {
  return { name, spect: '', detalhe: 'corpo', distPc: 0, x, y, opacity: 0.95, key };
}

/** a vista de abertura MEDIDA: o Sol, os planetas e as luas de Marte */
function aberturaDoAtlas(): StarLabel[] {
  return [
    rotulo('corpo:sun', 'Sol', 0.5, 0.4575),
    rotulo('corpo:mercury', 'Mercúrio', 0.5028, 0.4567),
    rotulo('corpo:venus', 'Vênus', 0.5022, 0.455),
    rotulo('corpo:earth', 'Terra', 0.4973, 0.461),
    rotulo('corpo:mars', 'Marte', 0.5033, 0.4525),
    rotulo('corpo:neptune', 'Netuno', 0.3326, 0.4031),
    rotulo('corpo:moon', 'Lua', 0.4973, 0.4611),
    rotulo('corpo:phobos', 'Fobos', 0.5033, 0.4525),
    rotulo('corpo:deimos', 'Deimos', 0.5033, 0.4525),
  ];
}

/** a lei do hit-test do Director: o mais perto dentro de ~6% da tela */
const RAIO2_DO_CLIQUE = 0.0035;
function maisPerto(labels: readonly StarLabel[], x: number, y: number): StarLabel | null {
  let best: StarLabel | null = null;
  let bestD = RAIO2_DO_CLIQUE;
  for (const l of labels) {
    const dx = l.x - x;
    const dy = l.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = l;
    }
  }
  return best;
}

describe('o clique bate com o nome escrito na tela', () => {
  it('o desenho MARCA quem sobreviveu à colisão — e na abertura sobra o Sol', () => {
    const labels = aberturaDoAtlas();
    new LabelCanvas(canvasFalso()).draw(labels);
    const por = (k: string) => labels.find((l) => l.key === k)!;
    // o Sol chega primeiro (a lista põe os corpos na ordem da camada) e
    // ocupa a vaga; os quatro planetas internos e as duas luas de Marte
    // caem dentro da caixa dele
    expect(por('corpo:sun').desenhado).toBe(true);
    for (const k of [
      'corpo:mercury',
      'corpo:venus',
      'corpo:earth',
      'corpo:mars',
      'corpo:moon',
      'corpo:phobos',
      'corpo:deimos',
    ]) {
      expect(por(k).desenhado, k).toBe(false);
    }
    // e quem está longe da confusão continua na tela
    expect(por('corpo:neptune').desenhado).toBe(true);
  });

  it('A ARMADILHA É REAL: sem a marca, o clique no "SOL" escrito acha um invisível', () => {
    // o ponteiro no TEXTO do rótulo (ele é desenhado à direita da âncora)
    const labels = aberturaDoAtlas();
    new LabelCanvas(canvasFalso()).draw(labels);
    const achado = maisPerto(labels, 0.525, 0.45625)!;
    // NÃO é o Sol, e é um rótulo que o desenho jogou fora — Marte,
    // Fobos e Deimos empilham no MESMO ponto (a mesma efeméride de
    // Marte, a esta escala), então qual dos três ganha o desempate é
    // decimal de projeção: ao vivo em 1200×1200 saiu FOBOS, e é dele o
    // nome que o dono viu no alto da tela.
    expect(achado.key).not.toBe('corpo:sun');
    expect(['corpo:mars', 'corpo:phobos', 'corpo:deimos']).toContain(achado.key);
    expect(achado.desenhado).toBe(false);
  });

  it('com a marca, o mesmo clique acha o SOL', () => {
    const labels = aberturaDoAtlas();
    new LabelCanvas(canvasFalso()).draw(labels);
    const alvos = labels.filter((l) => l.desenhado !== false);
    expect(maisPerto(alvos, 0.525, 0.45625)?.key).toBe('corpo:sun');
  });

  it('a marca é reescrita a cada quadro — rótulo que volta à tela volta a ser alvo', () => {
    const canvas = new LabelCanvas(canvasFalso());
    const juntos = aberturaDoAtlas();
    canvas.draw(juntos);
    expect(juntos.find((l) => l.key === 'corpo:mars')!.desenhado).toBe(false);
    // o mesmo Marte, agora sozinho no quadro (a câmera desceu e o Sol
    // saiu de perto): desenhado, e portanto clicável
    const sozinho = [rotulo('corpo:mars', 'Marte', 0.5033, 0.4525)];
    canvas.draw(sozinho);
    expect(sozinho[0].desenhado).toBe(true);
  });
});
