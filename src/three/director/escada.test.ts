// Serve: chão — o religador do relógio enquadra o mesmo corpo que o gesto focou, nunca a Terra por engano
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
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA, HELIO_SEM_PONTO } from '../atlasConfig';
import { posicaoKepler } from '../../lib/atlas/kepler';
import type { RochosoResolvido } from '../world/corpos/rochoso';
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
      // OS OITO HELIOCÊNTRICOS SEM PONTO saem do propagador do projeto
      // (`posicaoKepler`, `elementosOrbitais.ts`) e não de número
      // digitado aqui: eles estão FORA do `RETRATO_2026`, então é o
      // Kepler da casa que responde por eles quando não há provedor.
      if (HELIO_SEM_PONTO.some((a) => a.id === id)) {
        return posicaoKepler(id, EPOCA_JD_TDB);
      }
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

/**
 * O CORPO ESTÁ NO QUADRO? — a pergunta do item 92, em valores
 * EXECUTADOS: a POSIÇÃO e a DIREÇÃO da câmera viva contra a posição do
 * corpo, e o tamanho que o globo ocupa da altura da tela.
 *
 * As DUAS metades são necessárias, e é o defeito que ensina: no degrau
 * de órbita a câmera olha o corpo em cheio (o alvo É o corpo), então o
 * centro cai no meio da tela e só o TAMANHO denuncia que ali não há
 * globo nenhum — Éris a 93,5 UA vista de 520 UA rende 3·10⁻⁸ da altura
 * do quadro. "Está no eixo" não é "está em quadro".
 *
 * EM ÂNGULO, e não em `project`: o `near`/`far` da câmera é escrito
 * pelo ENGINE a cada quadro (medido no navegador: near = 9,8·10⁻⁶ pc),
 * e a bancada não tem engine. Com o `near` de fábrica (0,1 pc) todo
 * corpo do sistema cai atrás do plano de corte e o NDC responde
 * "fora" para as duas vistas — a régua mediria a bancada, não o app.
 * O ângulo entre o olhar e o corpo não depende dos planos de corte.
 */
function noQuadro(camera: THREE.PerspectiveCamera, centro: THREE.Vector3, raio: number) {
  camera.updateMatrixWorld();
  const olhar = camera.getWorldDirection(new THREE.Vector3());
  const paraOCorpo = centro.clone().sub(camera.position);
  const distancia = paraOCorpo.length();
  const meiaVertical = (camera.fov * Math.PI) / 360;
  const meiaHorizontal = Math.atan(Math.tan(meiaVertical) * camera.aspect);
  return {
    // o centro do corpo dentro da abertura MAIS APERTADA da lente
    noEixo: olhar.angleTo(paraOCorpo) <= Math.min(meiaVertical, meiaHorizontal),
    // o diâmetro angular do globo sobre a abertura vertical
    alturas: Math.atan2(raio, distancia) / meiaVertical,
    raios: distancia / raio,
  };
}

/** a escada com o rig REAL e o mundo de mentira em volta */
function bancada({ comEfemeride = false, comAnoes = false } = {}) {
  const atlas = new AtlasRig();
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 1e6);
  // sem efeméride: as posições saem do retrato, e o instante é o da
  // época. Com ela (o caso das LUAS e dos oito heliocêntricos sem
  // ponto, que não estão no retrato) vale a de mentira acima. É um
  // objeto VIVO porque a fonte chega TARDE no app de verdade, e o item
  // 92 julga justamente o que acontece quando ela chega.
  const maquinaDoTempo = {
    jdVivo: EPOCA_JD_TDB,
    efemeride: comEfemeride ? efemerideDeMentira() : null,
    garantirEfemerides() {},
  };
  /** tudo que o HUD ouviu, na ordem — o `onFoco` é o nome em quadro */
  const focos: (string | null)[] = [];
  const escada = new Escada({
    atlas,
    maquinaDoTempo: maquinaDoTempo as unknown as MaquinaDoTempo,
    rotulos: {} as Rotulos,
    solRaioPc: 2.2546e-8,
    teletransportou: () => {},
    pediuACasa: () => {},
    events: {
      onFoco: (nome: string | null) => {
        focos.push(nome);
      },
      onEscada: () => {},
    },
    fios: {
      engine: () => ({ camera }) as unknown as Engine,
      roam: () => ({}) as unknown as FreeRoam,
      fase: () => 'atlas',
      corpoNaOrbita: () => null,
      // 0 = primeiro quadro do modo: sem rampa, o enquadramento é direto
      quadrosDaFase: () => 0,
      shotMode: () => true,
      reducedMotion: () => false,
      planetas: () =>
        ({ posicoes: new Float32Array(CORPOS_DO_SISTEMA.length * 3) }) as unknown as Planetas,
      meta: () => undefined,
      // a lista viva dos rochosos CONSTRUÍDOS. Os anões e asteroides
      // entram aqui com `planeta: false`, que é o que os distingue na
      // lista real — é essa marca que abre (ou não) o degrau do globo
      // deles em `podeAproximar`.
      rochosos: () =>
        comAnoes
          ? [
              { corpo: { id: 'eris', planeta: false } as unknown as RochosoResolvido },
              { corpo: { id: 'vesta', planeta: false } as unknown as RochosoResolvido },
            ]
          : [],
      // a lista viva dos gigantes CONSTRUÍDOS — é ela que abre o degrau
      gigantes: () => [
        { corpo: { id: 'jupiter', planeta: true } as unknown as GiganteResolvido },
      ],
    },
  });
  /** o que o tick faz depois de recompor: escreve a câmera */
  const aplicar = () => atlas.apply(camera, 1, 1200);
  return { escada, atlas, camera, aplicar, focos, maquinaDoTempo };
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
    // O 0,01 é ESTRUTURAL, não capricho: Io×Júpiter distam só 0,026°,
    // e esta é a ÚNICA asserção da família que separa "polo da lua" de
    // "polo do pai" (Titã×Saturno = 0,165° passa na folga de 5°;
    // Caronte×Plutão = 0°). Afrouxar para 0,05 abre a classe inteira.
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

// ============================================================
// OS OITO HELIOCÊNTRICOS SEM PONTO TÊM OS DOIS DEGRAUS (item 92).
//
// O CASO MEDIDO, em navegador, no binário anterior a este dente:
// `?foco=Éris&ver=corpo&d=6` — o degrau que `ANOES_DO_SISTEMA` declara
// ("órbita em torno do Sol → aproximar o globo") — parava no degrau de
// ÓRBITA e devolvia um quadro sem globo nenhum. A câmera terminava a
// 77.040.000 raios de Éris (contra 6,4 de Marte, o controle, no mesmo
// endereço), e o globo media 0,00003 px de diâmetro. Não era de Éris:
// os OITO faziam o mesmo, com 0,00003 a 0,0005 px.
//
// O QUE SE JULGA AQUI é o que o visitante vê: o corpo está NO QUADRO?
// (`noQuadro` — projeção do centro pela câmera viva e o tamanho que o
// globo ocupa da altura da tela). Não texto, não o nome do degrau
// sozinho: no degrau errado o degrau também dizia `orbita` com o corpo
// no meio da tela, e só o TAMANHO separava as duas vistas.
// ============================================================
const ERIS = paraPc(posicaoKepler('eris', EPOCA_JD_TDB));
const RAIO_ERIS = raiosDoRochosoPc('eris').a;
const VESTA = paraPc(posicaoKepler('vesta', EPOCA_JD_TDB));
const RAIO_VESTA = raiosDoRochosoPc('vesta').a;

describe('anões e asteroides: o degrau do globo (item 92)', () => {
  it('`?foco=Éris&ver=corpo` põe ÉRIS em quadro — não a órbita de 93 UA', () => {
    const { escada, camera, aplicar, focos } = bancada({ comEfemeride: true, comAnoes: true });
    escada.focarNoCorpo('eris', 'corpo');
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'eris' });

    const q = noQuadro(camera, ERIS, RAIO_ERIS);
    expect(q.noEixo).toBe(true);
    // o globo ocupa a tela: no degrau de órbita isto valia 3·10⁻⁸
    expect(q.alturas).toBeGreaterThan(0.2);
    // ...e a câmera está a poucos raios DELE, não da órbita dele
    expect(q.raios).toBeLessThan(10);

    // O NOME SOBREVIVE À DESCIDA, e esta linha é a segunda metade do
    // item: `aproximarDoCorpo` resolvia nome só nos DEZ corpos da
    // camada, então o gesto que põe Éris em quadro apagava "Ⓘ ÉRIS" da
    // linha de contexto. Sem ela o conserto entregaria o globo com a
    // legenda em branco.
    expect(focos.at(-1)).toBe('Éris');
  });

  it('VESTA também — é a classe, não um caso especial de Éris', () => {
    // A dose que impede o dente de virar teatro: outra FAMÍLIA
    // (asteroide, não anão) e outra ordem de distância (2,4 UA contra
    // 93,5). Um conserto escrito só para Éris passa acima e reprova
    // aqui.
    const { escada, camera, aplicar, focos } = bancada({ comEfemeride: true, comAnoes: true });
    escada.focarNoCorpo('vesta', 'corpo');
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'vesta' });
    const q = noQuadro(camera, VESTA, RAIO_VESTA);
    expect(q.noEixo).toBe(true);
    expect(q.alturas).toBeGreaterThan(0.2);
    expect(q.raios).toBeLessThan(10);
    expect(focos.at(-1)).toBe('Vesta');
  });

  it('o GESTO da descida (clicar no mesmo anão já focado) desce um degrau', () => {
    // O irmão do `?ver=corpo`: o duplo clique no anão JÁ focado em
    // órbita. Os dois caminhos saíam pelo mesmo desvio, duas linhas
    // antes de qualquer descida ser consultada.
    const { escada, camera, aplicar } = bancada({ comEfemeride: true, comAnoes: true });
    escada.focarNoCorpo('eris');
    expect(escada.escadaViva).toMatchObject({ degrau: 'orbita', corpoId: 'eris' });
    aplicar();
    // na órbita o globo é invisível — é o quadro sem corpo do item
    expect(noQuadro(camera, ERIS, RAIO_ERIS).alturas).toBeLessThan(1e-5);

    escada.focarNoCorpo('eris');
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'eris' });
    expect(noQuadro(camera, ERIS, RAIO_ERIS).alturas).toBeGreaterThan(0.2);
  });

  it('`?ver=corpo` atravessa a efeméride que chega TARDE (verDoBoot)', () => {
    // A METADE QUE O NAVEGADOR EXIGIU. Os oito estão fora do
    // `RETRATO_2026`: no boot, quando `?foco=` roda, não há posição
    // nenhuma para eles, então o degrau de órbita é o que se pode ter.
    // Quando a fonte chega, `reenquadrarAposEfemeride` reaplica o
    // degrau VIVO — e sem `verDoBoot` o `corpo` do endereço morria ali
    // sem ninguém ver. Medido pela URL real antes desta metade: degrau
    // `orbita`, 77.040.000 raios; depois: `corpo`, 6,4 raios.
    const { escada, camera, aplicar, maquinaDoTempo } = bancada({ comAnoes: true });
    escada.focarNoCorpo('eris', 'corpo');
    // sem fonte não há degrau nenhum para dar: a escada pediu e voltou
    expect(escada.escadaViva).toMatchObject({ degrau: 'orbita', corpoId: 'eris' });

    maquinaDoTempo.efemeride = efemerideDeMentira();
    escada.reenquadrarAposEfemeride();
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'eris' });
    expect(noQuadro(camera, ERIS, RAIO_ERIS).alturas).toBeGreaterThan(0.2);
  });

  it('ANTI-DERIVA do religador: sem `?ver=`, a fonte que chega TARDE não desce', () => {
    // O gêmeo obrigatório do `verDoBoot`: o religador só pode descer
    // quando o ENDEREÇO pediu. Um religador que devolvesse 'corpo'
    // fixo passaria no teste acima e forçaria ao globo todo corpo cuja
    // efeméride chega tarde — e era exatamente a sabotagem que esta
    // suíte não pegava (achado da auditoria de 25/08; a vista
    // `anao-eris-orbita` do gate pegava, mas só no portão de captura).
    const { escada, aplicar, maquinaDoTempo } = bancada({ comAnoes: true });
    escada.focarNoCorpo('eris');
    expect(escada.escadaViva).toMatchObject({ degrau: 'orbita', corpoId: 'eris' });
    maquinaDoTempo.efemeride = efemerideDeMentira();
    escada.reenquadrarAposEfemeride();
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'orbita', corpoId: 'eris' });
  });

  it('`?foco=Éris` SEM `?ver=` continua na órbita — o contrato não mudou', () => {
    // O contraponto obrigatório: o padrão de `?foco=` é o degrau de
    // órbita, e um conserto que descesse sempre trocaria um defeito
    // por outro. Medido pela URL depois do conserto: `?foco=Éris`
    // sozinha segue a 77.040.000 raios, como sempre esteve.
    const { escada, camera, aplicar } = bancada({ comEfemeride: true, comAnoes: true });
    escada.focarNoCorpo('eris');
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'orbita', corpoId: 'eris' });
    expect(noQuadro(camera, ERIS, RAIO_ERIS).raios).toBeGreaterThan(1e6);
  });
});
