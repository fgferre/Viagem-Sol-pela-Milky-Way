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
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { Engine } from '../core/engine';
import type { NamedStar, StarsMeta } from '../config';
import type { FreeRoam } from '../cinematic/cameraRig';
import type { Planetas } from '../world/planetas/planetas';
import type { GiganteResolvido } from '../world/corpos/gigante';
import type { MaquinaDoTempo } from './maquinaDoTempo';
import type { Rotulos } from './rotulos';
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA, HELIO_SEM_PONTO, nomeDoCorpo } from '../atlasConfig';
import { posicaoKepler } from '../../lib/atlas/kepler';
import type { RochosoResolvido } from '../world/corpos/rochoso';
import { IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';
import { baseCorpoEquatorial } from '../../lib/atlas/orientacao';
import { raiosDoRochosoPc } from '../world/corpos/rochoso';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { EPOCA_JD_TDB } from '../world/planetas/retrato2026';
import { RAIO_EQ_TERRA_PC, posicaoDaTerraUA } from '../world/corpos/terra';
import { posicaoDoGiganteUA, raiosDoGigantePc } from '../world/corpos/gigante';
import { ANEL_DE_SATURNO, omegaDoAnelCpu } from '../world/corpos/descricaoDoAnel';
import { AtlasRig, K_MIN_RAIOS, K_PISO_DO_CORPO } from '../cinematic/atlasRig';
import { IDS_ESCULPIDOS, criaGeometriaEsculpida } from '../world/corpos/esculpido';
import { LUGARES_DA_BUSCA, poseDePertoDaEstrelaS, poseDoLugar } from '../world/lugaresDoCeu';
import { posicaoDoCometaNaCena, poseDoCometaDePerto } from '../world/cometas';
import { M31 } from '../world/geradorDasVizinhas';
import { GAL } from '../world/baseGalactica';
import { ENTREGA_DO_BURACO_PC, kmParaPc } from '../escala';
import { RS_SGR_A_PC } from '../../lib/buracoNegro';
import { ATLAS_FOV_GRAUS, enquadrar, retanguloUtilDoAtlas } from '../cinematic/atlasRig';
import { MARGEM_DE_ENQUADRAMENTO } from '../cinematic/enquadramento';
import { orientacaoInercialDoAnelNaCena } from '../world/corpos/orientacaoNaCena';
import { ID_DO_PONTO_DO_ANEL, PISO_KM, RAIO_DO_PONTO_KM } from '../world/pontoDoAnel';
import { construirIndice, resolverFoco } from '../../lib/buscaEstrelas';
import { estrelaVisitavelPorNome, raioDaEstrelaPc } from '../../lib/atlas/estrelasVisitaveis';
import { raioDoPisoDoGas } from '../world/ventoDaEstrela';

// O runner da casa é `node` (vitest.config.ts) e o enquadramento pergunta
// a largura da janela (`larguraDeCss`) a cada `apply`. Uma linha de
// `window` mínimo resolve, como em `world/labels.test.ts` — trocar o
// ambiente de TODOS os testes por jsdom para ler um número seria caro.
(globalThis as { window?: unknown }).window = { innerWidth: 1200, location: { search: '' } };
const { Escada, quadroDePerto, soloDoCorpo } = await import('./escada');

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
function bancada({
  comEfemeride = false,
  comAnoes = false,
  comSaturno = false,
  comPiloto = false,
  named = undefined as NamedStar[] | undefined,
} = {}) {
  const atlas = new AtlasRig();
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 1e6);
  // sem efeméride: as posições saem do retrato, e o instante é o da
  // época. Com ela (o caso das LUAS e dos oito heliocêntricos sem
  // ponto, que não estão no retrato) vale a de mentira acima. É um
  // objeto VIVO porque a fonte chega TARDE no app de verdade, e o item
  // 92 julga justamente o que acontece quando ela chega.
  const maquinaDoTempo = {
    jdVivo: EPOCA_JD_TDB,
    saltos: 0,
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
      meta: () => (named ? ({ named } as unknown as StarsMeta) : undefined),
      // o piloto das estrelas com corpo (`?estrelaslugar`), desligado por padrão aqui
      estrelasComLugar: () => comPiloto,
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
        ...(comSaturno
          ? [{ corpo: { id: 'saturn', planeta: true } as unknown as GiganteResolvido }]
          : []),
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

  it('Saturno de perto é o retrato COM os anéis — e `?d=` segue em raios do planeta (12/11)', () => {
    // MEDIDO no navegador: o degrau enquadrava a esfera do PLANETA, e os
    // anéis (2,3 raios) vazavam a tela; o cartão pinava 12 raios fixos, e o
    // desktop com a ficha aberta mostrava Saturno em ~10% da largura
    const { escada, atlas, camera, aplicar } = bancada({ comSaturno: true });
    const SATURNO = paraPc(posicaoDoGiganteUA('saturn', EPOCA_JD_TDB, null)!);
    const R = raiosDoGigantePc('saturn').a;
    escada.focarNoCorpo('saturn', 'corpo');
    aplicar();
    const d = camera.position.distanceTo(SATURNO);
    // o anel inteiro cabe na meia-altura da lente, com folga
    const meiaV = THREE.MathUtils.degToRad(camera.fov) / 2;
    expect(Math.asin((ANEL_DE_SATURNO.desenho.rExt * R) / d)).toBeLessThan(meiaV * 0.8);
    // a régua do link não mudou de sentido
    expect(atlas.raioDoAlvo).toBe(R);
    expect(atlas.distanciaEmRaios).toBeCloseTo(d / R, 6);
    // e o religador do relógio mantém o MESMO quadro
    const pose = camera.position.toArray();
    escada.recomporAlvo();
    aplicar();
    expect(camera.position.toArray()).toEqual(pose);
    // `?d=12` continua sendo 12 raios de Saturno
    escada.pinarEmRaios(12);
    aplicar();
    expect(camera.position.distanceTo(SATURNO) / R).toBeCloseTo(12, 3);
    // sem anel de disco, o quadro é o de sempre
    for (const id of ['jupiter', 'uranus', 'neptune', 'earth']) {
      const r = raiosDoGigantePc(id).a;
      expect(quadroDePerto(id, r)).toEqual({ raio: r, regua: null });
    }
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

  it('o cartão de um planeta chega a ele vindo de QUALQUER lugar do céu (12/11)', () => {
    // MEDIDO no navegador: das Híades (ou da Via Láctea de cima, ou de
    // Sgr A✱) o cartão "Saturno: os anéis, de perto" deixava a câmera no
    // lugar anterior, a linha de cima com o nome velho, e a busca seguinte
    // não movia mais nada — o `focoEstrela` do lugar sobrevivia e o degrau
    // do corpo descia à estrela ou ao buraco em vez do planeta.
    const controle = bancada();
    controle.escada.focarNoCorpo('jupiter', 'corpo');
    const nomeDeJupiter = controle.focos.at(-1);
    // a mesma porta de `escolherAlvo` para um lugar
    const visitar = (e: InstanceType<typeof Escada>, l: (typeof LUGARES_DA_BUSCA)[number]) =>
      l.raioPc ? e.visitarLugar(l) : e.visitarEstrela({ n: l.nome, x: l.x, y: l.y, z: l.z });
    const sgrA = LUGARES_DA_BUSCA.find((l) => l.id === 'sagittarius-a')!;
    const origens = [
      ...LUGARES_DA_BUSCA.map((l) => (e: InstanceType<typeof Escada>) => visitar(e, l)),
      // o buraco de perto (o degrau corpo do centro)
      (e: InstanceType<typeof Escada>) => {
        visitar(e, sgrA);
        e.aproximarDoCorpo();
      },
    ];
    for (const ir of origens) {
      const { escada, camera, aplicar, focos } = bancada();
      ir(escada);
      // o cartão: o mesmo par que `escolherAlvo` dispara (ver + raios)
      escada.focarNoCorpo('jupiter', 'corpo');
      escada.pinarEmRaios(10);
      aplicar();
      expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'jupiter' });
      expect(focos.at(-1)).toBe(nomeDeJupiter);
      expect(camera.position.distanceTo(JUPITER) / RAIO_JUPITER).toBeCloseTo(10, 3);
      // e a busca seguinte ainda move a câmera
      escada.focarNoCorpo('earth', 'corpo');
      aplicar();
      expect(camera.position.distanceTo(TERRA)).toBeLessThan(10 * RAIO_EQ_TERRA_PC);
    }
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

describe('o piso da câmera é o SOLO REAL de cada corpo (07/10, "câmera mais livre")', () => {
  const pisoDe = (id: string) => {
    const s = soloDoCorpo(id, 2.2546e-8);
    return (s.kDoPiso ?? K_MIN_RAIOS) * s.pisoRaio!;
  };

  it('a Terra e Júpiter no degrau corpo descem a 1,1 raio; o Sol fica em 2', () => {
    const { escada, atlas } = bancada();
    escada.focarNoCorpo('earth', 'corpo');
    expect(atlas.pisoDeZoom / RAIO_EQ_TERRA_PC).toBeCloseTo(K_PISO_DO_CORPO, 12);
    escada.focarNoCorpo('jupiter', 'corpo');
    expect(atlas.pisoDeZoom / RAIO_JUPITER).toBeCloseTo(K_PISO_DO_CORPO, 12);
    // o Sol: regime de brilho conferido, 2 raios como sempre
    expect(pisoDe('sun') / 2.2546e-8).toBeCloseTo(2, 12);
  });

  it('Hipérion: o piso fica ACIMA do pico da forma medida (1,368a)', () => {
    const a = raiosDoRochosoPc('hyperion').a;
    // 1,367691 é o raio máximo da forma da Cassini (Thomas, Joseph & Ansty
    // 2018) em raios de 135 km — o número da linha de RELEVO_DA_LUA
    expect(pisoDe('hyperion') / a).toBeGreaterThan(1.367691);
    expect(pisoDe('hyperion') / a).toBeCloseTo(K_PISO_DO_CORPO * 1.367691, 5);
  });

  it('as luas esculpidas: o piso fica acima do vértice mais alto da malha', () => {
    for (const id of IDS_ESCULPIDOS) {
      const geo = criaGeometriaEsculpida(id);
      const pos = geo.getAttribute('position');
      let pico = 0;
      for (let i = 0; i < pos.count; i++) {
        pico = Math.max(pico, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)));
      }
      geo.dispose();
      expect(pisoDe(id) / raiosDoRochosoPc(id).a, id).toBeGreaterThan(pico);
    }
  });
});

describe('a vista de perto de Sgr A✱ é escala real em qualquer tela (13/11)', () => {
  // MEDIDO no navegador: a 390×844 a esfera de 7,4 RS só cabia na largura
  // a 35,8 RS, fora dos 24 RS da escala real — o selo dizia FORA DE ESCALA
  const dePerto = (largura: number, altura: number, base = 0) => {
    const { escada, camera, atlas } = bancada();
    camera.aspect = largura / altura;
    escada.visitarLugar(LUGARES_DA_BUSCA.find((l) => l.id === 'sagittarius-a')!);
    escada.aproximarDoCorpo();
    const extra = { base, direita: 0 };
    atlas.apply(camera, 1, largura, 0, extra);
    const pela = (raio: number) =>
      enquadrar({
        rAlvo: raio,
        fovDeg: ATLAS_FOV_GRAUS,
        aspect: camera.aspect,
        retanguloUtil: retanguloUtilDoAtlas(1, largura, extra),
      }).distancia;
    return { d: camera.position.distanceTo(GAL.GC_POS), pela };
  };

  it('a mesa não muda: a esfera de 7,4 RS cabe antes da entrega', () => {
    const { d, pela } = dePerto(1280, 800);
    expect(d / pela(7.4 * RS_SGR_A_PC)).toBeCloseTo(1, 6);
    expect(d).toBeLessThan(ENTREGA_DO_BURACO_PC);
  });

  it('retrato, com e sem a folha: a câmera fica dentro da entrega e a sombra cabe', () => {
    for (const [largura, altura, folha] of [
      [390, 844, 0], [390, 844, 0.19], [360, 800, 0], [360, 800, 0.2], [320, 568, 0], [320, 568, 0.28],
    ]) {
      const { d, pela } = dePerto(largura, altura, folha);
      const tela = `${largura}×${altura} folha ${folha}`;
      expect(d / RS_SGR_A_PC, tela).toBeGreaterThan(23.9);
      expect(d, tela).toBeLessThan(ENTREGA_DO_BURACO_PC);
      expect(d, tela).toBeGreaterThanOrEqual(pela(3 * RS_SGR_A_PC));
    }
  });

  it('tela estreita demais: a sombra vence a entrega e não sai do quadro', () => {
    // nos telefones de verdade o núcleo cabe de sobra (ver acima); ele só
    // manda abaixo de ~0,27 de aspecto — 200×800 é a régua do caso extremo
    const { d, pela } = dePerto(200, 800);
    expect(d / pela(3 * RS_SGR_A_PC)).toBeCloseTo(1, 6);
    expect(d).toBeGreaterThan(ENTREGA_DO_BURACO_PC);
  });
});

describe('o "Aproximar" de cometas e de lugares do céu (13/11)', () => {
  it('um cometa desce à cabeça pelo mesmo botão, e o relógio a acompanha', () => {
    const { escada, atlas, maquinaDoTempo } = bancada();
    maquinaDoTempo.jdVivo = 2446471.0;
    escada.visitarSonda('halley');
    expect(escada.escadaViva).toMatchObject({ degrau: 'cometa', podeAproximar: true });
    escada.aproximarDoCorpo();
    const nucleo = posicaoDoCometaNaCena('halley', 2446471.0)!;
    expect(escada.escadaViva).toMatchObject({ degrau: 'cometa', podeAproximar: false });
    expect(atlas.alvo.distanceTo(nucleo)).toBe(0);
    expect(atlas.raioDoAlvo).toBe(poseDoCometaDePerto('halley', 2446471.0, 5.5)!.raio);
    maquinaDoTempo.jdVivo = 2446472.0;
    escada.recomporAlvo();
    expect(atlas.alvo.distanceTo(posicaoDoCometaNaCena('halley', 2446472.0)!)).toBe(0);
    expect(atlas.raioDoAlvo).toBe(poseDoCometaDePerto('halley', 2446472.0, 5.5)!.raio);
  });

  it('só o lugar com vista de perto ganha o botão; Andrômeda enche o quadro sem a câmera entrar nela', () => {
    for (const l of LUGARES_DA_BUSCA.filter((x) => x.raioPc)) {
      const { escada } = bancada();
      escada.visitarLugar(l);
      const noCentro = new THREE.Vector3(l.x, l.y, l.z).distanceToSquared(GAL.GC_POS) < 1e-18;
      expect(escada.escadaViva.podeAproximar, l.id).toBe(noCentro || poseDoLugar(l)?.raioDePerto !== undefined);
    }
    const { escada, atlas, camera, aplicar } = bancada();
    const andromeda = LUGARES_DA_BUSCA.find((l) => l.id === 'andromeda')!;
    escada.visitarLugar(andromeda);
    escada.aproximarDoCorpo();
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'estrela', podeAproximar: false });
    expect(atlas.raioDoAlvo).toBe(poseDoLugar(andromeda)!.raioDePerto);
    // o disco de estrelas do modelo vai até 26 kpc do centro
    expect(camera.position.distanceTo(M31.centro)).toBeGreaterThan(26_000);
  });

  it('S2 aproxima da estrela, não do buraco, e o relógio a acompanha (14/11)', () => {
    const s2 = LUGARES_DA_BUSCA.find((l) => l.id === 's2')!;
    const { escada, atlas, camera, aplicar, maquinaDoTempo } = bancada();
    escada.visitarLugar(s2);
    escada.aproximarDoCorpo();
    aplicar();
    const pose = poseDePertoDaEstrelaS('S2', maquinaDoTempo.jdVivo)!;
    expect(escada.escadaViva).toMatchObject({ degrau: 'estrela', podeAproximar: false });
    expect(atlas.alvo.distanceTo(pose.alvo)).toBe(0);
    // o buraco em quadro, fora da sombra desenhada (~5,5°) que apagaria a estrela
    const paraEstrela = pose.alvo.clone().sub(camera.position);
    const angulo = paraEstrela.angleTo(GAL.GC_POS.clone().sub(camera.position)) / (Math.PI / 180);
    expect(angulo).toBeGreaterThan(8);
    expect(angulo).toBeLessThan(20);
    maquinaDoTempo.jdVivo += 365;
    escada.recomporAlvo();
    expect(atlas.alvo.distanceTo(poseDePertoDaEstrelaS('S2', maquinaDoTempo.jdVivo)!.alvo)).toBe(0);
  });

  it('o Esc de perto sobe UM degrau — lugar, galáxia de cima e cometa voltam à própria vista; o buraco do centro, como antes', () => {
    const passo = (ir: (e: InstanceType<typeof Escada>) => void, jd?: number) => {
      const { escada, atlas, maquinaDoTempo } = bancada();
      if (jd) maquinaDoTempo.jdVivo = jd;
      ir(escada);
      const antes = { alvo: atlas.alvo.clone(), raio: atlas.raioDoAlvo, degrau: escada.escadaViva.degrau };
      escada.aproximarDoCorpo();
      expect(atlas.raioDoAlvo).not.toBe(antes.raio);
      expect(escada.subirDegrau()).toBe(true);
      expect(escada.escadaViva).toMatchObject({ degrau: antes.degrau, podeAproximar: true });
      expect(atlas.alvo.distanceTo(antes.alvo)).toBe(0);
      expect(atlas.raioDoAlvo).toBe(antes.raio);
    };
    const lugar = (id: string) => LUGARES_DA_BUSCA.find((l) => l.id === id)!;
    passo((e) => e.visitarLugar(lugar('andromeda')));
    passo((e) => e.visitarLugar(lugar('via-lactea')));
    passo((e) => e.visitarSonda('halley'), 2446471.0);
    passo((e) => e.irAte(GAL.GC_POS.clone(), 0, 'Sagittarius A*'));
  });

  it('a estrela com corpo: o botão some depois de usado, como nos outros destinos (13/11, TRAPPIST-1)', () => {
    const { escada } = bancada({ comPiloto: true });
    escada.visitarEstrela({ n: 'TRAPPIST-1', x: 12.4, y: 0, z: 0 });
    expect(escada.escadaViva).toMatchObject({ degrau: 'estrela', podeAproximar: true });
    escada.aproximarDoCorpo();
    expect(escada.escadaViva).toMatchObject({ degrau: 'estrela', podeAproximar: false });
  });

  it('a estrela com gás chega com o piso do gás rente à borda do quadro, e a régua e o piso do zoom no corpo (19/11, Achernar)', () => {
    const { escada, atlas } = bancada({ comPiloto: true });
    const focar = vi.spyOn(atlas, 'focar');
    escada.visitarEstrela({ n: 'Achernar', x: 40, y: 0, z: 0 });
    escada.aproximarDoCorpo();
    const dados = estrelaVisitavelPorNome('Achernar')!;
    const raio = raioDaEstrelaPc(dados);
    const ultima = focar.mock.calls.at(-1)!;
    expect(raioDoPisoDoGas(dados)).toBeGreaterThan(MARGEM_DE_ENQUADRAMENTO);
    expect(ultima[1]).toBeCloseTo((raio * raioDoPisoDoGas(dados)) / MARGEM_DE_ENQUADRAMENTO, 15);
    expect(ultima[3]).toMatchObject({ pisoRaio: raio, regua: raio });
  });

  it('a nomeada fora da lista à mão também desce, pela ficha da regra única', () => {
    const arcturus: NamedStar = { n: 'Arcturus', x: 0, y: 11.26, z: 0, m: -0.05, s: 'K1.5III', d: 11.26, ci: 1.23 };
    const { escada } = bancada({ comPiloto: true, named: [arcturus] });
    escada.visitarEstrela(arcturus);
    expect(escada.escadaViva).toMatchObject({ degrau: 'estrela', podeAproximar: true });
    // com `?estrelaslugar=0`, ponto como antes
    const sem = bancada({ named: [arcturus] }).escada;
    sem.visitarEstrela(arcturus);
    expect(sem.escadaViva).toMatchObject({ degrau: 'estrela', podeAproximar: false });
  });
});

describe('a vista dos anéis de Saturno (`ver=aneis`, 16/11): chegar à mão até a camada', () => {
  const KM = kmParaPc(1);
  const SATURNO = paraPc(posicaoDoGiganteUA('saturn', EPOCA_JD_TDB, null)!);
  /** o ponto no frame do anel: raio (km), longitude (rad) e altura (km) */
  function noAnel(p: THREE.Vector3, centro: THREE.Vector3, jd: number) {
    const o = orientacaoInercialDoAnelNaCena(IAU_ORIENTATIONS.saturn, jd);
    const v = p.clone().sub(centro);
    const x = v.dot(new THREE.Vector3(...o.colunaX));
    const y = -v.dot(new THREE.Vector3(...o.colunaZ));
    return { rho: Math.hypot(x, y) / KM, lon: Math.atan2(y, x), z: v.dot(new THREE.Vector3(...o.colunaY)) / KM };
  }

  it('a vista põe o alvo no plano do anel A, com a face acesa no alto — e o corpo em foco continua sendo Saturno', () => {
    const { escada, atlas, camera, aplicar, focos } = bancada({ comSaturno: true });
    escada.focarNoCorpo('saturn', 'aneis');
    aplicar();
    expect(escada.escadaViva).toMatchObject({ degrau: 'aneis', corpoId: 'saturn' });
    expect(escada.verDaEscada).toBe('aneis');
    expect(focos.at(-1)).toBe(nomeDoCorpo('saturn'));
    expect(escada.anelDoDestino).toBe('saturn');
    const p = noAnel(atlas.alvo, SATURNO, EPOCA_JD_TDB);
    expect(p.rho).toBeCloseTo(RAIO_DO_PONTO_KM, 3);
    expect(Math.abs(p.z)).toBeLessThan(1e-3);
    // o polo do alto é o do anel, do lado que o Sol ilumina
    const polo = (atlas as unknown as { polo: THREE.Vector3 }).polo;
    expect(Math.abs(polo.dot(poloDe('saturn')))).toBeCloseTo(1, 9);
    expect(polo.dot(SATURNO.clone().negate())).toBeGreaterThan(0);
    // a câmera chega pela face acesa, 30° acima do plano, a ~1,5 km do ponto
    const daCamera = camera.position.clone().sub(atlas.alvo);
    expect((Math.asin(daCamera.clone().normalize().dot(polo)) * 180) / Math.PI).toBeCloseTo(30, 3);
    // a régua da bancada (4:3, lente de 35°) não é a da mesa; só a ordem de grandeza
    expect(daCamera.length() / KM).toBeGreaterThan(0.5);
    expect(daCamera.length() / KM).toBeLessThan(5);
  });

  it('o anel não é um lugar: a busca não o lista, e só Saturno tem a vista (os outros caem na órbita)', () => {
    const { escada } = bancada({ comSaturno: true });
    expect(escada.corpos.some((c) => c.id === ID_DO_PONTO_DO_ANEL)).toBe(false);
    const achado = resolverFoco(ID_DO_PONTO_DO_ANEL, construirIndice([], escada.corpos, []));
    expect(achado?.entrada).not.toMatchObject({ corpo: { id: ID_DO_PONTO_DO_ANEL } });
    escada.focarNoCorpo('jupiter', 'aneis');
    expect(escada.escadaViva.degrau).not.toBe('aneis');
    expect(escada.verDaEscada).toBe('orbita');
  });

  it('a fileira da ficha em cada vista de Saturno: "Aproximar" fora do corpo, "Sistema" sempre', () => {
    // a bancada não tem posições desenhadas: a órbita vem pela seleção, com a efeméride
    const { escada } = bancada({ comSaturno: true, comEfemeride: true });
    escada.selecionarCorpo('saturn');
    expect(escada.escadaViva).toMatchObject({ degrau: 'orbita', corpoId: 'saturn', podeAproximar: true });
    escada.aproximarDoCorpo();
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'saturn', podeAproximar: false });
    escada.focarNoCorpo('saturn', 'aneis');
    // nos anéis, "Aproximar" leva ao planeta de perto
    expect(escada.escadaViva).toMatchObject({ degrau: 'aneis', corpoId: 'saturn', podeAproximar: true });
    escada.aproximarDoCorpo();
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'saturn' });
    expect(escada.anelDoDestino).toBeNull();
  });

  it('o Esc nos anéis volta à vista de perto de Saturno — como o da lua volta ao pai', () => {
    const { escada } = bancada({ comSaturno: true });
    escada.focarNoCorpo('saturn', 'aneis');
    expect(escada.subirDegrau()).toBe(true);
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'saturn' });
    expect(escada.anelDoDestino).toBeNull();
  });

  it('o piso da roda fica em metros (2,5 m)', () => {
    const { escada, atlas } = bancada({ comSaturno: true });
    escada.focarNoCorpo('saturn', 'aneis');
    expect(atlas.pisoDeZoom / KM).toBeCloseTo(PISO_KM, 9);
    atlas.pinarDistancia(1e-30);
    expect(atlas.distancia / KM).toBeCloseTo(PISO_KM, 9);
  });

  it('com o relógio andando o ponto anda na órbita do material dele, Ω·ρ·Δt, e a câmera vai junto', () => {
    const { escada, atlas, camera, aplicar, maquinaDoTempo } = bancada({ comSaturno: true, comEfemeride: true });
    escada.focarNoCorpo('saturn', 'aneis');
    aplicar();
    // a efeméride de mentira deixa Saturno no lugar: o que se julga é o frame do anel
    const centro = paraPc(efemerideDeMentira().posicaoHeliocentrica('saturn'));
    const antes = noAnel(atlas.alvo, centro, EPOCA_JD_TDB);
    const cameraAntes = noAnel(camera.position, atlas.alvo, EPOCA_JD_TDB);
    const omega = omegaDoAnelCpu(RAIO_DO_PONTO_KM);
    const volta = (x: number) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));
    // um minuto (~1 000 km de arco) e meio dia de céu (~5,8 rad, quase uma volta)
    for (const dias of [60 / 86400, 0.5]) {
      maquinaDoTempo.jdVivo = EPOCA_JD_TDB + dias;
      escada.recomporAlvo();
      aplicar();
      const depois = noAnel(atlas.alvo, centro, maquinaDoTempo.jdVivo);
      expect(depois.rho).toBeCloseTo(antes.rho, 3);
      expect(depois.rho * volta(depois.lon - antes.lon)).toBeCloseTo(depois.rho * volta(omega * dias * 86400), 3);
      // e a câmera gira junto em volta dele, à mesma altura
      const cameraDepois = noAnel(camera.position, atlas.alvo, maquinaDoTempo.jdVivo);
      expect(volta(cameraDepois.lon - cameraAntes.lon - omega * dias * 86400)).toBeCloseTo(0, 6);
      expect(cameraDepois.z).toBeCloseTo(cameraAntes.z, 6);
    }
  });

  it('um SALTO da data (o AO VIVO que liga, a porta ?jd=) refaz a escolha pelo Sol: a vista não é levada pela órbita através dele', () => {
    const centro = paraPc(efemerideDeMentira().posicaoHeliocentrica('saturn'));
    const jd = EPOCA_JD_TDB + 321.08;
    // quem chega já na data nova
    const direto = bancada({ comSaturno: true, comEfemeride: true });
    direto.maquinaDoTempo.jdVivo = jd;
    direto.escada.focarNoCorpo('saturn', 'aneis');
    direto.aplicar();
    const esperado = noAnel(direto.atlas.alvo, centro, jd);
    // quem chegou na época e viu a data saltar para ela
    const { escada, atlas, aplicar, maquinaDoTempo } = bancada({ comSaturno: true, comEfemeride: true });
    escada.focarNoCorpo('saturn', 'aneis');
    aplicar();
    maquinaDoTempo.jdVivo = jd;
    maquinaDoTempo.saltos++;
    escada.recomporAlvo();
    aplicar();
    const depois = noAnel(atlas.alvo, centro, jd);
    expect(depois.rho).toBeCloseTo(esperado.rho, 3);
    expect(depois.lon).toBeCloseTo(esperado.lon, 9);
  });
});

describe('a troca de idioma reemite o foco vivo na língua nova (20/11/2026)', () => {
  it('corpo e lugar trocam o texto, a câmera fica; sem foco, nada renasce', async () => {
    const { definirIdioma, idiomaAtual } = await import('../../lib/idioma');
    const antes = idiomaAtual();
    definirIdioma('pt-BR');
    const { escada, camera, focos } = bancada();
    const andromeda = LUGARES_DA_BUSCA.find((l) => l.id === 'andromeda')!;
    const reemitido = (idioma: 'pt-BR' | 'en') => {
      definirIdioma(idioma);
      escada.reemitirFoco();
      return focos.at(-1);
    };
    escada.focarNoCorpo('earth', 'corpo');
    const pose = camera.position.toArray();
    expect(reemitido('en')).toBe('Earth');
    expect(camera.position.toArray()).toEqual(pose);
    expect(escada.escadaViva).toMatchObject({ degrau: 'corpo', corpoId: 'earth' });
    expect(reemitido('pt-BR')).toBe('Terra');
    // o lugar escolhido pela busca (sem nome guardado) e pelo clique (com o nome da língua velha)
    escada.visitarLugar(andromeda);
    const emPt = focos.at(-1);
    expect(reemitido('en')).toBe(andromeda.nomeEn);
    expect(andromeda.nomeEn).not.toBe(emPt);
    escada.selecionarPonto(new THREE.Vector3(andromeda.x, andromeda.y, andromeda.z), 1, andromeda.nomeEn!, andromeda);
    expect(reemitido('pt-BR')).toBe(emPt);
    // de volta à casa: o foco é nenhum, e continua nenhum
    escada.focarNoSistema();
    expect(reemitido('en')).toBeNull();
    definirIdioma(antes);
  });

  it('os lugares do mesmo centro (S2, a Via Láctea de cima) guardam o próprio nome, não o de Sagittarius A✱', async () => {
    const { definirIdioma, idiomaAtual } = await import('../../lib/idioma');
    const antes = idiomaAtual();
    for (const id of ['s2', 'via-lactea']) {
      definirIdioma('pt-BR');
      const lugar = LUGARES_DA_BUSCA.find((l) => l.id === id)!;
      const { escada, focos } = bancada();
      escada.visitarLugar(lugar);
      definirIdioma('en');
      escada.reemitirFoco();
      expect(focos.at(-1), id).toBe(lugar.nomeEn ?? lugar.nome);
      definirIdioma('pt-BR');
      escada.reemitirFoco();
      expect(focos.at(-1), id).toBe(lugar.nome);
    }
    definirIdioma(antes);
  });

  it('"Aproximar" da Via Láctea de cima chama a barra de Sagittarius A✱, e o Esc devolve o nome do lugar', async () => {
    const { definirIdioma, idiomaAtual } = await import('../../lib/idioma');
    const antes = idiomaAtual();
    definirIdioma('pt-BR');
    const lugar = (id: string) => LUGARES_DA_BUSCA.find((l) => l.id === id)!;
    const [via, sgr] = [lugar('via-lactea'), lugar('sagittarius-a')];
    const { escada, focos } = bancada();
    escada.visitarLugar(via);
    escada.aproximarDoCorpo();
    expect(focos.at(-1)).toBe(sgr.nome);
    definirIdioma('en');
    escada.reemitirFoco();
    expect(focos.at(-1)).toBe(sgr.nomeEn ?? sgr.nome);
    definirIdioma('pt-BR');
    expect(escada.subirDegrau()).toBe(true);
    expect(focos.at(-1)).toBe(via.nome);
    definirIdioma(antes);
  });
});
