// ============================================================
// O FILME COMO OBJETO (E1 da viagem solar, 04/10/2026). O motor tocava
// UM filme, montado no nível do módulo de `journey.ts`, e o caminho do
// filme lia as constantes dele direto. Agora ele toca o filme que o
// registro abaixo devolve pelo id: os planos, os pedidos de carga, o
// calendário do céu, o salto do "Ir à galáxia", a dose do Sol e os
// pinos de corpo vêm todos do objeto. O galáctico é a primeira
// instância, com as MESMAS peças de antes — sai bit a bit igual.
// ============================================================
import type * as THREE from 'three';
import type { ChaveDeTexto } from '../../lib/idioma';
import { doseDaDramaturgia } from '../director/doseDoSol';
import type { montarApoiosDoRoteiro } from './apoiosDoRoteiro';
import { APOIOS_DO_FILME, Journey, LUA_PC, REVEAL_T, TERRA_PC, jdDoFilme } from './journey';
import { montarFilmeSolar } from './filmes/solar/montar';

/** o que `montarApoiosDoRoteiro` devolve: os pedidos de carga e os marcos de QA */
export type ApoiosDoRoteiro = ReturnType<typeof montarApoiosDoRoteiro>;

/**
 * A TELA FINAL do filme — o que o véu de encerramento diz quando ele acaba.
 * O véu lê daqui, nunca de um texto fixo, e cada filme assina o seu: um filme
 * novo que esquecesse o fim não compilaria, em vez de herdar calado a citação
 * de outro.
 */
export type Encerramento =
  /** a frase emprestada do roteiro do fim (`roteiros/encerramento.json`): várias
   *  linhas que entram uma a uma, com a atribuição e a fonte dela — tudo vem do
   *  roteiro; só a nota do rodapé é chave de idioma */
  | { citacao: true; rodape: ChaveDeTexto }
  /** a linha e o crédito do próprio filme, por chave de idioma; sem `rodape`,
   *  o véu não mostra nota ao lado dos botões */
  | { citacao?: false; linha: ChaveDeTexto; credito: ChaveDeTexto; rodape?: ChaveDeTexto };

export interface Filme {
  id: string;
  /** o nome do filme nos botões de escolha (capa, "Mais", Atlas) — chave de idioma */
  titulo: ChaveDeTexto;
  /** a linha que diz o que o filme é, sob o botão da capa — chave de idioma */
  nota: ChaveDeTexto;
  /** o que o véu de encerramento diz quando o filme acaba */
  encerramento: Encerramento;
  /** os planos e as legendas, no relógio do filme */
  journey: Journey;
  /** o que pré-carregar e a partir de quando (corpos, efemérides) */
  apoios: ApoiosDoRoteiro;
  /** a data do céu (JD TDB) em cada segundo do corte */
  jdDoFilme(t: number): number;
  /** onde o "Ir à galáxia" salta; `null` quando o filme não tem galáxia a revelar */
  revealT: number | null;
  /** a dose de ocupação do Sol no instante (1 = o Sol da data, inteiro) */
  doseDoSol(t: number): number;
  /** corpos desenhados num centro fixo durante o filme, pelo id da casa */
  pinos: ReadonlyMap<string, THREE.Vector3>;
  /** as 16 heroes de autor (`world/heroStars.ts`) no céu do filme: a arte dos
   *  SOBREVOOS do galáctico — clarão de 0,08·10^(−0,3·m) pc, que da vizinhança
   *  do Sol já dá a Sírio 52 px de raio em qualquer lente. Num filme que não
   *  sai do sistema solar ela vira um "nascer do Sol" na borda do quadro (F4,
   *  Io); `false` deixa o céu só com o catálogo, como a física manda */
  heroes: boolean;
  /** o Sol gira pela DATA do filme (`anguloDoGiro`: a mesma face no mesmo
   *  instante, em toda sessão) em vez do tempo de tela. O galáctico fica no
   *  giro de tela — a abertura que o dono aprovou; a capa também, sempre */
  giroPeloRelogio: boolean;
  /** o "cima" da câmera enquanto ele toca (`cimaDoFilme`); ausente, o polo galáctico */
  cima?: THREE.Vector3;
}

/** o filme de sempre — do Sol ao centro da Via Láctea e de volta à Terra */
export const FILME_PADRAO = 'galactico';

function montarGalactico(): Filme {
  return {
    id: FILME_PADRAO,
    titulo: 'hud.filme.galactico.titulo',
    nota: 'hud.filme.galactico.nota',
    encerramento: { citacao: true, rodape: 'hud.fim.rodape' },
    journey: new Journey(),
    apoios: APOIOS_DO_FILME,
    jdDoFilme,
    revealT: REVEAL_T,
    doseDoSol: doseDaDramaturgia,
    pinos: new Map([
      ['earth', TERRA_PC],
      ['moon', LUA_PC],
    ]),
    heroes: true,
    giroPeloRelogio: false,
  };
}

/** a viagem solar (item 210): dois relógios (a Terra às 16:00 UTC, os atos de fora
 *  horas antes, para Io e Encélado acesas), sem galáxia a revelar, Sol inteiro do
 *  primeiro segundo e o polo da eclíptica no alto */
function montarSolar(): Filme {
  const m = montarFilmeSolar();
  return {
    id: 'solar',
    titulo: 'hud.filme.solar.titulo',
    nota: 'hud.filme.solar.nota',
    encerramento: { linha: 'hud.fim.solar.linha', credito: 'hud.fim.solar.credito' },
    journey: new Journey(m.shots, m.starts),
    apoios: m.apoios,
    jdDoFilme: m.jdDoFilme,
    revealT: null,
    doseDoSol: () => 1,
    pinos: m.pinos,
    heroes: false,
    giroPeloRelogio: true,
    cima: m.cima,
  };
}

/** O REGISTRO: id → quem monta. Cada filme só é montado quando pedido. */
export const FILMES: ReadonlyMap<string, () => Filme> = new Map([
  [FILME_PADRAO, montarGalactico],
  ['solar', montarSolar],
]);

/** os filmes que o HUD oferece, na ordem do cartaz (capa, "Mais" e Atlas): o do
 *  registro, nunca uma segunda lista de ids */
export const FILMES_EM_CARTAZ: readonly string[] = [...FILMES.keys()];

const montados = new Map<string, Filme>();

/**
 * O filme pelo id. Ausente (ou vazio) é o galáctico; um id que o
 * registro não conhece avisa no console e TAMBÉM toca o galáctico — link
 * torto não deixa a tela sem filme. O mesmo id devolve o mesmo objeto.
 */
export function filmeDe(id?: string | null): Filme {
  const pedido = id || FILME_PADRAO;
  const chave = FILMES.has(pedido) ? pedido : FILME_PADRAO;
  if (chave !== pedido) console.warn('?filme= desconhecido, toca o galáctico:', pedido);
  let filme = montados.get(chave);
  if (!filme) {
    filme = (FILMES.get(chave) ?? montarGalactico)();
    montados.set(chave, filme);
  }
  return filme;
}
