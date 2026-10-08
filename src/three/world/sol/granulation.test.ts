// Serve: chão — re-semear a granulação depois de passos não desenha num alvo que o passo amostra (o 1282 de 08/10)
// O re-bake do Sol semeia de novo um campo que já andou. O amostrador do
// passo ficava apontando para um dos dois alvos, e o desenho da semente
// naquele alvo virava laço de realimentação: o WebGL devolvia
// INVALID_OPERATION e não desenhava. Sem GPU: o renderer falso só anota,
// a cada desenho, se o alvo é a textura que o material amostra.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createGranulation } from './granulation.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
function bancada() {
  let alvo: THREE.WebGLRenderTarget | null = null;
  const lacos: string[] = [];
  const ctx: any = {
    quadCamera: new THREE.Camera(),
    makeFullscreenScene: () => new THREE.Scene(),
    rtType: THREE.HalfFloatType,
    SIM_W: 8,
    SIM_H: 4,
    NOISE_GLSL: '',
    sunUniforms: { uSimTex: { value: null } },
    spiculeUniforms: { uSimTex: { value: null } },
  };
  ctx.renderer = {
    setRenderTarget: (rt: THREE.WebGLRenderTarget | null) => {
      alvo = rt;
    },
    render: () => {
      if (alvo && gran.simUniforms.uPrevState.value === alvo.texture) lacos.push(`alvo ${gran.simRTs.indexOf(alvo)}`);
    },
  };
  const gran = createGranulation(ctx);
  return { gran, lacos };
}

describe('granulação: semente sem laço de realimentação', () => {
  it('re-semear depois de passos nunca desenha no alvo que o amostrador aponta', () => {
    const { gran, lacos } = bancada();
    gran.seedSimulation();
    for (let passos = 1; passos <= 2; passos++) {
      gran.stepSimulation(1 / 30);
      gran.seedSimulation();
    }
    expect(lacos).toEqual([]);
  });
});
