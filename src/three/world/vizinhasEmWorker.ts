// ============================================================
// O TRABALHADOR DAS VIZINHAS: o sorteio das galáxias vizinhas (~0,2 s,
// ~25 MB) fora da thread, EM PARALELO com o trabalhador da carga da Via
// Láctea (que leva segundos) — por isso o carregamento não fica mais
// lento. O lado de fora é `sortearVizinhas` (abaixo), com a conta na
// thread de reserva quando o trabalhador não sobe.
// ============================================================
import type { VizinhaSorteada } from './geradorDasVizinhas';

onmessage = async (e: MessageEvent<number>) => {
  const { gerarVizinhas } = await import('./geradorDasVizinhas');
  const vizinhas = gerarVizinhas(e.data);
  postMessage(vizinhas, {
    transfer: vizinhas.flatMap((v) => [v.pontos.buffer, ...(v.poeira ? [v.poeira.tau.buffer] : [])]),
  });
};

export type { VizinhaSorteada };
