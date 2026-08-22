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
// perto entre os DESENHADOS está de fato escrito na tela).
//
// EM 22/08 (item 73) o desenho ganhou SETE lugares por nome — a âncora
// e três de cada lado — e TRÊS pesos visuais, e o que sobra na tela deixou de ser um só — as duas
// metades acima continuam valendo palavra por palavra, e o que muda é
// quantos nomes cabem.
//
// O runner da casa é `node`: o canvas 2D é um duplo mínimo — o que se
// julga aqui é a decisão de colisão, que é aritmética, não pintura.
// ============================================================
import { describe, expect, it } from 'vitest';
import type { StarLabel } from '../three/world/labels';

(globalThis as { window?: unknown }).window = { devicePixelRatio: 1 };

const { LabelCanvas, DESLOCAMENTOS, PESOS_DO_ROTULO, pesoVisual } = await import(
  './LabelCanvas'
);

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

function rotulo(
  key: string,
  name: string,
  x: number,
  y: number,
  prioridade?: number
): StarLabel {
  return { name, spect: '', detalhe: 'corpo', distPc: 0, x, y, opacity: 0.95, key, prioridade };
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

/**
 * A ABERTURA CHEIA — o que a projeção realmente entrega: os dez corpos
 * MAIS as 21 luas, empilhadas sobre os planetas delas. É esta lista que
 * torna a disputa real: catorze lugares por âncora não bastam para 31
 * nomes no mesmo punhado de pixels, e alguém continua ficando de fora.
 */
function aberturaCheia(): StarLabel[] {
  const base = aberturaDoAtlas();
  // as luas espalhadas por um DÉCIMO de pixel: o desenho continua as
  // vendo empilhadas (a caixa tem 24 px), e o hit-test passa a
  // distingui-las — que é o que a armadilha da pendência 30 precisa
  for (let i = 0; i < 22; i++) {
    base.push(rotulo(`corpo:lua${i}`, `Lua ${i}`, 0.5033 + i * 2e-5, 0.4525, 6));
  }
  return base;
}

describe('o clique bate com o nome escrito na tela', () => {
  it('o desenho MARCA quem sobreviveu — e o aglomerado inteiro passa a caber', () => {
    const labels = aberturaDoAtlas();
    new LabelCanvas(canvasFalso()).draw(labels);
    // ATÉ 22/08 SOBRAVA UM SÓ: o Sol chegava primeiro e os quatro
    // planetas internos e as três luas caíam DENTRO da caixa dele. Com
    // sete lugares por nome nos dois lados (item 73) o aglomerado de 6 px cabe
    // inteiro — é esta a promessa que a foto do dono mostra.
    for (const l of labels) expect(l.desenhado, l.key).toBe(true);
  });

  it('A ARMADILHA É REAL: sem a marca, o clique acha um invisível', () => {
    // com a abertura CHEIA (os dez mais as 21 luas) a disputa volta a
    // ter perdedores, e é sobre eles que a pendência 30 fala
    const labels = aberturaCheia();
    new LabelCanvas(canvasFalso()).draw(labels);
    const perdedores = labels.filter((l) => l.desenhado === false);
    expect(perdedores.length).toBeGreaterThan(0);
    // o ponteiro em cima do ÚLTIMO da fila — quem perdeu a vaga; lendo
    // a lista INTEIRA, o mais perto é justamente ele
    const ultimo = labels.at(-1)!;
    const cru = maisPerto(labels, ultimo.x, ultimo.y)!;
    expect(cru.desenhado).toBe(false);
  });

  it('com a marca, o clique nunca acha um INVISÍVEL', () => {
    const labels = aberturaCheia();
    new LabelCanvas(canvasFalso()).draw(labels);
    const alvos = labels.filter((l) => l.desenhado !== false);
    const ultimo = labels.at(-1)!;
    const achado = maisPerto(alvos, ultimo.x, ultimo.y)!;
    // a promessa da pendência 30, palavra por palavra: o que o clique
    // acha É o que está escrito na tela
    expect(achado.desenhado).toBe(true);
  });

  it('a marca é reescrita a cada quadro — rótulo que volta à tela volta a ser alvo', () => {
    const canvas = new LabelCanvas(canvasFalso());
    const juntos = aberturaCheia();
    canvas.draw(juntos);
    const perdedor = juntos.find((l) => l.desenhado === false)!;
    expect(perdedor).toBeDefined();
    // o mesmo nome, agora sozinho no quadro (a câmera desceu e o resto
    // saiu de perto): desenhado, e portanto clicável
    const sozinho = [rotulo(perdedor.key, perdedor.name, 0.5033, 0.4525)];
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
    // OS SETE LUGARES NÃO SALVAM QUEM ESTÁ ATRÁS DO PAINEL, e é o
    // certo: as duas âncoras estão DENTRO do retângulo do rodapé, e o
    // traço que ligaria o texto ao ponto teria de atravessar tinta
    // opaca para chegar lá. Um nome apontando para um ponto invisível é
    // ruído, não informação (item 73 — a conferência do traço).
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


// ============================================================
// OS SETE LUGARES E OS TRÊS PESOS (item 73, plano §3). O que se julga
// é a decisão — onde o texto pousa e com que tinta —, que é aritmética e
// tabela; a pintura é do navegador.
// ============================================================
describe('sete lugares por nome — a âncora e três de cada lado', () => {
  it('o PRIMEIRO lugar é o de sempre: quem já cabia não se move', () => {
    const canvas = new LabelCanvas(canvasFalso());
    const sozinho = [rotulo('corpo:mars', 'Marte', 0.5, 0.45)];
    canvas.draw(sozinho);
    expect(sozinho[0].desenhado).toBe(true);
    // o deslocamento zero é o PRIMEIRO da tabela, sempre: é ele que faz
    // o rótulo que já cabia continuar exatamente onde estava
    expect(DESLOCAMENTOS[0]).toBe(0);
  });

  it('o passo LIMPA a caixa de colisão — 34 > 24 + 8', () => {
    // não é o ±18 do doador: nesta geometria 18 px ainda cruza, e as
    // cinco posições viravam uma
    for (const passo of DESLOCAMENTOS) {
      if (passo === 0) continue;
      expect(Math.abs(passo)).toBeGreaterThan(24 + 8);
    }
    // SETE e não os cinco do plano: com cinco lugares nos dois lados
    // cabiam 8 dos 10 corpos da abertura, medido no navegador (ver a
    // docstring). Sete LUGARES ao todo: a âncora (o zero) e três de cada
    // lado dela.
    expect(DESLOCAMENTOS.length).toBe(7);
    expect(DESLOCAMENTOS.filter((p) => p < 0)).toHaveLength(3);
    expect(DESLOCAMENTOS.filter((p) => p > 0)).toHaveLength(3);
    // simétricas em torno da âncora, e em ordem de distância
    expect([...DESLOCAMENTOS].sort((a, b) => Math.abs(a) - Math.abs(b))).toEqual([
      ...DESLOCAMENTOS,
    ]);
  });

  it('catorze empilhados cabem — os sete lugares nos dois lados; o 15º não', () => {
    const canvas = new LabelCanvas(canvasFalso());
    // quinze nomes no MESMO ponto — o pior caso do aglomerado interno,
    // exagerado: os sete lugares × dois lados = catorze vagas
    const muitos = Array.from({ length: 15 }, (_, i) =>
      rotulo(`corpo:c${i}`, `Corpo ${i}`, 0.5, 0.45)
    );
    canvas.draw(muitos);
    expect(muitos.filter((l) => l.desenhado).length).toBe(
      DESLOCAMENTOS.length * 2
    );
    expect(muitos[14].desenhado).toBe(false);
  });

  it('o LADO é alternativa, e o preferido vem primeiro', () => {
    const canvas = new LabelCanvas(canvasFalso());
    // dois no mesmo ponto, com a caixa alta o bastante para o primeiro
    // ocupar os sete lugares de um lado é caro — aqui basta ver
    // que os dois cabem, o que só é possível com dois lugares
    const dois = [
      rotulo('corpo:a', 'A', 0.5, 0.45),
      rotulo('corpo:b', 'B', 0.5, 0.45),
    ];
    canvas.draw(dois);
    expect(dois.every((l) => l.desenhado)).toBe(true);
  });

  it('o HUD ocupa PRIMEIRO, e os cinco lugares não o furam', () => {
    const canvas = new LabelCanvas(canvasFalso(1200, 900));
    // um painel no meio da tela, alto o bastante para engolir os cinco
    canvas.reservar([{ left: 500, right: 1100, top: 300, bottom: 560 }]);
    const labels = [rotulo('star:x', 'X', 0.52, 0.48)];
    canvas.draw(labels);
    expect(labels[0].desenhado).toBe(false);
  });
});

describe('três pesos visuais, numa tabela só', () => {
  it('a prioridade escolhe o peso, e o do meio é o desenho de sempre', () => {
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 100))).toBe(PESOS_DO_ROTULO.principal);
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 90))).toBe(PESOS_DO_ROTULO.principal);
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 10))).toBe(PESOS_DO_ROTULO.secundario);
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 5))).toBe(PESOS_DO_ROTULO.secundario);
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 3))).toBe(PESOS_DO_ROTULO.terciario);
  });

  it('SEM prioridade cai no do meio — é o rótulo do FILME, intocado', () => {
    const doFilme = pesoVisual(rotulo('star:x', 'X', 0, 0));
    expect(doFilme).toBe(PESOS_DO_ROTULO.secundario);
    // e o do meio É, número por número, o que o canvas sempre pintou
    expect(doFilme.tamanhoDoNome).toBe(12);
    expect(doFilme.pesoDoNome).toBe('500');
    expect(doFilme.corDoNome).toBe('rgba(240, 244, 251, 0.96)');
    expect(doFilme.tamanhoDoDetalhe).toBe(9);
    expect(doFilme.corDoDetalhe).toBe('rgba(159, 176, 201, 0.88)');
  });

  it('os três se distinguem no tamanho E na tinta', () => {
    const { principal, secundario, terciario } = PESOS_DO_ROTULO;
    expect(principal.tamanhoDoNome).toBeGreaterThan(secundario.tamanhoDoNome);
    expect(secundario.tamanhoDoNome).toBeGreaterThan(terciario.tamanhoDoNome);
    const cores = new Set([principal.corDoNome, secundario.corDoNome, terciario.corDoNome]);
    expect(cores.size).toBe(3);
  });
});
