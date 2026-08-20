// ============================================================
// O WORKER DA CARGA (Ajustes B do NORTE): os três assados pesados do
// init — poeira, campo acoplado e população — fora da thread principal,
// para o carregamento não congelar (~1,6 s dos dois bakes de mapa mais
// ~3,3 s da população). Este arquivo é o LADO DE DENTRO do worker; a
// costura que o sobe e conversa com ele é `assarCargaEmWorker`
// (director/carregamento.ts) — o fallback inline de lá chama a MESMA
// `assarCarga`, então a igualdade entre os dois caminhos é construção e
// não revisão.
//
// O worker não tem `window`, e a cadeia inteira lê knobs de bancada da
// URL DA PÁGINA: `tune`/`cnt` (`TUNE_Q`, no escopo do módulo do gerador
// e SEM guarda — importar o gerador sem `window` nem chega a rodar),
// `corewall` na emissão e `warpamp` no modelo galáctico, que os DOIS
// bakes de mapa também consomem (`WARP_TUNE`, também no escopo do
// módulo). Sem a linha abaixo, esses knobs valeriam no app e
// silenciosamente NÃO valeriam no worker — a mesma vista sairia
// diferente conforme a thread. A página manda o `search` dela na
// mensagem, e ele vira o `window.location.search` daqui ANTES do import
// dinâmico da cadeia; o import estático seria avaliado antes da
// mensagem chegar.
// ============================================================
// (sem `/// <reference lib="webworker" />`: o tsconfig do app carrega a
// lib DOM para todo src/, e as duas juntas duplicam globais. As
// assinaturas DOM de `onmessage`/`postMessage(msg, { transfer })`
// cobrem o que este arquivo usa.)
import type {
  CargaAssada,
  EntradaDaCarga,
  EtapaDaCadeia,
} from './cadeiaDaCarga';

export interface PedidoDaCarga extends EntradaDaCarga {
  /** o `window.location.search` da página — os knobs valem aqui dentro */
  search: string;
}

/** o worker avisa qual etapa ESTÁ COMEÇANDO; o rótulo do loader anda */
export interface AvancoDaCarga {
  etapa: EtapaDaCadeia;
}

export type RespostaDaCarga = AvancoDaCarga | CargaAssada;

onmessage = async (e: MessageEvent<PedidoDaCarga>) => {
  const { search, ...entrada } = e.data;
  Object.defineProperty(globalThis, 'window', {
    value: { location: { search } },
    configurable: true,
  });
  const { assarCarga } = await import('./cadeiaDaCarga');
  const carga = await assarCarga(entrada, (etapa) =>
    postMessage({ etapa } satisfies AvancoDaCarga)
  );
  // transferência, não cópia: os 122,7 MiB do cinema e os dois mapas de
  // 1 MiB mudam de dono, não de lugar
  postMessage(carga, {
    transfer: [carga.poeira.buffer, carga.estrutura.buffer, carga.bright.buffer],
  });
};
