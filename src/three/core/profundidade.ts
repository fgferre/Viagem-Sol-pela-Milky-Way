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
