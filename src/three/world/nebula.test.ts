// Serve: chão — o céu da nebulosa congela quando nada que o alimenta mudou (item 144)
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Nebula } from './nebula';

function bancada() {
  const renderer = {
    getRenderTarget: () => null,
    setRenderTarget: vi.fn(),
    render: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
  camera.position.set(10, 20, 30);
  camera.updateMatrixWorld();
  const nebula = new Nebula(0.5);
  return { renderer, camera, nebula, desenhos: () => (renderer.render as ReturnType<typeof vi.fn>).mock.calls.length };
}

describe('o quadro congelado da nebulosa (item 144)', () => {
  // REDESIGN (PLAN.md, 05/09): o volume assado nasce sujo (centro NaN),
  // então a PRIMEIRA chamada de `render` sempre inclui as 128 fatias do
  // bake (`+128` em cada número abaixo, contra a era anterior à etapa) —
  // o bake só não roda de novo enquanto a câmera não sair da margem de
  // 350 pc nem `uDustMap` mudar.
  it('a primeira chamada desenha (bake, LUT, raymarch e blur); a segunda, com tudo igual, desenha NADA', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(131);
    nebula.render(renderer, camera);
    nebula.render(renderer, camera);
    // A SABOTAGEM: apagar o `return` de `render` — o raymarch volta a
    // rodar a 60 Hz com a câmera parada, e este número sobe.
    expect(desenhos()).toBe(131);
  });

  it('a câmera mexeu: desenha de novo (sem refazer a LUT dentro dos 2 pc, sem reassar dentro dos 350 pc)', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    camera.position.x += 0.5;
    camera.updateMatrixWorld();
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(133);
    camera.fov = 40;
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(135);
  });

  it('um uniform que mudou de verdade suja o quadro; o mesmo valor de novo, não', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    nebula.setFade(1);
    nebula.setSunOccluder(new THREE.Vector3(0, 0, 0), 0);
    nebula.setCavity(new THREE.Vector3(), 0);
    nebula.setSeedClouds(new Float32Array(5), 0);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(131);
    nebula.setFade(0.5);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(133);
    const sementes = new Float32Array([1, 2, 3, 4, 0.5]);
    nebula.setSeedClouds(sementes, 1);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(135);
    nebula.setSeedClouds(sementes, 1);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(135);
    nebula.setSunOccluder(new THREE.Vector3(0, 0, 0), 2);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(137);
  });

  it('a LUT invalidada por salto ou por curva nova também acorda o quadro', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    nebula.invalidarLut();
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(134);
    nebula.setSize(800, 600);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(136);
  });

  // REDESIGN (PLAN.md, 05/09): o cubo assado SEGUE A CÂMERA — reassa
  // quando ela sai da margem de 350 pc de onde o bake anterior centrou,
  // não quando um insumo do catálogo muda por si só (isso é
  // `nuvensSemente.sementesParaBake`, do lado de fora da Nebula).
  it('a câmera saiu da margem do volume assado: reassa (128 fatias) antes do próximo raymarch', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera); // bake (128 fatias) + LUT + raymarch + blur
    expect(desenhos()).toBe(131);
    camera.position.x += 400; // > 350 pc de margem
    camera.updateMatrixWorld();
    nebula.render(renderer, camera); // reassa (128) + LUT (>2 pc) + raymarch + blur
    expect(desenhos()).toBe(262);
    nebula.render(renderer, camera); // parada de novo, dentro da nova margem: nada
    expect(desenhos()).toBe(262);
  });
});
