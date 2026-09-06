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
  CANAL_MAP,
  CARENCIA_DA_DESCARGA_S,
  RECARGAS_ATE_DESISTIR,
  TexturasDoCorpo,
  alvoDePixels,
  buscarManifestUmaVez,
  carregarCanaisDoCorpo,
  descartarTextura,
  escolherVariante,
} from './texturas';
import type {
  CanalPedido,
  ManifestDeTexturas,
  OpcoesDeTextura,
  Seguradores,
} from './texturas';
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
  /** o `AbortSignal` de CADA pedido, na ordem — a régua da peça 3 */
  const sinais: (AbortSignal | undefined)[] = [];
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
    carregarTextura: (url, sinal) =>
      new Promise((resolver, rejeitar) => {
        pedidos.push(url);
        sinais.push(sinal);
        pendentes.push(() =>
          caindo ? rejeitar(new Error('HTTP 500')) : resolver(texturaContada(descartadas, url))
        );
      }),
  };
  const soltas: number[] = [];
  const casa = new TexturasDoCorpo({
    corpo: 'earth',
    canais: [CANAL_MAP],
    rede,
    etiqueta: 'terra',
    oQueNaoNasce: 'o globo não nasce nesta sessão',
    publicar: (porCanal) => publicados.push([...porCanal.keys()]),
    soltar: () => soltas.push(publicados.length),
  });
  /** o relógio de PAREDE da bancada — quem testa a carência o anda */
  let relogio = 0;
  return {
    casa,
    pedidos,
    sinais,
    descartadas,
    publicados,
    soltas,
    /** os três seguradores, um de cada vez ou juntos */
    tick: (seguram: Partial<Seguradores> = {}, avancarS = 0) => {
      relogio += avancarS;
      casa.aoTick(
        { tela: false, foco: false, filme: false, ...seguram },
        relogio
      );
    },
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
    b.tick({ tela: true });
    await b.entregar();
    expect(b.casa.pronta).toBe(true);
    expect(b.casa.tierNaTela).toBe('alta');
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta')]);

    // o visitante escolhe Cinema: o tick seguinte PEDE, porque o
    // gatilho continua armado — o corpo está NA TELA, e é por isso que
    // ele precisa dos pixels certos
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta'), mapaDaTerraEm('cinema')]);

    // ---- COM O LOTE EM VOO: o globo continua na tela ----------------
    // é o critério inteiro do item 59. `pronta` é o que faz `emQuadro`
    // nos quatro corpos; se ele caísse aqui, a Terra viraria ponto.
    for (let i = 0; i < 5; i++) {
      b.tick({ tela: true });
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
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('performance');
    b.tick({ tela: true });
    expect(b.casa.pronta).toBe(true);
    await b.entregar();
    expect(b.casa.tierNaTela).toBe('performance');
    expect(b.pedidos).toEqual([mapaDaTerraEm('cinema'), mapaDaTerraEm('performance')]);
    expect(b.descartadas).toEqual([mapaDaTerraEm('cinema')]);
  });

  it('três tiers seguidos: só o ÚLTIMO vira pixel, o do meio é descartado', async () => {
    const b = bancadaDaTroca('alta');
    b.tick({ tela: true });
    await b.entregar();
    // clique 1: cinema (fica em voo)
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    // clique 2: performance ANTES de o de cinema chegar
    b.escolher('performance');
    b.tick({ tela: true });
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
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    b.escolher('alta'); // arrependeu-se antes de o lote chegar
    // e SEM gatilho: cancelar não toca a rede, então o corpo que saiu
    // da tela no meio do arrependimento também larga o lote em voo
    b.tick();
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
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('cinema');
    b.tick({ tela: true });
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
    b.tick({ tela: true });
    await b.entregar();
    b.derrubarARede(true);
    b.escolher('cinema');
    const avisos: string[] = [];
    const warn = console.warn;
    console.warn = (m: string) => avisos.push(m);
    try {
      // 1 carga + RECARGAS_ATE_DESISTIR recargas, como na primeira vez
      for (let i = 0; i < 1 + RECARGAS_ATE_DESISTIR; i++) {
        b.tick({ tela: true });
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
    for (let i = 0; i < 5; i++) b.tick({ tela: true });
    expect(b.pedidos).toHaveLength(antes);
  });

  it('FORA DA TELA a troca não nasce; e nasce no tick em que o corpo VOLTA', async () => {
    const b = bancadaDaTroca('alta');
    b.tick({ tela: true }); // visitado: o gatilho armou e o lote de alta desceu
    await b.entregar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta')]);

    // o visitante foi embora (gate desarmado, o Atlas focando outro
    // corpo) e mexe no seletor. É o estado dos 38 corpos do palco:
    // 'pronta' quer dizer "carregou alguma vez", não "está na tela" —
    // sem a condição do gatilho, cada clique re-baixava o lote de todos
    // eles (34,4 MiB de variante de cinema por leva, item 59/auditoria).
    b.escolher('cinema');
    for (let i = 0; i < 5; i++) b.tick();
    await b.respirar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta')]);
    expect(b.casa.carregando).toBe(false);
    expect(b.casa.tierNaTela).toBe('alta');

    // e ele VOLTA a ser olhado: o pedido nasce neste tick, pela mesma
    // comparação com `tierVivo` que já estava aqui — nada precisou
    // guardar o clique perdido
    b.tick({ tela: true });
    await b.respirar();
    expect(b.pedidos).toEqual([mapaDaTerraEm('alta'), mapaDaTerraEm('cinema')]);
    await b.entregar();
    expect(b.casa.tierNaTela).toBe('cinema');
  });

  it('corpo PROCEDURAL (sem canais) nasce pronto e nenhuma troca o alcança', async () => {
    const pedidos: string[] = [];
    let soltou = 0;
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
      soltar: () => soltou++,
    });
    const segura = { tela: true, foco: false, filme: false };
    casa.aoTick(segura, 0);
    expect(casa.pronta).toBe(true);
    tier = 'cinema';
    casa.aoTick(segura, 0);
    await flush();
    expect(pedidos).toEqual([]);
    // e NINGUÉM SEGURANDO por muito mais que a carência não o descarrega:
    // não há texel de arquivo para devolver, e voltar a 'fria' só faria
    // o corpo republicar a casca a cada ida e volta
    casa.aoTick({ tela: false, foco: false, filme: false }, 1000);
    expect(soltou).toBe(0);
    expect(casa.pronta).toBe(true);
  });
});

describe('a descarga adiada: os três que seguram e a carência de 15 s', () => {
  it('BASTA UM: o foco solta, a TELA continua segurando, e nada é devolvido', async () => {
    const b = bancadaDaTroca('cinema');
    // os dois juntos — é o estado de quem está focado E perto
    b.tick({ tela: true, foco: true });
    await b.entregar();
    expect(b.casa.pronta).toBe(true);
    expect(b.casa.segurando).toBe(2);

    // o visitante troca o foco, mas o corpo continua grande na tela:
    // com um FLAG no lugar da contagem, isto soltaria a imagem que o
    // olho está lendo
    for (let i = 0; i < 40; i++) b.tick({ tela: true }, 1);
    expect(b.casa.segurando).toBe(1);
    expect(b.casa.pronta).toBe(true);
    expect(b.soltas).toEqual([]);
    expect(b.descartadas).toEqual([]);
  });

  it('o FILME segura sozinho: 60 s sem tela nem foco e o globo continua', async () => {
    const b = bancadaDaTroca('cinema');
    b.tick({ filme: true });
    await b.entregar();
    for (let i = 0; i < 60; i++) b.tick({ filme: true }, 1);
    expect(b.casa.segurando).toBe(1);
    expect(b.casa.pronta).toBe(true);
    expect(b.descartadas).toEqual([]);
  });

  it('NINGUÉM segura: a carência corre e SÓ depois dela os texels voltam', async () => {
    const b = bancadaDaTroca('cinema');
    b.tick({ tela: true });
    await b.entregar();
    const arquivo = mapaDaTerraEm('cinema');

    // o relógio começa a contar no primeiro tick sem segurador
    b.tick();
    expect(b.casa.segurando).toBe(0);
    // um cabelo ANTES do prazo: ainda tudo de pé
    b.tick({}, CARENCIA_DA_DESCARGA_S - 0.01);
    expect(b.casa.pronta, 'descarregou antes da carência').toBe(true);
    expect(b.descartadas).toEqual([]);
    // e no prazo: o corpo solta os uniforms ANTES de os texels sumirem
    b.tick({}, 0.02);
    expect(b.soltas).toHaveLength(1);
    expect(b.descartadas).toEqual([arquivo]);
    expect(b.casa.pronta).toBe(false);
    expect(b.casa.tierNaTela).toBe(null);
  });

  it('a VOLTA DENTRO da carência não toca a rede — e a volta DEPOIS toca', async () => {
    const b = bancadaDaTroca('cinema');
    b.tick({ foco: true });
    await b.entregar();
    expect(b.pedidos).toHaveLength(1);

    // saiu do foco por 10 s e voltou: o relógio zera, nada recarrega
    b.tick();
    b.tick({}, 10);
    b.tick({ foco: true });
    await b.entregar();
    expect(b.pedidos, 'a volta rápida pagou rede').toHaveLength(1);
    expect(b.casa.pronta).toBe(true);
    expect(b.descartadas).toEqual([]);

    // ...e a ressurreição zerou MESMO o relógio: outros 10 s soltos
    // (20 s desde a primeira saída) ainda não descarregam
    b.tick();
    b.tick({}, 10);
    expect(b.casa.pronta, 'o relógio da carência não zerou na volta').toBe(true);

    // agora sim, além do prazo — e a volta seguinte recarrega
    b.tick({}, CARENCIA_DA_DESCARGA_S);
    expect(b.casa.pronta).toBe(false);
    b.tick({ foco: true });
    await b.entregar();
    expect(b.pedidos).toHaveLength(2);
    expect(b.casa.pronta).toBe(true);
    expect(b.casa.tierNaTela).toBe('cinema');
  });

  it('PRIMEIRA CARGA em voo sem ninguém segurando: cancela na hora, sem carência', async () => {
    const b = bancadaDaTroca('cinema');
    b.tick({ foco: true });
    await b.respirar();
    expect(b.casa.carregando).toBe(true);

    // o visitante saiu antes de a imagem chegar: não há pixel a
    // preservar, então a espera de 15 s só serviria para os bytes
    // continuarem descendo para ninguém
    b.tick();
    expect(b.casa.carregando).toBe(false);
    // e o lote que chega depois não fica sem dono
    await b.entregar();
    expect(b.publicados).toEqual([]);
    expect(b.descartadas).toEqual([mapaDaTerraEm('cinema')]);
    expect(b.casa.pronta).toBe(false);
  });

  it('a TROCA de tier em voo perde o dono, e os pixels VELHOS ficam a carência inteira', async () => {
    const b = bancadaDaTroca('alta');
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    expect(b.casa.carregando).toBe(true);

    // ninguém mais segura: o lote NOVO é descartado ao chegar, mas o
    // VELHO continua na tela até a carência fechar
    b.tick();
    expect(b.casa.carregando).toBe(false);
    await b.entregar();
    expect(b.casa.pronta).toBe(true);
    expect(b.casa.tierNaTela).toBe('alta');
    expect(b.descartadas).toEqual([mapaDaTerraEm('cinema')]);

    b.tick({}, CARENCIA_DA_DESCARGA_S);
    expect(b.descartadas).toEqual([mapaDaTerraEm('cinema'), mapaDaTerraEm('alta')]);
    expect(b.casa.pronta).toBe(false);
  });
});

describe('a carga sai da thread principal: fetch + createImageBitmap (peça 2)', () => {
  /**
   * A bancada substitui `fetch` e `createImageBitmap` no global — é o
   * que faz este teste medir o CARREGADOR DE PRODUÇÃO
   * (`carregarPelaRede`, o default de `carregarCanaisDoCorpo`) e não
   * uma cópia dele. Em Node os dois não existem com esta forma, e é
   * justamente por isso que a peça precisava de um juiz próprio.
   */
  function bancadaDoBitmap() {
    const chamadas: { url: string; opcoes: unknown }[] = [];
    const fechados: unknown[] = [];
    const blobs = new Map<string, object>();
    const falso = globalThis as unknown as Record<string, unknown>;
    const antes = { fetch: falso.fetch, cib: falso.createImageBitmap, IB: falso.ImageBitmap };
    class BitmapDeTeste {
      width = 8;
      height = 4;
      fechado = false;
      close() {
        this.fechado = true;
        fechados.push(this);
      }
    }
    falso.ImageBitmap = BitmapDeTeste;
    falso.fetch = async (url: string) => {
      const blob = { url };
      blobs.set(url, blob);
      return { ok: true, blob: async () => blob };
    };
    falso.createImageBitmap = async (blob: { url: string }, opcoes: unknown) => {
      chamadas.push({ url: blob.url, opcoes });
      return new BitmapDeTeste();
    };
    return {
      chamadas,
      fechados,
      restaurar: () => {
        falso.fetch = antes.fetch;
        falso.createImageBitmap = antes.cib;
        falso.ImageBitmap = antes.IB;
      },
    };
  }

  it('decodifica pelo bitmap, com as três opções que preservam o pixel', async () => {
    const b = bancadaDoBitmap();
    try {
      const lote = await carregarCanaisDoCorpo(
        'earth',
        [CANAL_MAP],
        { tier: () => 'alta', maxTextureSize: 16384, base: '', webp: true,
          buscarManifest: async () => MANIFEST },
        'alta',
        () => false
      );
      // o pedido passou pelo caminho novo — e com as opções literais
      expect(b.chamadas).toHaveLength(1);
      expect(b.chamadas[0].url).toBe(mapaDaTerraEm('alta'));
      expect(b.chamadas[0].opcoes).toEqual({
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
      });
      // O PAR QUE SALVA O PIXEL: o bitmap já vem virado, então o three
      // NÃO pode virar de novo. Tirar `flipY = false` põe todo globo da
      // casa de cabeça para baixo, e nenhum teste de unidade veria.
      const tex = lote!.get('map')!;
      expect(tex.flipY).toBe(false);
      // `needsUpdate` é só escrita no three; o que ele MOVE é a versão,
      // e é a versão que faz o renderer subir os texels
      expect(tex.version).toBeGreaterThan(0);
      expect(tex.image).toBeInstanceOf(
        (globalThis as unknown as { ImageBitmap: new () => object }).ImageBitmap
      );
    } finally {
      b.restaurar();
    }
  });

  it('o descarte FECHA o bitmap além de devolver a textura à GPU', async () => {
    const b = bancadaDoBitmap();
    try {
      const lote = await carregarCanaisDoCorpo(
        'earth',
        [CANAL_MAP],
        { tier: () => 'alta', maxTextureSize: 16384, base: '', webp: true,
          buscarManifest: async () => MANIFEST },
        'alta',
        () => false
      );
      const tex = lote!.get('map')!;
      let devolvida = false;
      tex.addEventListener('dispose', () => {
        devolvida = true;
      });
      descartarTextura(tex);
      // as DUAS metades: `dispose()` é a GPU, `close()` é a memória de
      // CPU do bitmap decodificado — que o GC não recolhe sozinho
      expect(devolvida).toBe(true);
      expect(b.fechados).toEqual([tex.image]);
    } finally {
      b.restaurar();
    }
  });

  it('o lote que CAI no meio fecha os bitmaps que já tinham chegado', async () => {
    const b = bancadaDoBitmap();
    try {
      await expect(
        carregarCanaisDoCorpo(
          'earth',
          [CANAL_MAP, { canal: 'nao-existe', cor: true, repetirEmU: false }],
          { tier: () => 'alta', maxTextureSize: 16384, base: '', webp: true,
            buscarManifest: async () => MANIFEST },
          'alta',
          () => false
        )
      ).rejects.toThrow(/sem variante/);
      // o canal que chegou não pode ficar com o bitmap aberto — é o
      // vazamento de CPU que o `dispose()` sozinho não fecha
      expect(b.fechados).toHaveLength(1);
    } finally {
      b.restaurar();
    }
  });
});

describe('o abort: pedido sem dono para de descer (peça 3)', () => {
  it('trocar de tier no meio da carga ABORTA o lote velho', async () => {
    const b = bancadaDaTroca('alta');
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    expect(b.pedidos).toHaveLength(2);
    expect(b.sinais[1]!.aborted).toBe(false);

    // um terceiro tier: o de cinema perde o dono. A geração já o
    // invalidava — invalidar é decidir que os bytes não servem, não
    // parar de recebê-los; um `map` de cinema descia INTEIRO para ser
    // descartado na chegada.
    b.escolher('performance');
    b.tick({ tela: true });
    expect(b.sinais[1]!.aborted, 'o lote de cinema continuou descendo').toBe(true);
    // e o pedido NOVO nasce vivo (o `carregar` só é chamado depois do
    // manifest, então o sinal dele só existe no microtask seguinte)
    await b.respirar();
    expect(b.sinais[2]!.aborted).toBe(false);
  });

  it('VOLTAR ao tier que já está na tela aborta o lote do meio do caminho', async () => {
    const b = bancadaDaTroca('alta');
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    b.escolher('alta');
    b.tick({ tela: true });
    expect(b.sinais[1]!.aborted).toBe(true);
  });

  it('perder o ÚLTIMO segurador em voo aborta na hora, sem esperar a carência', async () => {
    const b = bancadaDaTroca('cinema');
    b.tick({ foco: true });
    await b.respirar();
    expect(b.sinais[0]!.aborted).toBe(false);
    b.tick();
    expect(b.sinais[0]!.aborted).toBe(true);
  });

  it('a DESCARGA e o `dispose` abortam o que ainda estava descendo', async () => {
    const b = bancadaDaTroca('alta');
    b.tick({ tela: true });
    await b.entregar();
    b.escolher('cinema');
    b.tick({ tela: true });
    await b.respirar();
    // ninguém segura: o lote novo é abortado já, e os velhos ficam a
    // carência inteira — e a descarga não tem mais nada a abortar
    b.tick();
    expect(b.sinais[1]!.aborted).toBe(true);
    b.tick({}, CARENCIA_DA_DESCARGA_S);
    expect(b.casa.pronta).toBe(false);

    // e o teardown da cena corta uma carga viva
    const c = bancadaDaTroca('cinema');
    c.tick({ tela: true });
    await c.respirar();
    expect(c.sinais[0]!.aborted).toBe(false);
    c.casa.dispose();
    expect(c.sinais[0]!.aborted).toBe(true);
  });
});
