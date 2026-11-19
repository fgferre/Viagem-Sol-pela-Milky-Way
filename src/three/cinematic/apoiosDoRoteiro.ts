// Recursos e pontos de conferência: dados do plano, nunca outro relógio.
import type * as THREE from 'three';
import { LIMIAR_DO_GATE_PX, diametroAparentePx } from '../world/corpos/corpos';
import { booleano, erro, lista, numero, objeto, opcional, texto } from './dadosDoRoteiro';

export interface ApoiosDoPlano {
  /** pedidos a partir do início do plano: o autor adianta o que o motor pediria só
   *  `ANTECEDENCIA_DA_VISTA_S` antes de o corpo aparecer; quem solta é o motor (`PalcoDoRoteiro`) */
  preload?: { corpos?: string[]; efemerides?: boolean };
  /** nome único no filme → fração do tempo do plano */
  qa?: Record<string, number>;
}

/** Também lê os apoios dos planos cuja câmera ainda não foi convertida. */
export function lerApoiosDoPlano(dado: unknown, campo = 'apoios'): ApoiosDoPlano {
  const p = objeto(dado, campo);
  return {
    preload: opcional(p.preload, `${campo}.preload`, (valor, c) => {
      const preload = objeto(valor, c);
      return {
        corpos: opcional(preload.corpos, `${c}.corpos`, (v, chave) =>
          Array.from(lista(v, chave), (id, i) => texto(id, `${chave}[${i}]`))),
        efemerides: opcional(preload.efemerides, `${c}.efemerides`, booleano),
      };
    }),
    qa: opcional(p.qa, `${campo}.qa`, (valor, c) => Object.fromEntries(
      Object.entries(objeto(valor, c)).map(([nome, valor]) => {
        texto(nome, c);
        const em = numero(valor, `${c}.${nome}`);
        if (em < 0 || em >= 1) return erro(`${c}.${nome}`, 'deve estar entre 0 e 1 (exclusivo)');
        return [nome, em];
      })
    )),
  };
}

/**
 * O QUE O FILME SABE DE ANTEMÃO. A câmera de um filme tem caminho conhecido e os
 * corpos ficam em lugares conhecidos (os pinos); com os dois o MOTOR calcula
 * sozinho quando cada corpo aparece com tamanho de disco e quando deixa de
 * aparecer, pede as texturas um pouco antes e as devolve depois. Ninguém marca
 * no roteiro o que soltar, e vale igual tocando, saltando ou retomando no meio,
 * porque é função só do tempo do filme.
 *
 * Até 19/11 o pedido do roteiro valia até o fim do filme. No filme solar, de
 * vinte e dois corpos, isso empilhava 3,2 GiB de textura (medido em
 * `capturas/queda-filme-solar-19-11/`), e a placa desistia nos anéis de Saturno.
 */
export interface PalcoDoRoteiro {
  /** quanto dura o filme, em segundos */
  duracao: number;
  /** a câmera do filme no instante t (`Journey.at`) */
  camera(t: number): { pos: THREE.Vector3; fov: number };
  /** os corpos que o filme desenha: o id da casa, o centro e o raio, em pc */
  corpos: Iterable<readonly [id: string, centroPc: THREE.Vector3, raioPc: number]>;
}

/** de quanto em quanto tempo o motor olha o caminho da câmera, em segundos */
const PASSO_DA_VISTA_S = 0.25;
/** a tela mais alta que a conta atende: quanto mais alta, mais cedo o gate de 4 px abre */
const ALTURA_DE_REFERENCIA_PX = 2160;
/**
 * Com quanta antecedência o motor pede um corpo que vai aparecer, em segundos.
 * É a menor folga que os roteiros já davam à mão (a Terra, pedida ~18 s antes
 * do corte para ela); o `preload` de um plano pode pedir mais cedo.
 */
export const ANTECEDENCIA_DA_VISTA_S = 20;

/** por corpo, os trechos do filme em que ele aparece com tamanho de disco (o gate do palco) */
function vistasDoPalco(palco: PalcoDoRoteiro): Map<string, [number, number][]> {
  const corpos = [...palco.corpos];
  const vistas = new Map<string, [number, number][]>(corpos.map(([id]) => [id, []]));
  const aberta = new Map<string, number>();
  const passos = Math.ceil(palco.duracao / PASSO_DA_VISTA_S);
  for (let n = 0; n <= passos; n++) {
    const t = Math.min(n * PASSO_DA_VISTA_S, palco.duracao);
    const { pos, fov } = palco.camera(t);
    for (const [id, centro, raio] of corpos) {
      const emVista =
        diametroAparentePx(raio, pos.distanceTo(centro), ALTURA_DE_REFERENCIA_PX, fov) >= LIMIAR_DO_GATE_PX;
      const desde = aberta.get(id);
      if (emVista && desde === undefined) aberta.set(id, t);
      else if (!emVista && desde !== undefined) {
        vistas.get(id)?.push([desde, t]);
        aberta.delete(id);
      }
    }
  }
  // em vista no último quadro: o filme para ali (a fase 'end') e o corpo segue pedido
  for (const [id, desde] of aberta) vistas.get(id)?.push([desde, Infinity]);
  return vistas;
}

/**
 * Usa os inícios já calculados por Journey; nenhuma conta de duração se duplica.
 * Com o `palco`, cada corpo fica pedido só em volta das vezes em que aparece;
 * sem ele (ou para um corpo que o palco não conhece) o motor não sabe onde o
 * corpo está, e o pedido do roteiro vale até o fim do filme.
 */
export function montarApoiosDoRoteiro(
  planos: readonly (ApoiosDoPlano & { dur: number })[],
  inicios: readonly number[],
  palco?: PalcoDoRoteiro
) {
  /** por corpo, os inícios dos planos que o pedem */
  const pedidos = new Map<string, number[]>();
  const qa = new Map<string, number>();
  let efemerides = Infinity;
  for (const [i, plano] of planos.entries()) {
    const inicio = inicios[i];
    for (const id of plano.preload?.corpos ?? []) {
      pedidos.set(id, [...(pedidos.get(id) ?? []), inicio]);
    }
    if (plano.preload?.efemerides) efemerides = Math.min(efemerides, inicio);
    for (const [nome, em] of Object.entries(plano.qa ?? {})) {
      if (qa.has(nome)) return erro(`qa.${nome}`, 'está repetido no filme');
      qa.set(nome, inicio + em * plano.dur);
    }
  }
  /** por corpo, as janelas [de, até] em que o filme o segura */
  const janelas = new Map<string, [number, number][]>();
  for (const [id, vistas] of palco ? vistasDoPalco(palco) : []) {
    const doCorpo = vistas.map(([de, ate]): [number, number] => [de - ANTECEDENCIA_DA_VISTA_S, ate]);
    // o pedido do roteiro adianta a janela da próxima vez em que o corpo aparece
    for (const pedidoEm of pedidos.get(id) ?? []) {
      const proxima = doCorpo.find(([, ate]) => ate >= pedidoEm);
      if (proxima) proxima[0] = Math.min(proxima[0], pedidoEm);
    }
    janelas.set(id, doCorpo);
  }
  for (const [id, desde] of pedidos) {
    if (!janelas.has(id)) janelas.set(id, [[Math.min(...desde), Infinity]]);
  }
  return {
    /** o laço é por índice porque o palco pergunta por corpo e por quadro */
    preAquecerCorpo(t: number, id: string): boolean {
      const doCorpo = janelas.get(id);
      if (doCorpo) {
        for (let i = 0; i < doCorpo.length; i++) if (t >= doCorpo[i][0] && t <= doCorpo[i][1]) return true;
      }
      return false;
    },
    precisaEfemerides(t: number): boolean { return t >= efemerides; },
    instanteDeQA(nome: string): number {
      const t = qa.get(nome);
      if (t === undefined) return erro(`qa.${nome}`, 'não existe no filme');
      return t;
    },
  };
}
