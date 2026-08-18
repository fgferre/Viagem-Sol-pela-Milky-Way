// ============================================================
// OS HELPERS DO CARREGAMENTO — as construções do init que RETORNAM
// objetos. Moravam no director.ts (onda da arquitetura, Parte 1, corte
// 5); a semântica é a mesma, linha a linha. O SHELL do init fica na
// fachada: a ordem das etapas, os `stage()`, a disciplina do
// dispose-durante-carga (HMR) e os literais `expoM0: EXPO_M0` /
// `sigmaPx: SIGMA_PX` que os testes pinam POR TEXTO lá.
// ============================================================
import * as THREE from 'three';
import { Galaxy, buildGalaxy } from '../world/galaxy';
import type { GalaxyBuffers } from '../world/geradorDaGalaxia';
import type {
  PedidoDaGalaxia,
  RespostaDaGalaxia,
} from '../world/galaxiaEmWorker';
import { DUST_MAP_SIZE, DUST_MAP_HALF_EXTENT } from '../cartography/dustMap';
import type { bakeDustMap } from '../cartography/dustMap';
import type { bakeGalacticStructureMap } from '../cartography/structureMap';
import { TerraResolvida } from '../world/corpos/terra';
import { LuaResolvida } from '../world/corpos/lua';
import { ROCHOSOS, RochosoResolvido } from '../world/corpos/rochoso';
import { GIGANTES, GiganteResolvido } from '../world/corpos/gigante';
import type { QualityLevel } from '../core/engine';

/** o estado de gate/carga que o tick acompanha por corpo do palco */
export interface CorpoNoPalco<T> {
  corpo: T;
  emQuadroAntes: boolean;
  carregavaAntes: boolean;
  carregando: boolean;
  friaNoGate: boolean;
}

const corpoNoPalco = <T>(corpo: T): CorpoNoPalco<T> => ({
  corpo,
  emQuadroAntes: false,
  carregavaAntes: false,
  carregando: false,
  friaNoGate: false,
});

/** a semente da galáxia — um número, um dono (README: mulberry32) */
const SEMENTE_DA_GALAXIA = 20260730;

/**
 * A POPULAÇÃO FORA DA THREAD (Ajustes B do NORTE): buildGalaxy roda num
 * Worker para os ~3,3 s de CPU da população não congelarem o
 * carregamento — o "conserto DEFINITIVO" que o stage() do director
 * prometia. O contrato de igualdade é bit a bit: o worker executa o
 * MESMO buildGalaxy, com a MESMA semente e o `search` da página (os
 * knobs `?tune`/`warpamp` valem lá dentro — ver galaxiaEmWorker), e o
 * resultado volta por TRANSFERÊNCIA (os 122,7 MiB do cinema mudam de
 * dono, não de lugar).
 *
 * Os quatro campos de estrutura vão por CÓPIA (4 × 1 MiB): é o que
 * mantém o fallback inline sempre possível — worker que não sobe
 * (file://, CSP de embed) ou que morre no meio degrada para a conta na
 * thread, honesta e mais lenta, com os arrays intactos.
 */
function construirBuffersDaGalaxia(
  structure: PedidoDaGalaxia['structure'],
  populationScale: number
): Promise<GalaxyBuffers> {
  return new Promise((resolve) => {
    const inline = () =>
      resolve(buildGalaxy(SEMENTE_DA_GALAXIA, structure, populationScale));
    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../world/galaxiaEmWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch {
      inline();
      return;
    }
    worker.onmessage = (e: MessageEvent<RespostaDaGalaxia>) => {
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = () => {
      worker.terminate();
      inline();
    };
    worker.postMessage({
      seed: SEMENTE_DA_GALAXIA,
      structure,
      populationScale,
      search: window.location.search,
    } satisfies PedidoDaGalaxia);
  });
}

/**
 * A GALÁXIA do init: buildGalaxy com o campo de estrutura assado e a
 * população por tier (cinema semeia 4,02 M, performance 1,1 M —
 * decidido no build; a troca de tier em runtime é a fila C do NORTE, e
 * é para ela que o worker acima abre caminho).
 */
export async function montarGalaxia(
  structureBake: ReturnType<typeof bakeGalacticStructureMap>,
  dustBake: ReturnType<typeof bakeDustMap>,
  tier: QualityLevel
): Promise<Galaxy> {
  const buffers = await construirBuffersDaGalaxia(
    {
      gasResponse: structureBake.gasResponse,
      gasSupport: structureBake.gasSupport,
      youngResponse: structureBake.youngResponse,
      youngSupport: structureBake.youngSupport,
      size: DUST_MAP_SIZE,
      halfExtentPc: DUST_MAP_HALF_EXTENT,
    },
    tier === 'performance' ? 0.28 : 1
  );
  return new Galaxy(buffers, dustBake.texture, structureBake.texture);
}

/**
 * OS CORPOS DO PALCO (Onda 6): construtores baratos, sem geometria e
 * sem um byte de textura — a carga é preguiçosa por contrato (as
 * vistas oficiais não fazem fetch). O tier e o teto de textura
 * CONGELAM aqui, como a população da galáxia: a escada não reage a
 * auto-quality depois do init.
 */
export function montarCorposDoPalco(opts: {
  tier: QualityLevel;
  maxTextureSize: number | undefined;
  base: string;
}) {
  const { tier, maxTextureSize, base } = opts;
  const terra = new TerraResolvida({ tier, maxTextureSize, base });
  const lua = new LuaResolvida({ tier, maxTextureSize, base });
  const rochosos = ROCHOSOS.map((config) =>
    corpoNoPalco(new RochosoResolvido({ config, tier, maxTextureSize, base }))
  );
  const gigantes = GIGANTES.map(({ id }) =>
    corpoNoPalco(new GiganteResolvido({ id, tier, maxTextureSize, base }))
  );
  return { terra, lua, rochosos, gigantes };
}

/**
 * A CENA DESCARTÁVEL do aquecimento de shaders. Os quads de pós
 * (nebulosa, BH) não estão na cena real — entram por aqui. A chave de
 * programa inclui a PRESENÇA do atributo normal (vertexNormals): o
 * quad da nebulosa é PlaneGeometry (tem normal), o FullScreenQuad do
 * BH é um triângulo só com position+uv — cada material compila contra
 * a geometria que vai usá-lo. Devolve a cena e o que o shell precisa
 * DESCARTAR no finally (o try/finally e o `this.warmup` que o dispose
 * espera ficam na fachada — são disciplina do teardown dela).
 */
export function montarCenaDeAquecimento(materiais: {
  comNormal: readonly THREE.Material[];
  semNormal: readonly THREE.Material[];
}) {
  const warm = new THREE.Scene();
  const warmGeo = new THREE.PlaneGeometry(2, 2);
  const warmGeoBH = new THREE.PlaneGeometry(2, 2);
  warmGeoBH.deleteAttribute('normal');
  for (const m of materiais.comNormal) {
    warm.add(new THREE.Mesh(warmGeo, m));
  }
  for (const m of materiais.semNormal) {
    warm.add(new THREE.Mesh(warmGeoBH, m));
  }
  const warmRt = new THREE.WebGLRenderTarget(2, 2);
  const descartar = () => {
    warmRt.dispose();
    warmGeo.dispose();
    warmGeoBH.dispose();
  };
  return { warm, warmRt, descartar };
}
