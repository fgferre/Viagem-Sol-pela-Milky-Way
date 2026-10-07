/**
 * O WORKER DA TELA DE CARGA. A thread principal congela várias vezes
 * durante a carga (medido em 07/10: 4× de 0,2–0,37 s na mesa, até 0,75 s
 * com a CPU 4× mais lenta); aqui a cena desenha num OffscreenCanvas com
 * o próprio `requestAnimationFrame` e não congela junto. Quem fala com
 * ele é `hospedeiro.ts`; as contas do quadro são as de `andamento.ts`,
 * as mesmas da thread principal.
 */
// (sem `/// <reference lib="webworker" />`, como `cargaEmWorker.ts`: o
// tsconfig do app carrega a lib DOM para todo src/, e as assinaturas DOM
// de `onmessage`/`postMessage` cobrem o que este arquivo usa.)
import type { Cena, IdDaTela, RotuloPronto } from './cena';
import { criarAndamento, type Andamento, type FatiaDaCarga } from './andamento';
import { carregarCena } from './rodizio';

export type ParaOTrabalhador =
  | {
      tipo: 'iniciar';
      id: IdDaTela;
      canvas: OffscreenCanvas;
      largura: number;
      altura: number;
      dpr: number;
      reduzido: boolean;
      foto: boolean;
      /** guardar o instante de cada quadro (só no servidor de dev, para a prova de fluidez) */
      medir: boolean;
    }
  /** rótulos novos (ou refeitos) para o mapa da cena; os bitmaps vêm transferidos */
  | { tipo: 'rotulos'; rotulos: Map<string, RotuloPronto> }
  | { tipo: 'etapa'; fatia: FatiaDaCarga }
  | { tipo: 'terminou' }
  | { tipo: 'tamanho'; largura: number; altura: number; dpr: number }
  | { tipo: 'reduzido'; sim: boolean }
  /** a carga falhou: o último quadro fica parado sob o painel */
  | { tipo: 'congelar' }
  | { tipo: 'quadros' }
  | { tipo: 'soltar' };

export type DoTrabalhador =
  /** o primeiro quadro está no canvas */
  | { tipo: 'pronto' }
  /** o desfecho chegou ao fim */
  | { tipo: 'acabou' }
  /** a cena não abriu ou quebrou aqui: a thread principal tenta ela mesma */
  | { tipo: 'falhou'; mensagem: string }
  /** os instantes dos quadros, em ms desde a origem do relógio da página */
  | { tipo: 'quadros'; tempos: number[] };

const MAX_TEMPOS = 6000;

const avisar = (m: DoTrabalhador) => postMessage(m);

let andamento: Andamento | null = null;
let cena: Cena | null = null;
let duracaoFinal = 1;
let tamanho = { largura: 1, altura: 1, dpr: 1 };
let foto = false;
let medir = false;
let congelado = false;
let desenhou = false;
let avisouFim = false;
let pedido = false;
let morto = false;
const tempos: number[] = [];
/** o mapa vivo que a cena lê a cada quadro (`cena.ts`, `RecursosDaCena`) */
const rotulos = new Map<string, RotuloPronto>();

function agendar(): void {
  if (pedido || morto) return;
  pedido = true;
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(quadro);
  else setTimeout(quadro, 1000 / 60);
}

function quadro(): void {
  pedido = false;
  if (!cena || !andamento || morto) return;
  if (congelado && desenhou) return;
  const agora = performance.now();
  const e = andamento.quadro(agora, duracaoFinal);
  try {
    cena.quadro(e);
  } catch (err) {
    falhar(err);
    return;
  }
  if (medir && tempos.length < MAX_TEMPOS) tempos.push(performance.timeOrigin + agora);
  if (!desenhou) {
    desenhou = true;
    avisar({ tipo: 'pronto' });
  }
  if (e.fim >= 1 && !avisouFim) {
    avisouFim = true;
    avisar({ tipo: 'acabou' });
  }
  if (!foto && !congelado) agendar();
}

function falhar(err: unknown): void {
  morto = true;
  try {
    cena?.soltar();
  } catch {
    /* a cena já quebrou; soltar é só cortesia */
  }
  cena = null;
  avisar({ tipo: 'falhou', mensagem: String(err) });
}

async function iniciar(m: Extract<ParaOTrabalhador, { tipo: 'iniciar' }>): Promise<void> {
  foto = m.foto;
  medir = m.medir;
  tamanho = { largura: m.largura, altura: m.altura, dpr: m.dpr };
  andamento = criarAndamento(performance.now(), m.foto);
  andamento.reduzir(m.reduzido);
  try {
    const definicao = await carregarCena(m.id);
    if (morto) return;
    duracaoFinal = definicao.duracaoFinal;
    cena = definicao.criar(m.canvas, { rotulos });
    cena.redimensionar(tamanho.largura, tamanho.altura, tamanho.dpr);
  } catch (err) {
    falhar(err);
    return;
  }
  agendar();
}

onmessage = (ev: MessageEvent<ParaOTrabalhador>) => {
  const m = ev.data;
  const agora = performance.now();
  switch (m.tipo) {
    case 'iniciar':
      void iniciar(m);
      return;
    case 'rotulos':
      for (const [id, r] of m.rotulos) {
        rotulos.get(id)?.bitmap.close();
        rotulos.set(id, r);
      }
      break;
    case 'etapa':
      andamento?.etapa(m.fatia, agora);
      break;
    case 'terminou':
      andamento?.terminou(agora);
      break;
    case 'tamanho':
      tamanho = { largura: m.largura, altura: m.altura, dpr: m.dpr };
      cena?.redimensionar(m.largura, m.altura, m.dpr);
      break;
    case 'reduzido':
      andamento?.reduzir(m.sim);
      break;
    case 'congelar':
      congelado = true;
      return;
    case 'quadros':
      avisar({ tipo: 'quadros', tempos: tempos.slice() });
      return;
    case 'soltar':
      morto = true;
      cena?.soltar();
      cena = null;
      for (const r of rotulos.values()) r.bitmap.close();
      rotulos.clear();
      close();
      return;
  }
  // a foto só desenha quando algo muda; o laço vivo já desenha sozinho
  if (foto) agendar();
};
