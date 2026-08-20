// ============================================================
// A CADEIA DA CARGA — os três assados pesados do init num lugar só, na
// ordem em que se alimentam: poeira → estrutura → população. É CPU
// PURA: nada aqui toca WebGL (os mapas voltam como RGBA cru, e quem
// tem GPU é quem os veste de textura), e é isso que deixa a MESMA
// função rodar dentro do worker (`cargaEmWorker`) e no fallback da
// thread (`assarCargaEmWorker`, director/carregamento.ts). A igualdade
// bit a bit entre os dois caminhos não é revisão: é construção.
//
// A ordem não é arranjo — é dependência. O bake da poeira entrega
// `density`/`coverage` (APOGEE) e a crista `arms`, que o campo acoplado
// consome em vez de recalcular; o campo acoplado entrega os quatro
// canais de resposta/suporte, que a população lê para semear os braços.
// ============================================================
import {
  bakeDustMap,
  DUST_MAP_SIZE,
  DUST_MAP_HALF_EXTENT,
} from '../cartography/dustMap';
import { bakeGalacticStructureMap } from '../cartography/structureMap';
import type { GalacticAssets } from '../cartography/galacticAssets';
import { buildGalaxy } from './geradorDaGalaxia';

/** as etapas do loader que a cadeia atravessa DEPOIS de começar */
export type EtapaDaCadeia = 'structure' | 'galaxy';

export interface EntradaDaCarga {
  /** a semente da galáxia — um número, um dono (README: mulberry32) */
  seed: number;
  /** os catálogos observacionais JÁ decididos pelo `?cart` da página:
   *  `null` é cena 100% procedural. O knob que decide alocação lê-se
   *  ANTES de quem aloca — aqui só chega a decisão tomada. */
  catalogos: GalacticAssets | null;
  populationScale: number;
}

export interface CargaAssada {
  /** RGBA 512² do mapa de poeira (dustMap.ts descreve os canais) */
  poeira: Uint8Array;
  coberturaDaPoeira: number;
  /** RGBA 512² do campo acoplado (structureMap.ts descreve os canais) */
  estrutura: Uint8Array;
  coberturaDeGas: number;
  coberturaDeJovens: number;
  /** stride 8: x,y,z,r,g,b,size,alpha — o contrato de `GalaxyBuffers` */
  bright: Float32Array;
  brightCount: number;
}

/**
 * `aoAvancar` recebe a etapa que VAI começar agora, e é esperado: no
 * worker ele só publica o rótulo (o await vira um microtask), e no
 * fallback inline ele é quem devolve o fôlego do `setTimeout(0)` que o
 * `stage()` do director dava entre um bloqueio e o seguinte — sem
 * worker a thread congela como sempre congelou, mas o rótulo pinta.
 */
export async function assarCarga(
  { seed, catalogos, populationScale }: EntradaDaCarga,
  aoAvancar: (etapa: EtapaDaCadeia) => void | Promise<void>
): Promise<CargaAssada> {
  const poeira = bakeDustMap(catalogos ? catalogos.dustDensity : null);
  await aoAvancar('structure');
  const estrutura = bakeGalacticStructureMap(
    catalogos,
    poeira.density,
    poeira.coverage,
    poeira.arms
  );
  await aoAvancar('galaxy');
  const populacao = buildGalaxy(
    seed,
    {
      gasResponse: estrutura.gasResponse,
      gasSupport: estrutura.gasSupport,
      youngResponse: estrutura.youngResponse,
      youngSupport: estrutura.youngSupport,
      size: DUST_MAP_SIZE,
      halfExtentPc: DUST_MAP_HALF_EXTENT,
    },
    populationScale
  );
  return {
    poeira: poeira.pixels,
    coberturaDaPoeira: poeira.coverageFraction,
    estrutura: estrutura.pixels,
    coberturaDeGas: estrutura.gasCoverageFraction,
    coberturaDeJovens: estrutura.youngCoverageFraction,
    bright: populacao.bright,
    brightCount: populacao.brightCount,
  };
}
