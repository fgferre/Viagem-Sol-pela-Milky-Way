// ============================================================
// OS HELPERS DO CARREGAMENTO — as construções do init que RETORNAM
// objetos. Moravam no director.ts (onda da arquitetura, Parte 1, corte
// 5); a semântica é a mesma, linha a linha. O SHELL do init fica na
// fachada: a ordem das etapas, os `stage()`, a disciplina do
// dispose-durante-carga (HMR) e os literais `expoM0: EXPO_M0` /
// `sigmaPx: SIGMA_PX` que os testes pinam POR TEXTO lá.
// ============================================================
import * as THREE from 'three';
import { Galaxy } from '../world/galaxy';
import { assarCarga } from '../world/cadeiaDaCarga';
import type {
  CargaAssada,
  EtapaDaCadeia,
} from '../world/cadeiaDaCarga';
import type {
  PedidoDaCarga,
  RespostaDaCarga,
} from '../world/cargaEmWorker';
import { DUST_MAP_SIZE } from '../cartography/dustMap';
import type { GalacticAssets } from '../cartography/galacticAssets';
import { TerraResolvida } from '../world/corpos/terra';
import { LuaResolvida } from '../world/corpos/lua';
import { ROCHOSOS, RochosoResolvido } from '../world/corpos/rochoso';
import { GIGANTES, GiganteResolvido } from '../world/corpos/gigante';
import { LUA_PC, TERRA_PC } from '../cinematic/journey';
import type { AtorDoPalco, PostoNoPalco } from './palco';
import type { QualityLevel } from '../core/engine';

/**
 * O POSTO de um corpo no palco — os quatro traços que o distinguem no
 * laço e as digitais do quadro anterior. O contrato mora em
 * `director/palco.ts`, ao lado do laço que os consome; aqui só se
 * MONTA. `CorpoNoPalco` continua sendo o nome do tipo para quem só
 * precisa do par `{ corpo }` (a escada).
 */
export type CorpoNoPalco<T extends AtorDoPalco> = PostoNoPalco<T>;

function corpoNoPalco<T extends AtorDoPalco>(
  corpo: T,
  id: string,
  tracos: {
    pinoNoFilme?: THREE.Vector3;
    temPonto: boolean;
    temRetrato: boolean;
    rotuloDeLua: boolean;
  }
): PostoNoPalco<T> {
  return {
    corpo,
    id,
    pinoNoFilme: tracos.pinoNoFilme ?? null,
    temPonto: tracos.temPonto,
    temRetrato: tracos.temRetrato,
    rotuloDeLua: tracos.rotuloDeLua,
    emQuadroAntes: false,
    carregavaAntes: false,
    carregando: false,
    friaNoGate: false,
  };
}

/** a semente da galáxia — um número, um dono (README: mulberry32) */
const SEMENTE_DA_GALAXIA = 20260730;

/**
 * A CARGA PESADA FORA DA THREAD (Ajustes B do NORTE): a cadeia inteira
 * — bake da poeira, campo acoplado e população — roda num Worker, para
 * os ~1,6 s dos dois mapas mais os ~3,3 s da população não congelarem o
 * carregamento. É o "conserto DEFINITIVO" que o stage() do director
 * prometia, agora pelas três etapas e não só pela última.
 *
 * O contrato de igualdade é bit a bit POR CONSTRUÇÃO: os dois lados
 * chamam a MESMA `assarCarga`, com a mesma entrada e o `search` da
 * página (os knobs `?tune`/`warpamp` valem lá dentro — ver
 * cargaEmWorker). O resultado volta por TRANSFERÊNCIA (os 122,7 MiB do
 * cinema e os dois RGBA de 1 MiB mudam de dono, não de lugar).
 *
 * Os catálogos vão por CÓPIA (~9,7 MiB de Float32): é o que mantém o
 * fallback inline sempre possível — worker que não sobe (file://, CSP
 * de embed) ou que morre no meio degrada para a conta na thread,
 * honesta e mais lenta — e o que deixa o palco (nuvens observadas,
 * forjas, nuvens-semente) com os MESMOS arrays intactos depois.
 */
function assarCargaEmWorker(
  pedido: PedidoDaCarga,
  aoAvancar: (etapa: EtapaDaCadeia) => void
): Promise<CargaAssada> {
  return new Promise((resolve) => {
    // sem worker a thread congela como sempre congelou; o fôlego do
    // `setTimeout(0)` entre etapas é o mesmo que o `stage()` dá, para o
    // rótulo pintar antes do bloqueio seguinte
    const inline = () =>
      resolve(
        assarCarga(pedido, async (etapa) => {
          aoAvancar(etapa);
          await new Promise<void>((r) => setTimeout(r, 0));
        })
      );
    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../world/cargaEmWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch {
      inline();
      return;
    }
    worker.onmessage = (e: MessageEvent<RespostaDaCarga>) => {
      if ('etapa' in e.data) {
        aoAvancar(e.data.etapa);
        return;
      }
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = () => {
      worker.terminate();
      inline();
    };
    worker.postMessage(pedido);
  });
}

/**
 * Os dois mapas cartográficos viram textura AQUI, e não dentro dos
 * bakes: os bakes são CPU pura para poderem rodar no worker, e quem tem
 * GPU é a thread. Os dois copiavam o MESMO bloco de sete linhas —
 * mipmaps inclusive, sem os quais a minificação do mapa (vistas
 * afastadas e a LUT da faixa) cintila; o custo é 1/3 de memória extra,
 * uma vez.
 */
function texturaDoMapa(pixels: Uint8Array): THREE.DataTexture {
  const textura = new THREE.DataTexture(
    pixels,
    DUST_MAP_SIZE,
    DUST_MAP_SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  textura.minFilter = THREE.LinearMipmapLinearFilter;
  textura.magFilter = THREE.LinearFilter;
  textura.generateMipmaps = true;
  textura.wrapS = THREE.ClampToEdgeWrapping;
  textura.wrapT = THREE.ClampToEdgeWrapping;
  textura.needsUpdate = true;
  return textura;
}

/** o que a carga entrega ao init: a galáxia, os dois mapas e as coberturas */
export interface CargaDoMundo {
  galaxy: Galaxy;
  dustMapTexture: THREE.DataTexture;
  structureMapTexture: THREE.DataTexture;
  coberturaDaPoeira: number;
  coberturaDeGas: number;
  coberturaDeJovens: number;
}

/**
 * DESCARTA uma carga que não vai virar mundo — o `dispose()` dos três
 * objetos de GPU que ela criou. Dois caminhos precisam dele e por isso
 * ele tem nome: o `dispose()` do Director caindo dentro do `await` do
 * init, e a troca de tier CANCELADA (o visitante clicou noutro tier
 * enquanto o mundo assava). Quem esquecer um deles deixa 122,7 MiB de
 * partículas e dois RGBA na placa sem dono.
 */
export function descartarCarga(carga: CargaDoMundo) {
  carga.galaxy.dispose();
  carga.dustMapTexture.dispose();
  carga.structureMapTexture.dispose();
}

/**
 * A CARGA do init E da troca de tier viva (Ajustes C): os dois mapas
 * assados e a população por tier (cinema semeia 4,02 M, performance
 * 1,1 M). `catalogos` já chega decidido pelo `?cart` da página: o knob
 * que decide alocação lê-se ANTES de quem aloca — e é a MESMA regra que
 * faz o `tier` ser parâmetro daqui em vez de leitura do engine lá
 * dentro: quem troca de tier ao vivo pede o mundo NOVO por este mesmo
 * caminho, com o mundo velho ainda desenhando, e a única diferença
 * entre os dois é o número que entra aqui.
 */
export async function montarCarga(opts: {
  catalogos: GalacticAssets | null;
  tier: QualityLevel;
  aoAvancar: (etapa: EtapaDaCadeia) => void;
}): Promise<CargaDoMundo> {
  const { catalogos, tier, aoAvancar } = opts;
  const carga = await assarCargaEmWorker(
    {
      seed: SEMENTE_DA_GALAXIA,
      catalogos,
      populationScale: tier === 'performance' ? 0.28 : 1,
      search: window.location.search,
    },
    aoAvancar
  );
  const dustMapTexture = texturaDoMapa(carga.poeira);
  const structureMapTexture = texturaDoMapa(carga.estrutura);
  return {
    galaxy: new Galaxy(carga, dustMapTexture, structureMapTexture),
    dustMapTexture,
    structureMapTexture,
    coberturaDaPoeira: carga.coberturaDaPoeira,
    coberturaDeGas: carga.coberturaDeGas,
    coberturaDeJovens: carga.coberturaDeJovens,
  };
}

/**
 * OS CORPOS DO PALCO (Onda 6): construtores baratos, sem geometria e
 * sem um byte de textura — a carga é preguiçosa por contrato (as
 * vistas oficiais não fazem fetch).
 *
 * O TETO DE TEXTURA congela aqui (é do aparelho, não muda). O TIER não:
 * ele entra como FUNÇÃO e é lido no instante da carga (Ajustes C). Até
 * 2026-08-20 congelava junto, e a troca de tier viva não alcançava
 * corpo nenhum; reconstruí-los para alcançar tirava o globo da tela por
 * ~2 s (o tempo da textura nova) — o véu que a letra C proíbe. Quem já
 * carregou guarda os pixels que tem; quem carregar depois obedece ao
 * tier de agora — inclusive quando quem acabou de trocá-lo foi o Auto
 * do seletor (o antigo auto-quality do engine morreu na letra D).
 */
export function montarCorposDoPalco(opts: {
  tier: () => QualityLevel;
  maxTextureSize: number | undefined;
  base: string;
}) {
  const { tier, maxTextureSize, base } = opts;
  // A TERRA e a LUA têm o PINO DAS 16:00 do filme (`TERRA_PC`/`LUA_PC`,
  // journey.ts): sem ele a coda mira um globo a 1,7 milhão de km. A Lua
  // é a única do quarteto sem ponto fotométrico na camada
  // (`IDS_FOTOMETRIA` não a conhece) e sem retrato congelado — sem
  // efeméride ela simplesmente não existe, e é isso que o fallback frio
  // precisa saber para não segurar a captura para sempre.
  const terra = corpoNoPalco(new TerraResolvida({ tier, maxTextureSize, base }), 'earth', {
    pinoNoFilme: TERRA_PC,
    temPonto: true,
    temRetrato: true,
    rotuloDeLua: false,
  });
  const lua = corpoNoPalco(new LuaResolvida({ tier, maxTextureSize, base }), 'moon', {
    pinoNoFilme: LUA_PC,
    temPonto: false,
    temRetrato: false,
    rotuloDeLua: true,
  });
  const rochosos = ROCHOSOS.map((config) => {
    const corpo = new RochosoResolvido({ config, tier, maxTextureSize, base });
    return corpoNoPalco(corpo, corpo.id, {
      // planeta cai no retrato e tem ponto; lua rochosa (Fobos, Io…)
      // não tem nem um nem outro, e é ela que ganha rótulo próprio
      temPonto: corpo.planeta,
      temRetrato: corpo.planeta,
      rotuloDeLua: !corpo.planeta,
    });
  });
  const gigantes = GIGANTES.map(({ id }) =>
    corpoNoPalco(new GiganteResolvido({ id, tier, maxTextureSize, base }), id, {
      temPonto: true,
      temRetrato: true,
      rotuloDeLua: false,
    })
  );
  // A LISTA ÚNICA do tick, na ORDEM de sempre — Terra, Lua, rochosos,
  // gigantes. Os mesmos objetos das listas acima: uma lista, duas
  // leituras (o laço do palco lê todas; a escada lê rochosos/gigantes).
  const noPalco: PostoNoPalco[] = [terra, lua, ...rochosos, ...gigantes];
  return { terra, lua, rochosos, gigantes, noPalco };
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
