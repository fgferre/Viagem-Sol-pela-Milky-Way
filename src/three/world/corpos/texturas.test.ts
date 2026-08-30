// Serve: chão — os três furos das quatro cópias antigas (canal solto, anel sem mapa, manifest repetido) não voltam
// ============================================================
// O PIPELINE ÚNICO DE TEXTURAS — os três furos que quatro cópias
// tinham, cada um com o seu oráculo e um fetch FALSO (nada de rede).
//
// Estes testes existem porque o defeito das quatro cópias não era o
// código repetido: era que cada cópia repetia o que era igual e
// divergia no que importava. O que se cobra aqui é a TRANSAÇÃO — se a
// carga não pode ser publicada inteira, nenhum texel fica residente — e
// o pedido ÚNICO do manifest.
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ALVO_DE_APOIO_CINEMA,
  CANAL_MAP,
  alvoDePixels,
  buscarManifestUmaVez,
  carregarCanaisDoCorpo,
  escolherVariante,
} from './texturas';
import type { CanalPedido, ManifestDeTexturas, OpcoesDeTextura } from './texturas';

const DATA_DIR = fileURLToPath(new URL('../../../../public/data/atlas/', import.meta.url));
const MANIFEST = JSON.parse(
  readFileSync(join(DATA_DIR, 'texturas.json'), 'utf8')
) as ManifestDeTexturas;

/** uma textura que CONTA o próprio descarte — o three dispara o evento
 *  'dispose' de dentro de `Texture.dispose()`, então a contagem é a do
 *  three e não uma imitação nossa. */
function texturaContada(descartadas: string[], nome: string): THREE.Texture {
  const t = new THREE.Texture();
  t.addEventListener('dispose', () => descartadas.push(nome));
  return t;
}

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

const nunca = () => false;

// ------------------------------------------------------------
// FURO (a): um canal que cai não pode abandonar os outros
// ------------------------------------------------------------

describe('furo (a): a carga é TRANSAÇÃO — cai um canal, não sobra nenhum', () => {
  const CINCO: readonly CanalPedido[] = [
    { canal: 'map', cor: true, repetirEmU: true },
    { canal: 'night', cor: true, repetirEmU: true },
    { canal: 'clouds', cor: true, repetirEmU: true },
    { canal: 'normal', cor: false, repetirEmU: true },
    { canal: 'roughness', cor: false, repetirEmU: true },
  ];

  /** o `night` cai; os outros quatro chegam — e o `night` cai DEPOIS,
   *  que é o caso em que o `Promise.all` antigo já tinha ido embora. */
  function opcoesComUmCanalQueCai(descartadas: string[]): OpcoesDeTextura {
    return {
      tier: () => 'cinema',
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async () => MANIFEST,
      carregarTextura: async (url) => {
        if (url.includes('/night')) throw new Error('HTTP 500');
        await flush();
        return texturaContada(descartadas, url);
      },
    };
  }

  it('os quatro que chegaram são DESCARTADOS, não abandonados', async () => {
    const descartadas: string[] = [];
    await expect(
      carregarCanaisDoCorpo('earth', CINCO, opcoesComUmCanalQueCai(descartadas), nunca)
    ).rejects.toThrow();
    // 5 canais, 1 caiu: os 4 que baixaram têm de ter sido descartados.
    // Com `Promise.all` este número era ZERO — a espera terminava no
    // primeiro erro e os outros quatro terminavam para lugar nenhum.
    expect(descartadas).toHaveLength(4);
  });

  it('três tentativas não deixam 12 imagens penduradas', async () => {
    const descartadas: string[] = [];
    const opcoes = opcoesComUmCanalQueCai(descartadas);
    for (let i = 0; i < 3; i++) {
      await carregarCanaisDoCorpo('earth', CINCO, opcoes, nunca).catch(() => undefined);
    }
    expect(descartadas).toHaveLength(12);
  });

  it('canal SEM variante no manifest também descarta o lote', async () => {
    const descartadas: string[] = [];
    const comCanalInexistente: readonly CanalPedido[] = [
      CANAL_MAP,
      { canal: 'canal-que-nao-existe', cor: true, repetirEmU: true },
    ];
    await expect(
      carregarCanaisDoCorpo('mars', comCanalInexistente, {
        tier: () => 'cinema',
        maxTextureSize: 16384,
        base: '',
        webp: true,
        buscarManifest: async () => MANIFEST,
        carregarTextura: async (url) => texturaContada(descartadas, url),
      }, nunca)
    ).rejects.toThrow(/sem variante/);
    expect(descartadas).toHaveLength(1);
  });

  it('cancelada no caminho: devolve null e descarta TUDO', async () => {
    const descartadas: string[] = [];
    const fora = await carregarCanaisDoCorpo(
      'earth',
      CINCO,
      {
        tier: () => 'cinema',
        maxTextureSize: 16384,
        base: '',
        webp: true,
        buscarManifest: async () => MANIFEST,
        carregarTextura: async (url) => texturaContada(descartadas, url),
      },
      () => true
    );
    expect(fora).toBeNull();
    expect(descartadas).toHaveLength(5);
  });
});

// ------------------------------------------------------------
// FURO (b): Saturno publicava o mapa antes de ter o anel
// ------------------------------------------------------------

describe('furo (b): o anel de Saturno é do MESMO lote que o mapa', () => {
  const SATURNO: readonly CanalPedido[] = [
    CANAL_MAP,
    { canal: 'ring', cor: true, repetirEmU: false },
  ];

  it('anel que cai leva o mapa junto — nenhum texel residente', async () => {
    const descartadas: string[] = [];
    const opcoes: OpcoesDeTextura = {
      tier: () => 'cinema',
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async () => MANIFEST,
      carregarTextura: async (url) => {
        if (url.includes('/ring')) throw new Error('HTTP 404');
        return texturaContada(descartadas, url);
      },
    };
    // três tentativas, como manda RECARGAS_ATE_DESISTIR. Antes, cada
    // uma deixava um `map` de Saturno residente (42,7 MiB em cinema) e
    // o planeta nunca aparecia.
    for (let i = 0; i < 3; i++) {
      await carregarCanaisDoCorpo('saturn', SATURNO, opcoes, nunca).catch(() => undefined);
    }
    expect(descartadas).toHaveLength(3);
  });

  it('o anel mantém a dose de assunto (8k em cinema), não a de apoio', () => {
    // não é dose nova: `gigante.ts` já pedia o anel com o alvo do 'map'.
    // O que mudou é que agora está escrito onde a dose se decide.
    expect(alvoDePixels('cinema', 'ring', 16384)).toBe(8192);
    expect(alvoDePixels('cinema', 'clouds', 16384)).toBe(ALVO_DE_APOIO_CINEMA);
    expect(
      escolherVariante(MANIFEST.entradas, 'saturn', 'ring', 8192, true)?.larguraPx
    ).toBe(8192);
  });

  it('o anel NÃO repete em U — a placa é radial, não equiretangular', async () => {
    const lote = await carregarCanaisDoCorpo(
      'saturn',
      SATURNO,
      {
        tier: () => 'cinema',
        maxTextureSize: 16384,
        base: '',
        webp: true,
        buscarManifest: async () => MANIFEST,
        carregarTextura: async () => new THREE.Texture(),
      },
      nunca
    );
    expect(lote?.get('map')!.wrapS).toBe(THREE.RepeatWrapping);
    expect(lote?.get('ring')!.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(lote?.get('ring')!.wrapT).toBe(THREE.ClampToEdgeWrapping);
  });
});

// ------------------------------------------------------------
// FURO (c): 33 pedidos do MESMO arquivo de 3,44 MiB
// ------------------------------------------------------------

describe('furo (c): o manifest desce UMA vez', () => {
  function opcoesQueContam() {
    const pedidos: string[] = [];
    const opcoes: OpcoesDeTextura = {
      tier: () => 'cinema',
      maxTextureSize: 16384,
      base: '',
      webp: true,
      buscarManifest: async (url) => {
        pedidos.push(url);
        await flush();
        return MANIFEST;
      },
      carregarTextura: async () => new THREE.Texture(),
    };
    return { pedidos, opcoes };
  }

  it('treze corpos ao mesmo tempo, um pedido só', async () => {
    const { pedidos, opcoes } = opcoesQueContam();
    const corpos = [
      'earth', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
      'saturn', 'uranus', 'neptune', 'io', 'europa', 'titan', 'phobos',
    ];
    await Promise.all(
      corpos.map((c) => carregarCanaisDoCorpo(c, [CANAL_MAP], opcoes, nunca))
    );
    expect(pedidos).toEqual(['data/atlas/texturas.json']);
  });

  it('e nas cargas seguintes também — a promessa fica em cache', async () => {
    const { pedidos, opcoes } = opcoesQueContam();
    await carregarCanaisDoCorpo('mars', [CANAL_MAP], opcoes, nunca);
    await carregarCanaisDoCorpo('venus', [CANAL_MAP], opcoes, nunca);
    expect(pedidos).toHaveLength(1);
  });

  it('cada buscador tem o SEU cache — dois testes nunca se leem', async () => {
    const a = opcoesQueContam();
    const b = opcoesQueContam();
    await carregarCanaisDoCorpo('mars', [CANAL_MAP], a.opcoes, nunca);
    await carregarCanaisDoCorpo('mars', [CANAL_MAP], b.opcoes, nunca);
    expect(a.pedidos).toHaveLength(1);
    expect(b.pedidos).toHaveLength(1);
  });

  it('manifest que FALHA não fica no cache — a recarga contada tem de tentar', async () => {
    const pedidos: string[] = [];
    let caindo = true;
    const buscar = async (url: string) => {
      pedidos.push(url);
      if (caindo) throw new Error('HTTP 500');
      return MANIFEST;
    };
    await expect(buscarManifestUmaVez(buscar, 'x.json')).rejects.toThrow();
    caindo = false;
    await expect(buscarManifestUmaVez(buscar, 'x.json')).resolves.toBe(MANIFEST);
    expect(pedidos).toHaveLength(2);
  });
});
