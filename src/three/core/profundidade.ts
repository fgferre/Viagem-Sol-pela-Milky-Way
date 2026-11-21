import * as THREE from 'three';

/**
 * A PROFUNDIDADE INVERTIDA (`?profundidade=invertida`, PLAN-PROFUNDIDADE.md).
 *
 * O near acompanha a superfície mais próxima (`nearPlanePc`) e o far fica
 * em 60.000 pc. Um buffer comum de 24 bits não separa nada além de
 * ~near × 2^24: com a câmera a metros de um anel, o globo, as luas e as
 * linhas de órbita caem todos no valor do fundo e quem desenha por último
 * vence. Com a profundidade invertida (1 no plano próximo, 0 no distante)
 * guardada em ponto flutuante, a precisão é relativa à distância em toda
 * a faixa.
 *
 * O three faz quase tudo sozinho (`reversedDepthBuffer`, que pede a
 * extensão `EXT_clip_control`): inverte os testes e a limpeza, e TROCA A
 * MATRIZ DE PROJEÇÃO DA CÂMERA na primeira vez que desenha. É essa troca
 * que as duas funções abaixo absorvem: quem lê o `z` de
 * `Vector3.project(camera)` pergunta aqui, nunca compara com ±1 à mão.
 * Sem a extensão (ou com a porta fechada) `camera.reversedDepth` é falso
 * e as respostas são as de sempre.
 */

/** o `z` de `project(camera)` está ATRÁS da câmera ou além do plano distante? */
export function alemDoFundo(zNdc: number, camera: THREE.Camera): boolean {
  return camera.reversedDepth ? zNdc < 0 : zNdc > 1;
}

/** ...ou aquém do plano próximo: fora do alcance da lente, de um lado ou do outro */
export function foraDoAlcance(zNdc: number, camera: THREE.Camera): boolean {
  return camera.reversedDepth ? zNdc < 0 || zNdc > 1 : zNdc > 1 || zNdc < -1;
}

/**
 * A CÂMERA SEM LENTE das passagens que escrevem a posição de recorte à mão
 * (o pré-passo dos pedaços do anel, a cena macia da lente de cinema). Com a
 * profundidade invertida o three pede a TODA câmera que refaça a projeção
 * (`updateProjectionMatrix`), e a `Camera` base não tem esse método: o
 * desenho da passagem morria com um erro no console. A projeção desta é a
 * identidade nas duas convenções, então não há o que refazer.
 */
export class CameraSemLente extends THREE.Camera {
  updateProjectionMatrix(): void {}
}

/** o que a ordenação lê de cada item da lista de desenho do three */
interface ItemDaLista {
  id: number;
  groupOrder: number;
  renderOrder: number;
  z: number;
  material: { id: number };
  materialVariant?: number;
}

/**
 * A ORDEM DE DESENHO SOB A PROFUNDIDADE INVERTIDA. O three r185 ordena as
 * listas como sempre e, com a profundidade invertida, VIRA cada lista
 * inteira (`WebGLRenderLists.js`, `sort`: `opaque.reverse()` e as outras).
 * A intenção é só trocar o sentido do z (o z de recorte passa a CAIR com a
 * distância), mas a virada leva junto `groupOrder` e `renderOrder`: a folha
 * das esteiras (ordem 10) era pintada antes do disco do anel (ordem 0), a
 * névoa antes dos pedaços, e toda mistura que depende da ordem pedida saía
 * trocada. Estas duas comparações devolvem a ordem FINAL que o app sempre
 * teve — grupo, ordem pedida, material (nos opacos) e só então a distância,
 * opacos da frente para o fundo e transparentes do fundo para a frente.
 */
export function ordemDosOpacos(a: ItemDaLista, b: ItemDaLista): number {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
  if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
  if (a.material.id !== b.material.id) return a.material.id - b.material.id;
  const va = a.materialVariant ?? 0;
  const vb = b.materialVariant ?? 0;
  if (va !== vb) return va - vb;
  if (a.z !== b.z) return b.z - a.z;
  return a.id - b.id;
}

export function ordemDosTransparentes(a: ItemDaLista, b: ItemDaLista): number {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
  if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
  if (a.z !== b.z) return a.z - b.z;
  return a.id - b.id;
}

/**
 * Instala as duas ordens no renderer que nasceu com a profundidade
 * invertida. O three vira a lista DEPOIS de ordenar, mesmo com ordenação
 * sob medida: por isso cada comparação entra com os lados trocados. Sem a
 * invertida não faz nada, e a ordenação é a do three, como sempre.
 */
export function ordenarSobAInvertida(renderer: THREE.WebGLRenderer): void {
  if (!renderer.capabilities.reversedDepthBuffer) return;
  renderer.setOpaqueSort((a: ItemDaLista, b: ItemDaLista) => ordemDosOpacos(b, a));
  renderer.setTransparentSort((a: ItemDaLista, b: ItemDaLista) => ordemDosTransparentes(b, a));
}
