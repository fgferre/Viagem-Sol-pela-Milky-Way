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

const { LabelCanvas, PESOS_DO_ROTULO, pesoVisual } = await import('./LabelCanvas');

/** o que o desenho escreveu: texto e onde ele pousou */
interface Pintada {
  texto: string;
  x: number;
  y: number;
}

/** contexto 2D de mentira: mede texto por caractere e ANOTA o que pinta. */
function contextoFalso() {
  const nada = () => {};
  const pintadas: Pintada[] = [];
  /** quantas vezes `measureText` foi chamado de verdade */
  const medicoes = { conta: 0 };
  return {
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
    fillText: (texto: string, x: number, y: number) => pintadas.push({ texto, x, y }),
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
  it('o desenho MARCA quem sobreviveu — no aglomerado fica quem chegou primeiro', () => {
    const labels = aberturaDoAtlas();
    new LabelCanvas(canvasFalso()).draw(labels);
    // A LEI DO ITEM 82: um lugar por nome, e colidiu — some. Quem chega
    // primeiro na lista ocupa, e a lista chega ordenada pela régua de
    // relevância, então quem some é sempre o MENOR da disputa. O Sol
    // abre a fila e fica; os quatro rochosos e as três luas caem DENTRO
    // da caixa dele e somem; Netuno, longe do nó, fica.
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

  it('NINGUÉM sai do desenho sem resposta — e a resposta vai no objeto do Director', () => {
    // Esta promessa era medida em `cinematic/atlasRig.test.ts` lendo o
    // TEXTO do laço deste arquivo (que `label.desenhado = false` viesse
    // antes do primeiro `continue`). Em 24/08 ela passou a ser medida
    // pelo comportamento: o que importa é que nenhum rótulo volte com a
    // marca `undefined`, porque o clique só descarta o `false` explícito
    // — um `undefined` faria o "SOL" escrito na tela valer Fobos.
    const labels = [
      rotulo('corpo:sun', 'Sol', 0.5, 0.4575, 90),
      // este some por ser quase transparente (a lua colada no pai)
      { ...rotulo('corpo:moon', 'Lua', 0.2, 0.3, 6), opacity: 0.01 },
      // este some porque a régua de relevância já disse não
      { ...rotulo('star:kdra', 'κ Dra', 0.8, 0.7, 3), cortadoPelaRegua: true },
      // e este some por colidir com o Sol
      rotulo('corpo:mercury', 'Mercúrio', 0.5028, 0.4567, 10),
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
    expect(juntos.filter((l) => l.desenhado).map((l) => l.name)).toEqual(['Alnitak']);

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
    expect(muitos[0].desenhado).toBe(true);
  });

  it('COLIDIU, O MENOR SOME: quem a régua pôs à frente é quem fica', () => {
    const { rotulos } = bancada();
    // a lista chega ordenada pela régua de relevância — o Sol antes do
    // planeta, o planeta antes da estrela. Quem chega primeiro ocupa, e
    // é assim que "o menor some" acontece sem uma segunda lei
    const doisNoMesmoPonto = [
      rotulo('corpo:sun', 'Sol', 0.5, 0.45, 90),
      rotulo('star:kdra', 'κ Dra', 0.5, 0.45, 3),
    ];
    rotulos.draw(doisNoMesmoPonto);
    expect(doisNoMesmoPonto[0].desenhado).toBe(true);
    expect(doisNoMesmoPonto[1].desenhado).toBe(false);
  });

  it('a régua manda ANTES da geometria: cortado não disputa lugar nenhum', () => {
    const { rotulos } = bancada();
    // sozinho no quadro, com a tela inteira à disposição — e mesmo assim
    // não nasce, porque a régua de relevância já disse não
    const cortado = rotulo('star:kdra', 'κ Dra', 0.3, 0.3, 3);
    cortado.cortadoPelaRegua = true;
    const passa = rotulo('star:vega', 'Vega', 0.7, 0.6, 5);
    rotulos.draw([cortado, passa]);
    expect(cortado.desenhado).toBe(false);
    expect(passa.desenhado).toBe(true);
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
    expect(ctx.pintadas.length).toBe(0);
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
    const indo = rotulo('star:indo', 'INDO', 0.4, 0.4);
    indo.saindo = true;
    // o mesmo pixel: sem a porta, o primeiro da lista ocuparia e o
    // segundo sumiria — que é a régua mudando por causa da rampa
    const vivo = rotulo('star:vivo', 'VIVO', 0.4, 0.4);
    rotulos.draw([indo, vivo]);
    expect(vivo.desenhado).toBe(true);
  });

  it('não vira alvo de clique nem alimenta a histerese', () => {
    const { rotulos } = bancada();
    const indo = rotulo('star:indo', 'INDO', 0.4, 0.4);
    indo.saindo = true;
    rotulos.draw([indo]);
    // `desenhado` é a lista única do clique (pendência 30) e a fonte da
    // histerese da régua: um nome de saída não entra em nenhuma das duas
    expect(indo.desenhado).toBe(false);
    expect(indo.ladoEsquerdo).toBeUndefined();
  });
});
