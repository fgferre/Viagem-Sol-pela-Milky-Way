// Serve: chão — o céu da nebulosa congela quando nada que o alimenta mudou (item 144)
import { afterEach, describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Nebula } from './nebula';
import type { VolumeDePoeira } from '../cartography/galacticAssets';

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

  // item 145b — a variante do gás volumétrico troca ao vivo: o quad do
  // raymarch ganha outro material E o volume assado reassa (fino/macio
  // têm layouts de canal diferentes; ver glslBakeDensity em common.ts).
  // A câmera não se move nestes dois renders: a diferença de desenhos é
  // só o efeito de `setVariante`, isolado do resto do quadro congelado.
  it('setVariante troca o material e suja o volume; a mesma variante de novo é no-op', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera); // bake (128) + LUT + raymarch + blur
    expect(desenhos()).toBe(131);
    nebula.setVariante('fino');
    nebula.render(renderer, camera); // reassa (128) + raymarch + blur — LUT reusa (câmera parada)
    expect(desenhos()).toBe(261);
    nebula.render(renderer, camera); // nada mudou: quadro congelado de novo
    expect(desenhos()).toBe(261);
    nebula.setVariante('fino'); // já é a variante ativa: no-op
    nebula.render(renderer, camera);
    expect(desenhos()).toBe(261);
  });
});

// item E2 (PLAN.md) — a poeira medida do Gaia entra no bake do macio.
// `material`/`volumeMaterial` são privados: o acesso abaixo é o mesmo
// molde de clarao.test.ts/orbitas.test.ts para conferir uniform escrito
// sem GPU real (o `renderer` da bancada é um mock).
function volumeFalso(): VolumeDePoeira {
  return {
    descritor: {
      kind: 'volume',
      file: 'dust-near-20pc.bin',
      dims: [2, 2, 2],
      voxelPc: 20,
      originPc: [-20, -20, -20],
      scale: 1000,
      type: 'float16',
      byteLength: 16,
      sha256: '',
      innerRadiusPc: 0,
      outerRadiusPc: 40,
    },
    dados: new Uint16Array(8),
  };
}

describe('poeira medida (E2/E3) — Nebula.setPoeiraMedida/setPoeira', () => {
  it('setPoeiraMedida cria a Data3DTexture certa, escreve os uniforms nos dois materiais e reassa (128 renders a mais) quando a poeira foi pedida', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera); // bake (128) + LUT + raymarch + blur
    expect(desenhos()).toBe(131);

    // pedida ANTES do bloco chegar (a mesma ordem do director: setPoeira
    // no construtor, setPoeiraMedida quando o fetch resolve depois) —
    // sem isto o efetivo não muda com a chegada (item C, carga
    // preguiçosa) e o "128 a mais" abaixo não provaria nada.
    nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 0 });
    nebula.setPoeiraMedida(volumeFalso());

    const { material, volumeMaterial } = nebula as unknown as {
      material: THREE.ShaderMaterial;
      volumeMaterial: THREE.ShaderMaterial;
    };
    const tex = material.uniforms.uPoeiraTex.value as THREE.Data3DTexture;
    expect(tex.isData3DTexture).toBe(true);
    expect(tex.format).toBe(THREE.RedFormat);
    expect(tex.type).toBe(THREE.HalfFloatType);
    expect(tex.minFilter).toBe(THREE.LinearFilter);
    expect(tex.magFilter).toBe(THREE.LinearFilter);
    expect([tex.image.width, tex.image.height, tex.image.depth]).toEqual([2, 2, 2]);
    // os DOIS materiais (raymarch e bake) recebem a MESMA textura e os
    // mesmos números do descritor — nunca só um dos dois.
    expect(volumeMaterial.uniforms.uPoeiraTex.value).toBe(tex);
    expect((material.uniforms.uPoeiraMin.value as THREE.Vector3).toArray()).toEqual([-20, -20, -20]);
    expect((volumeMaterial.uniforms.uPoeiraMin.value as THREE.Vector3).toArray()).toEqual([
      -20, -20, -20,
    ]);
    expect((material.uniforms.uPoeiraTamanho.value as THREE.Vector3).toArray()).toEqual([
      40, 40, 40,
    ]);
    expect(material.uniforms.uPoeiraEscala.value).toBeCloseTo(0.001, 9);
    expect((material.uniforms.uPoeiraRaios.value as THREE.Vector2).toArray()).toEqual([0, 40]);

    nebula.render(renderer, camera); // reassa (128) + raymarch + blur — LUT reusa (câmera parada)
    expect(desenhos()).toBe(261);
  });

  // TROCA DE FONTE AO VIVO (item A, revisão independente v2, 27/09): o
  // director redispara `setPoeiraMedida` com uma textura NOVA (fonte
  // trocada) enquanto o macio já está ativo e já leu um volume antes —
  // o modo efetivo não muda (continua 1), e sem a invalidação extra
  // `atualizarModoEfetivo` retornaria cedo, deixando o bake com a
  // textura ANTIGA para sempre.
  it('dois volumes diferentes em sequência no macio ativo: o segundo provoca novo bake', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 0 });
    nebula.setPoeiraMedida(volumeFalso());
    nebula.render(renderer, camera); // bake (128) + LUT + raymarch + blur
    const antes = desenhos();

    nebula.setPoeiraMedida(volumeFalso()); // uma SEGUNDA textura, mesmo efetivo (1)
    nebula.render(renderer, camera); // reassa (128) + raymarch + blur — LUT reusa (câmera parada)

    expect(desenhos() - antes).toBe(130);
  });

  // CARGA PREGUIÇOSA (item C, revisão independente, 27/09): o bloco pode
  // chegar (director.ts o baixa quando a cartografia está ligada) mesmo
  // com a poeira nunca pedida — reassar as 128 fatias por nada seria
  // exatamente o custo que a carga preguiçosa evita.
  it('chegada do bloco com modo pedido 0 não provoca bake extra', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.render(renderer, camera); // bake (128) + LUT + raymarch + blur
    expect(desenhos()).toBe(131);

    nebula.setPoeiraMedida(volumeFalso()); // pedido continua 0: o efetivo não muda

    nebula.render(renderer, camera); // nada sujo, câmera parada: nada desenha
    expect(desenhos()).toBe(131);
  });

  it('o pedido é só "ligada": setPoeira({modo:1}) no fino vira modo efetivo 2 (direto) e no antigo fica 0', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.setVariante('fino');
    nebula.setPoeiraMedida(volumeFalso());
    nebula.render(renderer, camera);

    // o número do pedido não escolhe a técnica: a variante escolhe
    nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 0 });
    const { material } = nebula as unknown as { material: THREE.ShaderMaterial };
    expect(material.uniforms.uPoeiraModo.value).toBe(2);

    // a variante antiga não lê poeira: efetivo 0, e pedir de novo não
    // provoca as 128 fatias de um bake (o antigo nunca assa)
    nebula.setVariante('antigo');
    expect(material.uniforms.uPoeiraModo.value).toBe(0);
    const antes = desenhos();
    nebula.setPoeira({ modo: 2, ganho: 46.9, gama: 1, lanes: 0 });
    nebula.render(renderer, camera);
    expect(desenhos() - antes).toBeLessThan(128);
  });

  // E3 (antecipada — PLAN.md, item B): o fino lê o bloco DIRETO, no modo
  // 2 — nunca no 1 (esse é do macio, ver o teste acima).
  it('setPoeira({modo:2}) com a variante fino liga o modo efetivo 2 — o fino lê o bloco direto', () => {
    const { nebula } = bancada();
    nebula.setVariante('fino');
    nebula.setPoeiraMedida(volumeFalso());
    nebula.setPoeira({ modo: 2, ganho: 46.9, gama: 1, lanes: 0 });
    const { material, volumeMaterial } = nebula as unknown as {
      material: THREE.ShaderMaterial;
      volumeMaterial: THREE.ShaderMaterial;
    };
    expect(material.uniforms.uPoeiraModo.value).toBe(2);
    expect(volumeMaterial.uniforms.uPoeiraModo.value).toBe(2);
  });

  it('setPoeiraMedida(null) volta ao modo efetivo 0 e destrói a textura anterior', () => {
    const { nebula } = bancada();
    nebula.setPoeiraMedida(volumeFalso());
    nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 0 });
    const { material } = nebula as unknown as { material: THREE.ShaderMaterial };
    expect(material.uniforms.uPoeiraModo.value).toBe(1);
    const texAntes = material.uniforms.uPoeiraTex.value as THREE.Data3DTexture;
    const disposeSpy = vi.spyOn(texAntes, 'dispose');

    nebula.setPoeiraMedida(null);

    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(material.uniforms.uPoeiraModo.value).toBe(0);
    expect(material.uniforms.uPoeiraTex.value).not.toBe(texAntes);
  });

  // PRONTIDÃO DA CAPTURA (item D, revisão independente, 27/09): sem
  // retentativa, uma falha do fetch é DEFINITIVA — esperar para sempre
  // travaria `get captura` do director. `setPoeiraMedida(null)` é o
  // mesmo desfecho de um fetch que falhou, foi abortado ou excedeu o
  // teto de textura (ver director.ts).
  it('poeiraAssentada fica verdadeira depois de setPoeiraMedida(null) com o pedido ligado (falha encerrada)', () => {
    const { nebula } = bancada();
    nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 0 });
    expect(nebula.poeiraAssentada).toBe(false); // pedida, fetch ainda em voo

    nebula.setPoeiraMedida(null); // o fetch resolveu sem bloco: falha encerrada

    expect(nebula.poeiraAssentada).toBe(true);
  });

  // LIMITES (item E, revisão independente, 27/09): gama ∈ [0,2; 3],
  // ganho ∈ [0; 500], lanes ∈ [0; 1] — clamp, e NaN cai no padrão.
  it('setPoeira clampa ganho/gama/lanes fora da faixa (e NaN cai no padrão)', () => {
    const { nebula } = bancada();
    const { material, volumeMaterial } = nebula as unknown as {
      material: THREE.ShaderMaterial;
      volumeMaterial: THREE.ShaderMaterial;
    };

    nebula.setPoeira({ modo: 0, ganho: 999, gama: 10, lanes: 5 });
    expect(material.uniforms.uPoeiraGanho.value).toBe(500);
    expect(material.uniforms.uPoeiraGama.value).toBe(3);
    expect(material.uniforms.uPoeiraLanes.value).toBe(1);

    nebula.setPoeira({ modo: 0, ganho: -10, gama: -1, lanes: -1 });
    expect(material.uniforms.uPoeiraGanho.value).toBe(0);
    expect(material.uniforms.uPoeiraGama.value).toBeCloseTo(0.2, 9);
    expect(material.uniforms.uPoeiraLanes.value).toBe(0);

    nebula.setPoeira({ modo: 0, ganho: NaN, gama: NaN, lanes: NaN });
    expect(material.uniforms.uPoeiraGanho.value).toBeCloseTo(46.9, 9);
    expect(material.uniforms.uPoeiraGama.value).toBe(1);
    expect(material.uniforms.uPoeiraLanes.value).toBe(0);
    expect(volumeMaterial.uniforms.uPoeiraGanho.value).toBeCloseTo(46.9, 9);
  });

  // item 7 (revisão independente v2, 27/09): no modo efetivo 2 (fino) o
  // ganho/gama/lanes são consumidos AO VIVO por amostra no raymarch
  // (nebulaDensity) — reassar as 128 fatias do bake por uma mudança que
  // o bake nem lê seria o mesmo desperdício que a carga preguiçosa
  // (item C, acima) já evita para a chegada do bloco.
  it('no fino ativo, mudar o ganho não reassa — só o raymarch, nunca as 128 fatias do bake', () => {
    const { renderer, camera, nebula, desenhos } = bancada();
    nebula.setVariante('fino');
    nebula.setPoeiraMedida(volumeFalso());
    nebula.setPoeira({ modo: 2, ganho: 46.9, gama: 1, lanes: 0 });
    nebula.render(renderer, camera); // reassa (128) + raymarch + blur — dust liga sujo

    const antes = desenhos();
    nebula.setPoeira({ modo: 2, ganho: 100, gama: 1, lanes: 0 }); // só o ganho muda
    nebula.render(renderer, camera); // sem o bake: só a imagem
    expect(desenhos() - antes).toBeLessThan(128);
  });
});

// item 1 (revisão independente v2, 27/09) — window.__poeira é um painel
// COMPARTILHADO com o Director (frame diagnostics, ver diagnosticoDaPoeira.ts
// em lib/): a sequência abaixo é a que derrubava a cena com `gas=antigo`
// (nunca assa; `Director.tick` roda antes e cria `window.__poeira = {}`
// só com as métricas de quadro) trocando para `fino` (o primeiro bake
// via `g.__poeira.bakesMs.push`, ausente). `environment: node`
// (vitest.config.ts): sem `window` de verdade, este bloco encena o
// mínimo dele em `globalThis`, mesma régua de `lib/contadorDeFps.test.ts`.
describe('window.__poeira — o painel compartilhado com o Director não trava o primeiro bake', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('window.__poeira já existe SÓ com quadroMaxMs (o director rodou primeiro, sem nunca assar): o primeiro bake não lança e ganha bakesMs', () => {
    // `location.search` vazio: só o suficiente para o construtor (lê
    // `?nebsteps=` fora deste teste) não quebrar por um motivo alheio.
    const janela = {
      location: { search: '' },
      __poeira: { quadroMaxMs: 1 } as { quadroMaxMs: number; bakesMs?: number[] },
    };
    (globalThis as { window?: unknown }).window = janela;
    const { renderer, camera, nebula } = bancada();
    nebula.setVariante('fino'); // marca volumeSujo — o próximo render() assa

    expect(() => nebula.render(renderer, camera)).not.toThrow();

    expect(janela.__poeira.bakesMs?.length).toBe(1);
    expect(janela.__poeira.quadroMaxMs).toBe(1); // preservado, não apagado pelo bake
  });
});
