/**
 * OS RÓTULOS QUE A CENA DESENHA, rasterizados AQUI, na thread principal:
 * o worker não tem as fontes do app (`cena.ts`, `RotuloPronto`). Cada um
 * segue, linha por linha, a especificação do cabeçalho da cena que o usa
 * — os nomes das constelações em `cenas/ceu.ts` (item 3) e a pílula do
 * Sol em `cenas/galaxia.ts` — na língua de agora e no `dpr` da cena.
 *
 * A posição de cada letra vem do LAYOUT do navegador (um elemento de DOM
 * com as propriedades do protótipo, medido letra a letra) e o canvas só
 * pinta cada letra ali: o canvas 2D não liga o `tabular-nums` do Inter,
 * que encolhe cada avanço da pílula (a armadilha do cabeçalho da
 * galáxia), e assim o espaçamento é o mesmo do texto em HTML.
 */
import type { IdDaTela, RotuloPronto } from './cena';
import { RETRATO_ABAIXO_DE } from './cena';
import { idiomaAtual, t, type ChaveDeTexto } from '../../lib/idioma';

/** os nomes do céu, pelo id que a cena procura no mapa (`cenas/ceu.ts`, item 3) */
const NOMES_DO_CEU: readonly [string, ChaveDeTexto][] = [
  ['cruzeiro', 'hud.carga.cruzeiro'],
  ['escorpiao', 'hud.carga.escorpiao'],
  ['sagitario', 'hud.carga.sagitario'],
];
/** folga de CSS em volta da caixa de cada nome, onde cabe o desfoque da sombra */
const FOLGA_DO_NOME = 12;
/** o id da pílula na cena da galáxia */
const ID_DA_PILULA = 'voceEstaAqui';

const familia = (token: string, reserva: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim() || reserva;

/** a fonte pode não ter chegado ainda; sem ela o rótulo sai na reserva, e não falta */
async function carregarFonte(fonte: string, texto: string): Promise<void> {
  try {
    await document.fonts.load(fonte, texto);
  } catch {
    /* fica a fonte reserva */
  }
}

/**
 * A caixa do texto, a linha de base e o x de cada letra, em px de CSS,
 * medidos num elemento escondido com a `fonte` e o `estilo` dados.
 */
function medirLetras(texto: string, fonte: string, estilo: string) {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font:${fonte};${estilo}`;
  el.textContent = texto;
  // a linha de base: o pé de um inline-block vazio pousa nela
  const ancora = document.createElement('span');
  ancora.style.cssText = 'display:inline-block;width:0;height:0;';
  el.appendChild(ancora);
  document.body.appendChild(el);
  const caixa = el.getBoundingClientRect();
  const base = ancora.getBoundingClientRect().bottom - caixa.top;
  const no = el.firstChild as Text;
  const faixa = document.createRange();
  const xs: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    faixa.setStart(no, i);
    faixa.setEnd(no, i + 1);
    xs.push(faixa.getBoundingClientRect().left - caixa.left);
  }
  el.remove();
  return { largura: caixa.width, altura: caixa.height, base, xs };
}

/** um nome de constelação, pelo item 3 do cabeçalho de `cenas/ceu.ts` */
async function nomeDoCeu(texto: string, tamanho: number, dpr: number): Promise<RotuloPronto> {
  const fonte = `italic 300 ${tamanho}px ${familia('--fonte-display', 'Georgia, serif')}`;
  await carregarFonte(fonte, texto);
  const m = medirLetras(texto, fonte, 'letter-spacing:.02em;');
  // a caixa do texto começa em (f, f) px do aparelho; o bitmap tem a folga dos dois lados
  const f = Math.round(FOLGA_DO_NOME * dpr);
  const c = document.createElement('canvas');
  c.width = Math.ceil(m.largura * dpr) + 2 * f;
  c.height = Math.ceil(m.altura * dpr) + 2 * f;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2D indisponível para os nomes do céu');
  ctx.translate(f, f);
  ctx.scale(dpr, dpr);
  ctx.font = fonte;
  ctx.textBaseline = 'alphabetic';
  // 1) só a sombra: a letra é pintada longe, fora do quadro, e a sombra cai
  // de volta no lugar — o alfa dela é o dela, não o do texto; o desfoque
  // do canvas não acompanha a escala, daí × dpr
  const LONGE = 5000;
  ctx.shadowColor = 'rgba(2,3,8,.95)';
  ctx.shadowBlur = 8 * dpr;
  ctx.shadowOffsetX = LONGE * dpr;
  ctx.fillStyle = '#000';
  for (let i = 0; i < texto.length; i++) ctx.fillText(texto[i], m.xs[i] - LONGE, m.base);
  // 2) o texto por cima
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.fillStyle = 'rgba(226,184,114,.92)';
  for (let i = 0; i < texto.length; i++) ctx.fillText(texto[i], m.xs[i], m.base);
  const bitmap = await createImageBitmap(c, { premultiplyAlpha: 'premultiply' });
  return { bitmap, largura: m.largura + 2 * FOLGA_DO_NOME, altura: m.altura + 2 * FOLGA_DO_NOME };
}

/** a pílula "o Sol · você está aqui", pelo cabeçalho de `cenas/galaxia.ts` */
async function pilulaDoSol(dpr: number): Promise<RotuloPronto> {
  const texto = t('hud.carga.voceEstaAqui').toLocaleUpperCase(idiomaAtual());
  const fonte = `400 11px ${familia('--fonte-ui', 'system-ui, sans-serif')}`;
  await carregarFonte(fonte, texto);
  const m = medirLetras(texto, fonte, 'letter-spacing:0.14em;font-variant-numeric:tabular-nums;');
  const medida = (document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D);
  medida.font = fonte;
  const metrica = medida.measureText(texto);
  const subida = Math.round(metrica.fontBoundingBoxAscent);
  // a pílula: 4 px em cima e embaixo, 10 à esquerda e 9 à direita do texto
  const caixaW = 10 + m.largura + 9;
  const caixaH = 4 + subida + Math.round(metrica.fontBoundingBoxDescent) + 4;
  // e 1 px de folga em volta, para o anel
  const largura = caixaW + 2;
  const altura = caixaH + 2;
  const c = document.createElement('canvas');
  c.width = Math.ceil(largura * dpr);
  c.height = Math.ceil(altura * dpr);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2D indisponível para a pílula do Sol');
  ctx.scale(dpr, dpr);
  // o anel de 1 px por FORA da pílula (não passa por baixo dela)
  ctx.beginPath();
  ctx.roundRect(0, 0, largura, altura, altura / 2);
  ctx.roundRect(1, 1, caixaW, caixaH, caixaH / 2);
  ctx.fillStyle = 'rgba(226,184,114,.16)';
  ctx.fill('evenodd');
  ctx.beginPath();
  ctx.roundRect(1, 1, caixaW, caixaH, caixaH / 2);
  ctx.fillStyle = 'rgba(4,5,9,.62)';
  ctx.fill();
  ctx.font = fonte;
  ctx.fillStyle = '#e2b872';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < texto.length; i++) ctx.fillText(texto[i], 1 + 10 + m.xs[i], 1 + 4 + subida);
  const bitmap = await createImageBitmap(c, { premultiplyAlpha: 'premultiply' });
  return { bitmap, largura, altura };
}

/**
 * O que decide rasterizar de novo: a língua, o `dpr` (o bitmap é em px do
 * aparelho) e, no céu, o degrau do retrato (15 px → 13 px). `null` para
 * a cena que não desenha rótulo nenhum.
 */
export function chaveDosRotulos(tela: IdDaTela, largura: number, altura: number, dpr: number): string | null {
  if (tela === 'ceu') return `${idiomaAtual()}|${dpr}|${largura / altura < RETRATO_ABAIXO_DE.ceu ? 13 : 15}`;
  if (tela === 'galaxia') return `${idiomaAtual()}|${dpr}`;
  return null;
}

/** os rótulos da cena, prontos para o mapa dela (vazio se ela não tem nenhum) */
export async function rasterizarRotulos(
  tela: IdDaTela,
  largura: number,
  altura: number,
  dpr: number
): Promise<Map<string, RotuloPronto>> {
  const feitos = new Map<string, RotuloPronto>();
  if (tela === 'ceu') {
    const tamanho = largura / altura < RETRATO_ABAIXO_DE.ceu ? 13 : 15;
    for (const [id, chave] of NOMES_DO_CEU) feitos.set(id, await nomeDoCeu(t(chave), tamanho, dpr));
  } else if (tela === 'galaxia') {
    feitos.set(ID_DA_PILULA, await pilulaDoSol(dpr));
  }
  return feitos;
}
