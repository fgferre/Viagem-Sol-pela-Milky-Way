// ============================================================
// O RELIGADOR DO RELÓGIO NÃO TROCA O CORPO EM FOCO.
//
// O degrau `corpo` tem DOIS escritores de câmera: o gesto
// (`aproximarDoCorpo`, que é para onde `?foco=X&ver=corpo`, o botão
// "aproximar" e o duplo clique caem) e o RELIGADOR (`recomporAlvo`, que
// o tick chama a cada instante de céu novo para o enquadramento seguir o
// corpo enquanto o tempo anda). Os dois têm de enquadrar O MESMO CORPO,
// e é isto que se julga aqui — em CÂMERA, que é o que o visitante vê.
//
// O defeito que este dente reprova é real e foi medido em navegador:
// `?foco=jupiter&ver=corpo` anunciava "Júpiter" na ficha e punha a TERRA
// em quadro no primeiro tique do relógio, porque o religador tinha a
// posição e o raio da Terra escritos em literal — herança da Onda 7,
// quando a Terra era o único corpo com malha. O mesmo acontecia com o
// botão "aproximar" de qualquer planeta.
//
// A BANCADA é o rig REAL (`AtlasRig` é matemática de THREE, roda em
// node) com a escada por cima e fios de mentira só onde a escada fala
// com o mundo. Sem efeméride carregada as posições saem do RETRATO —
// dado do projeto, não número inventado no teste — e o instante é o da
// época, que é onde as capturas do gate moram.
// ============================================================
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Engine } from '../core/engine';
import type { FreeRoam } from '../cinematic/cameraRig';
import type { Planetas } from '../world/planetas/planetas';
import type { GiganteResolvido } from '../world/corpos/gigante';
import type { MaquinaDoTempo } from './maquinaDoTempo';
import type { Rotulos } from './rotulos';
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA } from '../atlasConfig';
import { IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../lib/atlas/orientacao';
import { raiosDoRochosoPc } from '../world/corpos/rochoso';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import { RAIO_EQ_TERRA_PC, posicaoDaTerraUA } from '../world/corpos/terra';
import { posicaoDoGiganteUA, raiosDoGigantePc } from '../world/corpos/gigante';
import { AtlasRig } from '../cinematic/atlasRig';

// O runner da casa é `node` (vitest.config.ts) e o enquadramento pergunta
// a largura da janela (`larguraDeCss`) a cada `apply`. Uma linha de
// `window` mínimo resolve, como em `world/labels.test.ts` — trocar o
// ambiente de TODOS os testes por jsdom para ler um número seria caro.
(globalThis as { window?: unknown }).window = { innerWidth: 1200, location: { search: '' } };
const { Escada } = await import('./escada');

/** posição da efeméride/retrato (eclíptica, UA) → frame da cena (pc) */
function paraPc(p: { x: number; y: number; z: number }): THREE.Vector3 {
  const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
  return new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
}

/**
 * Uma efeméride de mentira com a assinatura da de verdade — só o que a
 * escada pede dela (`posicaoHeliocentrica`). Os números são do RETRATO
 * para os planetas, e para as luas é o pai mais um deslocamento em UA:
 * o que se julga é QUAL corpo a escada foi buscar, não a órbita dele.
 */
const DESLOCAMENTO_DA_LUA: Record<string, number> = {
  moon: 0.00257, // ~384 mil km
  io: 0.00282,
  titan: 0.00817,
};

/** o polo IAU de um corpo no frame da cena — a MESMA fonte da escada */
function poloDe(id: string): THREE.Vector3 {
  const p = baseCorpoEquatorial(IAU_ORIENTATIONS[id], EPOCA_JD_TDB).polo;
  return new THREE.Vector3(p[0], p[1], p[2]).normalize();
}
/** o ângulo entre dois vetores, em graus — a unidade em que se olha */
const graus = (a: THREE.Vector3, b: THREE.Vector3) => (a.angleTo(b) * 180) / Math.PI;
function efemerideDeMentira() {
  return {
    posicaoHeliocentrica(id: string): { x: number; y: number; z: number } {
      const desloca = DESLOCAMENTO_DA_LUA[id];
      if (desloca === undefined) {
        const p =
          id === 'earth'
            ? posicaoDaTerraUA(EPOCA_JD_TDB, null)
            : posicaoDoGiganteUA(id, EPOCA_JD_TDB, null);
        if (!p) throw new Error(`corpo fora da bancada: ${id}`);
        return p;
      }
      const pai = LUAS_DO_SISTEMA.find((l) => l.id === id)!.pai;
      const p = this.posicaoHeliocentrica(pai);
      return { x: p.x + desloca, y: p.y, z: p.z };
    },
  };
}

/** a escada com o rig REAL e o mundo de mentira em volta */
function bancada({ comEfemeride = false } = {}) {
  const atlas = new AtlasRig();
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 1e6);
  const escada = new Escada({
    atlas,
    // sem efeméride: as posições saem do retrato, e o instante é o da
    // época. Com ela (o caso das LUAS, que não estão no retrato) vale a
    // de mentira acima.
    maquinaDoTempo: {
      jdVivo: EPOCA_JD_TDB,
      efemeride: comEfemeride ? efemerideDeMentira() : null,
      garantirEfemerides() {},
    } as unknown as MaquinaDoTempo,
    rotulos: {} as Rotulos,
    solRaioPc: 2.2546e-8,
    teletransportou: () => {},
    pediuACasa: () => {},
    events: { onFoco: () => {}, onEscada: () => {} },
    fios: {
      engine: () => ({ camera }) as unknown as Engine,
      roam: () => ({}) as unknown as FreeRoam,
      fase: () => 'atlas',
      // 0 = primeiro quadro do modo: sem rampa, o enquadramento é direto
      quadrosDaFase: () => 0,
      shotMode: () => true,
      reducedMotion: () => false,
      planetas: () =>
        ({ posicoes: new Float32Array(CORPOS_DO_SISTEMA.length * 3) }) as unknown as Planetas,
      meta: () => undefined,
      rochosos: () => [],
      // a lista viva dos gigantes CONSTRUÍDOS — é ela que abre o degrau
      gigantes: () => [
        { corpo: { id: 'jupiter', planeta: true } as unknown as GiganteResolvido },
      ],
    },
  });
  /** o que o tick faz depois de recompor: escreve a câmera */
  const aplicar = () => atlas.apply(camera, 1, 1200);
  return { escada, atlas, camera, aplicar };
}

const JUPITER = paraPc(posicaoDoGiganteUA('jupiter', EPOCA_JD_TDB, null)!);
const TERRA = paraPc(posicaoDaTerraUA(EPOCA_JD_TDB, null));
const RAIO_JUPITER = raiosDoGigantePc('jupiter').a;

describe('o degrau `corpo` de um corpo que não é a Terra', () => {
  it('`?foco=jupiter&ver=corpo` enquadra Júpiter — e o tique do relógio o mantém', () => {
    const { escada, atlas, camera, aplicar } = bancada();

    // o que o boot da URL faz (useDirector → Director.focarNoCorpo)
    escada.focarNoCorpo('jupiter', 'corpo');
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'jupiter' });
    expect(atlas.raioDoAlvo).toBe(RAIO_JUPITER);
    const poseDoGesto = camera.position.toArray();
    // a câmera fica a poucos raios de Júpiter — o enquadramento do corpo
    expect(camera.position.distanceTo(JUPITER)).toBeLessThan(10 * RAIO_JUPITER);

    // O TIQUE DO RELÓGIO. Com o instante parado no mesmo jd, recompor é
    // reescrever o MESMO enquadramento: o alvo não pode trocar de corpo,
    // e a pose sai bit a bit igual à do gesto.
    escada.recomporAlvo();
    aplicar();
    expect(atlas.alvo.distanceTo(JUPITER)).toBe(0);
    expect(atlas.raioDoAlvo).toBe(RAIO_JUPITER);
    expect(camera.position.toArray()).toEqual(poseDoGesto);

    // e o defeito que existiu, dito pelo nome: a câmera NÃO está na Terra
    expect(camera.position.distanceTo(TERRA)).toBeGreaterThan(3 * AU_PARA_PC);
  });

  it('a Terra não mudou um bit: gesto e religador dão a mesma pose', () => {
    const { escada, camera, aplicar } = bancada();
    escada.focarNoCorpo('earth', 'corpo');
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'earth' });
    const poseDoGesto = camera.position.toArray();
    expect(camera.position.distanceTo(TERRA)).toBeLessThan(10 * RAIO_EQ_TERRA_PC);

    escada.recomporAlvo();
    aplicar();
    expect(camera.position.toArray()).toEqual(poseDoGesto);
  });

  it('`?foco=io&ver=corpo` fica em Io — o religador não a troca pela Lua', () => {
    // O MESMO literal da Onda 7, na família das 21 luas: medido no
    // navegador, a ficha dizia "Io" e o quadro mostrava a LUA (0,985 UA
    // do Sol, raio 1.737,4 km). O gesto acertava; quem trocava era o
    // tique do relógio.
    const { escada, atlas, camera, aplicar } = bancada({ comEfemeride: true });
    escada.focarNoCorpo('io', 'corpo');
    expect(escada.escadaViva).toMatchObject({ degrau: 'lua', corpoId: 'io' });
    const poseDoGesto = camera.position.toArray();
    const raioDeIo = raiosDoRochosoPc('io').a;
    expect(atlas.raioDoAlvo).toBe(raioDeIo);

    escada.recomporAlvo();
    aplicar();
    expect(atlas.raioDoAlvo).toBe(raioDeIo);
    expect(camera.position.toArray()).toEqual(poseDoGesto);
    // e o alvo não é a Lua: as duas estão a 4,2 UA uma da outra
    const lua = paraPc(efemerideDeMentira().posicaoHeliocentrica('moon'));
    expect(atlas.alvo.distanceTo(lua)).toBeGreaterThan(3 * AU_PARA_PC);
  });

  it('o ALTO DA TELA de uma lua é o eixo DELA — nos dois escritores (item 88)', () => {
    // O TERCEIRO E ÚLTIMO literal da Onda 7, e o único que não punha o
    // corpo errado em quadro: ele só INCLINAVA a cena. Medido em
    // navegador antes do conserto (`?foco=tita`, `?foco=caronte` e
    // `?foco=io`, jd 2460409,26395835): as TRÊS devolviam o MESMO
    // `camera.up` — (−0,006780, −0,373991, 0,927408), que é o polo da
    // NOSSA Lua no instante. Três pais diferentes, um horizonte só.
    //
    // Julga-se em `camera.up`, que é o que o visitante vê no alto da
    // tela, e nos DOIS escritores do degrau: o gesto (`focarNaLua`) e o
    // religador do relógio (`recomporAlvo` → `enquadreVivo`). Consertar
    // um só giraria a câmera no primeiro tique — por isso as duas
    // metades moram no mesmo dente.
    const { escada, camera, aplicar } = bancada({ comEfemeride: true });
    const daLua = poloDe('moon');

    escada.focarNoCorpo('titan', 'corpo');
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'lua', corpoId: 'titan' });
    // o gesto sobe com o eixo de TITÃ — o mesmo que orienta a malha dela
    // O TETO É 5° e não zero, e o motivo é do RIG, não do polo: o `up`
    // publicado passa por `upDoAtlas`, que mistura na direção da
    // eclíptica e grampeia contra a mira quando a câmera se aproxima do
    // eixo. Nesta geometria de bancada isso vale 2,68° — contra os
    // 26,55° que separam o polo de Titã do da Lua na época. A margem
    // entre o certo e o errado é de uma ordem de grandeza.
    expect(graus(camera.up, poloDe('titan'))).toBeLessThan(5);
    // ...e ele NÃO é o da nossa Lua: 23,87° de horizonte rodado
    expect(graus(camera.up, daLua)).toBeGreaterThan(20);
    const altoDoGesto = camera.up.toArray();

    // O TIQUE DO RELÓGIO no MESMO instante: recompor reescreve o mesmo
    // enquadramento, então o alto da tela sai bit a bit igual. É esta
    // linha que reprova o conserto pela metade.
    escada.recomporAlvo();
    aplicar();
    expect(camera.up.toArray()).toEqual(altoDoGesto);
    expect(graus(camera.up, daLua)).toBeGreaterThan(20);

    // IO É A DOSE MÍNIMA da família das 21 — o eixo de Júpiter é quase
    // o da Lua (3,72° na época, contra 26,55° de Titã) —, e é ela que
    // impede o dente de virar teatro: um conserto que fosse só um caso
    // especial de Saturno passaria na metade de cima e reprovaria aqui.
    // Aqui a mira não chega perto do eixo, então o `up` sai EXATO.
    escada.focarNoCorpo('io', 'corpo');
    aplicar();
    expect(graus(camera.up, poloDe('io'))).toBeLessThan(0.01);
    expect(graus(camera.up, daLua)).toBeGreaterThan(1.5);
    const altoDeIo = camera.up.toArray();
    escada.recomporAlvo();
    aplicar();
    expect(camera.up.toArray()).toEqual(altoDeIo);
  });

  it('corpo sem malha construída: o religador não move a câmera para outro mundo', () => {
    // Saturno fora da lista viva de gigantes (malha ainda não construída)
    // é o caso em que o religador ANTES caía na Terra. Agora ele não tem
    // o que recompor — e a câmera fica onde o gesto a deixou.
    const { escada, atlas, camera, aplicar } = bancada();
    escada.focarNoCorpo('jupiter', 'corpo');
    escada.focoCorpoId = 'saturn';
    const poseDoGesto = camera.position.toArray();
    escada.recomporAlvo();
    aplicar();
    expect(atlas.alvo.distanceTo(TERRA)).toBeGreaterThan(3 * AU_PARA_PC);
    expect(camera.position.toArray()).toEqual(poseDoGesto);
  });
});
