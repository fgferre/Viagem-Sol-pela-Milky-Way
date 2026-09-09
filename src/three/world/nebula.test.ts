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
  // REDESIGN (PLAN.md, 05/09; grade grossa de máximo: etapa A2): o volume
  // assado nasce sujo (centro NaN), então a PRIMEIRA chamada de `render`
  // sempre inclui as 128 fatias do bake MAIS as 16 da redução em grade
  // grossa que roda logo depois de cada bake (`+144` em cada número
  // abaixo, contra a era anterior à etapa A2) — o bake só não roda de
  // novo enquanto a câmera não sair da margem de 350 pc nem `uDustMap`
  // mudar.
  it('a primeira chamada desenha (bake, redução, LUT, raymarch e blur); a segunda, com tudo igual, desenha NADA', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(147);
    nebula.render(renderer, camera);
    nebula.render(renderer, camera);
    // A SABOTAGEM: apagar o `return` de `render` — o raymarch volta a
    // rodar a 60 Hz com a câmera parada, e este número sobe.
    expect(desenhos()).toBe(147);
  });

  it('a câmera mexeu: desenha de novo (sem refazer a LUT dentro dos 2 pc, sem reassar dentro dos 350 pc)', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    camera.position.x += 0.5;
    camera.updateMatrixWorld();
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(149);
    camera.fov = 40;
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(151);
  });

  it('um uniform que mudou de verdade suja o quadro; o mesmo valor de novo, não', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    nebula.setFade(1);
    nebula.setSunOccluder(new THREE.Vector3(0, 0, 0), 0);
    nebula.setCavity(new THREE.Vector3(), 0);
    nebula.setSeedClouds(new Float32Array(5), 0);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(147);
    nebula.setFade(0.5);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(149);
    const sementes = new Float32Array([1, 2, 3, 4, 0.5]);
    nebula.setSeedClouds(sementes, 1);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(151);
    nebula.setSeedClouds(sementes, 1);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(151);
    nebula.setSunOccluder(new THREE.Vector3(0, 0, 0), 2);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(153);
  });

  it('a LUT invalidada por salto ou por curva nova também acorda o quadro', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera);
    nebula.invalidarLut();
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(150);
    nebula.setSize(800, 600);
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(152);
  });

  // REDESIGN (PLAN.md, 05/09): o cubo assado SEGUE A CÂMERA — reassa
  // quando ela sai da margem de 350 pc de onde o bake anterior centrou,
  // não quando um insumo do catálogo muda por si só (isso é
  // `nuvensSemente.sementesParaBake`, do lado de fora da Nebula).
  it('a câmera saiu da margem do volume assado: reassa (128 fatias + 16 da redução) antes do próximo raymarch', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera); // bake (128+16) + LUT + raymarch + blur
    expect(desenhos()).toBe(147);
    camera.position.x += 400; // > 350 pc de margem
    camera.updateMatrixWorld();
    nebula.render(renderer, camera); // reassa (128+16) + LUT (>2 pc) + raymarch + blur
    expect(desenhos()).toBe(294);
    nebula.render(renderer, camera); // parada de novo, dentro da nova margem: nada
    expect(desenhos()).toBe(294);
  });

  // item 145b — a variante do gás volumétrico troca ao vivo: o quad do
  // raymarch ganha outro material E o volume assado reassa (fino/macio
  // têm layouts de canal diferentes; ver glslBakeDensity em common.ts).
  // A câmera não se move nestes dois renders: a diferença de desenhos é
  // só o efeito de `setVariante`, isolado do resto do quadro congelado.
  it('setVariante troca o material e suja o volume; a mesma variante de novo é no-op', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera); // bake (128+16) + LUT + raymarch + blur
    expect(desenhos()).toBe(147);
    nebula.setVariante('fino');
    nebula.render(renderer, camera); // reassa (128+16) + raymarch + blur — LUT reusa (câmera parada)
    expect(desenhos()).toBe(293);
    nebula.render(renderer, camera); // nada mudou: quadro congelado de novo
    expect(desenhos()).toBe(293);
    nebula.setVariante('fino'); // já é a variante ativa: no-op
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(293);
  });

  // etapa A2 (PLAN.md) — a redução em grade grossa (16³) não pode virar
  // uma dessincronia silenciosa: ela tem de rodar DEPOIS das 128 fatias
  // finas de CADA bake (nunca antes — leria o volume fino da rodada
  // anterior) e ANTES do render target ser restaurado. `setRenderTarget`
  // é a única chamada que carrega a fatia como segundo argumento; o bake
  // fino e a redução são as únicas duas coisas que a usam.
  it('a redução roda depois de CADA bake: 16 fatias a mais, na ordem, do tamanho do volume grosso', () => {
    const { renderer, camera, nebula } = bancada();
    nebula.render(renderer, camera);
    const chamadas = (renderer.setRenderTarget as ReturnType<typeof vi.fn>).mock.calls;
    const porFatia = chamadas.filter((c) => c.length === 2);
    expect(porFatia.length).toBe(128 + 16);
    const fatiasDaReducao = porFatia.slice(128).map((c) => c[1]);
    expect(fatiasDaReducao).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });
});
