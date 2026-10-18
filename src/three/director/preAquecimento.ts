// A dose antecipada é por corpo; o gate de tamanho continua dono do resto.
import { LUAS_DO_SISTEMA } from '../atlasConfig';
import type { ApoiosDoRoteiro } from '../cinematic/filme';
import type { Phase } from '../fases';

/**
 * No Atlas, só foco e pai de lua: os dois que o enquadramento declarou.
 * A medição que limitou a dose em 22/08 mora no NORTE, Ajustes.
 *
 * DESDE O ITEM 115 SÃO DUAS FUNÇÕES e não uma, porque quem lê já não é
 * só a carga: a descarga precisa saber QUEM segura os texels, e as duas
 * mãos têm garantias diferentes. Esta solta no clique seguinte do
 * visitante — é o caso que a carência de 15 s existe para amortecer.
 */
export function corpoNoFocoDoAtlas(fase: Phase, foco: string | null, id: string): boolean {
  if (fase !== 'atlas' || !foco) return false;
  return id === foco || id === LUAS_DO_SISTEMA.find((l) => l.id === foco)?.pai;
}

/**
 * O DESTINO: o foco do Atlas sem o pai da lua. É o único dos dois que pede
 * o teto do tier antes de estar grande na tela — a câmera vai até ele, e
 * a carga antecipada existe para ele chegar nítido. O pai segura os texels
 * pelo `corpoNoFocoDoAtlas` e pede o degrau da tela (peso de rede, 18/10).
 */
export function corpoEDestinoDoAtlas(fase: Phase, foco: string | null, id: string): boolean {
  return fase === 'atlas' && foco === id;
}

/** o pai de cada lua, lido sem alocar (a vizinhança é perguntada por corpo e por tick) */
const PAI_DA_LUA = new Map(LUAS_DO_SISTEMA.map((l) => [l.id, l.pai]));

/**
 * A VIZINHANÇA do foco: o SISTEMA dele — o planeta e as luas, ou, com o
 * foco numa lua, o pai e as irmãs. São os corpos que o próximo clique
 * alcança ou que girar a câmera mostra; com a rede quieta, o que já estiver
 * armado sobe ao teto (`TexturasDoCorpo.aoTick`), para o clique não chegar
 * no piso (peso de rede, 18/10: a Lua 6,6 s e Dione 4,6 s no 1024). O foco
 * não é vizinho dele mesmo — ele é o destino.
 */
export function corpoNaVizinhancaDoAtlas(fase: Phase, foco: string | null, id: string): boolean {
  if (fase !== 'atlas' || !foco || id === foco) return false;
  const sistema = PAI_DA_LUA.get(foco) ?? foco;
  return id === sistema || PAI_DA_LUA.get(id) === sistema;
}

/**
 * A REDE DEIXA A VIZINHANÇA DESCER? Nunca com a economia de dados pedida
 * (`navigator.connection.saveData`); na tela de toque, só depois de o foco
 * estar inteiro — o telefone não divide a banda do que o visitante olha.
 */
export function vizinhancaLiberada(
  economiaDeDados: boolean,
  telaDeToque: boolean,
  focoInteiro: boolean
): boolean {
  return !economiaDeDados && (!telaDeToque || focoInteiro);
}

/**
 * No filme, só os corpos e os momentos declarados pelo roteiro — e o
 * pedido é MONOTÔNICO: `montarApoiosDoRoteiro` guarda o INÍCIO de cada
 * corpo e responde `t >= inicio`, então uma vez aceso ele fica aceso até
 * o filme acabar. É essa monotonia que garante que a descarga nunca
 * tire do roteiro um corpo que ele vai usar em seguida.
 *
 * 'journey' OU 'end' CONTAM COMO FILME (item 225): a legenda do
 * encerramento ("pálido ponto azul") vive na fase 'end', e até aqui só
 * 'journey' segurava a textura — a carência de 15 s descarregava Terra
 * e Lua bem na hora da citação. `end` é o MESMO filme, só congelado no
 * último quadro do roteiro (ver `fases.ts`), então o segurador tem de
 * valer nas duas.
 */
export function corpoPedidoPeloRoteiro(
  fase: Phase,
  t: number,
  id: string,
  apoios: ApoiosDoRoteiro
): boolean {
  return (fase === 'journey' || fase === 'end') && apoios.preAquecerCorpo(t, id);
}

/** Efemérides continuam idempotentes/abortáveis; isto só declara a intenção. */
export function efemeridesPrecisamPreCarga(
  fase: Phase,
  t: number,
  apoios: ApoiosDoRoteiro
): boolean {
  return fase === 'atlas' || (fase === 'journey' && apoios.precisaEfemerides(t));
}
