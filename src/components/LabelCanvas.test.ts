// Serve: dono — um lugar por nome: quem colide some, o clique só acha quem está escrito na tela, e o lado da vaga viaja com o objeto
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
// e três de cada lado — e TRÊS pesos visuais. EM 24/08 (item 82) os
// sete lugares MORRERAM: o dono viu a teia de traços que eles desenham
// (*"fica uma confusao na tela"*) e a lei virou a dos atlas de
// referência — um lugar por nome, e quem não cabe SOME. As duas metades
// acima continuam valendo palavra por palavra: o que muda é que agora
// some MAIS gente, e a marca é ainda mais necessária.
//
// O runner da casa é `node`: o canvas 2D é um duplo mínimo — o que se
// julga aqui é a decisão de colisão, que é aritmética, não pintura.
// ============================================================
import { describe, expect, it } from 'vitest';
import type { StarLabel } from '../three/world/labels';
import type { RotuloComVaga } from '../three/world/rotulos3d';

(globalThis as { window?: unknown }).window = { devicePixelRatio: 1 };

const {
  LabelCanvas,
  PESOS_DO_ROTULO,
  pesoVisual,
  QuadtreeDeRotulos,
  JULGAMENTOS_POR_QUADRO,
  VALORES_POR_NO,
  PROFUNDIDADE_MAXIMA,
} = await import('./LabelCanvas');

/** o que o desenho escreveu: texto e onde ele pousou */
interface Pintada {
  texto: string;
  x: number;
  y: number;
  /** o alfa VIGENTE no instante da pintura (item 125, F2 · A8) */
  alfa: number;
}

/** contexto 2D de mentira: mede texto por caractere e ANOTA o que pinta. */
function contextoFalso() {
  const nada = () => {};
  const pintadas: Pintada[] = [];
  /** quantas vezes `measureText` foi chamado de verdade */
  const medicoes = { conta: 0 };
  const ctx = {
    pintadas,
    medicoes,
    measureText: (t: string) => {
      medicoes.conta++;
      return { width: t.length * 7 };
    },
    setTransform: nada,
    clearRect: () => pintadas.splice(0, pintadas.length),
    beginPath: nada,
    moveTo: nada,
    lineTo: nada,
    stroke: nada,
    // o anel do ícone (item 89) desenha um arco cheio; aqui só se julga
    // a decisão de vaga, então as duas são mudas como as vizinhas
    arc: nada,
    fill: nada,
    fillText: (texto: string, x: number, y: number) =>
      pintadas.push({ texto, x, y, alfa: ctx.globalAlpha }),
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
  return ctx;
}

function canvasFalso(largura = 1200, altura = largura) {
  const ctx = contextoFalso();
  return {
    clientWidth: largura,
    clientHeight: altura,
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
}

/** um canvas de rótulos com o contexto de mentira à mão */
function bancada(largura = 1200, altura = largura) {
  const canvas = canvasFalso(largura, altura);
  const ctx = (canvas as unknown as { getContext: () => ReturnType<typeof contextoFalso> })
    .getContext();
  return { canvas, ctx, rotulos: new LabelCanvas(canvas) };
}

function rotulo(
  key: string,
  name: string,
  x: number,
  y: number,
  prioridade?: number
): RotuloComVaga {
  return { name, spect: '', detalhe: 'corpo', distPc: 0, x, y, opacity: 0.95, key, prioridade };
}

/**
 * A vista de abertura MEDIDA: o Sol, os planetas e as luas de Marte.
 *
 * OS PESOS SÃO OS DA CASA (item 125, F3): Sol 100, planeta 50, lua 25.
 * Até 01/09 a lista vinha sem eles e a disputa era por ORDEM DE CHEGADA;
 * hoje ela é pareada e o peso é o primeiro critério, então uma cena de
 * teste sem peso mede outra coisa (o desempate alfabético).
 */
function aberturaDoAtlas(): StarLabel[] {
  return [
    rotulo('corpo:sun', 'Sol', 0.5, 0.4575, 100),
    rotulo('corpo:mercury', 'Mercúrio', 0.5028, 0.4567, 50),
    rotulo('corpo:venus', 'Vênus', 0.5022, 0.455, 50),
    rotulo('corpo:earth', 'Terra', 0.4973, 0.461, 50),
    rotulo('corpo:mars', 'Marte', 0.5033, 0.4525, 50),
    rotulo('corpo:neptune', 'Netuno', 0.3326, 0.4031, 50),
    rotulo('corpo:moon', 'Lua', 0.4973, 0.4611, 25),
    rotulo('corpo:phobos', 'Fobos', 0.5033, 0.4525, 25),
    rotulo('corpo:deimos', 'Deimos', 0.5033, 0.4525, 25),
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
  it('o desenho MARCA quem sobreviveu — no aglomerado fica quem PESA mais', () => {
    const labels = aberturaDoAtlas();
    new LabelCanvas(canvasFalso()).draw(labels);
    // A LEI DO ITEM 82: um lugar por nome, e colidiu — some. Quem decide
    // (desde o item 125, F3) é a comparação PAREADA do Eyes: peso, depois
    // profundidade, depois alfabética. O Sol pesa 100 e fica; os quatro
    // rochosos e as três luas caem DENTRO da caixa dele e somem; Netuno,
    // longe do nó, fica.
    const desenhados = labels.filter((l) => l.desenhado).map((l) => l.key);
    expect(desenhados).toContain('corpo:sun');
    expect(desenhados).toContain('corpo:neptune');
    // e o que morreu morreu por ESTAR EM CIMA: cada perdedor projeta a
    // menos de 8 px do Sol, que é menos que a altura da caixa
    for (const l of labels) {
      if (l.desenhado) continue;
      const sol = labels[0];
      const dx = (l.x - sol.x) * 1200;
      const dy = (l.y - sol.y) * 1200;
      expect(Math.hypot(dx, dy), l.key).toBeLessThan(24);
    }
  });

  it('A ARMADILHA É REAL: sem a marca, o clique acha um invisível', () => {
    // com a abertura CHEIA (os dez mais as 21 luas) a disputa volta a
    // ter perdedores, e é sobre eles que a pendência 30 fala
    const labels = aberturaCheia();
    const canvas = new LabelCanvas(canvasFalso());
    // DOIS QUADROS, e a razão é o RODÍZIO (item 125, F3 · P7): o
    // `LabelQuadtree` julga 20 nomes por quadro, e são 31 aqui. Quem não
    // foi julgado mantém o veredito anterior — que num canvas recém-nascido
    // é "ainda não perdeu". A volta inteira leva dois quadros; a rampa de
    // 750 ms é que absorve essa latência na tela.
    canvas.draw(labels);
    canvas.draw(labels);
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
    const canvas = new LabelCanvas(canvasFalso());
    canvas.draw(labels); // a volta do rodízio, como acima
    canvas.draw(labels);
    const alvos = labels.filter((l) => l.desenhado !== false);
    const ultimo = labels.at(-1)!;
    const achado = maisPerto(alvos, ultimo.x, ultimo.y)!;
    // a promessa da pendência 30, palavra por palavra: o que o clique
    // acha É o que está escrito na tela
    expect(achado.desenhado).toBe(true);
  });

  it('NINGUÉM sai do desenho sem resposta — e a resposta vai no objeto do Director', () => {
    // Esta promessa era medida em `cinematic/atlasRig.test.ts` lendo o
    // TEXTO do laço deste arquivo (que `label.desenhado = false` viesse
    // antes do primeiro `continue`). Em 24/08 ela passou a ser medida
    // pelo comportamento: o que importa é que nenhum rótulo volte com a
    // marca `undefined`, porque o clique só descarta o `false` explícito
    // — um `undefined` faria o "SOL" escrito na tela valer Fobos.
    const labels = [
      rotulo('corpo:sun', 'Sol', 0.5, 0.4575, 100),
      // este some por ser quase transparente (a lua colada no pai)
      { ...rotulo('corpo:moon', 'Lua', 0.2, 0.3, 25), opacity: 0.01 },
      // este some porque a régua de aparição já o cedeu (F2 · A5)
      { ...rotulo('star:kdra', 'κ Dra', 0.8, 0.7, 5), causaDoSumico: 'tamanho' as const },
      // e este some por colidir com o Sol, que pesa mais
      rotulo('corpo:mercury', 'Mercúrio', 0.5028, 0.4567, 50),
    ];
    new LabelCanvas(canvasFalso()).draw(labels);
    for (const l of labels) expect(typeof l.desenhado, l.key).toBe('boolean');
    expect(labels.map((l) => l.desenhado)).toEqual([true, false, false, false]);
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
    // NÃO HÁ SEGUNDO LUGAR PARA QUEM ESTÁ ATRÁS DO PAINEL, e é o
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
// UM LUGAR POR NOME (item 82, N1) — a lei que substituiu os catorze
// lugares do item 73. O que se julga é a DECISÃO: onde o texto pousa, se
// ele pousa, e quem cede quando dois se atropelam. A pintura é do
// navegador; aqui só entra aritmética.
//
// Estes vereditos são de COMPORTAMENTO de propósito: nenhum deles
// pergunta o nome de uma constante nem conta linhas de tabela. Trocar a
// implementação inteira é permitido; mudar o que o visitante VÊ, não.
// ============================================================
describe('um lugar por nome — ou cabe ali, ou some', () => {
  it('o roteiro abre lugar para todos os assuntos e o fundo continua cedendo', () => {
    const canvas = new LabelCanvas(canvasFalso());
    const juntos = ['Alnitak', 'Alnilam', 'Mintaka'].map((name, i) =>
      rotulo(name, name, 0.4 + i * 0.005, 0.45)
    );
    canvas.draw(juntos);
    // três nomes empilhados, mesmo peso e mesma distância: quem fica é o
    // ÚLTIMO no alfabeto — o terceiro critério do Eyes (F3 · P3), e é
    // contraintuitivo de propósito (`localeCompare < 0 ⇒ é o ocluído`)
    expect(juntos.filter((l) => l.desenhado).map((l) => l.name)).toEqual(['Mintaka']);

    const dirigidos = juntos.map((l) => ({ ...l, dirigido: true }));
    const fundo = rotulo('fundo', 'Fundo', 0.407, 0.45);
    canvas.draw([...dirigidos, fundo]);
    expect(dirigidos.filter((l) => l.desenhado).map((l) => l.name))
      .toEqual(['Alnitak', 'Alnilam', 'Mintaka']);
    expect(fundo.desenhado).toBe(false);

    const { rotulos } = bancada();
    rotulos.reservar([{ left: 610, right: 800, top: 400, bottom: 680 }]);
    const semLugarDoLadoNatural = rotulo('dirigido', 'Dirigido', 0.5, 0.45);
    semLugarDoLadoNatural.dirigido = true;
    rotulos.draw([semLugarDoLadoNatural]);
    expect(semLugarDoLadoNatural.desenhado).toBe(true);
  });

  it('o nome pousa na MESMA ALTURA da âncora: acabaram os traços em diagonal', () => {
    // A TEIA QUE O DONO VIU eram os deslocamentos verticais: um nome que
    // não cabia subia até 102 px e puxava um risco diagonal até o ponto.
    // Com um lugar só, todo texto pousa na linha da própria âncora — e
    // é isso que faz o traço voltar a ser o risco horizontal de 10 px.
    const { ctx, rotulos } = bancada();
    const espalhados = Array.from({ length: 6 }, (_, i) =>
      rotulo(`corpo:c${i}`, `Corpo ${i}`, 0.2 + i * 0.1, 0.2 + i * 0.09)
    );
    rotulos.draw(espalhados);
    const desenhados = espalhados.filter((l) => l.desenhado);
    expect(desenhados.length).toBe(6);
    for (const l of desenhados) {
      const alturaDaAncora = l.y * 1200;
      const escritos = ctx.pintadas.filter((p) => Math.abs(p.y - alturaDaAncora) < 0.5);
      // o nome E o detalhe, os dois na linha da âncora
      expect(escritos.length, l.key).toBe(2);
    }
  });

  it('empilhados, sobra UM — e não catorze', () => {
    const { rotulos } = bancada();
    // quinze nomes no MESMO ponto: até 23/08 catorze deles achavam um
    // lugar e a tela virava uma coluna de texto saindo de um pixel
    const muitos = Array.from({ length: 15 }, (_, i) =>
      rotulo(`corpo:c${i}`, `Corpo ${i}`, 0.5, 0.45)
    );
    rotulos.draw(muitos);
    expect(muitos.filter((l) => l.desenhado).length).toBe(1);
    // e o sobrevivente é o mesmo em toda execução: chave por chave, a
    // ordem do P3 é TOTAL, e o último no alfabeto é quem fica
    expect(muitos.find((l) => l.desenhado)!.key).toBe('corpo:c9');
  });

  it('COLIDIU, O MENOR SOME: quem PESA mais é quem fica', () => {
    const { rotulos } = bancada();
    // a comparação é pareada (F3 · P3): o Sol pesa 100, a designação de
    // Bayer pesa 5 — e a ordem da lista não tem parte nenhuma nisso
    const doisNoMesmoPonto = [
      rotulo('star:kdra', 'κ Dra', 0.5, 0.45, 5),
      rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100),
    ];
    rotulos.draw(doisNoMesmoPonto);
    expect(doisNoMesmoPonto[1].desenhado).toBe(true);
    expect(doisNoMesmoPonto[0].desenhado).toBe(false);
  });

  it('A DERROTA NÃO É PERPÉTUA: o perdedor continua sendo julgado', () => {
    // A LEI MUDOU EM 01/09 (item 125, F3). Até então `cortadoPelaRegua`
    // era veto: o rótulo nem chegava à geometria. Agora ele é o
    // `hiddenByLabelQuadtree` deles — a marca do quadro anterior — e o
    // nome tem de ser julgado de novo, senão nunca voltaria à tela
    // quando o vencedor saísse de perto.
    const { rotulos } = bancada();
    const perdedor = rotulo('star:kdra', 'κ Dra', 0.3, 0.3, 5);
    perdedor.cortadoPelaRegua = true;
    const vizinho = rotulo('star:vega', 'Vega', 0.7, 0.6, 10);
    rotulos.draw([vizinho, perdedor]);
    // ninguém disputa o canto dele: ele volta
    expect(perdedor.desenhado).toBe(true);
    expect(perdedor.perdeuAVaga).toBe(false);
    expect(vizinho.desenhado).toBe(true);
  });

  it('perto da borda direita o nome cresce para DENTRO da tela', () => {
    const { ctx, rotulos } = bancada();
    const naBorda = [rotulo('star:x', 'X', 0.9, 0.45)];
    rotulos.draw(naBorda);
    expect(naBorda[0].desenhado).toBe(true);
    // o texto pousa à ESQUERDA da âncora: do outro lado ele sairia do
    // quadro. O lado não é vaga alternativa — é a borda mandando.
    const ancora = 0.9 * 1200;
    expect(ctx.pintadas.every((p) => p.x < ancora)).toBe(true);
  });

  it('o HUD ocupa PRIMEIRO, e não há segundo lugar para furá-lo', () => {
    const { rotulos } = bancada(1200, 900);
    // um painel no meio da tela: até 23/08 o nome procurava outra vaga
    // e podia contornar a borda dele
    rotulos.reservar([{ left: 500, right: 1100, top: 300, bottom: 560 }]);
    const labels = [rotulo('star:x', 'X', 0.52, 0.48)];
    rotulos.draw(labels);
    expect(labels[0].desenhado).toBe(false);
  });
});

// ============================================================
// O QUADRO QUE NÃO MUDOU NÃO SE REPINTA (item 82, N1) — os dois
// consertos baratos que vieram junto com a lei nova.
//
// `draw` limpava 3,7 M px e repintava tudo sessenta vezes por segundo,
// inclusive com o Atlas parado, e media cada string duas vezes por
// rótulo por quadro. O que NÃO pode mudar é o que o visitante vê e o que
// o clique acha — e é isso que estes vereditos guardam.
// ============================================================
describe('o quadro parado não se repinta', () => {
  it('o mesmo quadro duas vezes: a segunda não pinta nada', () => {
    const { ctx, rotulos } = bancada();
    const primeiro = aberturaDoAtlas();
    rotulos.draw(primeiro);
    const quantoPintou = ctx.pintadas.length;
    expect(quantoPintou).toBeGreaterThan(0);
    // a projeção do quadro seguinte é uma lista NOVA de objetos, com os
    // mesmos nomes nos mesmos pixels — é o Atlas parado
    rotulos.draw(aberturaDoAtlas());
    expect(ctx.pintadas.length).toBe(quantoPintou);
  });

  it('…e ainda assim a MARCA do clique é reescrita nos objetos novos', () => {
    // o defeito silencioso que este atalho poderia criar: a lista é
    // nova, e sem a marca ela nasceria `undefined` — que o clique lê
    // como "pode ser alvo". O "SOL" escrito na tela voltaria a valer
    // Fobos (pendência 30).
    const { rotulos } = bancada();
    const primeiro = aberturaDoAtlas();
    rotulos.draw(primeiro);
    const segundo = aberturaDoAtlas();
    rotulos.draw(segundo);
    // quadro pulado ou não, as marcas são as MESMAS, e nenhuma fica sem
    // resposta — é a lista única do desenho e do clique
    expect(segundo.map((l) => l.desenhado)).toEqual(primeiro.map((l) => l.desenhado));
    for (const l of segundo) expect(typeof l.desenhado, l.key).toBe('boolean');
  });

  it('o nome que ANDA repinta — o atalho é sobre o que não mudou', () => {
    const { ctx, rotulos } = bancada();
    rotulos.draw([rotulo('corpo:mars', 'Marte', 0.5, 0.45)]);
    expect(ctx.pintadas[0].x).toBe(600 + 18);
    // meio por cento de tela: seis pixels, que o olho vê. O dente está
    // em cobrar ONDE o texto foi pintado, e não quantas pinceladas
    // houve: a contagem passa com e sem o defeito, porque um quadro
    // pulado deixa na lista exatamente as pinceladas do quadro anterior.
    rotulos.draw([rotulo('corpo:mars', 'Marte', 0.505, 0.45)]);
    expect(ctx.pintadas[0].x).toBe(606 + 18);
  });

  it('o HUD que muda de forma repinta, ainda com os nomes parados', () => {
    const { ctx, rotulos } = bancada(1200, 900);
    const primeiro = [rotulo('star:x', 'X', 0.52, 0.48)];
    rotulos.draw(primeiro);
    expect(primeiro[0].desenhado).toBe(true);
    // um painel abriu debaixo do nome: os pixels do rótulo são os
    // mesmos, e mesmo assim o quadro é outro
    rotulos.reservar([{ left: 500, right: 1100, top: 300, bottom: 560 }]);
    const segundo = [rotulo('star:x', 'X', 0.52, 0.48)];
    rotulos.draw(segundo);
    expect(segundo[0].desenhado).toBe(false);
    expect(segundo[0].perdeuAVaga).toBe(true);
    // O QUE MUDOU EM 01/09 (item 125, F3): o perdedor não some no mesmo
    // quadro, ele SAI pela rampa de 750 ms — no Eyes a quadtree põe a
    // classe e a transição do CSS faz o resto, com o div pintando o
    // caminho todo. Aqui a rampa mora no produtor, então neste teste
    // unitário o nome continua sendo pintado; o que não pode é a decisão
    // ficar congelada pelo atalho da assinatura.
    expect(ctx.pintadas.length).toBeGreaterThan(0);
  });

  it('a mesma string não se mede duas vezes', () => {
    const { ctx, rotulos } = bancada();
    // dois quadros com os nomes ANDANDO: sem cache seriam duas medições
    // por rótulo por quadro, e as strings são exatamente as mesmas
    rotulos.draw([rotulo('corpo:mars', 'Marte', 0.3, 0.3)]);
    const medidoNoPrimeiro = ctx.medicoes.conta;
    expect(medidoNoPrimeiro).toBe(2); // o nome e o detalhe
    rotulos.draw([rotulo('corpo:mars', 'Marte', 0.6, 0.5)]);
    expect(ctx.medicoes.conta).toBe(medidoNoPrimeiro);
  });
});

// ============================================================
// A VAGA TEM LADO, E O LADO VIAJA NO OBJETO (item 109, 30/08).
//
// O contrato da beta 3D é "o 2D decide a vaga, o 3D só pinta nela" — mas
// o lado da vaga (a caixa reservada à ESQUERDA da âncora quando a borda
// direita manda) morria dentro deste arquivo, e o pintor 3D crescia
// sempre para a direita: nos 28% direitos da tela o nome saía clipado.
// Aqui se prova que o lado é escrito no MESMO objeto que `desenhado` —
// inclusive no quadro pulado pela assinatura, em que os objetos são
// novos — e que o rótulo da beta (`textoInvisivel`) o recebe mesmo sem
// um glifo 2D ser pintado.
// ============================================================
describe('a vaga tem lado, e o lado viaja no objeto (item 109)', () => {
  it('borda direita ⇒ vaga à esquerda; meio da tela ⇒ vaga à direita', () => {
    const { rotulos } = bancada();
    const naBorda = rotulo('corpo:x', 'X', 0.9, 0.45);
    const noMeio = rotulo('corpo:y', 'Y', 0.3, 0.3);
    rotulos.draw([naBorda, noMeio]);
    expect(naBorda.ladoEsquerdo).toBe(true);
    expect(noMeio.ladoEsquerdo).toBe(false);
  });

  it('o rótulo da beta (textoInvisivel) ocupa a vaga COM lado — sem pintar glifo', () => {
    const { ctx, rotulos } = bancada();
    const beta = { ...rotulo('corpo:earth', 'Terra', 0.9, 0.45), textoInvisivel: true };
    rotulos.draw([beta]);
    expect(beta.desenhado).toBe(true);
    expect((beta as RotuloComVaga).ladoEsquerdo).toBe(true);
    // o texto é do pintor 3D; aqui não sai pincelada de glifo nenhuma
    expect(ctx.pintadas).toHaveLength(0);
  });

  it('no quadro pulado pela assinatura, os objetos NOVOS repetem o lado', () => {
    // sem a lembrança, o pintor 3D veria `ladoEsquerdo` vazio num quadro
    // parado e o nome pulava de lado — o mesmo gênero de defeito
    // silencioso que a marca `desenhado` já desarma
    const { rotulos } = bancada();
    rotulos.draw([rotulo('corpo:x', 'X', 0.9, 0.45)]);
    const segundo = rotulo('corpo:x', 'X', 0.9, 0.45);
    rotulos.draw([segundo]);
    expect(segundo.desenhado).toBe(true);
    expect(segundo.ladoEsquerdo).toBe(true);
  });

  it('a entrada só-ícone não tem texto, logo não tem lado', () => {
    const { rotulos } = bancada();
    const so = { ...rotulo('corpo:z', 'Z', 0.9, 0.45), icone: true };
    rotulos.draw([so]);
    expect(so.desenhado).toBe(true);
    expect((so as RotuloComVaga).ladoEsquerdo).toBeUndefined();
    // e num quadro pulado o ícone segue sem lado
    const denovo = { ...rotulo('corpo:z', 'Z', 0.9, 0.45), icone: true };
    rotulos.draw([denovo]);
    expect(denovo.desenhado).toBe(true);
    expect((denovo as RotuloComVaga).ladoEsquerdo).toBeUndefined();
  });
});

describe('três pesos visuais, numa tabela só', () => {
  it('a prioridade escolhe o peso, e o do meio é o desenho de sempre', () => {
    // os degraus na escala do Eyes (item 125, F3 · P1) — o CONJUNTO de
    // quem cai em cada peso é o mesmo de antes, nome por nome
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 201))).toBe(PESOS_DO_ROTULO.principal); // foco
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 100))).toBe(PESOS_DO_ROTULO.principal); // sol
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 50))).toBe(PESOS_DO_ROTULO.secundario); // planeta
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 25))).toBe(PESOS_DO_ROTULO.secundario); // lua
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 10))).toBe(PESOS_DO_ROTULO.secundario); // nome próprio
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 5))).toBe(PESOS_DO_ROTULO.terciario); // Bayer
    expect(pesoVisual(rotulo('a', 'A', 0, 0, 1))).toBe(PESOS_DO_ROTULO.terciario); // piso
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

// ============================================================
// O NOME QUE ESTÁ SAINDO É IMAGEM, NÃO OCUPANTE (item 115, bloco B).
//
// A rampa de 250/750 ms devolve à pintura o rótulo que a régua de
// relevância CORTOU, para ele esvair em vez de sumir num quadro. A lei
// que faz disso o COMO e não o QUEM mora aqui: o `saindo` pinta e não
// reserva vaga, não vira alvo de clique e não guarda lado. Apagar a
// porta do `saindo` no desenho faz os três vereditos abaixo reprovarem.
// ============================================================
describe('o nome que sai pinta, mas não ocupa (item 115)', () => {
  it('pinta na tela como qualquer outro', () => {
    const { ctx, rotulos } = bancada();
    const indo = rotulo('star:indo', 'INDO', 0.4, 0.4);
    indo.saindo = true;
    rotulos.draw([indo]);
    expect(ctx.pintadas.map((p) => p.texto)).toContain('INDO');
  });

  it('não reserva a vaga: o vizinho VIVO entra por cima dele', () => {
    const { rotulos } = bancada();
    // o de saída pesa MAIS e mesmo assim cede: quem está escondido não
    // derruba ninguém (F3 · P9), e é essa linha que impede a rampa de
    // virar régua
    const indo = rotulo('star:indo', 'INDO', 0.4, 0.4, 50);
    indo.saindo = true;
    indo.cortadoPelaRegua = true;
    const vivo = rotulo('star:vivo', 'VIVO', 0.4, 0.4, 10);
    rotulos.draw([indo, vivo]);
    expect(vivo.desenhado).toBe(true);
  });

  it('não vira alvo de clique: quem perdeu a vaga não é alvo', () => {
    const { rotulos } = bancada();
    // os dois no mesmo pixel: o de peso menor perde e, perdendo, sai da
    // lista única do clique (pendência 30) e não guarda lado
    const indo = rotulo('star:indo', 'INDO', 0.4, 0.4, 5);
    const fica = rotulo('star:fica', 'FICA', 0.4, 0.4, 100);
    rotulos.draw([indo, fica]);
    expect(indo.desenhado).toBe(false);
    expect(indo.perdeuAVaga).toBe(true);
    expect(indo.ladoEsquerdo).toBeUndefined();
    expect(fica.desenhado).toBe(true);
  });
});

// ============================================================
// A8 — O PRODUTO DAS DUAS CAMADAS chega ao PIXEL (item 125, F2).
//
// A conta das camadas mora em `world/labels.ts` e é julgada lá. O que se
// prova aqui é o último elo: que o desenho pinta o TEXTO com o produto e
// que o anel/risco fica na camada de fora — o canal de ícone é da F5.
// ============================================================
describe('A8 — o texto pinta o produto das duas camadas', () => {
  it('o nome sai com `opacity × alfaDoTexto`, e o ausente vale 1', () => {
    const { ctx, rotulos } = bancada();
    const l = rotulo('corpo:earth', 'Terra', 0.5, 0.5);
    l.opacity = 0.8;
    l.alfaDoTexto = 0.35;
    rotulos.draw([l]);
    const nome = ctx.pintadas.find((p) => p.texto === 'TERRA')!;
    expect(nome.alfa).toBeCloseTo(0.8 * 0.35, 12);

    // O RAMO DO FILME não passa pelas rampas e não traz o campo: ele
    // continua pintando com a opacidade de sempre, pixel a pixel.
    const { ctx: ctx2, rotulos: r2 } = bancada();
    const semCanal = rotulo('corpo:earth', 'Terra', 0.5, 0.5);
    semCanal.opacity = 0.8;
    r2.draw([semCanal]);
    expect(ctx2.pintadas.find((p) => p.texto === 'TERRA')!.alfa).toBeCloseTo(0.8, 12);
    // SABOTAGEM QUE ISTO MORDE: pintar só `opacity` (ou só o alfa do
    // canal) muda o primeiro número e deixa o segundo igual.
  });

  it('o alfa do canal entra na ASSINATURA — o fade não congela no atalho', () => {
    const { ctx, rotulos } = bancada();
    const l = rotulo('corpo:earth', 'Terra', 0.5, 0.5);
    l.opacity = 0.8;
    l.alfaDoTexto = 0.35;
    rotulos.draw([l]);
    const primeiro = ctx.pintadas.find((p) => p.texto === 'TERRA')!.alfa;
    // mesmo pixel, mesma opacidade de fora, SÓ o canal de dentro andou
    const l2 = rotulo('corpo:earth', 'Terra', 0.5, 0.5);
    l2.opacity = 0.8;
    l2.alfaDoTexto = 0.75;
    rotulos.draw([l2]);
    const segundo = ctx.pintadas.find((p) => p.texto === 'TERRA')!.alfa;
    expect(segundo).not.toBeCloseTo(primeiro, 6);
    expect(segundo).toBeCloseTo(0.8 * 0.75, 12);
    // SABOTAGEM QUE ISTO MORDE: tirar `alfaDoTexto` da assinatura faz o
    // segundo desenho ser pulado e os dois números coincidirem.
  });
});

// ============================================================
// A QUADTREE DA COLISÃO (item 125, F3 · P5/P6/P7) — a estrutura do
// `LabelQuadtree` do NASA Eyes, com os literais dele.
//
// Estes vereditos são os únicos do arquivo que olham a estrutura por
// dentro, e é deliberado: a fase inteira é "adote a quadtree deles", e
// uma varredura linear com o nome de árvore passaria em todo teste de
// comportamento. O que se cobra aqui são os NÚMEROS (8 valores por nó,
// profundidade 8, colapso em 4) e a lei de descida (um valor só desce
// para o filho que o CONTENHA inteiro).
// ============================================================
describe('a quadtree — a estrutura, com os números deles', () => {
  const caixa = (x: number, y: number, lado = 2) => ({
    left: x, right: x + lado, top: y, bottom: y + lado,
  });

  it('os literais são 8 valores por nó, profundidade 8 e colapso em 4', () => {
    expect(VALORES_POR_NO).toBe(8);
    expect(PROFUNDIDADE_MAXIMA).toBe(8);
    expect(JULGAMENTOS_POR_QUADRO).toBe(20);
  });

  it('acha quem cruza e ignora quem não cruza — o contrato mínimo', () => {
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    arvore.inserir('a', 'a', caixa(10, 10));
    arvore.inserir('b', 'b', caixa(900, 900));
    expect(arvore.consultar(caixa(11, 11), []).map((v) => v.nome)).toEqual(['a']);
    expect(arvore.consultar(caixa(500, 500), [])).toEqual([]);
    expect(arvore.tamanho).toBe(2);
  });

  it('NOVE valores no mesmo canto estouram o nó — e todos continuam achados', () => {
    // a prova de que a subdivisão não PERDE ninguém: é o defeito clássico
    // de quadtree, e ele some em silêncio (um nome deixa de derrubar o
    // vizinho e a tela ganha uma sobreposição que ninguém explica)
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    for (let i = 0; i < 9; i++) arvore.inserir(`v${i}`, `v${i}`, caixa(10 + i, 10));
    expect(arvore.tamanho).toBe(9);
    const achados = arvore.consultar({ left: 0, right: 100, top: 0, bottom: 100 }, []);
    expect(achados.length).toBe(9);
    // e a busca larga acha os nove pelos QUATRO quadrantes também
    expect(arvore.consultar({ left: 0, right: 1000, top: 0, bottom: 1000 }, []).length).toBe(9);
  });

  it('quem NÃO cabe num filho fica no pai — e continua sendo achado', () => {
    // um retângulo que cruza o meio da tela não desce: `bounds.surrounds`
    // é a lei, e um valor mal colocado num filho sumiria das consultas
    // feitas pelo filho vizinho
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    for (let i = 0; i < 9; i++) arvore.inserir(`v${i}`, `v${i}`, caixa(10 + i, 10));
    arvore.inserir('meio', 'meio', { left: 400, right: 600, top: 400, bottom: 600 });
    expect(arvore.consultar(caixa(590, 590), []).map((v) => v.nome)).toEqual(['meio']);
  });

  it('remover devolve a árvore ao estado anterior — e o valor some das buscas', () => {
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    for (let i = 0; i < 9; i++) arvore.inserir(`v${i}`, `v${i}`, caixa(10 + i, 10));
    for (let i = 0; i < 9; i++) arvore.remover(`v${i}`);
    expect(arvore.tamanho).toBe(0);
    expect(arvore.consultar({ left: 0, right: 1000, top: 0, bottom: 1000 }, [])).toEqual([]);
    // e a árvore volta a funcionar depois do colapso
    arvore.inserir('novo', 'novo', caixa(10, 10));
    expect(arvore.consultar(caixa(11, 11), []).map((v) => v.nome)).toEqual(['novo']);
  });

  it('o COLAPSO recolhe os valores para o pai — ninguém se perde na volta', () => {
    // a árvore estoura em quatro filhos com nove valores e volta a ser um
    // nó só quando a subárvore cai abaixo de quatro (`maxValuesPerNode/2`).
    // O defeito que isto pega é o do colapso que DESCARTA em vez de
    // recolher: a árvore encolhe, as buscas ficam mudas e a colisão para
    // de acontecer sem que nada acuse.
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    for (let i = 0; i < 9; i++) arvore.inserir(`v${i}`, `v${i}`, caixa(10 + i * 3, 10));
    for (let i = 0; i < 6; i++) arvore.remover(`v${i}`);
    expect(arvore.tamanho).toBe(3);
    const achados = arvore.consultar({ left: 0, right: 1000, top: 0, bottom: 1000 }, []);
    expect(achados.map((v) => v.nome).sort()).toEqual(['v6', 'v7', 'v8']);
  });

  it('inserir o mesmo nome duas vezes SUBSTITUI — a caixa nova manda', () => {
    // é assim que o rodízio atualiza a caixa de um nome que se moveu; sem
    // isto a árvore acumularia fantasmas do quadro anterior
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    arvore.inserir('a', 'a', caixa(10, 10));
    arvore.inserir('a', 'a', caixa(900, 900));
    expect(arvore.tamanho).toBe(1);
    expect(arvore.consultar(caixa(11, 11), [])).toEqual([]);
    expect(arvore.consultar(caixa(901, 901), []).map((v) => v.nome)).toEqual(['a']);
  });

  it('a janela nova reconstrói a raiz — caixa de quadro velho não sobrevive', () => {
    const arvore = new QuadtreeDeRotulos(1000, 1000);
    arvore.inserir('a', 'a', caixa(10, 10));
    arvore.redimensionar(400, 300);
    expect(arvore.tamanho).toBe(0);
  });
});

// ============================================================
// O RODÍZIO E OS DOIS RETÂNGULOS (item 125, F3 · P6/P7) — vistos pelo
// desenho, que é onde eles decidem o que o visitante vê.
// ============================================================
describe('o rodízio julga 20 por quadro (item 125, F3 · P7)', () => {
  /** um nome pesado e `n` leves, todos no mesmo ponto */
  const empilhados = (n: number): StarLabel[] => [
    rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100),
    ...Array.from({ length: n }, (_, i) =>
      rotulo(`star:s${String(i).padStart(2, '0')}`, `S${i}`, 0.5, 0.45, 5)
    ),
  ];

  it('num quadro só, quem ficou FORA da janela não é julgado — e continua na tela', () => {
    const { rotulos } = bancada();
    const labels = empilhados(24); // 25 nomes, janela de 20
    rotulos.draw(labels);
    const desenhados = labels.filter((l) => l.desenhado);
    // o Sol mais os CINCO que o rodízio ainda não alcançou
    expect(desenhados.length).toBe(1 + (25 - JULGAMENTOS_POR_QUADRO));
    expect(desenhados[0].key).toBe('corpo:sun');
  });

  it('no quadro seguinte a volta se completa e sobra UM', () => {
    const { rotulos } = bancada();
    const labels = empilhados(24);
    rotulos.draw(labels);
    const segundos = empilhados(24); // objetos NOVOS, como na projeção
    rotulos.draw(segundos);
    expect(segundos.filter((l) => l.desenhado).map((l) => l.key)).toEqual(['corpo:sun']);
  });

  it('quem não foi julgado MANTÉM o veredito anterior, não o perde', () => {
    const { rotulos } = bancada();
    rotulos.draw(empilhados(24));
    rotulos.draw(empilhados(24));
    // terceiro quadro: a janela cobre outros vinte, e os que ficaram de
    // fora continuam derrotados — sem isto o nome voltaria a piscar a
    // cada volta do rodízio
    const terceiros = empilhados(24);
    rotulos.draw(terceiros);
    expect(terceiros.filter((l) => l.desenhado).map((l) => l.key)).toEqual(['corpo:sun']);
  });

  it('o atalho da assinatura NÃO congela um rodízio pela metade', () => {
    // o quadro de entrada é idêntico nos dois desenhos; se o atalho
    // valesse já no segundo, os cinco não julgados ficariam na tela para
    // sempre
    const { rotulos } = bancada();
    rotulos.draw(empilhados(24));
    const segundos = empilhados(24);
    rotulos.draw(segundos);
    expect(segundos.filter((l) => l.desenhado).length).toBe(1);
  });
});

describe('dois retângulos por nome (item 125, F3 · P6)', () => {
  it('o NOME que pousa em cima da marca de outro objeto cede', () => {
    const { rotulos } = bancada(1200, 900);
    // o Sol tem a marca dele no ponto; a estrela está à ESQUERDA, e o
    // texto dela cresce para a direita, por cima da marca do Sol
    const sol = rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100);
    const vizinha = rotulo('star:v', 'V', 0.47, 0.45, 5);
    rotulos.draw([sol, vizinha]);
    expect(sol.desenhado).toBe(true);
    expect(vizinha.desenhado).toBe(false);
    // e o inverso: longe da marca, o mesmo par convive
    const { rotulos: r2 } = bancada(1200, 900);
    const sol2 = rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100);
    const longe = rotulo('star:v', 'V', 0.2, 0.2, 5);
    r2.draw([sol2, longe]);
    expect(longe.desenhado).toBe(true);
  });

  it('a marca NÃO é quem perde: dois objetos vizinhos guardam os dois ícones', () => {
    // entrada só-ícone (item 89): a marca é o rótulo, e aí sim ela
    // disputa — dois ícones no mesmo pixel não podem ficar os dois
    const { rotulos } = bancada();
    const a = { ...rotulo('corpo:a', 'A', 0.5, 0.45, 50), icone: true };
    const b = { ...rotulo('corpo:b', 'B', 0.5, 0.45, 25), icone: true };
    rotulos.draw([a, b]);
    expect(a.desenhado).toBe(true);
    expect(b.desenhado).toBe(false);
  });
});

describe('os retângulos são do CANVAS, não do dispositivo', () => {
  it('o mesmo quadro em dpr 2 decide igual — a árvore não dobra de lado', () => {
    const janela = globalThis.window as unknown as { devicePixelRatio: number };
    const labels1 = aberturaDoAtlas();
    janela.devicePixelRatio = 1;
    new LabelCanvas(canvasFalso()).draw(labels1);
    const labels2 = aberturaDoAtlas();
    janela.devicePixelRatio = 2;
    new LabelCanvas(canvasFalso()).draw(labels2);
    janela.devicePixelRatio = 1;
    expect(labels2.map((l) => l.desenhado)).toEqual(labels1.map((l) => l.desenhado));
  });
});

// ============================================================
// A CAIXA JULGADA SAI NO OBJETO (item 125, F3) — o contrato que o juiz
// de imagem do `atlas-smoke` lê. Sem ele o juiz teria de recalcular a
// geometria por fora, com a fonte, o lado e a largura do texto: uma
// segunda régua, que mede a cópia e não a tela.
// ============================================================
describe('a caixa da disputa viaja no rótulo', () => {
  it('quem disputou tem caixa; quem está fora da disputa NÃO tem', () => {
    const { rotulos } = bancada(1200, 900);
    const vivo = rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100);
    const cedido = { ...rotulo('corpo:x', 'X', 0.3, 0.3, 50), causaDoSumico: 'tamanho' as const };
    const apagado = { ...rotulo('corpo:y', 'Y', 0.7, 0.3, 50), opacity: 0.01 };
    rotulos.draw([vivo, cedido, apagado]);
    expect(vivo.caixaDaDisputa).toBeDefined();
    expect(vivo.caixaDaDisputa!.right).toBeGreaterThan(vivo.caixaDaDisputa!.left);
    expect(vivo.caixaDaDisputa!.folga).toBe(8);
    expect(cedido.caixaDaDisputa).toBeUndefined();
    expect(apagado.caixaDaDisputa).toBeUndefined();
  });

  it('NENHUM par de caixas desenhadas se sobrepõe — a lei nova, medida', () => {
    const { rotulos } = bancada(1200, 900);
    const labels = aberturaCheia();
    rotulos.draw(labels);
    rotulos.draw(labels); // a volta do rodízio
    const naTela = labels.filter((l) => l.desenhado).map((l) => l.caixaDaDisputa!);
    expect(naTela.length).toBeGreaterThan(1);
    for (let i = 0; i < naTela.length; i++) {
      for (let j = i + 1; j < naTela.length; j++) {
        const a = naTela[i];
        const b = naTela[j];
        const cruza =
          a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
        expect(cruza, `caixas ${i} e ${j} se sobrepõem`).toBe(false);
      }
    }
  });

  it('quem PERDEU tem, no mesmo espaço, um desenhado que o vence', () => {
    const { rotulos } = bancada(1200, 900);
    const labels = aberturaCheia();
    rotulos.draw(labels);
    rotulos.draw(labels);
    const naTela = labels.filter((l) => l.desenhado);
    const perdedores = labels.filter((l) => l.perdeuAVaga && l.caixaDaDisputa);
    expect(perdedores.length).toBeGreaterThan(0);
    for (const p of perdedores) {
      const c = p.caixaDaDisputa!;
      const vencedor = naTela.find((v) => {
        const b = v.caixaDaDisputa!;
        return (
          c.right + c.folga > b.left && c.left - c.folga < b.right
          && c.bottom + c.folga > b.top && c.top - c.folga < b.bottom
        );
      });
      expect(vencedor, `${p.key} perdeu para ninguém`).toBeDefined();
    }
  });

  it('e a caixa sobrevive ao quadro pulado pela assinatura', () => {
    const { rotulos } = bancada(1200, 900);
    const primeiro = [rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100)];
    rotulos.draw(primeiro);
    rotulos.draw([rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100)]);
    const terceiro = [rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100)];
    rotulos.draw(terceiro); // este sai pelo atalho: objetos NOVOS
    expect(terceiro[0].caixaDaDisputa).toEqual(primeiro[0].caixaDaDisputa);
  });
});

// ============================================================
// §4 ENCOBRIMENTO — o nome que o globo esconde (item 125, F4 · O1-O5).
//
// Ele é o TERCEIRO estado desta bancada, e não existia antes: não é
// candidato (não entra na árvore, não ocupa vaga, não recebe clique) e
// mesmo assim PINTA, porque a rampa de 750 ms corre sobre o globo. No
// Eyes é o `<div>` com `hidden`: alfa a zero em 750 ms,
// `pointer-events: none`, desenhando onde estava.
// ============================================================
describe('F4 — o nome ocluído pinta sem ocupar', () => {
  /** o mesmo rótulo, marcado como o produtor o entrega quando o globo o pega */
  const atrasDoGlobo = (l: StarLabel): StarLabel => ({
    ...l,
    causaDoSumico: 'oclusao',
    saindo: true,
    opacity: 0.5,
  });

  it('PINTA a rampa, mas não é alvo de clique nem tem caixa julgada', () => {
    const { rotulos, ctx } = bancada(1200, 900);
    const preso = atrasDoGlobo(rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100));
    rotulos.draw([preso]);
    expect(ctx.pintadas.map((p) => p.texto)).toContain('SOL');
    // ...com a tinta da rampa, não com a cheia
    expect(ctx.pintadas.find((p) => p.texto === 'SOL')!.alfa).toBeCloseTo(0.5, 10);
    // e nada mais: sem clique, sem caixa, sem veredito de disputa
    expect(preso.desenhado).toBe(false);
    expect(preso.caixaDaDisputa).toBeUndefined();
    expect(preso.perdeuAVaga).toBe(false);
  });

  it('NÃO reserva espaço: o vizinho mais fraco no mesmo lugar continua na tela', () => {
    const { rotulos } = bancada(1200, 900);
    // dois nomes no MESMO ponto: o forte (peso 100) e o fraco (peso 25)
    const forte = rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100);
    const fraco = rotulo('corpo:moon', 'Lua', 0.5, 0.45, 25);
    rotulos.draw([forte, fraco]);
    expect(forte.desenhado).toBe(true);
    expect(fraco.desenhado).toBe(false); // a lei de sempre: quem colide some
    // agora o forte está atrás de um globo — ele sai da árvore, e a vaga
    // que ele ocupava fica livre para o fraco
    const { rotulos: outro } = bancada(1200, 900);
    const escondido = atrasDoGlobo(rotulo('corpo:sun', 'Sol', 0.5, 0.45, 100));
    const livre = rotulo('corpo:moon', 'Lua', 0.5, 0.45, 25);
    outro.draw([escondido, livre]);
    expect(livre.desenhado).toBe(true);
    expect(escondido.desenhado).toBe(false);
  });

  it('a MARGEM da composição continua valendo — ocluído no rodapé não pinta', () => {
    // a causa de fora não é passe livre: quem cai na faixa do HUD não
    // desenha, ocluído ou não
    const { rotulos, ctx } = bancada(1200, 900);
    rotulos.draw([atrasDoGlobo(rotulo('corpo:sun', 'Sol', 0.5, 0.95, 100))]);
    expect(ctx.pintadas).toHaveLength(0);
  });
});
