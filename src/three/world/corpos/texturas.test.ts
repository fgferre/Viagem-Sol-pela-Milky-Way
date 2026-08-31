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
  RECARGAS_ATE_DESISTIR,
  TexturasDoCorpo,
  alvoDePixels,
  buscarManifestUmaVez,
  carregarCanaisDoCorpo,
  escolherVariante,
} from './texturas';
import type { CanalPedido, ManifestDeTexturas, OpcoesDeTextura } from './texturas';
import type { QualityLevel } from '../../core/engine';

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
      carregarCanaisDoCorpo('earth', CINCO, opcoesComUmCanalQueCai(descartadas), 'cinema', nunca)
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
      await carregarCanaisDoCorpo('earth', CINCO, opcoes, 'cinema', nunca).catch(() => undefined);
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
      }, 'cinema', nunca)
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
      'cinema',
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
      await carregarCanaisDoCorpo('saturn', SATURNO, opcoes, 'cinema', nunca).catch(() => undefined);
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
      'cinema',
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
      corpos.map((c) => carregarCanaisDoCorpo(c, [CANAL_MAP], opcoes, 'cinema', nunca))
    );
    expect(pedidos).toEqual(['data/atlas/texturas.json']);
  });

  it('e nas cargas seguintes também — a promessa fica em cache', async () => {
    const { pedidos, opcoes } = opcoesQueContam();
    await carregarCanaisDoCorpo('mars', [CANAL_MAP], opcoes, 'cinema', nunca);
    await carregarCanaisDoCorpo('venus', [CANAL_MAP], opcoes, 'cinema', nunca);
    expect(pedidos).toHaveLength(1);
  });

  it('cada buscador tem o SEU cache — dois testes nunca se leem', async () => {
    const a = opcoesQueContam();
    const b = opcoesQueContam();
    await carregarCanaisDoCorpo('mars', [CANAL_MAP], a.opcoes, 'cinema', nunca);
    await carregarCanaisDoCorpo('mars', [CANAL_MAP], b.opcoes, 'cinema', nunca);
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

// ------------------------------------------------------------
// O DOUBLE-BUFFER DA TROCA DE TIER (item 59)
// ------------------------------------------------------------

/**
 * A bancada da troca: o `carregarTextura` NÃO resolve sozinho — cada
 * pedido fica pendurado até `entregar()`. É o que deixa o teste olhar o
 * corpo COM um lote em voo, que é o instante inteiro do item 59: o
 * visitante trocou de qualidade e o globo tem de continuar na tela.
 */
function bancadaDaTroca(tierInicial: QualityLevel = 'alta') {
  let tier = tierInicial;
  const pedidos: string[] = [];
  const descartadas: string[] = [];
  const publicados: string[][] = [];
  let pendentes: (() => void)[] = [];
  let caindo = false;
  const rede: OpcoesDeTextura = {
    tier: () => tier,
    maxTextureSize: 16384,
    base: '',
    webp: true,
    buscarManifest: async () => MANIFEST,
    carregarTextura: (url) =>
      new Promise((resolver, rejeitar) => {
        pedidos.push(url);
        pendentes.push(() =>
          caindo ? rejeitar(new Error('HTTP 500')) : resolver(texturaContada(descartadas, url))
        );
      }),
  };
  const casa = new TexturasDoCorpo({
    corpo: 'earth',
    canais: [CANAL_MAP],
    rede,
    etiqueta: 'terra',
    oQueNaoNasce: 'o globo não nasce nesta sessão',
    publicar: (porCanal) => publicados.push([...porCanal.keys()]),
  });
  return {
    casa,
    pedidos,
    descartadas,
    publicados,
    escolher: (t: QualityLevel) => {
      tier = t;
    },
    derrubarARede: (v: boolean) => {
      caindo = v;
    },
    /** deixa o manifest e os `then` andarem, SEM entregar imagem
     *  nenhuma — é assim que o teste fica com o lote em voo na mão */
    respirar: flush,
    /** entrega os lotes pendurados e roda os microtasks */
    entregar: async () => {
      await flush();
      const agora = pendentes;
      pendentes = [];
      for (const f of agora) f();
      await flush();
    },
  };
}

/** a variante que o manifest REAL dá para o `map` da Terra num tier. */
const mapaDaTerraEm = (tier: QualityLevel) =>
  escolherVariante(
    MANIFEST.entradas,
    'earth',
    'map',
    alvoDePixels(tier, 'map', 16384),
    true
  )!.arquivo;

describe('o double-buffer por corpo: trocar de tier não tira o globo da tela', () => {
  it('carregado em alta, o pedido de cinema nasce em SEGUNDO PLANO', async () => {
    const b = bancadaDaTroca('alta');
    b.casa.aoTick(true);
    await b.entregar();
    expect(b.casa.pronta).toBe(true);
    expect(b.casa.tierNaTela).toBe('alta');
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta')]);

    // o visitante escolhe Cinema: o tick seguinte PEDE, porque o
    // gatilho continua armado — o corpo está NA TELA, e é por isso que
    // ele precisa dos pixels certos
    b.escolher('cinema');
    b.casa.aoTick(true);
    await b.respirar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta'), mapaDaTerraEm('cinema')]);

    // ---- COM O LOTE EM VOO: o globo continua na tela ----------------
    // é o critério inteiro do item 59. `pronta` é o que faz `emQuadro`
    // nos quatro corpos; se ele caísse aqui, a Terra viraria ponto.
    for (let i = 0; i < 5; i++) {
      b.casa.aoTick(true);
      expect(b.casa.pronta, `tick ${i} sem globo`).toBe(true);
    }
    // e o ponteiro NÃO trocou: quem desenha ainda é o mapa de alta
    expect(b.publicados).toHaveLength(1);
    expect(b.casa.tierNaTela).toBe('alta');
    // a carga em voo se declara — o `captura` do Director espera por ela
    expect(b.casa.carregando).toBe(true);
    // e cinco ticks com o mesmo tier não abrem cinco pedidos
    expect(b.pedidos).toHaveLength(2);

    // ---- o lote chega: a troca é de UM passo ------------------------
    await b.entregar();
    expect(b.publicados).toHaveLength(2);
    expect(b.casa.tierNaTela).toBe('cinema');
    expect(b.casa.carregando).toBe(false);
    expect(b.casa.pronta).toBe(true);
    // e os texels velhos foram devolvidos — trocar de tier não pode
    // empilhar um mapa de 42,7 MiB por clique
    expect(b.descartadas).toEqual([mapaDaTerraEm('alta')]);
  });

  it('o caminho de volta também: cinema → performance', async () => {
    const b = bancadaDaTroca('cinema');
    b.casa.aoTick(true);
    await b.entregar();
    b.escolher('performance');
    b.casa.aoTick(true);
    expect(b.casa.pronta).toBe(true);
    await b.entregar();
    expect(b.casa.tierNaTela).toBe('performance');
    expect(b.pedidos).toEqual([mapaDaTerraEm('cinema'), mapaDaTerraEm('performance')]);
    expect(b.descartadas).toEqual([mapaDaTerraEm('cinema')]);
  });

  it('três tiers seguidos: só o ÚLTIMO vira pixel, o do meio é descartado', async () => {
    const b = bancadaDaTroca('alta');
    b.casa.aoTick(true);
    await b.entregar();
    // clique 1: cinema (fica em voo)
    b.escolher('cinema');
    b.casa.aoTick(true);
    await b.respirar();
    // clique 2: performance ANTES de o de cinema chegar
    b.escolher('performance');
    b.casa.aoTick(true);
    await b.respirar();
    expect(b.pedidos).toHaveLength(3);
    // os dois chegam juntos; a GERAÇÃO é quem decide qual vale
    await b.entregar();
    expect(b.publicados).toHaveLength(2);
    expect(b.casa.tierNaTela).toBe('performance');
    // o lote de cinema não ficou pendurado: veio e foi descartado, com
    // o de alta que saiu da tela
    expect(b.descartadas.sort()).toEqual(
      [mapaDaTerraEm('alta'), mapaDaTerraEm('cinema')].sort()
    );
  });

  it('voltar ao tier que JÁ está na tela CANCELA, não abre pedido novo', async () => {
    const b = bancadaDaTroca('alta');
    b.casa.aoTick(true);
    await b.entregar();
    b.escolher('cinema');
    b.casa.aoTick(true);
    await b.respirar();
    b.escolher('alta'); // arrependeu-se antes de o lote chegar
    // e SEM gatilho: cancelar não toca a rede, então o corpo que saiu
    // da tela no meio do arrependimento também larga o lote em voo
    b.casa.aoTick(false);
    // nada a buscar: o mapa de alta nunca saiu da tela
    expect(b.pedidos).toHaveLength(2);
    expect(b.casa.carregando).toBe(false);
    await b.entregar();
    // o lote de cinema chegou depois do arrependimento: descartado, e o
    // mapa de alta que está na tela continua sendo o mesmo objeto
    expect(b.casa.tierNaTela).toBe('alta');
    expect(b.publicados).toHaveLength(1);
    expect(b.descartadas).toEqual([mapaDaTerraEm('cinema')]);
  });

  it('o corpo descartado no meio da troca não deixa texel sem dono', async () => {
    const b = bancadaDaTroca('alta');
    b.casa.aoTick(true);
    await b.entregar();
    b.escolher('cinema');
    b.casa.aoTick(true);
    await b.respirar();
    b.casa.dispose(); // o Director morre com o lote no ar
    await b.entregar();
    // o que estava na tela E o que chegou depois: os dois devolvidos
    expect(b.descartadas.sort()).toEqual(
      [mapaDaTerraEm('alta'), mapaDaTerraEm('cinema')].sort()
    );
    expect(b.publicados).toHaveLength(1);
  });

  it('a troca que CAI deixa o globo no tier de antes, e desiste com aviso', async () => {
    const b = bancadaDaTroca('alta');
    b.casa.aoTick(true);
    await b.entregar();
    b.derrubarARede(true);
    b.escolher('cinema');
    const avisos: string[] = [];
    const warn = console.warn;
    console.warn = (m: string) => avisos.push(m);
    try {
      // 1 carga + RECARGAS_ATE_DESISTIR recargas, como na primeira vez
      for (let i = 0; i < 1 + RECARGAS_ATE_DESISTIR; i++) {
        b.casa.aoTick(true);
        await b.entregar();
        // a cada queda o globo CONTINUA na tela, com os pixels de alta
        expect(b.casa.pronta).toBe(true);
        expect(b.casa.tierNaTela).toBe('alta');
      }
    } finally {
      console.warn = warn;
    }
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('[terra]');
    expect(avisos[0]).toContain("segue no tier 'alta'");
    // e depois de desistir ele PARA de pedir — 60 pedidos por segundo
    // contra uma rede que já disse não três vezes é o defeito, não a cura
    const antes = b.pedidos.length;
    for (let i = 0; i < 5; i++) b.casa.aoTick(true);
    expect(b.pedidos).toHaveLength(antes);
  });

  it('FORA DA TELA a troca não nasce; e nasce no tick em que o corpo VOLTA', async () => {
    const b = bancadaDaTroca('alta');
    b.casa.aoTick(true); // visitado: o gatilho armou e o lote de alta desceu
    await b.entregar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta')]);

    // o visitante foi embora (gate desarmado, o Atlas focando outro
    // corpo) e mexe no seletor. É o estado dos 38 corpos do palco:
    // 'pronta' quer dizer "carregou alguma vez", não "está na tela" —
    // sem a condição do gatilho, cada clique re-baixava o lote de todos
    // eles (34,4 MiB de variante de cinema por leva, item 59/auditoria).
    b.escolher('cinema');
    for (let i = 0; i < 5; i++) b.casa.aoTick(false);
    await b.respirar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta')]);
    expect(b.casa.carregando).toBe(false);
    expect(b.casa.tierNaTela).toBe('alta');

    // e ele VOLTA a ser olhado: o pedido nasce neste tick, pela mesma
    // comparação com `tierVivo` que já estava aqui — nada precisou
    // guardar o clique perdido
    b.casa.aoTick(true);
    await b.respirar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta'), mapaDaTerraEm('cinema')]);
    await b.entregar();
    expect(b.casa.tierNaTela).toBe('cinema');
  });

  it('corpo PROCEDURAL (sem canais) nasce pronto e nenhuma troca o alcança', async () => {
    const pedidos: string[] = [];
    let tier: QualityLevel = 'alta';
    const casa = new TexturasDoCorpo({
      corpo: 'pallas',
      canais: [],
      rede: {
        tier: () => tier,
        base: '',
        webp: true,
        buscarManifest: async (url) => {
          pedidos.push(url);
          return MANIFEST;
        },
        carregarTextura: async (url) => {
          pedidos.push(url);
          return new THREE.Texture();
        },
      },
      oQueNaoNasce: 'o corpo não nasce nesta sessão',
      publicar: () => undefined,
    });
    casa.aoTick(true);
    expect(casa.pronta).toBe(true);
    tier = 'cinema';
    casa.aoTick(true);
    await flush();
    expect(pedidos).toEqual([]);
  });
});
