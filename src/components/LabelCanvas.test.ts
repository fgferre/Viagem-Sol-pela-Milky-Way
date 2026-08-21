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
// a última projeção do director devolveu em `?atlas=1`, 1200×1200, na
// época (hoje o caminho de console é `__director.rotulos.alvos` —
// corte 7 da onda da arquitetura; Sol em 0,5000/0,4575; Marte, Fobos e
// Deimos empilhados em
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

function canvasFalso(largura = 1200, altura = largura) {
  return {
    clientWidth: largura,
    clientHeight: altura,
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

// ============================================================
// O HUD FIXO AFASTA O NOME (item 56, 2026-08-20). O flagrante do dono
// foi a 375 px: o rodapé do Atlas vira coluna única e ocupa um terço da
// altura, e "E IND · 11,9 anos-luz" saiu escrito atravessado na data do
// céu. A margem de composição deste arquivo só corta a partir de 0,76
// da altura; a coluna começa em ~0,61. Quem cobre a diferença é o
// retângulo MEDIDO que o App publica (`AREAS_RESERVADAS`), e o que se
// prova aqui é que ele manda no desenho.
//
// A tela é 375×812 (a do flagrante) e o retângulo é o do rodapé real
// medido lá: 15..360 × 495..752.
// ============================================================
describe('o HUD fixo afasta o nome (item 56)', () => {
  const RODAPE = { left: 15, right: 360, top: 495, bottom: 752 };
  /** as duas do flagrante, em fração de tela: sobre a data e sobre a dica */
  const sobreORodape = () => [
    rotulo('star:eind', 'E IND', 0.29, 0.622),
    rotulo('star:lang', 'LANG-EXSTER', 0.24, 0.742),
  ];

  it('sem reserva o nome nasce por cima do rodapé — o defeito do dono', () => {
    const labels = sobreORodape();
    new LabelCanvas(canvasFalso(375, 812)).draw(labels);
    // 0,622 e 0,742 passam longe da margem de 0,76: as duas são
    // desenhadas, e é isso que a foto de 20/08 mostra
    expect(labels.map((l) => l.desenhado)).toEqual([true, true]);
  });

  it('com o retângulo do rodapé reservado, as duas cedem', () => {
    const canvas = new LabelCanvas(canvasFalso(375, 812));
    canvas.reservar([RODAPE]);
    const labels = sobreORodape();
    canvas.draw(labels);
    expect(labels.map((l) => l.desenhado)).toEqual([false, false]);
  });

  it('e quem está ACIMA do rodapé continua na tela', () => {
    const canvas = new LabelCanvas(canvasFalso(375, 812));
    canvas.reservar([RODAPE]);
    // PEACOCK, no mesmo quadro do flagrante, bem acima da coluna
    const labels = [rotulo('star:peacock', 'Peacock', 0.61, 0.49)];
    canvas.draw(labels);
    expect(labels[0].desenhado).toBe(true);
  });

  it('a reserva é lista viva: trocar de arranjo troca quem cede', () => {
    const canvas = new LabelCanvas(canvasFalso(375, 812));
    canvas.reservar([RODAPE]);
    const estreita = sobreORodape();
    canvas.draw(estreita);
    expect(estreita[0].desenhado).toBe(false);
    // a janela alargou, o selo voltou ao canto e a coluna encolheu: o
    // App republica, e o mesmo nome volta a ser desenhado
    canvas.reservar([{ left: 15, right: 360, top: 700, bottom: 752 }]);
    const larga = sobreORodape();
    canvas.draw(larga);
    expect(larga[0].desenhado).toBe(true);
  });
});
