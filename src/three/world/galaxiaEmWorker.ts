// ============================================================
// O WORKER da geração da galáxia (Ajustes B do NORTE): buildGalaxy
// fora da thread principal, para o carregamento não congelar os ~3,3 s
// da população (o "conserto DEFINITIVO" prometido no stage() do
// director). Este arquivo é o LADO DE DENTRO do worker; a costura que
// o sobe e conversa com ele é `construirBuffersDaGalaxia`
// (carregamento.ts) — o fallback inline de lá usa o MESMO buildGalaxy.
//
// O worker não tem `window`, e a cadeia do gerador lê os knobs de
// bancada da URL DA PÁGINA (tune/?cnt, warpamp, corewall — todos com
// fallback `typeof window === 'undefined'`). Sem a linha abaixo, esses
// knobs valeriam no app e silenciosamente NÃO valeriam no worker — a
// mesma vista sairia diferente conforme a thread. A página manda o
// `search` dela na mensagem, e ele vira o `window.location.search`
// daqui ANTES do import dinâmico do gerador; o import estático seria
// avaliado antes da mensagem chegar.
// ============================================================
// (sem `/// <reference lib="webworker" />`: o tsconfig do app carrega a
// lib DOM para todo src/, e as duas juntas duplicam globais. As
// assinaturas DOM de `onmessage`/`postMessage(msg, { transfer })`
// cobrem o que este arquivo usa.)

export interface PedidoDaGalaxia {
  seed: number;
  structure: {
    gasResponse: Float32Array;
    gasSupport: Float32Array;
    youngResponse: Float32Array;
    youngSupport: Float32Array;
    size: number;
    halfExtentPc: number;
  };
  populationScale: number;
  /** o `window.location.search` da página — os knobs `?tune` valem aqui */
  search: string;
}

export interface RespostaDaGalaxia {
  bright: Float32Array;
  brightCount: number;
}

onmessage = async (e: MessageEvent<PedidoDaGalaxia>) => {
  const { seed, structure, populationScale, search } = e.data;
  Object.defineProperty(globalThis, 'window', {
    value: { location: { search } },
    configurable: true,
  });
  const { buildGalaxy } = await import('./geradorDaGalaxia');
  const buffers = buildGalaxy(seed, structure, populationScale);
  const resposta: RespostaDaGalaxia = buffers;
  // transferência, não cópia: os 122,7 MiB do cinema mudam de dono
  postMessage(resposta, { transfer: [buffers.bright.buffer] });
};
