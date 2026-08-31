// Serve: chão — a trilha do juiz da beira segue a FITA e não a estrela mais brilhante da faixa, e ainda reprova fita que some ou que morre no meio (item 121)
// ============================================================
// O JUIZ DO JUIZ DA BEIRA — quadros montados à mão, com a resposta ao
// lado, para que o achador da crista não possa mudar em silêncio.
//
// O QUE ESTE ARQUIVO PROTEGE. O `beira-da-fita.mjs` mede um perfil
// através da fita, e para isso precisa primeiro ACHAR a fita numa faixa
// do quadro que também tem estrelas. Até o item 121 ele tomava o pixel
// mais claro de cada coluna; com o gradiente da fita (bloco B do 115) a
// fita passou a ser mais ESCURA que várias estrelas do campo, o pixel
// mais claro virou estrela, e o juiz reprovava a si mesmo — na perna de
// dpr 1, `colunasMansas` 0,86 contra um mínimo de 0,90, com a fita
// perfeitamente medível (pico 104 contra céu 24).
//
// O conserto trocou o pixel mais claro pela TRILHA de maior soma que anda
// devagar, e a cobrança da continuidade — que a construção agora garante
// — pela cobrança de que a trilha esteja VIVA de ponta a ponta. Os dois
// lados dessa troca têm de continuar valendo:
//
//   · a trilha ignora estrela mais brilhante que a fita (o conserto);
//   · e ainda assim reprova quando não há fita, ou quando a fita morre no
//     meio da janela (o que o conserto NÃO pode ter afrouxado).
//
// Os quadros são `Float32Array` de cinza, entrando pela porta
// `julgarQuadro` — sem um codificador de PNG no meio, que só poderia
// inventar o que se quer medir.
// ============================================================
import { describe, expect, it } from 'vitest';
import {
  BUSCA_X,
  BUSCA_Y,
  MIN_DE_COLUNAS_VIVAS,
  PASSO_MAX_DA_CRISTA,
  PISO_DA_CRISTA,
  acharACrista,
  julgarQuadro,
} from './beira-da-fita.mjs';

const LARGURA = 1067;
const ALTURA = 800;

/** a mesma janela que o juiz vai varrer — para plantar a fita dentro dela */
function janela(largura = LARGURA, altura = ALTURA) {
  const meia = Math.round((altura * BUSCA_X) / 2);
  return {
    x0: Math.round(largura / 2) - meia,
    x1: Math.round(largura / 2) + meia,
    y0: Math.round(altura * BUSCA_Y.de),
    y1: Math.round(altura * BUSCA_Y.ate),
  };
}

/** um borrão gaussiano — serve de estrela e de corte transversal da fita */
function borrao(cinza, largura, x, y, amplitude, sigma) {
  const raio = Math.ceil(sigma * 4);
  for (let dy = -raio; dy <= raio; dy++) {
    const linha = (y + dy) * largura;
    for (let dx = -raio; dx <= raio; dx++) {
      const xx = x + dx;
      if (xx < 0 || xx >= largura) continue;
      cinza[linha + xx] += amplitude * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
    }
  }
}

/**
 * Um quadro com céu chapado e uma fita quase horizontal descendo devagar
 * pela janela. `viva` é a fração da janela em que a fita existe — 1 é a
 * fita inteira, 0,6 é a fita que morre a 60% do caminho.
 */
function quadroComFita({
  ceu = 24, brilhoDaFita = 80, sigma = 1, inclinacao = 0.25, viva = 1, estrelas = [],
} = {}) {
  const cinza = new Float32Array(LARGURA * ALTURA).fill(ceu);
  const { x0, x1 } = janela();
  const fim = x0 + Math.round((x1 - x0) * viva);
  for (let x = x0 - 4; x < x1 + 4; x++) {
    if (x >= fim) continue;
    const yc = Math.round(110 - inclinacao * (x - x0));
    for (let dy = -5; dy <= 5; dy++) {
      cinza[(yc + dy) * LARGURA + x] += brilhoDaFita * Math.exp(-(dy * dy) / (2 * sigma * sigma));
    }
  }
  for (const e of estrelas) borrao(cinza, LARGURA, e.x, e.y, e.brilho, e.sigma ?? 1.2);
  return cinza;
}

/** onde a fita está, na coluna `x`, para o mesmo desenho de `quadroComFita` */
const yDaFita = (x, inclinacao = 0.25) => Math.round(110 - inclinacao * (x - janela().x0));

describe('a trilha segue a fita, não o pixel mais claro da faixa', () => {
  const xEstrela = Math.round(LARGURA / 2);
  const yEstrela = 40;
  const quadro = quadroComFita({
    estrelas: [{ x: xEstrela, y: yEstrela, brilho: 220, sigma: 1.2 }],
  });

  it('a estrela É mais clara que a fita naquela coluna — senão o teste não separa nada', () => {
    const naEstrela = quadro[yEstrela * LARGURA + xEstrela];
    const naFita = quadro[yDaFita(xEstrela) * LARGURA + xEstrela];
    expect(naEstrela).toBeGreaterThan(naFita);
    // e a estrela está longe da fita: não é ambiguidade de um pixel
    expect(Math.abs(yEstrela - yDaFita(xEstrela))).toBeGreaterThan(40);
  });

  it('e ainda assim a crista fica na fita na coluna da estrela', () => {
    const { colunas } = acharACrista(quadro, LARGURA, ALTURA);
    const c = colunas.find((k) => k.x === xEstrela);
    expect(c.y).toBe(yDaFita(xEstrela));
  });

  it('nenhuma coluna salta — é o que o achador antigo não conseguia com estrela na faixa', () => {
    const { colunas } = acharACrista(quadro, LARGURA, ALTURA);
    const maiorSalto = colunas
      .slice(1)
      .reduce((m, c, i) => Math.max(m, Math.abs(c.y - colunas[i].y)), 0);
    expect(maiorSalto).toBeLessThanOrEqual(PASSO_MAX_DA_CRISTA);
  });

  it('e o quadro é APROVADO, com os dois números da fita desenhada', () => {
    const v = julgarQuadro(quadro, LARGURA, ALTURA);
    expect(v.aprovado).toBe(true);
    expect(v.colunasVivas).toBe(1);
    // sigma 1 dá FWHM 2·√(2 ln2)·σ = 2,355 px; a interpolação linear entre
    // pixels inteiros erra pouco e para baixo
    expect(v.fwhmPx).toBeGreaterThan(2.2);
    expect(v.fwhmPx).toBeLessThan(2.5);
  });
});

describe('o que a trilha NÃO pode ter afrouxado', () => {
  it('sem fita nenhuma, reprova por crista fraca — estrelas soltas não fazem fita', () => {
    const { x0, x1 } = janela();
    const cinza = new Float32Array(LARGURA * ALTURA).fill(24);
    for (let k = 0; k < 12; k++) {
      borrao(cinza, LARGURA, x0 + Math.round(((x1 - x0) * k) / 12), 40 + k * 7, 220, 1.2);
    }
    const v = julgarQuadro(cinza, LARGURA, ALTURA);
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/sem fita na faixa/);
  });

  it('fita esmaecida abaixo do piso reprova, por mais contínua que ela seja', () => {
    // a fita inteira, mas com brilho que não chega ao piso da crista
    const v = julgarQuadro(
      quadroComFita({ ceu: 4, brilhoDaFita: PISO_DA_CRISTA - 10 }),
      LARGURA,
      ALTURA
    );
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/sem fita na faixa/);
  });

  it('fita que morre no meio da janela reprova — trilha contínua não basta', () => {
    const v = julgarQuadro(quadroComFita({ viva: 0.6 }), LARGURA, ALTURA);
    expect(v.aprovado).toBe(false);
    expect(v.motivo).toMatch(/a trilha morre no meio/);
  });

  it('...e a soleira do vivo morde de verdade: 0,95 passa, 0,80 não', () => {
    expect(MIN_DE_COLUNAS_VIVAS).toBe(0.9);
    expect(julgarQuadro(quadroComFita({ viva: 0.95 }), LARGURA, ALTURA).aprovado).toBe(true);
    expect(julgarQuadro(quadroComFita({ viva: 0.8 }), LARGURA, ALTURA).aprovado).toBe(false);
  });
});
