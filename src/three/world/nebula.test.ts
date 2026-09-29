// Serve: chão — o céu da nebulosa congela quando nada que o alimenta mudou (item 144); a pirâmide da poeira (E3c) só lê tijolo desejado (nos raios do preset), sobe o lote antes do desenho, só troca de material aquecida, deixa a lane ceder onde o nível lido tem o detalhe real e, sem ela, o shader é o de hoje
import { afterEach, describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  Nebula,
  RAMPAS_DESLIGADAS,
  TETO_DA_ESPERA_DA_PIRAMIDE_S,
  cenaParaHelioGalactico,
  empilharTabelas,
  medidoPelosNiveis,
  pesoDoNivel,
  raiosDoNivel,
  texelNaPilha,
} from './nebula';
import { MEDIA_DA_LANE } from '../shaders/common';
import { GAL, helioGalacticoParaCena } from './baseGalactica';
import type { VolumeDePoeira } from '../cartography/galacticAssets';
import {
  CODIGO_OMITIDO,
  CONCORRENCIA_DE_BUSCA,
  NUCLEO_DO_TIJOLO,
  PRIMEIRO_CODIGO_DE_VAGA,
  RAIO_DESEJADO_NO_COMPUTADOR_PC,
  RAIO_DESEJADO_PC,
  VOXELS_POR_TIJOLO,
  montarOrcamento,
} from '../cartography/piramideDePoeira';
import type {
  FonteDeTijolos,
  NivelDaPiramide,
  PiramideDePoeira,
  Trio,
} from '../cartography/piramideDePoeira';

function bancada() {
  // `compile`/`properties`: o aquecimento da pirâmide (E3c) — o programa
  // de cada material responde `isReady` pelo `programasProntos` do teste
  const estado = { programasProntos: true };
  const renderer = {
    getRenderTarget: () => null,
    setRenderTarget: vi.fn(),
    render: vi.fn(),
    copyTextureToTexture: vi.fn(),
    compile: vi.fn(),
    properties: { get: () => ({ currentProgram: { isReady: () => estado.programasProntos } }) },
  } as unknown as THREE.WebGLRenderer;
  const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
  camera.position.set(10, 20, 30);
  camera.updateMatrixWorld();
  const nebula = new Nebula(0.5);
  return {
    renderer,
    camera,
    nebula,
    estado,
    desenhos: () => (renderer.render as ReturnType<typeof vi.fn>).mock.calls.length,
  };
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

// ============================================================
// A PIRÂMIDE DA POEIRA NA GPU (E3c). A geometria é a do contrato (n1 de
// 10 pc na caixa inteira, n2 de 5 pc em r ≤ 900, n3 de 2,5 pc em r ≤ 450,
// quina (−1250, −1250, −500)); o renderer é o mock da bancada, com
// `copyTextureToTexture` espiado — é por ele que cada tijolo sobe.
// ============================================================
const ORIGEM_DO_CONTRATO: Trio = [-1250, -1250, -500];
const GRADES_DO_CONTRATO = [
  { nivel: 1, voxelPc: 10, dims: [250, 250, 100] as Trio, raioPc: Infinity },
  { nivel: 2, voxelPc: 5, dims: [500, 500, 200] as Trio, raioPc: 900 },
  { nivel: 3, voxelPc: 2.5, dims: [1000, 1000, 400] as Trio, raioPc: 450 },
];

/** o tijolo do nível que contém o ponto (pc, referencial do bloco) */
function tijoloDe(g: (typeof GRADES_DO_CONTRATO)[number], p: Trio): Trio {
  const lado = NUCLEO_DO_TIJOLO * g.voxelPc;
  return [0, 1, 2].map((a) => Math.floor((p[a] - ORIGEM_DO_CONTRATO[a]) / lado)) as unknown as Trio;
}

/** o centro do núcleo do tijolo, cortado na borda da grade — a régua da residência */
function centroDo(g: (typeof GRADES_DO_CONTRATO)[number], b: Trio): Trio {
  return [0, 1, 2].map((a) => {
    const lo = ORIGEM_DO_CONTRATO[a] + b[a] * NUCLEO_DO_TIJOLO * g.voxelPc;
    const hi = ORIGEM_DO_CONTRATO[a] + Math.min((b[a] + 1) * NUCLEO_DO_TIJOLO, g.dims[a]) * g.voxelPc;
    return (lo + hi) / 2;
  }) as unknown as Trio;
}

/** pirâmide do contrato com os tijolos gravados em volta do Sol, e uma
 *  fonte cujas promessas o teste resolve na mão */
function piramideDeTeste() {
  const niveis: NivelDaPiramide[] = GRADES_DO_CONTRATO.map((g) => {
    const dimsEmTijolos = g.dims.map((d) => Math.ceil(d / NUCLEO_DO_TIJOLO)) as unknown as Trio;
    const [bi, bj, bk] = tijoloDe(g, [0, 0, 0]);
    const gravados = new Set<number>();
    for (const di of [-1, 0]) gravados.add(bi + di + dimsEmTijolos[0] * (bj + dimsEmTijolos[1] * bk));
    return {
      nivel: g.nivel,
      voxelPc: g.voxelPc,
      origemPc: ORIGEM_DO_CONTRATO,
      dims: g.dims,
      dimsEmTijolos,
      raioPc: g.raioPc,
      escala: 1000,
      gravados,
      pasta: `teste/n${g.nivel}`,
    };
  });
  const pedidos: { nivel: number; b: Trio; resolver: (d: Uint16Array) => void }[] = [];
  const fonte: FonteDeTijolos = {
    buscar: (nivel, bi, bj, bk) =>
      new Promise<Uint16Array>((resolver) => pedidos.push({ nivel: nivel.nivel, b: [bi, bj, bk], resolver })),
  };
  const piramide: PiramideDePoeira = { niveis };
  return { piramide, fonte, pedidos };
}

/** os campos privados que o teste confere (mesmo molde do resto do arquivo) */
type Entranhas = {
  material: THREE.ShaderMaterial;
  volumeMaterial: THREE.ShaderMaterial;
  piramide: { atlas: THREE.Data3DTexture; tabelas: THREE.Data3DTexture; dadosDasTabelas: Uint16Array } | null;
};

const microtarefas = () => new Promise((r) => setTimeout(r, 0));

describe('a pirâmide da poeira na GPU (E3c) — as contas puras', () => {
  it('a câmera vai ao referencial do bloco: a inversa exata de helioGalacticoParaCena, e o centro galáctico cai em +x', () => {
    for (const h of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [123.4, -56.7, 8.9]] as Trio[]) {
      const cena = helioGalacticoParaCena(h[0], h[1], h[2]);
      const volta = cenaParaHelioGalactico(cena.x, cena.y, cena.z);
      volta.forEach((v, a) => expect(v).toBeCloseTo(h[a], 9));
    }
    // Sol → centro galáctico, dado na cena: +x no bloco, sem componente em
    // l = 90° e com a latitude pequena de o Sol estar acima do plano
    const [x, y, z] = cenaParaHelioGalactico(GAL.DIR_GC.x, GAL.DIR_GC.y, GAL.DIR_GC.z);
    expect(x).toBeGreaterThan(0.99);
    expect(Math.abs(y)).toBeLessThan(1e-9);
    expect(Math.abs(z)).toBeLessThan(0.01);
  });

  it('o peso de um nível só passa de 0 onde a residência DESEJA o tijolo (centro no raio do preset) e dentro da região do nível', () => {
    // gerador fixo (LCG): a mesma nuvem de pontos a cada corrida
    let semente = 12345;
    const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (const [g, RAIOS] of GRADES_DO_CONTRATO.flatMap((g) =>
      [RAIO_DESEJADO_PC, RAIO_DESEJADO_NO_COMPUTADOR_PC].map((r) => [g, r] as const)
    )) {
      const raios = raiosDoNivel(g, RAIOS[g.nivel]);
      // bordas nunca invertidas (smoothstep com bordas trocadas é NaN na casa)
      expect(raios[0]).toBeLessThan(raios[1]);
      expect(raios[2]).toBeLessThan(raios[3]);
      // colado na câmera, perto do Sol, o nível vale inteiro
      expect(pesoDoNivel(raios, 0, 1)).toBe(1);
      let comPeso = 0;
      for (let n = 0; n < 20000; n++) {
        const cam: Trio = [(aleatorio() - 0.5) * 1200, (aleatorio() - 0.5) * 1200, (aleatorio() - 0.5) * 600];
        // direção uniforme e distância até um pouco além do fim da rampa
        const u = aleatorio() * 2 - 1;
        const fi = aleatorio() * 2 * Math.PI;
        const s = Math.sqrt(1 - u * u);
        const t = aleatorio() * (raios[1] + 10);
        const p: Trio = [cam[0] + t * s * Math.cos(fi), cam[1] + t * s * Math.sin(fi), cam[2] + t * u];
        if (p.some((v, a) => v < ORIGEM_DO_CONTRATO[a] || v >= ORIGEM_DO_CONTRATO[a] + g.dims[a] * g.voxelPc)) continue;
        const r = Math.hypot(...p);
        if (!(pesoDoNivel(raios, t, r) > 0)) continue;
        comPeso += 1;
        const centro = centroDo(g, tijoloDe(g, p));
        expect(Math.hypot(...centro.map((c, a) => c - cam[a]))).toBeLessThanOrEqual(RAIOS[g.nivel]);
        expect(r).toBeLessThanOrEqual(g.raioPc);
      }
      // a prova não pode ser vazia
      expect(comPeso).toBeGreaterThan(1000);
    }
    // um nível sem raio desejado (ou sem espaço para a rampa) sai desligado
    expect(raiosDoNivel({ voxelPc: 1.25, raioPc: 225 }, RAIO_DESEJADO_PC[4] ?? 0)).toEqual([...RAMPAS_DESLIGADAS]);
    expect(raiosDoNivel({ voxelPc: 2.5, raioPc: 450 }, Infinity)).toEqual([...RAMPAS_DESLIGADAS]);
    expect(pesoDoNivel(RAMPAS_DESLIGADAS, 0, 0)).toBe(0);
  });

  it('os raios do computador levam o fim das rampas a ~200 / ~400 / ~620 pc da câmera; os do Performance ficam os de antes', () => {
    const fim = (raios: readonly number[]) => GRADES_DO_CONTRATO.map((g) => raiosDoNivel(g, raios[g.nivel])[1]);
    // bₖ = raio − meia diagonal do tijolo (√3/2 · 32 · voxel)
    fim(RAIO_DESEJADO_NO_COMPUTADOR_PC).forEach((b, i) => expect(b).toBeCloseTo([622.9, 401.4, 200.7][i], 1));
    fim(RAIO_DESEJADO_PC).forEach((b, i) => expect(b).toBeCloseTo([422.9, 261.4, 80.7][i], 1));
  });

  it('a lane cede onde o nível lido tem voxel ≤ 5 pc: f = 1 − (W₂ + W₃), e cai na média ⟨L⟩, plena no n0/n1', () => {
    const n = (w: number, voxelPc: number, e = 1) => ({ w, voxelPc, e });
    // só o n1 (10 pc) e o n0: a lane de hoje, inteira — Lm = mix(1, L, s)
    const soGrosso = medidoPelosNiveis([n(0, 2.5), n(0, 5), n(1, 10)], 1, 0.2, 1);
    expect(soGrosso.forcaDasLanes).toBe(1);
    expect(soGrosso.lanes).toBeCloseTo(0.2, 12);
    // a mistura: W₃ = 0,5, W₂ = 0,5·0,4 = 0,2 → f = 1 − 0,7 = 0,3
    const meio = medidoPelosNiveis([n(0.5, 2.5, 3), n(0.4, 5, 2), n(1, 10, 1)], 0, 0.2, 1);
    expect(meio.forcaDasLanes).toBeCloseTo(0.3, 12);
    expect(meio.valor).toBeCloseTo(0.5 * 3 + 0.2 * 2 + 0.3 * 1, 12);
    expect(meio.lanes).toBeCloseTo(MEDIA_DA_LANE + 0.3 * (0.2 - MEDIA_DA_LANE), 12);
    // o n3 inteiro: nenhum desenho inventado, só a média — qualquer L dá o mesmo
    for (const L of [0.12, 0.5, 1]) {
      expect(medidoPelosNiveis([n(1, 2.5), n(1, 5), n(1, 10)], 0, L, 1).lanes).toBeCloseTo(MEDIA_DA_LANE, 12);
    }
    // tijolo fino não residente não tira força: o que se lê ali é o pai
    expect(medidoPelosNiveis([null, null, n(1, 10)], 0, 0.2, 1).forcaDasLanes).toBe(1);
    // s = 0 (sem textura): Lm = 1 em qualquer nível
    expect(medidoPelosNiveis([n(0.5, 2.5), null, n(1, 10)], 0, 0.2, 0).lanes).toBe(1);
  });

  it('a pilha das tabelas dá a cada entrada de cada nível um texel só, na posição que o shader lê', () => {
    const tijolos: Trio[] = [
      [8, 8, 4],
      [16, 16, 7],
      [32, 32, 13],
    ];
    const pilha = empilharTabelas(tijolos);
    expect(pilha).toEqual({ largura: 32, altura: 32, profundidade: 24, deslocamentoZ: [0, 4, 11] });
    const vistos = new Set<number>();
    tijolos.forEach(([nbx, nby, nbz], i) => {
      for (let bk = 0; bk < nbz; bk++) {
        for (let bj = 0; bj < nby; bj++) {
          for (let bi = 0; bi < nbx; bi++) {
            const texel = texelNaPilha(pilha, i, tijolos[i], bi + nbx * (bj + nby * bk));
            // o shader: texelFetch(ivec3(b) + ivec3(0, 0, deslocamentoZ))
            expect(texel).toBe(bi + pilha.largura * (bj + pilha.altura * (pilha.deslocamentoZ[i] + bk)));
            expect(vistos.has(texel)).toBe(false);
            vistos.add(texel);
          }
        }
      }
    });
    expect(Math.max(...vistos)).toBeLessThan(pilha.largura * pilha.altura * pilha.profundidade);
  });
});

describe('a pirâmide da poeira na GPU (E3c) — a Nebula', () => {
  /** a bancada com o bloco de 20 pc já carregado e a poeira pedida */
  function comPoeira(variante: 'macio' | 'fino') {
    const b = bancada();
    b.camera.position.set(0, 0, 0);
    b.camera.lookAt(1, 0, 0);
    b.camera.updateMatrixWorld();
    b.nebula.setVariante(variante);
    b.nebula.setPoeiraMedida(volumeFalso());
    b.nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 1 });
    return { ...b, entranhas: () => b.nebula as unknown as Entranhas };
  }

  it('ativa, troca os dois materiais do macio (o bake sem o medido) e sobe o lote antes do desenho; a captura espera assentar', async () => {
    const { renderer, camera, nebula, entranhas } = comPoeira('macio');
    const hoje = entranhas().material;
    const bakeDeHoje = entranhas().volumeMaterial;
    const { piramide, fonte, pedidos } = piramideDeTeste();
    nebula.setPiramide({ piramide, fonte, orcamento: montarOrcamento(16, 2 ** 22, 2048) });
    nebula.aquecerPiramide(renderer);

    expect(entranhas().material).not.toBe(hoje);
    expect(entranhas().material.fragmentShader).toContain('poeiraMedidaNiveis(ph, t, forcaDasLanes)');
    expect(entranhas().volumeMaterial).not.toBe(bakeDeHoje);
    expect(bakeDeHoje.fragmentShader).toContain('poeiraMedida(ph)');
    expect(entranhas().volumeMaterial.fragmentShader).not.toContain('poeiraMedida(ph)');
    // as tabelas sobem inteiras na chegada, com os omitidos já marcados
    const { dadosDasTabelas, atlas } = entranhas().piramide!;
    expect(dadosDasTabelas.includes(CODIGO_OMITIDO)).toBe(true);
    // antes do primeiro quadro a residência ainda não pediu nada: não é "assentada"
    expect(nebula.piramideAssentada).toBe(false);

    nebula.atualizarPiramide(renderer, 0, camera);
    expect(pedidos.length).toBe(CONCORRENCIA_DE_BUSCA);
    expect(nebula.piramideAssentada).toBe(false);
    // a rede entrega; cada quadro sobe o que chegou e pede o resto
    let atendidos = 0;
    for (let quadro = 1; quadro <= 4; quadro++) {
      for (const p of pedidos.slice(atendidos)) p.resolver(new Uint16Array(VOXELS_POR_TIJOLO));
      atendidos = pedidos.length;
      await microtarefas();
      nebula.atualizarPiramide(renderer, quadro * 0.1, camera);
    }
    expect(pedidos.length).toBe(6); // 2 gravados por nível, os três em volta do Sol

    const copias = (renderer.copyTextureToTexture as ReturnType<typeof vi.fn>).mock.calls;
    expect(copias.length).toBe(6);
    for (const [origem, destino, regiao, posicao] of copias) {
      expect(destino).toBe(atlas);
      expect(regiao).toBeNull();
      expect((origem as THREE.Data3DTexture).image.width).toBe(34);
      expect((posicao as THREE.Vector3).toArray().every((v) => v % 34 === 0)).toBe(true);
    }
    // cada tijolo que subiu é uma vaga na tabela; o portador não segura os bytes
    const vagas = [...dadosDasTabelas].filter((c) => c >= PRIMEIRO_CODIGO_DE_VAGA);
    expect(new Set(vagas).size).toBe(6);
    expect(entranhas().piramide!.tabelas.version).toBeGreaterThan(1);
    expect(nebula.piramideAssentada).toBe(true);
  });

  it('sem a pirâmide, ou com o Gaia desligado, volta o MESMO material de hoje — e nada é buscado', () => {
    const { renderer, camera, nebula, entranhas } = comPoeira('fino');
    const hoje = entranhas().material;
    const { piramide, fonte, pedidos } = piramideDeTeste();
    nebula.setPiramide({ piramide, fonte, orcamento: montarOrcamento(16, 2 ** 22, 2048) });
    nebula.aquecerPiramide(renderer);
    expect(entranhas().material.fragmentShader).toContain('poeiraMedidaNiveis(ph, t, forcaDasLanes)');

    // o Gaia desligado: o material de hoje, o mesmo objeto (o texto de hoje)
    nebula.setPoeira({ modo: 0, ganho: 46.9, gama: 1, lanes: 1 });
    expect(entranhas().material).toBe(hoje);
    nebula.atualizarPiramide(renderer, 0, camera);
    expect(pedidos.length).toBe(0);
    expect(nebula.piramideAssentada).toBe(true);

    // religado, a pirâmide volta; solta, o de hoje de novo, e o atlas é descartado
    nebula.setPoeira({ modo: 1, ganho: 46.9, gama: 1, lanes: 1 });
    expect(entranhas().material).not.toBe(hoje);
    const atlas = entranhas().piramide!.atlas;
    const descarte = vi.spyOn(atlas, 'dispose');
    nebula.setPiramide(null);
    expect(entranhas().material).toBe(hoje);
    expect(descarte).toHaveBeenCalledTimes(1);
    expect(nebula.piramideAssentada).toBe(true);
  });

  it('a troca espera o aquecimento: compilando, fica o material de hoje e a captura espera; pronto, troca', () => {
    const { renderer, camera, nebula, entranhas, estado } = comPoeira('macio');
    const hoje = entranhas().material;
    const bakeDeHoje = entranhas().volumeMaterial;
    const { piramide, fonte, pedidos } = piramideDeTeste();
    estado.programasProntos = false;
    nebula.setPiramide({ piramide, fonte, orcamento: montarOrcamento(16, 2 ** 22, 2048) });
    // sem aquecer, nada troca — mas a residência já busca os tijolos
    expect(entranhas().material).toBe(hoje);
    nebula.atualizarPiramide(renderer, 0, camera);
    expect(pedidos.length).toBe(CONCORRENCIA_DE_BUSCA);
    // o driver compila os dois do macio (raymarch e bake) uma vez só, com o
    // render target do raymarch amarrado (a chave de programa do three)
    nebula.aquecerPiramide(renderer);
    nebula.aquecerPiramide(renderer);
    expect(renderer.compile).toHaveBeenCalledTimes(1);
    const [cena] = (renderer.compile as ReturnType<typeof vi.fn>).mock.calls[0] as [THREE.Scene];
    expect(cena.children.length).toBe(2);
    expect(renderer.setRenderTarget).toHaveBeenCalledWith((nebula as unknown as { rt: unknown }).rt);
    expect(entranhas().material).toBe(hoje);
    expect(entranhas().volumeMaterial).toBe(bakeDeHoje);
    expect(nebula.piramideAssentada).toBe(false);
    // pronto: troca os dois no quadro seguinte
    estado.programasProntos = true;
    nebula.aquecerPiramide(renderer);
    expect(entranhas().material.fragmentShader).toContain('poeiraMedidaNiveis(ph, t, forcaDasLanes)');
    expect(entranhas().volumeMaterial).not.toBe(bakeDeHoje);
    expect(renderer.compile).toHaveBeenCalledTimes(1);
  });

  it('a rede que não responde segura a captura só até o teto', () => {
    const { renderer, camera, nebula } = comPoeira('fino');
    const { piramide, fonte } = piramideDeTeste();
    nebula.setPiramide({ piramide, fonte, orcamento: montarOrcamento(16, 2 ** 22, 2048) });
    nebula.aquecerPiramide(renderer);
    nebula.atualizarPiramide(renderer, 100, camera);
    nebula.atualizarPiramide(renderer, 100 + TETO_DA_ESPERA_DA_PIRAMIDE_S - 0.5, camera);
    expect(nebula.piramideAssentada).toBe(false);
    nebula.atualizarPiramide(renderer, 100 + TETO_DA_ESPERA_DA_PIRAMIDE_S, camera);
    expect(nebula.piramideAssentada).toBe(true);
  });
});
