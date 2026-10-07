/**
 * QUEM HOSPEDA A CENA DA TELA DE CARGA, do lado da página. Três modos,
 * nesta ordem de preferência:
 *
 *  · `worker` — o canvas vai para um worker (OffscreenCanvas) e a cena
 *    anima lá, imune aos congelamentos da thread principal durante a
 *    carga (`trabalhador.ts`);
 *  · `principal` — sem OffscreenCanvas, sem worker, ou com a cena
 *    falhando lá dentro (WebGL2 indisponível no worker), a MESMA cena
 *    roda aqui, com as mesmas contas (`andamento.ts`);
 *  · `sem-cena` — nem aqui ela abre (sem WebGL2): fica o fundo escuro do
 *    CSS com o texto por cima, e a carga do app segue igual.
 *
 * Nos três, um laço leve aqui na página entrega o estado de cada quadro
 * a `aoQuadro` (a porcentagem e o desfecho do texto em HTML) e conta o
 * desfecho; no `worker`, quem diz que ele acabou é o próprio worker, que
 * é quem está desenhando, e o relógio daqui é só a rede de segurança.
 */
import type { Cena, EstadoDaCena, IdDaTela, RecursosDaCena } from './cena';
import { criarAndamento, type FatiaDaCarga } from './andamento';
import { carregarCena } from './rodizio';
import type { DoTrabalhador, ParaOTrabalhador } from './trabalhador';

export type ModoDaTela = 'worker' | 'principal' | 'sem-cena';

export interface OpcoesDaTela {
  id: IdDaTela;
  /** `?shot=1`: um quadro estável por etapa, sem laço e sem desfecho */
  foto: boolean;
  reduzido: boolean;
  largura: number;
  altura: number;
  dpr: number;
  /** rótulos rasterizados aqui para cenas que os desenham (`cena.ts`) */
  recursos?: RecursosDaCena;
  /** o estado de cada quadro, para o texto por cima */
  aoQuadro: (e: EstadoDaCena) => void;
  /** a primeira imagem da cena chegou ao canvas */
  aoPronto: () => void;
  /** o desfecho chegou ao fim: a cena está no quadro final */
  aoAcabar: () => void;
}

export interface Hospedeiro {
  etapa(fatia: FatiaDaCarga): void;
  terminou(): void;
  tamanho(largura: number, altura: number, dpr: number): void;
  reduzir(sim: boolean): void;
  /** a carga falhou: a cena para no último quadro */
  congelar(): void;
  soltar(): void;
}

/** quanto o relógio daqui espera além do desfecho antes de não esperar mais o worker */
const FOLGA_DO_WORKER_MS = 600;
/** o desfecho até a cena ter dito quanto ele dura (só vale se ela nunca disser) */
const DURACAO_FINAL_PADRAO = 2.5;

const temWorkerComCanvas = () =>
  typeof Worker === 'function' &&
  typeof OffscreenCanvas === 'function' &&
  typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function';

/** o gancho dos juízes e da prova de fluidez (só no servidor de dev) */
interface GanchoDaTela {
  modo: ModoDaTela;
  /** instantes dos quadros da cena, em ms desde a origem do relógio da página */
  quadros: () => Promise<number[]>;
}

export function montarTela(palco: HTMLElement, o: OpcoesDaTela): Hospedeiro {
  const medir = import.meta.env.DEV;
  const andamento = criarAndamento(performance.now(), o.foto);
  andamento.reduzir(o.reduzido);
  let tamanho = { largura: o.largura, altura: o.altura, dpr: o.dpr };
  let duracaoFinal: number | null = null;
  let modo: ModoDaTela = 'sem-cena';
  let canvas: HTMLCanvasElement | null = null;
  let worker: Worker | null = null;
  let cena: Cena | null = null;
  let raf = 0;
  let rede = 0;
  let solto = false;
  let congelado = false;
  let desenhou = false;
  let acabou = false;
  let pedidoDeQuadros: ((tempos: number[]) => void) | null = null;
  const tempos: number[] = [];

  const definicao = carregarCena(o.id);
  definicao.then(
    (d) => {
      duracaoFinal = d.duracaoFinal;
    },
    (err: unknown) => console.error(err)
  );

  function novoCanvas(): HTMLCanvasElement {
    canvas?.remove();
    const c = document.createElement('canvas');
    c.className = 'tc-canvas';
    palco.appendChild(c);
    canvas = c;
    return c;
  }

  function semCena(err: unknown): void {
    console.error(err);
    modo = 'sem-cena';
    cena = null;
    canvas?.remove();
    canvas = null;
  }

  function acabar(): void {
    if (acabou || solto) return;
    acabou = true;
    o.aoAcabar();
  }

  function primeiroQuadro(): void {
    if (desenhou) return;
    desenhou = true;
    o.aoPronto();
  }

  function naThreadPrincipal(): void {
    worker = null;
    modo = 'principal';
    definicao.then(
      (d) => {
        if (solto) return;
        try {
          const c = novoCanvas();
          cena = d.criar(c, o.recursos);
          cena.redimensionar(tamanho.largura, tamanho.altura, tamanho.dpr);
        } catch (err) {
          semCena(err);
        }
        agendar();
      },
      (err: unknown) => semCena(err)
    );
  }

  function noWorker(): boolean {
    if (!temWorkerComCanvas()) return false;
    const c = novoCanvas();
    let w: Worker;
    let fora: OffscreenCanvas;
    try {
      fora = c.transferControlToOffscreen();
      w = new Worker(new URL('./trabalhador.ts', import.meta.url), { type: 'module' });
    } catch (err) {
      console.error(err);
      c.remove();
      canvas = null;
      return false;
    }
    const desistir = (motivo: unknown) => {
      if (worker !== w) return;
      console.error(motivo);
      w.terminate();
      naThreadPrincipal();
    };
    w.onmessage = (ev: MessageEvent<DoTrabalhador>) => {
      const m = ev.data;
      if (m.tipo === 'pronto') primeiroQuadro();
      else if (m.tipo === 'acabou') acabar();
      else if (m.tipo === 'falhou') desistir(m.mensagem);
      else if (m.tipo === 'quadros') {
        tempos.splice(0, tempos.length, ...m.tempos);
        pedidoDeQuadros?.(m.tempos);
        pedidoDeQuadros = null;
      }
    };
    w.onerror = (ev) => {
      ev.preventDefault();
      desistir(ev.message || 'worker da tela de carga falhou ao abrir');
    };
    worker = w;
    modo = 'worker';
    const transferir: Transferable[] = [fora];
    for (const r of o.recursos?.rotulos.values() ?? []) transferir.push(r.bitmap);
    enviar(
      {
        tipo: 'iniciar',
        id: o.id,
        canvas: fora,
        largura: tamanho.largura,
        altura: tamanho.altura,
        dpr: tamanho.dpr,
        reduzido: o.reduzido,
        foto: o.foto,
        medir,
        recursos: o.recursos,
      },
      transferir
    );
    return true;
  }

  function enviar(m: ParaOTrabalhador, transferir: Transferable[] = []): void {
    worker?.postMessage(m, transferir);
  }

  function agendar(): void {
    if (raf || solto) return;
    raf = requestAnimationFrame(passo);
  }

  function passo(agora: number): void {
    raf = 0;
    if (solto) return;
    const e = andamento.quadro(agora, duracaoFinal ?? DURACAO_FINAL_PADRAO);
    if (cena && !(congelado && desenhou)) {
      try {
        cena.quadro(e);
        if (medir && tempos.length < 6000) tempos.push(performance.timeOrigin + agora);
        primeiroQuadro();
      } catch (err) {
        semCena(err);
      }
    }
    if (!congelado) o.aoQuadro(e);
    if (e.fim >= 1) {
      // no worker o fim é dele; daqui só se ele sumiu ou atrasou demais
      if (modo !== 'worker') acabar();
      else if (!rede) rede = window.setTimeout(acabar, FOLGA_DO_WORKER_MS);
    }
    if (!o.foto && !congelado) agendar();
  }

  if (!noWorker()) naThreadPrincipal();
  agendar();

  if (medir) {
    (window as unknown as { __telaDeCarga?: GanchoDaTela }).__telaDeCarga = {
      get modo() {
        return modo;
      },
      // depois de solta, ficam os da última resposta (a de `soltar`)
      quadros: () =>
        worker
          ? new Promise<number[]>((resolver) => {
              pedidoDeQuadros = resolver;
              enviar({ tipo: 'quadros' });
            })
          : Promise.resolve(tempos.slice()),
    };
  }

  return {
    etapa(fatia) {
      andamento.etapa(fatia, performance.now());
      enviar({ tipo: 'etapa', fatia });
      if (o.foto) agendar();
    },
    terminou() {
      andamento.terminou(performance.now());
      enviar({ tipo: 'terminou' });
    },
    tamanho(largura, altura, dpr) {
      tamanho = { largura, altura, dpr };
      cena?.redimensionar(largura, altura, dpr);
      enviar({ tipo: 'tamanho', largura, altura, dpr });
      if (o.foto) agendar();
    },
    reduzir(sim) {
      andamento.reduzir(sim);
      enviar({ tipo: 'reduzido', sim });
    },
    congelar() {
      congelado = true;
      enviar({ tipo: 'congelar' });
    },
    soltar() {
      solto = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(rede);
      const w = worker;
      if (w) {
        if (medir) enviar({ tipo: 'quadros' });
        // a cena solta o contexto lá dentro e o worker se fecha; o
        // terminate é a rede, para um worker que não responda
        enviar({ tipo: 'soltar' });
        setTimeout(() => w.terminate(), 1000);
      }
      worker = null;
      try {
        cena?.soltar();
      } catch (err) {
        console.error(err);
      }
      cena = null;
      canvas?.remove();
      canvas = null;
    },
  };
}
