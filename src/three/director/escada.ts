// ============================================================
// A ESCADA DO ATLAS — a navegação por DEGRAUS (D7/Onda 7) numa peça. O
// censo do que mora aqui:
//
//  - o alvo e o voo: `visitarEstrela`, `irAte`, `focarNoCorpo`,
//    `focarNaLua`, `focarNoAnao`, `focarNoSistema`, `casaViva`;
//  - as transições que a ESCOLHA dispara: `receitaDoCorpo`,
//    `selecionarCorpo`, `selecionarPonto`;
//  - os degraus: `aproximarDoCorpo`, `aproximarDoSol`, `subirDegrau`
//    (a descida morreu com a roda de degraus, item 73), `rampaDaEscada`,
//    `escada`/`escadaViva`/`verDaEscada`, `emitirEscada`;
//  - o PINO do zoom contínuo: `pinarEmRaios` (a roda escreve `?d=`) e
//    `esquecerPinoDoLink` (o primeiro gesto apaga o pino do link);
//  - o religador do relógio (`enquadreVivo` → `recomporAlvo`), a
//    reaplicação quando a efeméride chega tarde
//    (`reenquadrarAposEfemeride`) e as medidas de apoio
//    (`raioFisicoDe`, `poloDoCorpo`, `posicaoDesenhada`,
//    `enquadrarAgora`, `nomeadas`, `corpos`).
//
// O QUE NÃO MORA MAIS AQUI (§11, um arquivo um assunto): o GESTO — o
// hit-test, a memória do clique, escolher e mergulhar — mudou-se para
// `escolha.ts` em 22/08, com a semântica linha a linha. Ficaram as três
// fachadas de 1 linha (`tryVisit`, `selecionarNoPonto`,
// `mergulharNoEscolhido`), porque quem as chama é o director.
//
// Morava no director.ts num bloco de ~860 linhas (onda da arquitetura,
// Parte 1, corte 9); a semântica é a mesma, linha a linha, e os métodos
// são chamados nos MESMOS pontos — fachadas de 1 linha no director
// servem o App, o HUD, os gates e as fiações do construtor. O trio do
// foco (`ver`/`focoEstrela`/`focoCorpoId`) e o `pinoDeBoot` têm UM
// dono: só a escada os escreve — é por isso que `selecionarCorpo` e
// `selecionarPonto` ficaram aqui e não foram com o gesto. O director lê
// `focoCorpoId` para o selo (`evLuzDoFoco`). Os punhos de instância
// (atlas, máquina do tempo, rótulos, o raio do Sol e o punho do salto)
// entram pelo construtor com o nome que os textos dos métodos exigem;
// o que só existe depois do construtor do director (engine, roam) e o
// que muda por quadro (fase, quadros da fase, planetas, as listas de
// corpos, o catálogo) entram por fio, atrás de getters com os mesmos
// nomes de sempre.
// ============================================================
import * as THREE from 'three';
import type { Engine } from '../core/engine';
import type { Phase } from '../fases';
import type { VerDaEscada } from '../selo';
import type { NamedStar, StarsMeta } from '../config';
import type { Planetas } from '../world/planetas/planetas';
import type { FreeRoam } from '../cinematic/cameraRig';
import type { CorpoBuscavel } from '../../lib/buscaEstrelas';
import type { MaquinaDoTempo } from './maquinaDoTempo';
import type { Rotulos } from './rotulos';
import type { AtlasRig } from '../cinematic/atlasRig';
import {
  orbitaMaisExterna,
  raioDeEnquadramentoEstelar,
} from '../cinematic/atlasRig';
import { CORPOS_DO_SISTEMA, LUAS_DO_SISTEMA, HELIO_SEM_PONTO } from '../atlasConfig';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../../lib/atlas/frameGalactico';
import { baseCorpoEquatorial } from '../../lib/atlas/orientacao';
import { BODY_AXES, IAU_ORIENTATIONS } from '../../lib/atlas/iauOrientation';
import { RAIO_EQ_TERRA_PC, posicaoDaTerraUA } from '../world/corpos/terra';
import { RAIO_LUA_PC } from '../world/corpos/lua';
import type { RochosoResolvido } from '../world/corpos/rochoso';
import { posicaoDoRochosoUA, raiosDoRochosoPc } from '../world/corpos/rochoso';
import type { GiganteResolvido } from '../world/corpos/gigante';
import { posicaoDoGiganteUA, raiosDoGigantePc } from '../world/corpos/gigante';
import { RETRATO_2026 } from '../world/planetas/retrato2026';
import type { IdRetrato } from '../world/planetas/retrato2026';
import { escalaDaUi, larguraDeCss } from '../../lib/uiScale';
import { Escolha } from './escolha';
// o centro do frame heliocêntrico mora no vizinho neutro
// (`cinematic/enquadramento.ts`): exportá-lo DAQUI fazia o único ciclo de
// import de valor do `src/` — a escada precisa da `Escolha`, e a escolha
// precisava do ponto
import { ORIGEM } from '../cinematic/enquadramento';

/** rascunho do polo do corpo — o rig COPIA, ninguém guarda a referência */
const POLO_DO_CORPO = new THREE.Vector3();

/**
 * Posição da efeméride (eclíptica heliocêntrica, em UA) → frame da CENA
 * (equatorial, em pc). Era a MESMA arrow escrita duas vezes, em
 * `focarNaLua` e em `enquadreVivo` — uma conta, uma função.
 */
function paraPc(p: { x: number; y: number; z: number }): THREE.Vector3 {
  const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
  return new THREE.Vector3(
    eq[0] * AU_PARA_PC,
    eq[1] * AU_PARA_PC,
    eq[2] * AU_PARA_PC
  );
}

/**
 * A ESCADA DE NAVEGAÇÃO (D7): em que degrau o enquadramento está.
 * `estrela` fica fora da escada de corpos (não tem "aproximar" — o
 * corpo resolvido dela é Onda 7), mas o botão "sistema" e o Esc valem.
 */
export interface EstadoDaEscada {
  degrau: 'sistema' | 'orbita' | 'corpo' | 'lua' | 'estrela';
  /** existe degrau abaixo alcançável pelo botão "aproximar"? Só quando
   *  o corpo em foco tem MESH resolvido (Terra nesta fase) — aproximar
   *  de um ponto fotométrico enquadraria um clarão sem corpo. */
  podeAproximar: boolean;
  /**
   * O ID do corpo em foco — `null` no enquadramento de abertura e quando
   * o foco é uma estrela (item 74, 22/08).
   *
   * O `onFoco` sempre emitiu só o NOME, que serve para escrever na tela e
   * não serve para procurar nada: a ficha precisa do id para casar o corpo
   * com `GM_CORPOS`, com `BODY_AXES` e com `corpos.json`. Ele viaja junto
   * com o degrau porque a escada é a ÚNICA escritora do foco — a fronteira
   * declarada no cabeçalho de `escolha.ts` —, e uma segunda rota do id para
   * o React seria a segunda escritora.
   *
   * `degrau === 'estrela'` continua sendo o que diz que o foco é estelar:
   * um campo `estrela` ao lado seria a mesma verdade escrita duas vezes. A
   * ficha de ESTRELA (item 74, parte B) vai precisar do `NamedStar` inteiro,
   * e é ela que o traz.
   */
  corpoId: string | null;
}

export class Escada {
  /**
   * O DEGRAU DA ESCADA (F2b/D7): `orbita` é a semântica de sempre do
   * `?foco=`; `corpo` é o alvo com raio físico. O degrau "lua" não é um
   * `ver` — é o foco na Lua (`focoCorpoId === 'moon'`), sempre com o
   * pai em quadro. A URL é ESPELHO (o `urlComMomento` escreve
   * `?ver=corpo`), nunca painel — precedente `?jd=`.
   */
  private ver: VerDaEscada = 'orbita';
  /** o foco vivo é uma ESTRELA (fora da escada de corpos)? */
  private focoEstrela = false;
  /** o corpo em FOCO no Atlas (id do retrato) — só a escada escreve;
   *  o director o lê para o selo (o ΔEV de `evLuzDoFoco` é dele). */
  focoCorpoId: string | null = null;
  /**
   * O `?d=` QUE CHEGOU PELO LINK, em raios do alvo — e ele precisa
   * SOBREVIVER à efeméride que chega tarde.
   *
   * A efeméride do Atlas nasce no `fetch` da entrada no modo, então ela
   * sempre chega DEPOIS do boot: quando chega,
   * `reenquadrarAposEfemeride` refaz o enquadramento do degrau vivo, e
   * `focar` zera o pino por lei (alvo novo nasce no enquadramento). Sem
   * este campo, todo link com `?d=` reproduzia a vista por um segundo e
   * então voltava sozinho para o enquadramento — link que não reproduz
   * a vista não é link.
   *
   * Morre no primeiro gesto do visitante (a roda e o Esc o limpam): a
   * partir dali quem manda é a mão, não o endereço.
   */
  private pinoDeBoot: number | null = null;

  /** o GESTO — hit-test, memória do clique, escolher e mergulhar
   *  (`escolha.ts`); nasce no construtor e só a escada o segura */
  private readonly escolha: Escolha;

  /** o rig do Atlas — a MESMA instância do director, com o nome que os
   *  textos dos métodos exigem (`this.atlas.focar`/`recompor`/`apply`) */
  private readonly atlas: AtlasRig;
  /** a máquina do tempo — o instante vivo, a efeméride e a busca da fonte */
  private readonly maquinaDoTempo: MaquinaDoTempo;
  /** o raio com que o Sol foi construído, em pc — a fonte única segue
   *  sendo o campo `solRaioPc` do director, entregue uma vez */
  private readonly solRaioPc: number;
  /** a câmera saltou — o punho é do director (LUT do raymarch, snap da
   *  cessão e contagem da captura moram lá) */
  private readonly teletransportou: () => void;
  /** as duas emissões da escada para o React — fio de DirectorEvents */
  private readonly events: {
    onFoco: (nome: string | null) => void;
    onEscada: (estado: EstadoDaEscada) => void;
  };

  private readonly fios: {
    engine: () => Engine;
    roam: () => FreeRoam;
    fase: () => Phase;
    quadrosDaFase: () => number;
    shotMode: () => boolean;
    reducedMotion: () => boolean;
    planetas: () => Planetas | null;
    meta: () => StarsMeta | undefined;
    rochosos: () => readonly { corpo: RochosoResolvido }[];
    gigantes: () => readonly { corpo: GiganteResolvido }[];
  };

  constructor(dono: {
    atlas: AtlasRig;
    maquinaDoTempo: MaquinaDoTempo;
    rotulos: Rotulos;
    solRaioPc: number;
    teletransportou: () => void;
    events: Escada['events'];
    fios: Escada['fios'];
  }) {
    this.atlas = dono.atlas;
    this.maquinaDoTempo = dono.maquinaDoTempo;
    this.solRaioPc = dono.solRaioPc;
    this.teletransportou = dono.teletransportou;
    this.events = dono.events;
    this.fios = dono.fios;
    this.escolha = new Escolha({
      escada: this,
      rotulos: dono.rotulos,
      fios: { fase: dono.fios.fase, meta: dono.fios.meta },
    });
  }

  // Os getters preservam os NOMES que o corpo dos métodos sempre usou —
  // a escada é a do director, linha a linha; só a origem do dado virou
  // fio (o que muda por quadro, e os dois punhos que nascem depois do
  // construtor do director: engine e roam).
  private get engine(): Engine {
    return this.fios.engine();
  }
  private get roam(): FreeRoam {
    return this.fios.roam();
  }
  private get phase(): Phase {
    return this.fios.fase();
  }
  private get quadrosDaFase(): number {
    return this.fios.quadrosDaFase();
  }
  private get shotMode(): boolean {
    return this.fios.shotMode();
  }
  private get reducedMotion(): boolean {
    return this.fios.reducedMotion();
  }
  private get planetas(): Planetas | null {
    return this.fios.planetas();
  }
  private get meta(): StarsMeta | undefined {
    return this.fios.meta();
  }
  private get rochosos(): readonly { corpo: RochosoResolvido }[] {
    return this.fios.rochosos();
  }
  private get gigantes(): readonly { corpo: GiganteResolvido }[] {
    return this.fios.gigantes();
  }

  // ---- as três fachadas do GESTO (o corpo delas mora em escolha.ts) ----
  /** clique curto no voo livre: a câmera VOA até o nome mais próximo */
  tryVisit(x: number, y: number) {
    this.escolha.tryVisit(x, y);
  }
  /** clique simples no Atlas: ESCOLHE o alvo sem mover a câmera */
  selecionarNoPonto(x: number, y: number) {
    this.escolha.selecionarNoPonto(x, y);
  }
  /** duplo clique no Atlas: MERGULHA no que o clique escolheu */
  mergulharNoEscolhido() {
    this.escolha.mergulharNoEscolhido();
  }

  /**
   * A RECEITA DE ENQUADRAMENTO de um corpo QUALQUER, no instante vivo —
   * a irmã de `enquadreVivo`, que só sabe do degrau em que se está.
   * `null` quer dizer "ainda não dá para enquadrar" (lua ou anão sem
   * efeméride carregada), e quem chama pede a fonte.
   */
  private receitaDoCorpo(id: string): {
    alvo: THREE.Vector3;
    raio: number;
    eixoDe: THREE.Vector3;
    pisoRaio: number | null;
    ver: VerDaEscada;
  } | null {
    if (id === 'sun') {
      return {
        alvo: ORIGEM.clone(),
        raio: this.solRaioPc,
        eixoDe: this.casaViva()?.eixo ?? orbitaMaisExterna().posicao,
        pisoRaio: this.solRaioPc,
        ver: 'corpo',
      };
    }
    const jd = this.maquinaDoTempo.jdVivo;
    const ef = this.maquinaDoTempo.efemeride;
    const lua = LUAS_DO_SISTEMA.find((l) => l.id === id);
    if (lua) {
      if (!ef) return null;
      const pos = paraPc(ef.posicaoHeliocentrica(id, jd));
      // o raio é o de BODY_AXES, a MESMA fonte de `focarNaLua`
      const raio = id === 'moon' ? RAIO_LUA_PC : raiosDoRochosoPc(id).a;
      return { alvo: pos, raio, eixoDe: pos, pisoRaio: raio, ver: 'corpo' };
    }
    // planetas e anões: alvo = o corpo, esfera = a ÓRBITA dele — a
    // mesma lei de `focarNoCorpo`, e a posição sai da efeméride viva
    // (sem ela, do ponto DESENHADO, que é onde o visitante clicou)
    const pos = ef ? paraPc(ef.posicaoHeliocentrica(id, jd)) : this.posicaoDesenhada(id);
    if (!pos || pos.lengthSq() === 0) return null;
    return {
      alvo: pos,
      raio: pos.length(),
      eixoDe: pos,
      pisoRaio: this.raioFisicoDe(id),
      ver: 'orbita',
    };
  }

  /** escolhe um corpo do sistema SEM mover a câmera — a transição de
   *  estado que `Escolha.selecionarNoPonto` (`escolha.ts`) dispara. Fica
   *  AQUI porque escreve o trio do foco, que tem um escritor só. */
  selecionarCorpo(id: string) {
    const r = this.receitaDoCorpo(id);
    if (!r) {
      // sem efeméride não há posição de lua nem de anão: pede a fonte e
      // não inventa alvo nenhum — o mesmo contrato de `focarNaLua`
      this.maquinaDoTempo.garantirEfemerides();
      return;
    }
    this.atlas.selecionar(r.alvo, r.raio, r.eixoDe, { pisoRaio: r.pisoRaio });
    this.enquadrarAgora();
    this.focoCorpoId = id;
    this.focoEstrela = false;
    this.ver = r.ver;
    this.pinoDeBoot = null;
    const nome =
      CORPOS_DO_SISTEMA.find((c) => c.id === id)?.nome ??
      LUAS_DO_SISTEMA.find((l) => l.id === id)?.nome ??
      HELIO_SEM_PONTO.find((a) => a.id === id)?.nome ??
      null;
    this.events.onFoco(nome);
    this.emitirEscada();
    this.teletransportou();
  }

  /** escolhe uma ESTRELA (ou o centro galáctico) sem mover a câmera —
   *  mesma fronteira de `selecionarCorpo`: quem chama é `escolha.ts` */
  selecionarPonto(pos: THREE.Vector3, raio: number, nome: string) {
    this.atlas.selecionar(pos, raio, pos);
    this.enquadrarAgora();
    this.focoCorpoId = null;
    this.focoEstrela = true;
    this.ver = 'orbita';
    this.pinoDeBoot = null;
    this.events.onFoco(nome);
    this.emitirEscada();
    this.teletransportou();
  }

  /**
   * AS 1.726 NOMEADAS, para quem precisa procurar entre elas (F3). A
   * paleta da busca monta o índice sobre esta lista em vez de baixar
   * `stars_meta.json` outra vez: o Director já a tem na memória desde o
   * `init`, e um segundo fetch de 385 kB para ler o mesmo dado seria uma
   * segunda fonte de verdade com custo de rede.
   */
  get nomeadas(): readonly NamedStar[] {
    return this.meta?.named ?? [];
  }

  /**
   * O MESMO destino do clique num rótulo, escolhido pelo NOME (F3). É a
   * porta pública por onde a paleta da busca chega — e ela cai no
   * caminho que já existia, `irAte`, de propósito: as duas fases seguem
   * fazendo o que faziam (o Atlas ENQUADRA de onde está, o voo livre
   * VOA até lá), cada uma com a lei que lhe cabe (ver `irAte`).
   */
  visitarEstrela(estrela: { n: string; x: number; y: number; z: number }) {
    const pos = new THREE.Vector3(estrela.x, estrela.y, estrela.z);
    // a lei de APROXIMAÇÃO do voo livre, que é onde este número é
    // consumido: 8% do caminho a percorrer, entre 0,8 e 9 pc
    this.irAte(
      pos,
      THREE.MathUtils.clamp(
        pos.distanceTo(this.engine.camera.position) * 0.08,
        0.8,
        9
      ),
      estrela.n
    );
  }

  /**
   * O mesmo alvo, os dois modos — e DUAS leis, porque o número significa
   * duas coisas. No voo livre `arriveDist` é a distância de CHEGADA de um
   * voo, e sair de onde se está é o certo. No Atlas ele seria o raio da
   * esfera ENQUADRADA, e aí depender da câmera destrói a
   * reprodutibilidade: o `apply` move a câmera na mesma chamada, então
   * clicar duas vezes no mesmo nome daria duas vistas e o `?foco=` do
   * link não reproduziria a vista de quem o copiou. Por isso o Atlas tira
   * o raio do ALVO (`raioDeEnquadramentoEstelar`, D5) e ignora o
   * `arriveDist` que veio.
   *
   * `nome` só serve ao Atlas: é o que o cabeçalho da ficha passa a ler. No
   * voo livre quem anuncia o destino é a linha de rumo, que já existe.
   */
  irAte(pos: THREE.Vector3, arriveDist: number, nome: string | null = null) {
    if (this.phase === 'atlas') {
      this.atlas.focar(pos, raioDeEnquadramentoEstelar(pos.length()), pos, {
        rampa: this.rampaDaEscada(),
      });
      this.enquadrarAgora();
      // estrela em foco: nenhum CORPO em foco — o ΔEV do selo cala
      this.focoCorpoId = null;
      this.focoEstrela = true;
      this.ver = 'orbita';
      this.events.onFoco(nome);
      this.emitirEscada();
      this.teletransportou();
      return;
    }
    this.roam.startVisit({ pos, arriveDist });
  }

  /**
   * A ESFERA DA CASA VIVA — raio e DIREÇÃO do enquadramento de
   * abertura, lidos da efeméride no instante pedido. `null` quer dizer
   * "sem fonte carregada", e aí quem chama cai no retrato congelado.
   *
   * Extraída de `focarNoSistema` (era o corpo dele, linha por linha)
   * quando o degrau do CORPO DO SOL passou a precisar da MESMA direção:
   * a descida casa→Sol é um DOLLY PURO no eixo em que o visitante já
   * estava — só a distância muda —, e duas contas do "mais externo"
   * seriam duas direções que divergiriam no primeiro salto de data.
   */
  private casaViva(): { raio: number; eixo: THREE.Vector3 } | null {
    if (!this.maquinaDoTempo.efemeride) return null;
    const jd = this.maquinaDoTempo.jdVivo;
    let raioUA = 0;
    const externo = { x: 0, y: 0, z: 0 };
    for (const c of CORPOS_DO_SISTEMA) {
      if (c.id === 'sun') continue;
      const p = this.maquinaDoTempo.efemeride.posicaoHeliocentrica(c.id, jd);
      const r = Math.hypot(p.x, p.y, p.z);
      if (r > raioUA) {
        raioUA = r;
        externo.x = p.x;
        externo.y = p.y;
        externo.z = p.z;
      }
    }
    const eq = eclipticaParaEquatorial([externo.x, externo.y, externo.z]);
    return {
      raio: raioUA * AU_PARA_PC,
      eixo: new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC),
    };
  }

  /**
   * O ENQUADRAMENTO DE ABERTURA: o sistema inteiro, visto de fora da
   * órbita mais externa. É a vista com que o Atlas abre, o destino do
   * clique no Sol e — desde a F2 — a ação da linha ESCALA do selo, que
   * é o único enquadramento em que o que domina o quadro é 1:1.
   *
   * ABERTURA NA ÉPOCA VIVA (F2b) — OVERRIDE DECLARADO (emendas
   * D-E5/T-E12): isto REVERTE a pendência 7 da Onda 5 ("compor a
   * posição viva é da onda das órbitas"), com razão: a posição viva só
   * depende da efeméride e do tempo vivo, que JÁ EXISTEM — órbitas
   * desenhadas nunca foram pré-requisito da conta. Com a fonte
   * carregada, quem é "o mais externo" e onde ele está saem da
   * efeméride NO INSTANTE PEDIDO (na época o resultado reproduz o
   * retrato — o A/B de `?jd=EPOCA` é bit a bit); sem fonte fica o
   * retrato congelado com o badge do tempo contando a verdade — o
   * caminho existente. O fecho da onda re-registra a pendência no
   * PLANO-ATLAS ("justificativa errada conta como falha", Onda 9).
   */
  focarNoSistema() {
    const congelada = orbitaMaisExterna();
    // sem efeméride carregada fica o RETRATO congelado, que é o que o
    // `AtlasRig.focarNoSistema` sempre fez — a conta agora é uma só
    // porque o piso do zoom precisa entrar nas DUAS entradas
    const casa = this.casaViva() ?? { raio: congelada.raio, eixo: congelada.posicao };
    // O PISO DO ZOOM DA ABERTURA É O SOL, e não a esfera enquadrada
    // (item 73, 22/08). Na abertura o ALVO É O SOL — a esfera do
    // sistema é centrada nele —, e a lei do modo é "um alvo e uma
    // distância": a roda tem de descer continuamente até o corpo do
    // alvo, como desce em Saturno. Com o piso na esfera enquadrada eram
    // 70,8 UA e CINCO estalos de curso; com o raio físico do Sol são
    // 0,00930 UA e 40 estalos, a mesma ordem das ~50 de Saturno.
    //
    // A queda não abre regime de brilho novo: 2 raios solares é MAIS
    // PERTO que o degrau do corpo do Sol (6,40 raios), que a
    // `luz-do-quadro` já julga, e a etapa 1 conferiu na tela que não
    // lava o quadro. O que ela revoga é a nota "descer ao Sol é outro
    // degrau" — que valia enquanto a roda trocava de degrau.
    this.atlas.focar(ORIGEM, casa.raio, casa.eixo, {
      rampa: this.rampaDaEscada(),
      pisoRaio: this.solRaioPc,
    });
    this.enquadrarAgora();
    this.focoCorpoId = null;
    this.focoEstrela = false;
    this.ver = 'orbita';
    this.events.onFoco(null);
    this.emitirEscada();
    this.teletransportou();
  }

  /**
   * A rampa entre degraus (F2b/D7) só anima o que o olho JÁ ESTAVA
   * VENDO: dentro da fase, com pelo menos um quadro do modo desenhado,
   * sem `?shot=` e sem reduced-motion — entrada, deep-link e captura
   * seguem instantâneos (contrato da Onda 5).
   *
   * O QUADRO DESENHADO É A CLÁUSULA NOVA (2026-08-14), e ela é o
   * conserto do defeito 2 do commit `51d7777` — o "`?foco=sol&ver=corpo`
   * não desce". A entrada no modo já era seca por uma sutileza de
   * ORDEM: `entrarNoAtlas` chama `focarNoSistema()` ANTES de
   * `setPhase('atlas')`, então a fase velha derrubava esta guarda. O
   * `?foco=` do boot vem DEPOIS da fase virar (o App o aplica ao voltar
   * do `entrarNoAtlas`), então ele caía na rampa: a câmera nascia na
   * abertura, a 226,84 UA, e só chegava ao Sol se alguém deixasse os
   * quadros correrem. Medido: `rampaT = 0` e a câmera parada em
   * 226,845 UA com o degrau já dizendo `corpo`/`sun` — o endereço
   * prometia uma vista e mostrava outra. Link que não reproduz a vista
   * não é link.
   *
   * A cláusula é o que a docstring sempre disse, agora escrita em
   * código: no primeiro quadro do modo NÃO HÁ pose de partida a
   * interpolar — não há nada na tela para o olho seguir.
   */
  private rampaDaEscada(): boolean {
    return (
      this.phase === 'atlas' &&
      this.quadrosDaFase > 0 &&
      !this.shotMode &&
      !this.reducedMotion
    );
  }

  /** o degrau vivo — o que o `onEscada` publica e o `?ver=` espelha. */
  private get escada(): EstadoDaEscada {
    const degrau: EstadoDaEscada['degrau'] =
      this.focoCorpoId !== null && LUAS_DO_SISTEMA.some((l) => l.id === this.focoCorpoId)
        ? 'lua'
        : this.focoCorpoId
          ? this.ver === 'corpo'
            ? 'corpo'
            : 'orbita'
          : this.focoEstrela
            ? 'estrela'
            : 'sistema';
    return {
      degrau,
      corpoId: this.focoCorpoId,
      // aproximar só desce para corpo com MESH resolvido — a lista é
      // dos corpos CONSTRUÍDOS, nunca redigitada: a Terra (F2a), os
      // planetas rochosos (F3) e os gigantes (F4)
      podeAproximar:
        degrau === 'orbita' &&
        (this.focoCorpoId === 'earth' ||
          this.rochosos.some((r) => r.corpo.planeta && r.corpo.id === this.focoCorpoId) ||
          this.rochosos.some(
            (r) => !r.corpo.planeta && HELIO_SEM_PONTO.some((a) => a.id === r.corpo.id) && r.corpo.id === this.focoCorpoId
          ) ||
          this.gigantes.some((g) => g.corpo.planeta && g.corpo.id === this.focoCorpoId)),
    };
  }

  /** o `ver` vivo, para o `urlComMomento` espelhar `?ver=corpo`. */
  get verDaEscada(): VerDaEscada {
    return this.ver;
  }

  get escadaViva(): EstadoDaEscada {
    return this.escada;
  }

  private emitirEscada() {
    this.events.onEscada(this.escada);
  }

  /**
   * OS DEZ CORPOS COMO ALVO (Onda 5) — o clique no rótulo, a escolha na
   * paleta e o `?foco=terra` caem todos aqui.
   *
   * O ALVO É O CORPO, e a esfera enquadrada tem o raio da ÓRBITA dele
   * (a distância heliocêntrica viva) — ou seja: Marte no centro, com a
   * escala da órbita em quadro.
   *
   * ERA CENTRADA NO SOL até 22/08, e é a linha que produzia a confusão
   * do item 73: "em quadro: Marte" com o SOL no meio da tela e Marte um
   * ponto na borda. Com a roda virando zoom o defeito deixou de ser só
   * de leitura — a distância de zoom se mede AO ALVO, e com o alvo no
   * Sol a roda aproximaria do SOL enquanto a linha de contexto anuncia
   * Marte. Move pixel, e é mudança pedida.
   *
   * A DIREÇÃO continua saindo do corpo, e é ela que dá a vista
   * privilegiada dele.
   *
   * A posição sai do atributo VIVO da camada, não do retrato: quem
   * clicou num rótulo clicou onde o ponto está DESENHADO, inclusive
   * depois de um salto de data.
   *
   * O SOL TEM OS DOIS DEGRAUS, e o `ver` é que decide qual — a escada
   * o desviava ANTES de olhar o argumento, e era por isso que
   * `?foco=sol&ver=corpo` não existia:
   *
   *  · `orbita` (o default) continua sendo a ABERTURA, palavra por
   *    palavra do que esta docstring já dizia: enquadrar "a órbita do
   *    Sol" seria enquadrar uma esfera de raio zero, e clicar no Sol de
   *    dentro do Atlas sempre quis dizer voltar para casa. O contrato
   *    de `?foco=sol` não muda um bit.
   *  · `corpo` desce ao CORPO do Sol. O raciocínio da esfera de raio
   *    zero valia para a órbita e não vale para o corpo: o Sol TEM raio
   *    físico na cena desde a onda do Sol real (`RAIO_DO_SOL_NA_CENA`),
   *    é o corpo mais bonito da casa, e era o único que a escada
   *    recusava — o visitante não tinha caminho NENHUM até ele.
   */
  focarNoCorpo(id: string, ver: VerDaEscada = 'orbita') {
    if (this.phase !== 'atlas') return;
    if (id === 'sun') {
      if (ver === 'corpo') this.aproximarDoSol();
      else this.focarNoSistema();
      return;
    }
    // A LUA e as luas da F3 vão direto ao degrau delas (D7): escolher
    // uma lua é vê-la com o pai em quadro — não existe "órbita de lua
    // em torno do Sol", e `?foco=fobos&ver=orbita` cai aqui também
    // (documentado: para uma lua os dois valores de ?ver= dão o mesmo
    // degrau).
    if (LUAS_DO_SISTEMA.some((l) => l.id === id)) {
      this.focarNaLua(id);
      return;
    }
    if (HELIO_SEM_PONTO.some((a) => a.id === id)) {
      this.focarNoAnao(id);
      return;
    }
    // O GESTO DA DESCIDA (D7): clicar no MESMO corpo já focado em
    // órbita desce um degrau — é o gesto irmão do botão "aproximar".
    if (
      ver === 'orbita' &&
      id === this.focoCorpoId &&
      this.ver === 'orbita' &&
      this.escada.podeAproximar
    ) {
      this.aproximarDoCorpo();
      return;
    }
    const i = CORPOS_DO_SISTEMA.findIndex((c) => c.id === id);
    if (i < 0 || !this.planetas) return;
    if (ver === 'corpo') {
      // `?foco=marte&ver=corpo` — o degrau reproduzido por URL
      this.focoCorpoId = id;
      this.ver = 'orbita';
      if (this.escada.podeAproximar) {
        this.aproximarDoCorpo();
        return;
      }
      // corpo ainda sem mesh resolvido: o degrau pedido não existe —
      // cai na órbita (o degrau que existe), sem fingir o que não há
    }
    const p = this.planetas.posicoes;
    const pos = new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    if (pos.lengthSq() === 0) return;
    this.atlas.focar(pos, pos.length(), pos, {
      rampa: this.rampaDaEscada(),
      // o PISO do zoom se mede no corpo, não na órbita dele (item 73)
      pisoRaio: this.raioFisicoDe(id),
    });
    this.enquadrarAgora();
    // o selo lê o ΔEV DESTE corpo enquanto ele estiver em foco (D2)
    this.focoCorpoId = id;
    this.focoEstrela = false;
    this.ver = 'orbita';
    this.events.onFoco(CORPOS_DO_SISTEMA[i].nome);
    this.emitirEscada();
    this.teletransportou();
  }

  /**
   * O POLO NORTE do corpo, no frame da CENA, no instante pedido — o
   * `up` dos degraus "corpo" e "lua" (Onda 7).
   *
   * O dado já existia pronto e puro: `baseCorpoEquatorial` avalia o
   * modelo IAU/WGCCRE do kernel `pck00011` e devolve o polo em
   * EQUATORIAL J2000, que É o frame da cena — é a mesma função que
   * orienta a malha da Terra (`orientacaoDoCorpoNaCena`). Nenhuma tabela
   * nova, nenhuma conversão nova: se a câmera e a malha discordassem, o
   * globo apareceria torto contra o próprio eixo desenhado.
   *
   * Corpo sem registro IAU devolve `null` e o chamador fica com a
   * eclíptica — que é o que o Atlas sempre fez.
   */
  /**
   * O RAIO FÍSICO de um corpo do sistema, em pc — a régua do PISO do
   * zoom da roda (`K_MIN_RAIOS`, item 73). `null` para quem não tem.
   *
   * FONTE ÚNICA: `BODY_AXES` do kernel `pck00011`, lida pela MESMA
   * função que dá raio às malhas. `raiosDoRochosoPc` é literalmente
   * `BODY_AXES[id]` convertido — o nome é do módulo em que ela nasceu,
   * não uma restrição de classe, e usar a irmã de gigante daria o mesmo
   * número por um segundo caminho. O SOL não está na tabela: ele é o
   * `solRaioPc` que o palco entregou, a mesma fonte única que o degrau
   * do corpo dele usa.
   */
  private raioFisicoDe(id: string): number | null {
    if (id === 'sun') return this.solRaioPc;
    return BODY_AXES[id] ? raiosDoRochosoPc(id).a : null;
  }

  private poloDoCorpo(id: string): THREE.Vector3 | null {
    const o = IAU_ORIENTATIONS[id];
    if (!o) return null;
    const p = baseCorpoEquatorial(o, this.maquinaDoTempo.jdVivo).polo;
    return POLO_DO_CORPO.set(p[0], p[1], p[2]);
  }

  /**
   * O DEGRAU "CORPO" (F2b/D7; generalizado na F3): o corpo EM FOCO
   * enquadrado com o raio FÍSICO dele (BODY_AXES, via o mesh resolvido
   * — nenhum literal de raio nasce aqui). O centro é o da MESMA cadeia
   * de efeméride/retrato da camada — uma fonte só.
   */
  aproximarDoCorpo() {
    if (this.phase !== 'atlas') return;
    const id = this.focoCorpoId ?? 'earth';
    // só corpos com mesh resolvido descem: a Terra, os planetas da F3
    // e os gigantes da F4 (a lista viva dos construídos)
    const ehGigante = this.gigantes.some((g) => g.corpo.planeta && g.corpo.id === id);
    const ehRochoso = this.rochosos.some((r) => r.corpo.id === id);
    const ehPlanetaResolvido =
      id === 'earth' ||
      this.rochosos.some((r) => r.corpo.planeta && r.corpo.id === id) ||
      ehGigante ||
      (ehRochoso && HELIO_SEM_PONTO.some((a) => a.id === id));
    if (!ehPlanetaResolvido) return;
    // o centro sai da MESMA cadeia do mesh (efeméride viva, retrato sem
    // ela) — calculado aqui e não lido do estado do tick, porque o boot
    // por `?ver=corpo` chega ANTES do primeiro tick (estado ainda NaN)
    const jd = this.maquinaDoTempo.jdVivo;
    const p =
      id === 'earth'
        ? posicaoDaTerraUA(jd, this.maquinaDoTempo.efemeride)
        : ehGigante
          ? posicaoDoGiganteUA(id, jd, this.maquinaDoTempo.efemeride)
          : posicaoDoRochosoUA(id, jd, this.maquinaDoTempo.efemeride);
    if (!p) return;
    const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
    const centro = new THREE.Vector3(
      eq[0] * AU_PARA_PC,
      eq[1] * AU_PARA_PC,
      eq[2] * AU_PARA_PC
    );
    const raioPc =
      id === 'earth'
        ? RAIO_EQ_TERRA_PC
        : ehGigante
          ? raiosDoGigantePc(id).a
          : raiosDoRochosoPc(id).a;
    this.atlas.focar(centro, raioPc, centro, {
      rampa: this.rampaDaEscada(),
      // o eixo do PLANETA no alto da tela, não o da eclíptica (Onda 7)
      polo: this.poloDoCorpo(id),
    });
    this.enquadrarAgora();
    this.focoCorpoId = id;
    this.focoEstrela = false;
    this.ver = 'corpo';
    this.events.onFoco(CORPOS_DO_SISTEMA.find((c) => c.id === id)?.nome ?? null);
    this.emitirEscada();
    this.teletransportou();
  }

  /**
   * O DEGRAU "CORPO" DO SOL — o último corpo da casa a ganhar escada, e
   * o que o dono reclama desde a primeira mensagem ("não vi o Sol
   * procedural"): o Atlas o desviava para 226,84 UA, onde o Sol não tem
   * corpo desenhado (o portão de 4 px desarma em 7,19 UA) nem clarão de
   * estrela (só começa em 0,02 pc), e o que sobrava era um ponto sem
   * teto que o bloom espalhava.
   *
   * O CENTRO é a ORIGEM — o Sol não tem efeméride que o mova, ele É o
   * centro do frame heliocêntrico —, e o RAIO é `this.solRaioPc`, a
   * fonte única do tamanho do Sol depois da construção (a MESMA que o
   * palco e o portão de 4 px leem). Nenhum literal de distância nasce
   * aqui: a lente é que decide, pelo `d = r·1,2/sen(θ/2)` de todo
   * enquadramento privilegiado. O número que sai é **6,40 raios
   * solares — 4,46 milhões de km**, e ele é conferível: é a mesma conta
   * que põe a abertura a 226,84 UA. Não foi ajustado à mão, e vizinha
   * de perto o lugar de onde o FILME já filma o Sol (5,74 raios
   * solares, 4,00 milhões de km), que é a prova medida de que a
   * composição aguenta esta distância.
   *
   * A DIREÇÃO é a MESMA da abertura (`casaViva`), e é decisão: descer
   * de casa ao Sol vira um DOLLY PURO — a rampa entre degraus só mexe
   * na distância, e o visitante não é girado enquanto atravessa quatro
   * ordens de grandeza.
   *
   * SEM `polo:`, e isto é honestidade e não esquecimento: a lei da
   * Onda 7 é "polo do CORPO nos degraus corpo e lua" PORQUE ali o polo
   * da câmera é o mesmo do modelo IAU que orienta a MALHA. A malha do
   * Sol é a do corpo procedural transplantado — gira no Y da cena com
   * a inclinação de 7,25° em Z (`stellarBody.ts`), não pelo
   * `IAU_ORIENTATIONS.sun` —, então pedir o polo IAU aqui alinharia a
   * câmera a um eixo que o Sol desenhado não tem. Fica a eclíptica, que
   * é o alto de tela do degrau de onde se veio.
   */
  private aproximarDoSol() {
    if (this.phase !== 'atlas') return;
    this.atlas.focar(
      ORIGEM,
      this.solRaioPc,
      this.casaViva()?.eixo ?? orbitaMaisExterna().posicao,
      { rampa: this.rampaDaEscada() }
    );
    this.enquadrarAgora();
    this.focoCorpoId = 'sun';
    this.focoEstrela = false;
    this.ver = 'corpo';
    this.events.onFoco(CORPOS_DO_SISTEMA.find((c) => c.id === 'sun')?.nome ?? null);
    this.emitirEscada();
    this.teletransportou();
  }

  /**
   * O DEGRAU "LUA" (F2b/D7; genérico desde a F3): a lua com o PAI em
   * quadro — `PARENT_FRAMING_BIAS` ganha aqui o consumidor prometido
   * desde a Onda 5 (a direção é a MISTURA de `direcaoDaLua`, lerp entre
   * direções, nunca fator de distância). Sem efeméride não há posição
   * de lua (não há luas no retrato): busca a fonte e reaplica o
   * enquadramento quando ela chegar (`reenquadrarAposEfemeride`).
   */
  focarNaLua(id: string = 'moon') {
    if (this.phase !== 'atlas') return;
    const entrada = LUAS_DO_SISTEMA.find((l) => l.id === id);
    if (!entrada) return;
    this.focoCorpoId = id;
    this.focoEstrela = false;
    this.ver = 'corpo';
    this.events.onFoco(entrada.nome);
    this.emitirEscada();
    if (!this.maquinaDoTempo.efemeride) {
      // a ficha já anuncia a lua; o enquadramento chega com a fonte
      // (`reenquadrarAposEfemeride`) — nenhuma posição inventada antes
      this.maquinaDoTempo.garantirEfemerides();
      return;
    }
    // centros pela MESMA cadeia dos meshes, calculados na hora (o boot
    // por URL chega antes do primeiro tick — ver aproximarDoCorpo)
    const jd = this.maquinaDoTempo.jdVivo;
    const lua = paraPc(this.maquinaDoTempo.efemeride.posicaoHeliocentrica(id, jd));
    const pai = paraPc(this.maquinaDoTempo.efemeride.posicaoHeliocentrica(entrada.pai, jd));
    // o raio físico é o de BODY_AXES (a fonte única — a Lua dela é a
    // exceção declarada; RAIO_LUA_PC deriva dela bit a bit)
    const raioPc = id === 'moon' ? RAIO_LUA_PC : raiosDoRochosoPc(id).a;
    this.atlas.focar(lua, raioPc, lua, {
      rampa: this.rampaDaEscada(),
      pai,
      polo: this.poloDoCorpo(LUAS_DO_SISTEMA[0].id),
    });
    this.enquadrarAgora();
    this.teletransportou();
  }

  /**
   * A RECEITA DO ENQUADRAMENTO VIVO no instante pedido — alvo, raio,
   * eixo, pai e polo do degrau em que a escada está AGORA (Onda 7).
   *
   * Ela existe para o RELIGADOR do relógio (`recomporAlvo`) e cita as
   * mesmas cadeias dos métodos de foco, uma a uma; `null` quer dizer
   * "nada a recompor": a estrela não anda com o relógio (o catálogo é
   * fixo), e sem efeméride a Lua não tem posição para dar.
   *
   * A POSIÇÃO DE ÓRBITA SAI DA EFEMÉRIDE e não de `planetas.posicoes`,
   * ao contrário do gesto de clique. Não é uma segunda fonte: é a MESMA
   * (`posicaoHeliocentrica` + `eclipticaParaEquatorial × AU_PARA_PC`, a
   * cadeia que a camada usa em `escreverInstante`), lida uma etapa
   * antes. A camada é escrita DEPOIS da câmera dentro do mesmo tick, e
   * ler o atributo dela aqui daria a posição do quadro ANTERIOR — um
   * quadro de atraso que a 116 dias/s são 1,9 dias de céu, 4,8 milhões
   * de km de Terra contra um enquadramento de 25 mil km. O quadro de
   * atraso sozinho já tirava o alvo de quadro.
   */
  private enquadreVivo(): {
    alvo: THREE.Vector3;
    raio: number;
    eixoDe: THREE.Vector3;
    pai: THREE.Vector3 | null;
    polo: THREE.Vector3 | null;
  } | null {
    const jd = this.maquinaDoTempo.jdVivo;
    const { degrau } = this.escada;
    if (degrau === 'estrela') return null;
    if (degrau === 'lua') {
      if (!this.maquinaDoTempo.efemeride) return null;
      const lua = paraPc(this.maquinaDoTempo.efemeride.posicaoHeliocentrica('moon', jd));
      // A MISTURA DO PAI É DO PRESET, e o religador não a inventa: ele
      // pergunta ao RIG se ela está de pé (item 73, 22/08). Uma lua
      // SELECIONADA com um clique nasce sem pai — a pose é a do
      // visitante, não a que `direcaoDaLua` calcularia —, e devolver o
      // pai aqui recolocaria no primeiro tique do relógio o
      // enquadramento que o gesto não pediu. Com o preset (duplo
      // clique, busca, `?foco=lua`) o rig TEM pai e nada muda.
      const comPai = this.atlas.temPai;
      return {
        alvo: lua,
        raio: RAIO_LUA_PC,
        eixoDe: lua,
        pai: comPai
          ? paraPc(this.maquinaDoTempo.efemeride.posicaoHeliocentrica(LUAS_DO_SISTEMA[0].pai, jd))
          : null,
        polo: comPai ? this.poloDoCorpo(LUAS_DO_SISTEMA[0].id)?.clone() ?? null : null,
      };
    }
    if (degrau === 'corpo') {
      const id = this.focoCorpoId ?? LUAS_DO_SISTEMA[0].pai;
      // O SOL NÃO ANDA: ele É a origem do frame heliocêntrico, e o
      // religador tem de dizer isso em vez de cair no ramo abaixo — que
      // devolve a TERRA (e teleportaria a câmera para o globo dela no
      // primeiro tique do relógio). O eixo segue o da casa pelo mesmo
      // motivo do enquadramento: uma direção só para os dois degraus.
      if (id === 'sun') {
        return {
          alvo: ORIGEM.clone(),
          raio: this.solRaioPc,
          eixoDe: this.casaViva()?.eixo ?? orbitaMaisExterna().posicao,
          pai: null,
          polo: null,
        };
      }
      const centro = paraPc(posicaoDaTerraUA(jd, this.maquinaDoTempo.efemeride));
      return {
        alvo: centro,
        raio: RAIO_EQ_TERRA_PC,
        eixoDe: centro,
        pai: null,
        polo: this.poloDoCorpo(id)?.clone() ?? null,
      };
    }
    if (degrau === 'orbita') {
      const id = this.focoCorpoId;
      if (!id) return null;
      const pos = this.maquinaDoTempo.efemeride
        ? paraPc(this.maquinaDoTempo.efemeride.posicaoHeliocentrica(id, jd))
        : this.posicaoDesenhada(id);
      if (!pos || pos.lengthSq() === 0) return null;
      // o ALVO é o corpo (item 73) — a mesma troca de `focarNoCorpo`, e
      // as duas têm de andar juntas ou o religador do relógio puxaria a
      // câmera de volta para o Sol no primeiro tique
      return { alvo: pos, raio: pos.length(), eixoDe: pos, pai: null, polo: null };
    }
    // sistema: a esfera é centrada no Sol e o raio é a órbita mais
    // externa VIVA — a MESMA conta de `focarNoSistema`, e agora
    // literalmente a mesma função (`casaViva`): era este trecho
    // redigitado, e duas cópias do "quem é o mais externo" divergiriam
    // sem ninguém ver — a câmera religada iria para um lugar e o gesto
    // para outro
    const casa = this.casaViva();
    if (!casa || casa.raio === 0) return null;
    return { alvo: ORIGEM, raio: casa.raio, eixoDe: casa.eixo, pai: null, polo: null };
  }

  /** a posição DESENHADA de um corpo (o retrato, quando não há fonte) */
  private posicaoDesenhada(id: string): THREE.Vector3 | null {
    const i = CORPOS_DO_SISTEMA.findIndex((c) => c.id === id);
    if (i < 0 || !this.planetas) return null;
    const p = this.planetas.posicoes;
    return new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
  }

  /**
   * O RELIGADOR DO RELÓGIO (Onda 7): o enquadramento segue o corpo
   * enquanto o tempo anda. Chamado do tick, e SÓ quando o instante do
   * céu mudou de fato — com o relógio parado (o estado de nascimento e
   * o de toda captura) ele nem é consultado.
   *
   * POR QUE NÃO HÁ TETO DE FREQUÊNCIA EM MILISSEGUNDOS, que era o
   * primeiro reflexo: a 116 dias de céu por segundo, um teto de 10 Hz
   * deixaria 11,6 dias entre correções — 29 milhões de km de Terra
   * contra um enquadramento de 25 mil km, 1.100× o quadro. O alvo
   * sairia de vista ENTRE as correções. O limite honesto é o do
   * instante: uma recomposição por mudança de `jd`, ou seja no máximo
   * uma por quadro, e zero quando o relógio está parado.
   *
   * Ele NÃO passa por `focar` nem por `teletransportou`: aquilo é
   * gesto (zera o arrasto do visitante, derruba a LUT do raymarch,
   * reinicia a contagem de estabilidade da captura) e isto é correção
   * do mesmo enquadramento, sessenta vezes por segundo.
   */
  recomporAlvo() {
    const e = this.enquadreVivo();
    if (!e) return;
    this.atlas.recompor(e.alvo, e.raio, e.eixoDe, { pai: e.pai, polo: e.polo });
  }

  /**
   * A SUBIDA da escada (D7): Esc e o botão "sistema". Esc sobe UM
   * degrau — lua → corpo do pai → órbita → sistema; estrela → sistema.
   * Devolve se algum degrau foi subido (o App decide se a tecla foi
   * consumida). A interação com diálogos está no App: diálogo aberto
   * come o Esc PRIMEIRO (o `dialogFocus` o trata com preventDefault no
   * contêiner), e só o Esc que sobrou chega aqui.
   *
   * O PRIMEIRO ESC DESFAZ O ZOOM (item 73, 22/08), e é o que faz a dica
   * do rodapé ("esc — voltar") continuar verdadeira depois que a roda
   * virou zoom contínuo: quem desceu da abertura até dois raios do Sol
   * está no degrau `sistema`, onde a escada não tem para onde subir —
   * sem esta linha o Esc não fazia NADA e o visitante ficava preso
   * junto ao corpo, com o único caminho de volta sendo rolar a roda
   * cinquenta vezes. Um Esc devolve o ENQUADRAMENTO do degrau em que se
   * está (`pinarDistancia(null)` é a conta pura, bit a bit); o Esc
   * seguinte sobe a escada, como sempre.
   */
  subirDegrau(): boolean {
    if (this.phase !== 'atlas') return false;
    if (this.atlas.distanciaEstaPinada) {
      this.atlas.pinarDistancia(null);
      this.pinoDeBoot = null;
      this.enquadrarAgora();
      this.teletransportou();
      return true;
    }
    const { degrau } = this.escada;
    if (degrau === 'sistema') return false;
    if (degrau === 'lua') {
      // sobe para o CORPO do pai (o degrau imediatamente acima)
      const entrada = LUAS_DO_SISTEMA.find((l) => l.id === this.focoCorpoId);
      if (!entrada) return false;
      this.focoCorpoId = entrada.pai;
      this.aproximarDoCorpo();
      return true;
    }
    if (degrau === 'corpo') {
      this.focarNoCorpo(this.focoCorpoId!, 'orbita');
      return true;
    }
    this.focarNoSistema();
    return true;
  }

  /**
   * A DESCIDA MORREU COM A RODA (item 73, 22/08). `descerDegrau` era o
   * consumidor de runtime da roda e da pinça, e tinha dois defeitos que
   * eram do DESENHO, não da implementação: no degrau `sistema` ele ia
   * para o literal do pai da única lua construída — a Terra —, então a
   * roda "para dentro" na vista de abertura escolhia um corpo que o
   * visitante não pediu; e o `subirDegrau` saindo de `orbita` zera o
   * `focoCorpoId`, então a roda "para fora" desfazia a seleção. É a
   * queixa dele, palavra por palavra: "nem conseguimos mais selecionar
   * para onde vamos".
   *
   * Com a roda escrevendo DISTÂNCIA (`AtlasRig.pinarDistancia`) os dois
   * somem por construção — não há caminho da roda até o alvo. A descida
   * continua existindo como gesto, com os donos que sempre teve e nos
   * quais o visitante ESCOLHE o corpo: o botão "⊕ Aproximar" do cabeçalho
   * da ficha (`aproximarDoCorpo`), o clique no mesmo corpo já focado
   * (`focarNoCorpo`), a busca e o `?ver=corpo`. A SUBIDA fica inteira —
   * ela é o Esc, e Esc é preset, não gesto contínuo.
   */

  /**
   * REAPLICA o enquadramento do degrau vivo quando a efeméride chega
   * TARDE (ela sempre chega tarde: o fetch nasce na entrada do modo).
   * Na época o resultado é o mesmo bit a bit (A/B de `?jd=EPOCA`); com
   * `?jd=` de outra data é aqui que a abertura vira a posição do DIA e
   * que o `?foco=lua` do boot ganha finalmente uma Lua para enquadrar.
   */
  reenquadrarAposEfemeride() {
    if (this.phase !== 'atlas' || this.focoEstrela) return;
    const { degrau } = this.escada;
    if (degrau === 'sistema') this.focarNoSistema();
    else if (degrau === 'lua') this.focarNaLua(this.focoCorpoId ?? 'moon');
    // o corpo do SOL tem método próprio (`aproximarDoCorpo` só conhece
    // os corpos com mesh de planeta e sairia sem fazer nada)
    else if (degrau === 'corpo') {
      if (this.focoCorpoId === 'sun') this.aproximarDoSol();
      else this.aproximarDoCorpo();
    }
    else if (this.focoCorpoId) {
      // órbita: reaplica SEM passar pelo gesto de descida (focarNoCorpo
      // no MESMO corpo desceria a escada — aqui é correção, não gesto)
      const id = this.focoCorpoId;
      this.focoCorpoId = null;
      this.focarNoCorpo(id, 'orbita');
    }
    // o `?d=` do link sobrevive ao reenquadramento — ver `pinoDeBoot`
    if (this.pinoDeBoot !== null) this.pinarEmRaios(this.pinoDeBoot);
  }

  /**
   * PINA A DISTÂNCIA em RAIOS do alvo — a porta `?d=` (item 73). O rig
   * trabalha em parsec porque é isso que a câmera consome; a URL fala
   * em raios porque é isso que sobrevive à troca de alvo e de tela, e a
   * conversão é a régua do enquadramento vivo (`raioDoAlvo`).
   *
   * O valor é GRAMPEADO pelo rig entre o piso e o teto do alvo, nunca
   * recusado: `?d=0.1` num planeta não vira erro, vira o topo das
   * nuvens — que é a leitura certa de "o mais perto que dá".
   */
  pinarEmRaios(raios: number | null) {
    if (this.phase !== 'atlas') return;
    this.pinoDeBoot = raios;
    if (raios === null || !Number.isFinite(raios) || raios <= 0) {
      this.atlas.pinarDistancia(null);
      this.enquadrarAgora();
      return;
    }
    this.atlas.pinarDistancia(raios * this.atlas.raioDoAlvo);
    this.enquadrarAgora();
  }

  /** o visitante mexeu na roda: o `?d=` do link deixa de mandar. */
  esquecerPinoDoLink() {
    this.pinoDeBoot = null;
  }

  /**
   * OS DEZ MAIS AS LUAS, para o índice da busca (F5; a Lua é F2b/P-E10).
   * O `rUA` dos dez sai do retrato e não do atributo vivo porque o
   * índice é construído UMA vez, na entrada no modo: ele é a NOTA da
   * lista ("4,2 UA · planeta"), e o que o Atlas enquadra de fato é a
   * órbita viva, lida na hora da escolha por `focarNoCorpo`.
   *
   * A LUA É OUTRA FONTE, dita por extenso: o retrato congelado NÃO TEM
   * luas (9 planetas — `RETRATO_2026`), então o `rUA` dela vem da
   * EFEMÉRIDE viva, e é a distância AO PAI (`posicao('moon')` é
   * geocêntrica por construção do motor) — a nota da lista fala
   * "384 mil km", nunca "0,0026 UA" (o degrau de unidade sub-UA da
   * regra da casa, emenda P-E10a). Sem efeméride carregada a Lua entra
   * SEM nota de distância (NaN — a paleta mostra só a classe): nome
   * honesto na lista, número só quando medido. O índice é reconstruído
   * quando a fonte chega (o App observa a fase da efeméride).
   */
  get corpos(): readonly CorpoBuscavel[] {
    const dez = CORPOS_DO_SISTEMA.map((c) => ({
      id: c.id,
      nome: c.nome,
      classe: c.classe,
      rUA: c.id === 'sun' ? 0 : RETRATO_2026[c.id as IdRetrato].rUA,
    }));
    const jd = this.maquinaDoTempo.jdVivo;
    const luas = LUAS_DO_SISTEMA.map((l) => {
      let rUA = Number.NaN;
      if (this.maquinaDoTempo.efemeride) {
        const p = this.maquinaDoTempo.efemeride.posicaoHeliocentrica(l.id, jd);
        const pai = this.maquinaDoTempo.efemeride.posicaoHeliocentrica(l.pai, jd);
        rUA = Math.hypot(p.x - pai.x, p.y - pai.y, p.z - pai.z);
      }
      return { id: l.id, nome: l.nome, classe: l.classe, rUA, pai: l.pai };
    });
    const anoes = HELIO_SEM_PONTO.map((a) => {
      let rUA = Number.NaN;
      if (this.maquinaDoTempo.efemeride) {
        const p = this.maquinaDoTempo.efemeride.posicaoHeliocentrica(a.id, jd);
        rUA = Math.hypot(p.x, p.y, p.z);
      }
      return { id: a.id, nome: a.nome, classe: a.classe, rUA };
    });
    return [...dez, ...luas, ...anoes];
  }

  /** anão ou asteroide heliocêntrico: órbita em torno do Sol, depois o globo. */
  private focarNoAnao(id: string) {
    const entrada = HELIO_SEM_PONTO.find((a) => a.id === id);
    if (!entrada) return;
    this.focoCorpoId = id;
    this.focoEstrela = false;
    this.ver = 'orbita';
    this.events.onFoco(entrada.nome);
    this.emitirEscada();
    if (!this.maquinaDoTempo.efemeride) {
      this.maquinaDoTempo.garantirEfemerides();
      return;
    }
    const jd = this.maquinaDoTempo.jdVivo;
    const p = this.maquinaDoTempo.efemeride.posicaoHeliocentrica(id, jd);
    const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
    const pos = new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
    if (pos.lengthSq() === 0) return;
    // alvo = o corpo, esfera = a órbita dele (item 73) — a mesma lei de
    // `focarNoCorpo`, que é de onde este degrau é irmão
    this.atlas.focar(pos, pos.length(), pos, {
      rampa: this.rampaDaEscada(),
      pisoRaio: this.raioFisicoDe(id),
    });
    this.enquadrarAgora();
    this.teletransportou();
  }

  /**
   * ESCREVE A CÂMERA JÁ, antes de avisar o HUD. Sem esta linha o
   * `onFoco` chega ao React com a câmera do enquadramento ANTERIOR, e o
   * selo — que lê a vista do Director na hora de desenhar — declara a
   * vista velha: depois de visitar uma estrela a dezenas de parsecs ele
   * ainda dizia ESCALA REAL, e a gradação por contexto (F6) herdaria a
   * mesma defasagem. Não há custo: o `apply` é escrita pura do estado
   * do rig, e o tick a repete no quadro seguinte com o mesmo resultado.
   */
  private enquadrarAgora() {
    this.atlas.apply(this.engine.camera, escalaDaUi(), larguraDeCss());
  }
}
