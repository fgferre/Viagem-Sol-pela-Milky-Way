// ============================================================
// O PASSO DO PALCO — os doze corpos resolvidos num laço só (item 63).
//
// POR QUE ESTE ARQUIVO EXISTE. Até 21/08 o tick do Director tratava
// Terra, Lua, `rochosos` e `gigantes` em QUATRO laços quase iguais, com
// a mesma sequência em cada um: `palco.registrar`/`remover`, a cessão do
// ponto, `carregando`, `friaNoGate`, `perturbar` e as digitais do quadro
// anterior. As diferenças entre os quatro não eram desenho — eram
// TRAÇOS de cada corpo, e traço se guarda como dado, não como cópia de
// laço. São quatro:
//
//  - `pinoNoFilme`: o centro pré-computado das 16:00 que a CODA usa
//    (Terra e Lua têm; o resto do sistema não aparece no filme);
//  - `temPonto`: o corpo tem ponto fotométrico na camada `planetas` e
//    por isso recebe a cessão suave (as luas não têm — `IDS_FOTOMETRIA`
//    não as conhece);
//  - `temRetrato`: o corpo EXISTE sem efeméride (planeta cai no retrato
//    congelado; lua, não) — é o que separa "textura que falhou" de
//    "corpo que por contrato não está aí" no fallback frio;
//  - `rotuloDeLua`: publica a posição viva para o rótulo (as luas, que
//    não têm ponto na camada para o `projectCorpos` seguir).
//
// O QUE NÃO MUDA AQUI: a ORDEM. Terra, Lua, rochosos, gigantes — a
// mesma de antes, porque o `updateClip` lê a superfície mais próxima
// logo abaixo e ordem de registro é ordem de empate.
//
// Sem three além de Vector3, sem relógio próprio, sem efeméride: o que
// varia por quadro chega no `QuadroDoPalco` e o que é da instância
// chega pelos fios — a mesma disciplina de `solNoQuadro.ts`.
// ============================================================
import type * as THREE from 'three';
import { Vector3 } from 'three';
import type { CorposResolvidos } from '../world/corpos/corpos';
import type { QuadroDaTerra } from '../world/corpos/terra';
import type { Planetas } from '../world/planetas/planetas';
import type { Rotulos } from './rotulos';

/**
 * O QUADRO que os doze recebem. É o da Terra — o mais completo dos
 * quatro (`dtS`, `psf` e `salto` só a cessão suave consome, e a Lua não
 * tem cessão) —, montado UMA vez por tick e reusado pelos doze: doze
 * objetos por quadro era alocação que o M4 da casa não deixa passar.
 */
export type QuadroDoPalco = QuadroDaTerra;

/** o quadro em branco que o Director guarda e reescreve a cada tick */
export function quadroDoPalcoVazio(): QuadroDoPalco {
  return {
    jdTdb: Number.NaN,
    fonte: null,
    camPosPc: new Vector3(),
    screenHPx: 0,
    fovDeg: 0,
    ligado: false,
    atlasQuente: false,
    politica: 'assistida',
    dtS: 0,
    psf: { expoM0: 0, sigmaPx: 0, beta: 0 },
    salto: false,
  };
}

/**
 * O que o laço LÊ do estado devolvido. `cede` e `emRampa` são opcionais
 * porque a Lua não tem ponto para ceder — e `emRampa` ausente é
 * `undefined`, que não perturba a captura, exatamente como o laço da
 * Lua fazia por omissão.
 */
export interface EstadoNoPalco {
  emQuadro: boolean;
  carregando: boolean;
  gateArmado: boolean;
  raioPc: number;
  centroPc: THREE.Vector3;
  cede?: number;
  emRampa?: boolean;
}

/** O contrato mínimo que os quatro tipos de corpo já cumprem: o nó que
 *  pendura no `palco.group`, o passo do quadro e o teardown. */
export interface AtorDoPalco {
  readonly group: THREE.Group;
  atualizar(q: QuadroDoPalco): EstadoNoPalco;
  dispose(): void;
}

/**
 * UM POSTO no palco: o corpo, os quatro traços e as digitais do quadro
 * anterior. É o MESMO objeto que a escada percorre como
 * `{ corpo: RochosoResolvido }` — uma lista, duas leituras.
 */
export interface PostoNoPalco<T extends AtorDoPalco = AtorDoPalco> {
  corpo: T;
  /** id da casa — 'earth', 'moon', 'io'… (o do palco e o do rótulo) */
  readonly id: string;
  /** centro pré-computado das 16:00 para a coda; null fora dela */
  readonly pinoNoFilme: THREE.Vector3 | null;
  readonly temPonto: boolean;
  readonly temRetrato: boolean;
  readonly rotuloDeLua: boolean;
  emQuadroAntes: boolean;
  carregavaAntes: boolean;
  carregando: boolean;
  friaNoGate: boolean;
}

/** o que é da instância do Director e o laço precisa alcançar */
export interface FiosDoPalco {
  palco: CorposResolvidos;
  planetas: Planetas | null;
  rotulos: Rotulos;
  /** a efeméride VIVA, ou null (retrato congelado) */
  efemeride: unknown;
  /** o filme está correndo? (só nele o pino das 16:00 vale) */
  noFilme: boolean;
  /**
   * ESTE corpo pré-aquece a textura neste quadro? É o GATILHO 2 da carga
   * preguiçosa (o gatilho 1 é o gate de 4 px), e desde 22/08 ele é POR
   * CORPO. Era um booleano só para os doze — `palcoQuente` —, e o preço
   * estava medido: abrir o Atlas em cinema carregava 1.147 MiB de texel
   * de corpo sem o visitante chegar perto de nada, e a coda do filme
   * fazia o mesmo com os dez que ela nunca resolve.
   */
  preAquecer: (id: string) => boolean;
  /** a cena mudou: a captura recomeça a contagem de estabilidade */
  perturbar: () => void;
}

/**
 * O PASSO — um laço, doze corpos. Roda ANTES de o near ler o palco: o
 * globo que entra em quadro NESTE tick já governa o clip NESTE tick.
 * O Director é quem registra a superfície (só corpo EM QUADRO entra no
 * `min()` — de longe o registro esvazia e o par (near, far) fica no
 * vigente bit a bit) e quem escreve a cessão do ponto na camada de
 * planetas; nenhum corpo conhece o palco nem a camada.
 */
export function passoDoPalco(
  postos: readonly PostoNoPalco[],
  quadro: QuadroDoPalco,
  fios: FiosDoPalco
): void {
  const { palco, planetas, rotulos, efemeride, noFilme, preAquecer, perturbar } = fios;
  for (const posto of postos) {
    // o pino das 16:00 é POR CORPO e só dentro do filme; sem ele o
    // pouso miraria um globo a 1,7 milhão de km
    quadro.centroPinadoPc =
      noFilme && posto.pinoNoFilme ? posto.pinoNoFilme : undefined;
    // e o pré-aquecimento também é POR CORPO (a dose de 22/08)
    quadro.atlasQuente = preAquecer(posto.id);
    const e = posto.corpo.atualizar(quadro);

    if (e.emQuadro) palco.registrar(posto.id, e.raioPc, e.centroPc);
    else palco.remover(posto.id);

    // a cessão SUAVE (F2b/D5): reafirmada TODO quadro — a escrita é
    // idempotente (`gravar`), então reafirmar não sobe upload
    if (posto.temPonto) planetas?.escreverCessao(posto.id, e.cede ?? 0);

    posto.carregando = e.carregando;
    // o FALLBACK FRIO (item 5b): gate armado, camada ligada e nem
    // textura quente nem fetch em voo — o `captura` segura nisto. A
    // cláusula do retrato separa "textura que desistiu" de "corpo que
    // por contrato não está aí": sem efeméride a lua não EXISTE, e
    // segurar a captura por ela seria segurar para sempre.
    posto.friaNoGate =
      palco.ligado &&
      (posto.temRetrato || efemeride !== null) &&
      e.gateArmado &&
      !e.emQuadro &&
      !e.carregando;

    // corpo entrando/saindo do quadro, textura que acabou de chegar e a
    // RAMPA da cessão andando são mudança de imagem: a contagem de
    // estabilidade recomeça (a captura nunca assenta no meio do fade)
    if (
      e.emQuadro !== posto.emQuadroAntes ||
      (posto.carregavaAntes && !e.carregando) ||
      e.emRampa === true
    ) {
      perturbar();
    }
    posto.emQuadroAntes = e.emQuadro;
    posto.carregavaAntes = e.carregando;

    // a posição viva para o RÓTULO das luas (NaN sem efeméride ⇒ o
    // projectCorpos não a projeta — rótulo só onde há corpo)
    if (posto.rotuloDeLua) rotulos.escreverPosicaoDeLua(posto.id, e.centroPc);
  }
}
