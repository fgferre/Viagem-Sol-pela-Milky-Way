// ============================================================
// Director — orquestra engine, mundo e cinemática.
// API consumida pelo React: eventos de legenda/progresso/fase.
// ============================================================
import * as THREE from 'three';
import { Engine, modoDoToneMapping } from './core/engine';
import type { QualityLevel } from './core/engine';
import type { EstadoDaVista } from './selo';
import { Post } from './core/post';
import { StarField } from './world/stars';
import { Nebula } from './world/nebula';
import { StellarBody, SOL_PARAMS } from './world/stellarBody';
import { Dust } from './world/dust';
import { projectCorpos, projectLabels, projectForced } from './world/labels';
import type { StarLabel } from './world/labels';
import { HeroStars, SunStar } from './world/heroStars';
import { Galaxy, buildGalaxy, GAL, EX, EY, EZ, galactocentricToScene } from './world/galaxy';
import type { CartographyMode } from './world/galaxy';
import { ObservedClouds } from './world/observedClouds';
import { StarForges } from './world/starForges';
import { WrappedStars, resolvedCatalogCurve } from './world/wrappedStars';
import {
  CORPOS_DEFAULT_ON,
  CorposResolvidos,
  diametroAparentePx,
  gateBinario,
} from './world/corpos/corpos';
import {
  RAIO_EQ_TERRA_PC,
  TerraResolvida,
  cessaoAlvo,
  posicaoDaTerraUA,
} from './world/corpos/terra';
import { LuaResolvida, RAIO_LUA_PC } from './world/corpos/lua';
import {
  ROCHOSOS,
  RochosoResolvido,
  posicaoDoRochosoUA,
  raiosDoRochosoPc,
} from './world/corpos/rochoso';
import {
  GIGANTES,
  GiganteResolvido,
  posicaoDoGiganteUA,
  raiosDoGigantePc,
} from './world/corpos/gigante';
import {
  PONTO_ZERO_SOL_PC,
  Planetas,
  PLANETAS_DEFAULT_ON,
  UA_POR_PC,
  magDoVertice,
} from './world/planetas/planetas';
import type { FonteDeEfemerides } from './world/planetas/planetas';
import { deslocamentoEVAssistida } from '../lib/atlas/luz';
import type { PoliticaDeLuz } from '../lib/atlas/luz';
import { lerPortaLuz } from './selo';
import type { VerDaEscada } from './selo';
import { sondarGl } from '../lib/glProbe';
import { EPOCA_JD_TDB, RETRATO_2026 } from './world/planetas/retrato2026';
import type { IdRetrato } from './world/planetas/retrato2026';
import {
  degrauValido,
  estadoDoTempo,
  grampearJd,
  lerPortaJd,
  taxaDoDegrau,
  DEGRAUS_DE_TEMPO,
} from './tempoDoAtlas';
import type { EstadoDoTempo, FaseDaEfemeride, SentidoDoTempo } from './tempoDoAtlas';
import { dateToTDB } from '../lib/atlas/time';
import { AU_PARA_PC, eclipticaParaEquatorial } from '../lib/atlas/frameGalactico';
import { baseCorpoEquatorial } from '../lib/atlas/orientacao';
import { IAU_ORIENTATIONS } from '../lib/atlas/iauOrientation';
import { RAIO_DO_SOL_NA_CENA } from './escala';
import { loadGalacticAssets } from './cartography/galacticAssets';
import {
  bakeDustMap,
  DUST_MAP_SIZE,
  DUST_MAP_HALF_EXTENT,
} from './cartography/dustMap';
import { bakeGalacticStructureMap } from './cartography/structureMap';
import { JourneyRig, FreeRoam } from './cinematic/cameraRig';
import { ArrastoDePonteiro } from './arrastoDePonteiro';
import { RodaDaEscada } from './rodaDaEscada';
import {
  AtlasRig,
  orbitaMaisExterna,
  raioDeEnquadramentoEstelar,
  retanguloUtilDoAtlas,
} from './cinematic/atlasRig';
import { escalaDaUi } from '../lib/uiScale';
import {
  CHAVE_DE_CORPO,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
  ANOES_DO_SISTEMA,
  ASTEROIDES_DO_SISTEMA,
  claraoDoAtlas,
} from './atlasConfig';

const HELIO_SEM_PONTO = [...ANOES_DO_SISTEMA, ...ASTEROIDES_DO_SISTEMA];
import { ESCRITOR_DE_CAMERA } from './fases';
import type { EscritorDeCamera, Phase } from './fases';
import { REVEAL_T } from './cinematic/journey';
import { BlackHolePass } from './world/blackHole';
import {
  DOMINANCE_DEFAULT_ON,
  fadesDoQuadro,
  matchHeroesToCatalog,
  psfPointSizePx,
} from './world/lodStellar';
import { carregarEfemerides, loadStarData } from './config';
import type { NamedStar, StarsMeta } from './config';
import type { CorpoBuscavel } from '../lib/buscaEstrelas';

// A fotosfera fica na origem do mundo — o grupo do Sol só é escalado.
const ORIGEM = new THREE.Vector3(0, 0, 0);

/** rascunho do polo do corpo — o rig COPIA, ninguém guarda a referência */
const POLO_DO_CORPO = new THREE.Vector3();

// A fase e o inventário de quem decide por ela moram em `fases.ts` —
// o App também os lê, e duplicar a união aqui era o começo da segunda
// fonte de verdade. Reexportado porque `import type { Phase } from
// './three/director'` é o endereço que o resto da casa já usa.
export type { Phase } from './fases';

/**
 * As etapas do carregamento, na ordem. Fonte ÚNICA: o director as emite,
 * o `?loader=<id>` do QA fixa uma delas e o HUD desenha o trilho a partir
 * desta mesma lista — o "07" do "etapa NN / 07" não é literal em lugar
 * nenhum, e acrescentar uma etapa aqui move rótulo, trilho e ARIA juntos.
 */
export const LOAD_STAGES = (
  [
    ['catalogs', 'recebendo os catálogos…'],
    ['stars', 'acordando 328.749 estrelas…'],
    ['dust', 'assando a poeira do disco…'],
    ['structure', 'acoplando braços e warp…'],
    ['galaxy', 'semeando o disco galáctico…'],
    ['layers', 'revelando as lâminas do disco…'],
    ['shaders', 'compilando os shaders…'],
  ] as const
).map(([id, label], i, all) => ({ id, label, index: i + 1, total: all.length }));

/**
 * Quadros desenhados sem NENHUMA perturbação para a cena valer como
 * estável (ver o getter `captura`). Dez, e o número tem medida atrás:
 * `sol`, `travessia` e `soldisco` devolvem o md5 oficial já no primeiro
 * quadro depois que o App aplica o deep-link (sonda de 2026-08-11, marcos
 * 1/2/3/5/…/700 na mesma captura). Dez dá margem de sobra para o intervalo
 * entre o fim do `init` e a aplicação de `?q=`/`?pos=`/`?t=`, e custa ~1 s
 * numa vista de 1800×1800 — contra os ~70 s dos 700 quadros que este sinal
 * aposenta.
 */
const QUADROS_ESTAVEIS = 10;

/**
 * Quadros que a captura SEGURA quando a efeméride PEDIDA está
 * `indisponivel` com os corpos em cena (auditoria item 5c): a janela em
 * que o tick dispara a SEGUNDA tentativa de `garantirEfemerides` (a
 * fase 'buscando' dela já segura sozinha, pelo termo de `andando`).
 * Esgotada a janela, a captura SOLTA — mas só depois do aviso único no
 * console: o quadro que sair dali mostra o RETRATO congelado, e a
 * captura nunca finge que a efeméride viva estava lá.
 */
const QUADROS_TENTANDO_FONTE = 10;

/**
 * Duração de CADA metade do véu de entrada/saída do Atlas, em
 * segundos: fecha, reposiciona, abre. Entrar no Atlas não é travessia
 * física (D3) — não há nave voando de um lugar ao outro, e fingir isso
 * numa escala que vai de 1 UA a 25 kpc seria mentira de câmera. Sob
 * `prefers-reduced-motion` a troca é INSTANTÂNEA: o véu não anima.
 */
const VEU_ATLAS_S = 0.45;

/**
 * O INSTANTE DE VIAGEM QUE O SOL VIVE DENTRO DO ATLAS, pinado.
 * A dramaturgia do ciclo solar é monótona em `journeyT` (mínimo no
 * arranque, máximo no fim da hélice — `SOL_PARAMS.dramaT0/dramaT1`);
 * sem pino, entrar no Atlas a partir de t=10 e a partir de t=250 daria
 * DOIS Sóis diferentes e nenhuma vista do Atlas seria reproduzível.
 * O pino é o fim da janela — o máximo solar, o Sol mais interessante
 * de olhar — e vem de `SOL_PARAMS`, não de um 29 redigitado.
 */
const ATLAS_JOURNEY_T = SOL_PARAMS.dramaT1;

/**
 * De quanto em quanto tempo o modo AO VIVO relê o relógio do visitante,
 * em segundos. Um: é a resolução em que a máquina do tempo fala (o
 * mostrador é minuto a minuto) e o passo em que a camada recalcula os
 * dez corpos — reler a 60 Hz seria pagar efeméride por quadro para
 * mostrar o mesmo minuto sessenta vezes (D2).
 */
const PASSO_DO_AO_VIVO_S = 1;

/**
 * De quanto em quanto tempo o mostrador do tempo é publicado para o
 * React enquanto o relógio anda, em segundos. Mesmo remédio da linha de
 * rumo (`updateDest`, 4 Hz): sem ele um `setState` por quadro
 * re-renderizaria o HUD inteiro 60×/s durante toda a viagem no tempo.
 */
const PASSO_DO_MOSTRADOR_S = 0.25;

/**
 * A LARGURA DE CSS DA JANELA — a entrada de largura do retângulo útil do
 * Atlas. `window.innerWidth` e não a do canvas de propósito: quem faz a
 * barra de controles quebrar é o `max-width: 60vw` do `hud.css`, e o
 * `vw` é o VIEWPORT. Fica aqui, ao lado de `escalaDaUi()`, porque as
 * duas leituras de DOM que o enquadramento precisa são estas duas — o
 * rig continua sem saber que existe DOM.
 */
function larguraDeCss(): number {
  return window.innerWidth;
}

/** etapa viva do carregamento: `{ id, index, total, label }`, index 1…total */
export type LoadStage = (typeof LOAD_STAGES)[number];
export type LoadStageId = LoadStage['id'];

interface DirectorEvents {
  onPhase: (p: Phase) => void;
  onCaption: (index: number, caption: string, sub?: string) => void;
  onProgress: (k: number) => void;
  onLabels: (labels: StarLabel[]) => void;
  onWarp: (k: number) => void;
  onQuality: (quality: QualityLevel) => void;
  /** linha de rumo ("→ DESTINO · distância viva"); vazio = esconder */
  onDest: (text: string) => void;
  /** etapa viva do carregamento — a mesma que o HUD desenha */
  onStage: (stage: LoadStage) => void;
  /** opacidade do véu do Atlas (0..1); custom property, não estado */
  onVeu: (k: number) => void;
  /**
   * O QUE ESTÁ EM QUADRO no Atlas — o nome do alvo enquadrado, ou
   * `null` quando é o enquadramento de abertura (o sistema inteiro) ou
   * quando o Director não tem nome para dar. `null` não é "vazio": é a
   * ContextLine lendo o nome do sistema em vez de chutar (D6).
   */
  onFoco: (nome: string | null) => void;
  /**
   * O MOSTRADOR DA MÁQUINA DO TEMPO. Sai no ritmo de
   * `PASSO_DO_MOSTRADOR_S` enquanto o relógio anda, e na hora quando o
   * visitante mexe em alguma coisa.
   */
  onTempo: (estado: EstadoDoTempo) => void;
  /**
   * O DEGRAU DA ESCADA (F2b/D7) — sai junto com `onFoco`, sempre que o
   * enquadramento troca. É dele que a ContextLine decide quais botões
   * mostrar (aproximar/sistema) e que o `urlComMomento` decide se
   * `?ver=corpo` entra no link.
   */
  onEscada: (estado: EstadoDaEscada) => void;
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
}

export class Director {
  /** o painel de ajustes mexe em tom e exposição ao vivo */
  readonly engine: Engine;
  private post: Post;
  private nebula: Nebula;
  private stars!: StarField;
  private heroes!: HeroStars;
  private sunStar!: SunStar;
  /** índice no catálogo de cada uma das 16 heroes (−1 = sem par
   *  declarado). Resolvido uma vez no init — ver `matchHeroesToCatalog`. */
  private heroCatalogIdx: number[] = [];
  /** `aLogLum` do ponto casado, lido do catálogo no init: é constante e
   *  é ele (não a magnitude do sidecar) que a GPU usa para a PSF. */
  private heroCatalogLogLum: number[] = [];
  /** saída de `fadesDoQuadro`, REUSADA entre quadros (zero alocação) */
  private readonly heroFades: number[] = [];
  private galaxy!: Galaxy;
  /** os 10 pontos fotométricos do domínio profundo (Onda 4, D3) —
   *  camada IRMÃ do `sun.group`, nunca filha dele */
  private planetas: Planetas | null = null;
  /** O PALCO LOCAL (Onda 6, F0 — D1): o grupo dos corpos resolvidos,
   *  vazio nesta fase. Irmão do `sun.group` e do `planetas.points`; a
   *  superfície mais próxima dele entra no `updateClip` a cada tick.
   *  `palco` e não `corpos`: o nome `corpos` já é do getter público da
   *  BUSCA (os dez do retrato), que é outra coisa. */
  private readonly palco = new CorposResolvidos();
  /** A TERRA RESOLVIDA (Onda 6, F2a) — o primeiro corpo do palco. Nasce
   *  no init com construtor barato (zero geometria, zero textura: a
   *  carga é preguiçosa por contrato — gate ou fase atlas). */
  private terra: TerraResolvida | null = null;
  /** digitais do tick anterior da Terra: pop do globo e chegada de
   *  textura são mudança de imagem — a captura recomeça a contagem. */
  private terraEmQuadroAntes = false;
  private terraCarregavaAntes = false;
  /** fetch de textura da Terra em voo — o `captura` espera por ele. */
  private terraCarregando = false;
  /** Terra no GATE a FRIO (armada, sem textura quente, sem fetch em voo
   *  e com a camada ligada): o fallback frio da carga que desistiu — o
   *  `captura` segura a prontidão em vez de fotografar o ponto fingindo
   *  globo (auditoria item 5b; precedente `sun.assentado`). */
  private terraFriaNoGate = false;
  /** A LUA RESOLVIDA (F2b) — o segundo morador do palco, com as mesmas
   *  digitais de estabilidade da Terra. */
  private lua: LuaResolvida | null = null;
  private luaEmQuadroAntes = false;
  private luaCarregavaAntes = false;
  private luaCarregando = false;
  /** a Lua no gate a frio — o mesmo contrato de `terraFriaNoGate`. */
  private luaFriaNoGate = false;
  /**
   * OS ROCHOSOS (F3+F5): planetas e luas texturadas — a classe
   * genérica percorrida como DADO (`ROCHOSOS`), com as mesmas digitais
   * de estabilidade das irmãs por instância (pop do mesh, chegada de
   * textura, gate a frio e rampa de cessão recomeçam a contagem da
   * captura).
   */
  private readonly rochosos: {
    corpo: RochosoResolvido;
    emQuadroAntes: boolean;
    carregavaAntes: boolean;
    carregando: boolean;
    friaNoGate: boolean;
  }[] = [];
  /**
   * OS GIGANTES (F4): Júpiter, Saturno, Urano e Netuno — a classe
   * própria (não cabe em rochoso.ts), percorrida como DADO
   * (`GIGANTES`), com as mesmas digitais de estabilidade.
   */
  private readonly gigantes: {
    corpo: GiganteResolvido;
    emQuadroAntes: boolean;
    carregavaAntes: boolean;
    carregando: boolean;
    friaNoGate: boolean;
  }[] = [];
  /** quadros já gastos segurando a captura com a efeméride pedida
   *  indisponível — ver QUADROS_TENTANDO_FONTE (auditoria item 5c). */
  private quadrosTentandoFonte = 0;
  /** a segunda tentativa de `garantirEfemerides` já foi disparada */
  private retentouFonte = false;
  /** o aviso único do retrato sob corpos já saiu no console */
  private acusouRetrato = false;
  /** posições VIVAS das luas para os rótulos (projectCorpos) —
   *  3 floats por entrada de `LUAS_DO_SISTEMA`, NaN sem efeméride
   *  (projectCorpos ignora NaN — rótulo só onde há corpo). */
  private readonly luaPosParaRotulo = new Float32Array(
    LUAS_DO_SISTEMA.length * 3
  ).fill(Number.NaN);
  /**
   * A CÂMERA SALTOU neste quadro (portal, enquadramento, ?pos=) — os
   * corpos resolvidos fazem SNAP da cessão em vez de animar através do
   * teletransporte (cicatriz "reset no salto de foco", D5). Armado por
   * `teletransportou()` e consumido por UM tick.
   */
  private saltoDeCamera = false;
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
  /**
   * A POLÍTICA DE LUZ dos corpos resolvidos (Onda 6, D2/D8). Default
   * `assistida` — o do Atlas; `?luz=` semeia no boot e a linha BRILHO
   * do selo troca ao vivo (`definirLuz`). Fora do Atlas o estado é
   * neutro por construção: não há superfície resolvida no filme.
   */
  private politicaDeLuz: PoliticaDeLuz = 'assistida';
  /** o corpo em FOCO no Atlas (id do retrato) — o selo lê o ΔEV dele. */
  private focoCorpoId: string | null = null;
  private observedClouds: ObservedClouds | null = null;
  private starForges: StarForges | null = null;
  private wrappedStars!: WrappedStars;
  private dustMapTexture: THREE.Texture | null = null;
  private structureMapTexture: THREE.Texture | null = null;
  /** nuvens do catálogo em coords de cena: x,y,z,raio,amp por registro */
  private seedCloudPool: Float32Array | null = null;
  private seedCloudScratch = new Float32Array(32 * 5);
  private seedCloudTimer = 0;
  private sun: StellarBody;
  private dust: Dust;
  private blackHole: BlackHolePass | null = null;
  private bgColor = new THREE.Color(0x000106);
  private rig = new JourneyRig();
  private roam: FreeRoam;
  private atlas = new AtlasRig();
  /** quem escreve a câmera AGORA — decidido pelo `setPhase` */
  private escritorDeCamera: EscritorDeCamera = 'nenhum';
  private meta!: StarsMeta;
  /** última projeção de rótulos — alvo do clicar-para-visitar */
  private lastLabels: StarLabel[] = [];
  private prevLabelKeys = new Set<string>();
  private lastDest = '';
  private destTimer = 0;
  /**
   * O GESTO de arrastar do Atlas e do pausar-e-olhar. Era um punhado de
   * campos soltos (`pauseDragging`, `pauseLastX/Y`, `pauseArrasto`,
   * `pauseDesde`) duplicado no `FreeRoam`, com os mesmos quatro
   * defeitos nos dois; agora os dois trios de listeners falam com a
   * MESMA máquina — que é onde o filtro por `pointerId`, o botão
   * principal e o cancelamento pelo sistema estão escritos e testados.
   */
  private arrastoDaPausa = new ArrastoDePonteiro();
  /** roda e pinça → degraus da escada (Onda 7) */
  private readonly roda = new RodaDaEscada();

  /**
   * O QUE O PORTAL GUARDA quando o visitante entra no Atlas — e devolve
   * inteiro quando ele parte. Não é só o `journeyT`: o `seek()` sozinho
   * zera o olhar do pausar-e-olhar, o tick zera o latch `leftDisk` fora
   * da viagem, e a pausa tem DOIS donos (`freezeJourney` aqui e
   * `rig.paused` no rig). Faltando qualquer um dos cinco, "Partir"
   * devolveria um quadro parecido — e o gate mede PIXEL.
   */
  private retomada: {
    journeyT: number;
    lookYaw: number;
    lookPitch: number;
    leftDisk: boolean;
    pausado: boolean;
  } | null = null;

  // ---- a máquina do tempo (Onda 5, F4/D2) --------------------------
  // O DIRECTOR É O DONO DO `jd`, e é dono sozinho: a camada de planetas
  // não tem relógio (o teste de texto-fonte dela proíbe `Date`), o HUD
  // só desenha o que este bloco publica, e a efeméride é um serviço que
  // chega tarde. Um segundo dono aqui seria a mesma classe de defeito
  // que a pausa já teve (dois donos, `freezeJourney` e `rig.paused`).

  /**
   * O instante PEDIDO, em JD TDB. Nasce na época do retrato — sem isso
   * a cena não seria a mesma de ontem no primeiro quadro. O instante
   * MOSTRADO é este grampeado na janela da tabela (`get tempo`).
   */
  private jdPedido = EPOCA_JD_TDB;
  /**
   * O instante em que o enquadramento do Atlas foi composto pela última
   * vez — o limite de frequência do religador (ver `recomporAlvo`).
   * `NaN` nunca é igual a nada, então o primeiro quadro da fase sempre
   * recompõe uma vez.
   */
  private jdDoEnquadre = Number.NaN;
  /** degrau na escada de taxas (`tempoDoAtlas`) */
  private degrau = 0;
  /** sentido do relógio: 0 é parado, e parado é como o Atlas abre */
  private sentidoDoTempo: SentidoDoTempo = 0;
  /** o relógio segue o tempo real do visitante */
  private aoVivo = false;
  /** a fonte viva; `null` enquanto ninguém pediu, ou se a rede faltou */
  private efemeride: FonteDeEfemerides | null = null;
  private faseDaEfemeride: FaseDaEfemeride = 'retrato';
  /** acumuladores do passo do AO VIVO e do mostrador */
  private relogioAoVivo = 0;
  private mostradorTimer = 0;
  /**
   * O relógio bateu na borda da tabela e PAROU ali. Uma máquina do
   * tempo honesta faz isso: a fita acaba, ela para na última volta e
   * diz. A alternativa — deixar o pedido correr para fora da janela —
   * cobraria do visitante o mesmo tempo de volta que ele gastou indo.
   */
  private naParede = false;

  /** véu do Atlas: 0 = aberto, 1 = fechado */
  private veu = 0;
  private veuAlvo = 0;
  /** o que fazer quando o véu terminar de FECHAR */
  private veuPendente: (() => void) | null = null;

  private phase: Phase = 'loading';
  private journeyT = 0;
  /**
   * A trajetória do Ato III reatravessa o envelope do disco (t≈151–154)
   * já a ~15 kpc do Sol; na viagem ROTEIRIZADA, uma vez fora do disco o
   * ambiente fica desligado (latch) — o pull-back mostra o modelo da
   * galáxia, não uma nebulosa ressuscitada. Free-roam/?pos= não usam o
   * latch: lá o comportamento relocável instantâneo é o desejado.
   */
  private leftDisk = false;
  private lastCaptionIdx = -1;
  /** congela o relógio da viagem (debug/screenshots via ?freeze=1) */
  freezeJourney = false;
  /** multiplicador do relógio da viagem (1× · 2× · 4×) */
  playbackRate = 1;
  private noNebula = false;
  private deepBg = new THREE.Color(0x010208);
  /** ?shot=1 congela o tempo visual — capturas determinísticas */
  private shotMode = false;
  /** prefers-reduced-motion: sem shake, sem pulso de warp/CA */
  private reducedMotion = false;
  /** toggles de debug: ?nogal=1&nosun=1&nodust=1&nohero=1&nocat=1 */
  private hide = new Set<string>();
  /** ?exp= na query desliga a auto-exposição (App.tsx aplica o valor fixo) */
  private expOverride = false;
  /** a gradação por contexto do Atlas está ligada? (`?grad=0` desliga) */
  private gradacaoLigada = true;

  private events: DirectorEvents;
  private readonly abortController = new AbortController();
  private readonly debug = new URLSearchParams(window.location.search);
  /**
   * O RAIO COM QUE O SOL FOI CONSTRUÍDO, em pc. Desde a F3 é SEMPRE o
   * físico (`RAIO_DO_SOL_NA_CENA`) — a porta `?solreal=1` da F1 morreu
   * quando ele virou o padrão. O campo fica porque é a fonte única para
   * todo mundo que precisa do tamanho do Sol depois da construção (o
   * oclusor da nebulosa, o palco, o gate de 4 px e a cessão do ponto), e
   * porque ler o raio de UM lugar é o que impediu, na F1, o Sol de
   * encolher no mesh e continuar tapando o céu como se fosse grande.
   */
  private readonly solRaioPc = RAIO_DO_SOL_NA_CENA;
  /**
   * O GATE DO SOL COMO CORPO (F2), estado da histerese entre quadros.
   * Nasce `false` porque o gate da casa entra por `>=` estrito e sai por
   * `<`: começar armado inverteria a decisão na primeira fronteira. É a
   * mesma partida de `TerraResolvida.armado`.
   */
  private solArmado = false;
  private disposed = false;
  /** pré-compilação em voo; o dispose do renderer espera por ela */
  private warmup: Promise<unknown> | null = null;
  /** download disparado no construtor, consumido pelo init */
  private readonly assets: ReturnType<Director['startLoading']>;

  constructor(canvas: HTMLCanvasElement, events: DirectorEvents) {
    this.events = events;
    this.engine = new Engine(canvas);
    // Se QUALQUER coisa abaixo lançar (o prime do Sol são ~550 draws numa
    // GPU que pode estar caindo), o contexto WebGL e o listener de resize
    // do Engine não podem ficar órfãos atrás do véu de erro — o catch
    // devolve o Engine e relança para o App mostrar a falha (Onda 1d).
    try {
    // A REDE PRIMEIRO. O prime do Sol (logo abaixo) são ~550 draws
    // offscreen síncronos, e ele não depende de um byte dos ativos — mas
    // como os fetches só nasciam no init(), os dois trabalhos rodavam em
    // SÉRIE. Disparados aqui, o prime e a compilação passam a acontecer
    // POR CIMA do download. init() só espera esta promise.
    this.assets = this.startLoading();
    // a promise agora nasce ANTES de quem a consome: se um dispose() vier
    // entre o construtor e o init(), o abort rejeitaria sem ninguém
    // ouvindo. Este ramo só cala o warning; o init continua vendo o erro.
    void this.assets.catch(() => {});
    this.post = new Post(this.engine.renderer, this.engine.scene, this.engine.camera);
    this.nebula = new Nebula(0.5);
    // Sol procedural transplantado (vivo: sim + bake + ciclo); o prime
    // do construtor compila os quads offscreen com RT amarrado. Desde a
    // Onda 3 o corpo é parametrizado e o Sol é a instância 1: quem
    // decide raio, rotação, atividade e semente é SOL_PARAMS, não
    // literais soltos dentro da classe.
    // O SOL TEM RAIO FÍSICO, SEM PORTA (F3). De 2026-08-12 a 2026-08-13
    // isto foi um ternário sobre a porta de URL, escolhendo entre o raio
    // físico e o artístico — a porta da F1, que existia para o raio verdadeiro
    // poder ser FOTOGRAFADO pelo mesmo motor, no mesmo dia, antes de
    // qualquer baseline ser paga. Ela cumpriu o papel dela: refutou com
    // imagem a frase "escala real seria invisível" de `config.ts:8` sem
    // custar um pixel, e a F2 depois lhe tirou o papel de LIGAR o Sol
    // como corpo (quem decide isso é a régua do palco, 4 px na tela).
    //
    // A F3 tirou a última: o raio é parâmetro de CONSTRUÇÃO (vira escala
    // do grupo e literal compilado no GLSL da coroa e da CME —
    // `SUN_R_GLSL`/`SEG_EPS_GLSL`), então "ser o padrão" só podia
    // significar construir o Sol pequeno SEMPRE, e é isso que se fez,
    // junto com o único plano que dependia do contrário — a abertura,
    // que foi refilmada a 4,00 milhões de km em vez de em volta de uma
    // bola de 2.269 UA. Uma porta que só pode estar ligada não é porta;
    // manter `?solreal=1` viva depois disto seria manter um caminho
    // morto na URL e uma segunda lei de raio no construtor.
    this.sun = new StellarBody(
      SOL_PARAMS,
      this.engine.renderer,
      this.engine.camera,
      this.engine.quality
    );
    this.dust = new Dust();
    this.roam = new FreeRoam(canvas, this.engine.camera);
    this.engine.onQuality((quality) => {
      this.nebula.setScale(quality === 'performance' ? 0.35 : 0.5);
      // passos do raymarch: aqui e não no tick. Reescrever o mesmo valor
      // 60×/s era ruído; quem muda o preset é quem tem de aplicá-lo — o
      // auto-quality passa por aqui, e o default do Nebula (44) NÃO é o
      // do cinema (56), então o valor inicial também vem daqui.
      this.nebula.setSteps(this.engine.preset.nebulaSteps);
      // o preset de grão era config morta — nunca chegava ao shader
      this.post.setGrain(this.engine.preset.grain);
      this.blackHole?.setQuality(quality);
      this.events.onQuality(quality);
      // troca de tier muda pixelRatio e passos do raymarch: a contagem de
      // estabilidade da captura recomeça (ver o getter `captura`)
      this.perturbar();
    });
    // o Engine já aplicou a qualidade no próprio construtor, antes destes
    // ouvintes existirem — o estado inicial precisa ser semeado à mão.
    // O setScale faltava desta lista: em performance inicial o raymarch
    // rodava a 0,5 (o default do construtor) em vez de 0,35 até a primeira
    // troca de tier — exatamente onde a economia mais importa (Onda 1e).
    this.nebula.setScale(this.engine.quality === 'performance' ? 0.35 : 0.5);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
    this.post.setGrain(this.engine.preset.grain);
    // e o React TAMBÉM é ouvinte tardio: sem esta semente, um tier inicial
    // vindo do storage ou do teto de GL (sem ?q=) deixava o painel de
    // Ajustes mostrando "cinema" — e o clique nele virava no-op (achado
    // da revisão de olhos frescos da Onda 1, verificado ao vivo).
    this.events.onQuality(this.engine.quality);

    this.engine.onResize((w, h) => {
      this.nebula.setSize(w, h);
      this.post.setSize(w, h);
      this.perturbar();
    });
    this.nebula.setSize(window.innerWidth, window.innerHeight);

    // debug via URL: ?nobloom=1
    if (this.debug.has('nobloom')) {
      this.post.bloom.enabled = false;
    }
    // A GRADAÇÃO POR CONTEXTO do Atlas (F6) nasce LIGADA e `?grad=0` a
    // desliga — o precedente exato é o `?knee=0` do pós. Ela precisa de
    // porta, e não só de um clique no selo, porque o "voltar ao brilho
    // real" pode RECARREGAR a página (quando há desvio que só o boot
    // lê): sem a porta, o selo diria "voltei ao real" e a gradação
    // renasceria no carregamento seguinte — o selo mentindo com a melhor
    // das intenções, que é o defeito que ele existe para não ter.
    this.gradacaoLigada = this.debug.get('grad') !== '0';
    this.noNebula = this.debug.has('nonebula');
    this.shotMode = this.debug.has('shot');
    this.expOverride = this.debug.has('exp');
    // ?luz= — a política da primeira lei de luz (Onda 6, D2/D8), pela
    // lei única da porta (`lerPortaLuz`, selo.ts); pedido inválido cai
    // no default do Atlas, nunca num caminho terceiro.
    this.politicaDeLuz = lerPortaLuz(this.debug.get('luz')) ?? 'assistida';
    // ?jd= — O INSTANTE DO CÉU (Onda 5, F4/D2), no precedente de
    // `?plan/?noplan`: uma porta que o A/B usa com o MESMO binário dos
    // dois lados. `?jd=EPOCA` pede o instante do retrato e é o lado
    // "com a porta" desse A/B — ele acende o caminho vivo INTEIRO
    // (busca, decodificação, escrita dos dois atributos) num instante
    // em que o resultado tem de ser o retrato bit a bit.
    if (this.debug.has('jd')) {
      const pedido = lerPortaJd(this.debug.get('jd'), EPOCA_JD_TDB);
      if (pedido === null) console.warn('?jd= inválido:', this.debug.get('jd'));
      else {
        this.jdPedido = pedido;
        this.garantirEfemerides();
      }
    }
    this.reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const k of [
      'nogal', 'nosun', 'nodust', 'nohero', 'nocat', 'nomarker', 'nocart', 'nowrap',
      // bissecção do ?nocart: nuvens CO e forjas separadamente
      'noco', 'noforge', 'nobh',
      // ?nodom=1 — desliga a CESSÃO do ponto do catálogo sob o hero
      // dominante (Onda 3, fase 3; ligada por padrão desde a fase 4a).
      // Com `DOMINANCE_DEFAULT_ON = true` este é o caminho de VOLTA — o
      // lado "antes" de qualquer A/B — e `?dom=1` continua ligando mesmo
      // se a constante voltar a `false`. O par existe para o A/B ser
      // feito com o MESMO binário dos dois lados (o `EXTRA=` do
      // ab-identidade anexa o parâmetro a todas as vistas).
      'nodom',
      // ?noplan=1 — desliga a CAMADA de planetas (Onda 4, D3/D7). Par de
      // `?plan=1`, no mesmo precedente. Governa a camada e SÓ ela: o
      // domínio profundo (janelas deep, near piecewise, voo proporcional)
      // é fundação sem porta, como o near — emenda D11a.
      'noplan',
      // ?nocorpos=1 — desliga o PALCO dos corpos resolvidos (Onda 6,
      // F0/D8). Par de `?corpos=1`, padrão ?dom/?nodom: o A/B se faz
      // com o MESMO binário dos dois lados. Desligado, os corpos saem
      // do QUADRO inteiro — inclusive do min() do near, que volta ao
      // vigente bit a bit (é o que devolve a baseline no A/B).
      'nocorpos',
      // AS TRÊS DA GALÁXIA. Quem as LÊ é a Galaxy (por quadro, no
      // `update`); elas entram no conjunto porque o `hide` é o que o
      // SELO declara — sem esta linha, chegar com `?nodisc=1` apagava
      // uma camada e o selo dizia "brilho real", enquanto o mesmo
      // desligamento pelo painel se declarava. Uma opção, um veredito.
      'nodisc', 'nogdust', 'noglow',
    ]) {
      if (this.debug.has(k)) this.hide.add(k);
    }

    // pausar-e-olhar: com a viagem pausada, arrastar olha ao redor;
    // no play a mira volta sozinha ao enquadramento do filme
    canvas.addEventListener('pointerdown', this.onPausePointerDown);
    window.addEventListener('pointermove', this.onPausePointerMove);
    window.addEventListener('pointerup', this.onPausePointerUp);
    // as DUAS outras saídas do gesto — sem elas o `pointerup` que nunca
    // chega deixa o arrasto preso para sempre (ver `onPausePointerCancel`)
    window.addEventListener('pointercancel', this.onPausePointerCancel);
    window.addEventListener('lostpointercapture', this.onPausePointerCancel);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    // A RODA E A PINÇA (Onda 7), e o `passive: false` é a coisa toda:
    // sem ele o navegador recusa o `preventDefault` e a página rola (ou
    // o Chrome DÁ ZOOM, que é o que a pinça faz por padrão) por baixo do
    // Atlas. Fica no CANVAS e não na janela para o HUD — a máquina do
    // tempo, a busca, o painel de ajustes — continuar rolando normal.
    canvas.addEventListener('wheel', this.onRodaDoAtlas, { passive: false });

    // clique curto no voo livre → mini-viagem até a estrela nomeada
    this.roam.onTap = (x, y) => this.tryVisit(x, y);

    this.engine.onTick((t, dt) => this.tick(t, dt));
    } catch (e) {
      this.engine.dispose();
      throw e;
    }
  }

  /**
   * catálogo HYG + ativos cartográficos em paralelo; os segundos são
   * progressivos — sem eles a cena continua procedural.
   * ?cart=off não baixa os ~6 MB que ninguém consumiria.
   */
  private startLoading() {
    const cartMode: CartographyMode =
      this.debug.get('cart') === 'off'
        ? 'off'
        : this.debug.get('cart') === 'obs'
          ? 'observed'
          : 'blend';
    return Promise.all([
      loadStarData(this.abortController.signal),
      cartMode === 'off'
        ? Promise.resolve(null)
        : loadGalacticAssets(this.abortController.signal),
    ]).then(([stars, galactic]) => ({ stars, galactic, cartMode }));
  }

  /**
   * Rótulo de etapa + fôlego para o browser PINTAR o rótulo. O init tem
   * ~5 s de CPU síncrona (bakes 1,6 s + buildGalaxy 3,27 s) e o loader
   * congelava junto — parecia travado exatamente enquanto mais trabalhava.
   * Barra por byte não conserta (a rede é a fatia pequena; ela pararia em
   * 100%). setTimeout(0) e não rAF: em aba de fundo o rAF é estrangulado
   * e o init nunca terminaria. O conserto DEFINITIVO é o Worker (fila
   * 2026-08-05, item 2); isto é o que dá para honestamente prometer sem ele:
   * o espectador vê O QUE está acontecendo, entre um congelamento e outro.
   */
  private async stage(id: LoadStageId) {
    const stage = LOAD_STAGES.find((s) => s.id === id);
    if (stage) this.events.onStage(stage);
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  async init() {
    await this.stage('catalogs');
    const {
      stars: { stars: starArrays, meta },
      galactic,
      cartMode,
    } = await this.assets;
    if (this.disposed) return;
    this.meta = meta;
    await this.stage('stars');

    // expoM0 é o "tempo de exposição": a magnitude aparente cujo pico de
    // PSF chega a 1. Com 3,5 as ~40 estrelas mais brilhantes do céu
    // saturam e ganham disco e spikes; o resto fica sub-saturado, que é
    // o que devolve ao campo os 8,6 mag de faixa dinâmica do catálogo.
    // O halo buildFarStars (mag 7,2–10,6 estático no Sol) morreu na
    // unificação 2: as cascas de wrappedStars cobrem essa população em
    // QUALQUER ponto do disco, com a mesma PSF e anti-dupla-contagem.
    this.stars = new StarField(starArrays, { expoM0: 3.5, sigmaPx: 0.85, tau: 0.045 });
    // ...e a LUT da faixa deixa de emitir de novo a luz que este campo
    // acabou de desenhar. A curva é MEDIDA nestes mesmos arrays, então
    // não tem como divergir do binário — regerar o catálogo a move
    // sozinha, o mesmo contrato que as cascas já têm com magLimit.
    this.nebula.setResolvedCurve(
      resolvedCatalogCurve(starArrays.position, starArrays.logLum)
    );
    this.heroes = new HeroStars(this.meta.named);
    // FIM DA DUPLA-LUZ hero↔catálogo (Onda 3, fase 3 — decisão D2). Até
    // aqui as 16 mais brilhantes desenhavam luz DUAS vezes na mesma
    // posição: o ponto do campo de catálogo e o billboard do hero por
    // cima, somados em blending aditivo. O casamento é POSICIONAL porque
    // o formato sc1 não carrega identidade (9 bytes, sem id) — posição
    // com tolerância de quantização, desempate por luminosidade.
    this.heroCatalogIdx = matchHeroesToCatalog(
      this.heroes.chosen,
      starArrays.position,
      starArrays.logLum
    );
    this.heroCatalogLogLum = this.heroCatalogIdx.map((i) =>
      i >= 0 ? starArrays.logLum[i] : 0
    );
    // sem par é DECLARAÇÃO, não chute: o slot é pulado e a estrela do
    // catálogo fica inteira (o hero continua desenhando por cima, como
    // antes desta fase). Hoje as 16 casam; o aviso existe para o dia em
    // que o catálogo for regerado com outro corte.
    const semPar = this.heroCatalogIdx
      .map((idx, i) => (idx < 0 ? this.heroes.chosen[i].n : null))
      .filter(Boolean);
    if (semPar.length) {
      console.warn(`[heroes] sem par no catálogo: ${semPar.join(', ')}`);
    }
    // o Sol sob a mesma lei dos heróis: de longe é estrela, não bola
    // (magnitude viva pela distância; o nearFade cede ao disco de perto)
    this.sunStar = new SunStar();
    this.engine.scene.add(this.sunStar.quad);

    // O mapa é bakeado SEMPRE: os canais B/A (braços/warp) alimentam
    // o envelope de gás do raymarch mesmo sem APOGEE (R/G zerados).
    const cartOn = Boolean(galactic) && cartMode !== 'off';
    // O CHECK DEPOIS DE CADA `stage` — e não só depois dos três awaits que
    // já o tinham. Cada `stage` cede a thread por um `setTimeout(0)`, e um
    // `dispose()` que caia nessa janela (Fast Refresh em dev, unmount no
    // meio da carga) rodava o teardown NA HORA enquanto o init seguia:
    // `buildGalaxy` (~3,3 s de CPU) e `bakeDiscLayers` realocavam ~2,7 M
    // partículas e render targets num contexto já destruído, e essa Galaxy
    // não era disposta por ninguém. Achado de auditoria externa.
    await this.stage('dust');
    if (this.disposed) return;
    const dustBake = bakeDustMap(cartOn && galactic ? galactic.dustDensity : null);
    this.dustMapTexture = dustBake.texture;
    await this.stage('structure');
    if (this.disposed) return;
    const structureBake = bakeGalacticStructureMap(
      cartOn ? galactic : null,
      dustBake.density,
      dustBake.coverage,
      dustBake.arms
    );
    this.structureMapTexture = structureBake.texture;
    // sem contagem no rótulo: cinema semeia 4,02 M, performance 1,1 M — um
    // número fixo mentiria em metade dos aparelhos
    await this.stage('galaxy');
    if (this.disposed) return;
    this.galaxy = new Galaxy(
      buildGalaxy(
        20260730,
        {
          gasResponse: structureBake.gasResponse,
          gasSupport: structureBake.gasSupport,
          youngResponse: structureBake.youngResponse,
          youngSupport: structureBake.youngSupport,
          size: DUST_MAP_SIZE,
          halfExtentPc: DUST_MAP_HALF_EXTENT,
        },
        this.engine.quality === 'performance' ? 0.28 : 1
      ),
      dustBake.texture,
      structureBake.texture
    );
    // O QUE JÁ ESTAVA DESLIGADO chega junto. A galáxia semeia as flags
    // dela da URL, como sempre, e isto só cobre a corrida do painel
    // aberto DURANTE o carregamento (`?ajustes=1`): sem esta linha, o
    // clique sumia no objeto que ainda não existia. Idempotente para
    // quem veio da URL, e mudo para as flags que não são da galáxia.
    for (const f of this.hide) this.galaxy.setLayerHidden(f, true);
    this.galaxy.setCartography(
      this.debug.has('discoff') ? 'off' : galactic ? cartMode : 'off'
    );
    // congela as lâminas (estáticas) em texturas — depois do modo
    await this.stage('layers');
    if (this.disposed) return;
    this.galaxy.bakeDiscLayers(this.engine.renderer);
    const tauTex = this.galaxy.tauMapTexture;
    this.nebula.setDustMap(dustBake.texture, cartOn ? 1 : 0);
    if (galactic && cartMode !== 'off') {
      this.observedClouds = new ObservedClouds(
        galactic.molecularClouds,
        galactic.largeMolecularClouds
      );
      this.starForges = new StarForges(galactic);
      // Extinção por coluna das forjas: a auditoria da rodada 26 achou a
      // chamada ANTES da criação (?. engolia em silêncio) — ela NUNCA
      // ligou, e toda a dosagem edge das rodadas 15–25 foi calibrada com
      // as forjas sem extinção. Ligar sob a dosagem atual foi MEDIDO:
      // edge 0,6441 → 0,7862 (thickRatio 0,050→0,040 quebra) e face
      // 0,0333 → 0,0301 (melhora). Fica DESLIGADA por padrão até a
      // rodada de re-dosagem sob o regime corrigido; ?forgetau=1 liga
      // para varrer. Detalhe no NORTE.
      if (tauTex && this.debug.has('forgetau')) {
        this.starForges.setTauMap(tauTex);
      }
      this.engine.scene.add(this.observedClouds.mesh);
      this.engine.scene.add(this.starForges.points);
      this.buildSeedCloudPool(galactic);
      if (dustBake) {
        console.info(
          `[cartografia] APOGEE ${(dustBake.coverageFraction * 100).toFixed(1)}% ` +
            'do disco; campo acoplado com ' +
            `${(structureBake.gasCoverageFraction * 100).toFixed(1)}% ` +
            'de suporte material e ' +
            `${(structureBake.youngCoverageFraction * 100).toFixed(1)}% ` +
            'de suporte em traçadores jovens.'
        );
      }
    }
    if (this.disposed) return;

    // canais B/A do dust map alimentam a densidade das cascas (1 fetch
    // no lugar dos braços/warp analíticos por vértice — medido +5 ms)
    this.wrappedStars = new WrappedStars(this.dustMapTexture, {
      magLimit: this.meta.magLimit,
      horizonPc: this.meta.horizonPc,
    });
    this.engine.scene.add(this.wrappedStars.points);
    // Sagittarius A* — passe de pós que só liga perto do centro
    // (custo ZERO desligado: o composer o pula; shader compila na
    // primeira aproximação). Ver blackHole.ts.
    this.blackHole = new BlackHolePass();
    this.blackHole.setQuality(this.engine.quality);
    this.post.addBlackHole(this.blackHole);
    this.engine.scene.add(this.stars.points);
    this.engine.scene.add(this.sun.group);
    this.engine.scene.add(this.dust.points);
    this.engine.scene.add(this.heroes.group);
    this.engine.scene.add(this.galaxy.group);
    // Os 10 pontos fotométricos (Onda 4, D3). Grupo PRÓPRIO na cena, ao
    // lado do `sunStar.quad` e NUNCA dentro de `sun.group` — de lá
    // herdaria a escala 0,005 do doador e o `return` antecipado quando o
    // disco apaga. A PSF vem do campo (`stars` publica expoM0/sigmaPx):
    // é o que faz a fotometria planeta↔estrela ser relativa de verdade.
    this.planetas = new Planetas(this.stars);
    this.engine.scene.add(this.planetas.points);
    // O PALCO LOCAL (Onda 6, F0): o grupo dos corpos resolvidos entra
    // irmão dos dois acima. Desde a F2a ele tem o primeiro morador: a
    // Terra — construtor barato, sem geometria e sem um byte de textura
    // (a carga é preguiçosa por contrato; as 18 vistas não fazem fetch).
    // O tier e o teto de textura congelam AQUI, como a população da
    // galáxia: a escada não reage a auto-quality depois do init.
    this.terra = new TerraResolvida({
      tier: this.engine.quality,
      maxTextureSize: sondarGl().maxTextureSize,
      base: import.meta.env.BASE_URL,
    });
    this.palco.group.add(this.terra.group);
    // A LUA (F2b): mesmo contrato — construtor barato, carga preguiçosa.
    this.lua = new LuaResolvida({
      tier: this.engine.quality,
      maxTextureSize: sondarGl().maxTextureSize,
      base: import.meta.env.BASE_URL,
    });
    this.palco.group.add(this.lua.group);
    // OS ROCHOSOS (F3): a classe genérica, um por config da lista viva.
    this.rochosos.length = 0;
    for (const config of ROCHOSOS) {
      const corpo = new RochosoResolvido({
        config,
        tier: this.engine.quality,
        maxTextureSize: sondarGl().maxTextureSize,
        base: import.meta.env.BASE_URL,
      });
      this.rochosos.push({
        corpo,
        emQuadroAntes: false,
        carregavaAntes: false,
        carregando: false,
        friaNoGate: false,
      });
      this.palco.group.add(corpo.group);
    }
    // OS GIGANTES (F4): a classe própria, um por config da lista viva.
    this.gigantes.length = 0;
    for (const { id } of GIGANTES) {
      const corpo = new GiganteResolvido({
        id,
        tier: this.engine.quality,
        maxTextureSize: sondarGl().maxTextureSize,
        base: import.meta.env.BASE_URL,
      });
      this.gigantes.push({
        corpo,
        emQuadroAntes: false,
        carregavaAntes: false,
        carregando: false,
        friaNoGate: false,
      });
      this.palco.group.add(corpo.group);
    }
    this.engine.scene.add(this.palco.group);
    this.engine.scene.background = this.nebula.texture;
    this.engine.scene.backgroundIntensity = 1.0;

    // Pré-compilação sob o véu: sem ela, o primeiro uso de cada programa
    // espera o link do ANGLE/FXC bloqueando a thread (medido a frio:
    // ~10–15 s congelados na intro; e o BH compilava sozinho no meio do
    // mergulho, t≈187). KHR_parallel_shader_compile compila em threads
    // do driver — aqui só se espera, com a thread viva. Os quads de pós
    // (nebulosa, BH) não estão na cena: entram por uma cena descartável.
    // Captura (?shot=) pula: o polling queimaria o virtual-time-budget,
    // e sob tempo virtual o stall síncrono de sempre não custa nada.
    if (!this.shotMode) {
      await this.stage('shaders');
      if (this.disposed) return;
      const warm = new THREE.Scene();
      // a chave de programa inclui a PRESENÇA do atributo normal
      // (vertexNormals): o quad da nebulosa é PlaneGeometry (tem normal),
      // o FullScreenQuad do BH é um triângulo só com position+uv — cada
      // material precisa compilar contra a geometria que vai usá-lo
      const warmGeo = new THREE.PlaneGeometry(2, 2);
      const warmGeoBH = new THREE.PlaneGeometry(2, 2);
      warmGeoBH.deleteAttribute('normal');
      for (const m of this.nebula.warmupMaterials) {
        warm.add(new THREE.Mesh(warmGeo, m));
      }
      for (const m of [
        ...(this.blackHole?.warmupMaterials ?? []),
        ...this.post.warmupMaterials,
      ]) {
        warm.add(new THREE.Mesh(warmGeoBH, m));
      }
      // A chave de programa do three inclui o colorSpace de SAÍDA, que é
      // "tela" quando nenhum render target está amarrado — e no frame real
      // tudo renderiza DENTRO do composer (linear). Compilar sem RT gera a
      // variante errada e o primeiro frame re-linka tudo (medido: 8,7 s).
      const warmRt = new THREE.WebGLRenderTarget(2, 2);
      this.engine.renderer.setRenderTarget(warmRt);
      try {
        // guardado porque o dispose PRECISA esperar por ele: o
        // compileAsync do three faz polling por setTimeout lendo
        // `materialProperties.currentProgram`, e renderer.dispose()
        // apaga essas propriedades — o polling seguinte estoura com
        // "isReady of undefined", fora de qualquer try/catch nosso
        this.warmup = Promise.all([
          this.engine.renderer.compileAsync(this.engine.scene, this.engine.camera),
          this.engine.renderer.compileAsync(warm, this.engine.camera),
        ]);
        await this.warmup;
      } finally {
        this.warmup = null;
        this.engine.renderer.setRenderTarget(null);
        warmRt.dispose();
        warmGeo.dispose();
        warmGeoBH.dispose();
      }
      if (this.disposed) return;
    }

    this.setPhase('intro');
    this.engine.start();
  }

  /**
   * A única porta de troca de fase — e, desde a Onda 5, a única DONA do
   * escritor de câmera. Antes três lugares ligavam e desligavam o
   * `enabled` do FreeRoam à mão (`play`, `enterFreeRoam`, `placeCamera`);
   * com a terceira via seriam seis, e "quem manda na câmera agora" não
   * teria resposta num lugar só. Agora tem: `ESCRITOR_DE_CAMERA`.
   */
  private setPhase(p: Phase) {
    this.phase = p;
    this.escritorDeCamera = ESCRITOR_DE_CAMERA[p];
    // trocar de fase encerra o gesto da roda: meio empurrão guardado não
    // pode virar degrau na próxima entrada no Atlas
    this.roda.esquecer();
    this.roam.enabled = this.escritorDeCamera === 'voo';
    this.events.onPhase(p);
    // o HUD da fase nova pode ter mostrador de tempo, e ele monta com o
    // valor de agora em vez de esperar o primeiro passo do relógio
    this.publicarTempo();
    this.perturbar();
  }

  /** a fase viva — o App precisa dela para a guarda de atalhos */
  get fase(): Phase {
    return this.phase;
  }

  /** a viagem está congelada? (o pause-look tem dois donos — ver D3) */
  get pausado(): boolean {
    return this.freezeJourney;
  }

  // ---- sinal de prontidão para captura -----------------------------
  /**
   * Quadros DESENHADOS desde a última carga/alteração de estado que muda o
   * que a tela mostra. É o coração do `captura` logo abaixo, e ele só é
   * escrito em dois lugares: `perturbar()` (zera) e o fim do `tick` (soma
   * 1, depois do `post.render`).
   */
  private quadrosEstaveis = 0;

  /** algo mudou o que a cena mostra — a contagem de estabilidade recomeça */
  private perturbar() {
    this.quadrosEstaveis = 0;
  }

  /**
   * A CENA ESTÁ ESTÁVEL PARA CAPTURAR? Bandeira somente-leitura que o
   * harness de identidade (`scripts/visual/ab-identidade.mjs`) espera no
   * lugar de contar 700 quadros no escuro.
   *
   * POR QUE ELA EXISTE: o critério antigo era "o log da cartografia e mais
   * 700 quadros" — ~70 s por captura numa vista de 1800×1800, e 700 é um
   * número que ninguém mediu, escolhido com folga porque a alternativa
   * (`--virtual-time-budget`) devolvia a MESMA vista em estados diferentes.
   * Medido em 2026-08-11 nesta máquina: `sol`, `travessia` e `soldisco` já
   * saem com o md5 oficial no PRIMEIRO quadro depois que o deep-link é
   * aplicado. Os 700 quadros eram seguro, não critério.
   *
   * O QUE ELA ESPERA, e cada termo é uma condição REAL que o director
   * conhece (nada de relógio de parede):
   *  - `fase !== 'loading'`: o `init()` terminou — catálogo HYG e ativos
   *    cartográficos baixados, mapas de poeira/estrutura assados, galáxia
   *    construída, lâminas congeladas. O log `[cartografia]` que o harness
   *    antigo farejava sai DENTRO desse init, antes de todo o resto dele.
   *  - nada está ANDANDO: nem a viagem correndo (`journey` sem
   *    `freezeJourney`) nem a câmera do voo livre (visita a caminho, slerp
   *    de entrada, inércia). Aí a cena muda por construção e prontidão não
   *    quer dizer nada. Sob `?shot=` o relógio visual é 0, o `?t=` do
   *    harness congela e o `?pos=` entra com `snapCanonical`.
   *  - `sun.assentado`: o Sol tem retrato completo publicado — sem bake
   *    fatiado no meio e com a coroa volumétrica já publicada.
   *  - corpos assentados (item 5b da auditoria): nenhum corpo resolvido
   *    está no GATE a FRIO — armado, camada ligada, e nem textura quente
   *    nem fetch em voo. Capturar assim fotografaria o ponto fingindo a
   *    vista do globo; a carga que desistiu (3 tentativas, terra.ts)
   *    deixa a captura REPROVAR por teto em vez de mentir.
   *  - fonte assentada (item 5c): efeméride PEDIDA e indisponível com
   *    corpos em cena segura a janela da retentativa
   *    (QUADROS_TENTANDO_FONTE) — depois dela o aviso único já acusou o
   *    RETRATO e a captura solta.
   *  - `quadrosEstaveis >= QUADROS_ESTAVEIS`: quadros desenhados desde a
   *    última perturbação (troca de fase, `?q=`, `?pos=`, `?t=`, resize,
   *    exposição, camada ligada/desligada). Pequeno de propósito: o que
   *    ele cobre é o intervalo entre o fim do `init` e a aplicação dos
   *    parâmetros de URL pelo App, que acontece um tique depois.
   *
   * SOMENTE LEITURA: este getter não escreve nada e o único custo no
   * caminho de render é o `++` no fim do tick. Se ele mudasse um pixel, o
   * gate que ele serve estaria medindo a si mesmo.
   */
  get captura() {
    const andando =
      (this.phase === 'journey' && !this.freezeJourney) ||
      (this.phase === 'free' && this.roam.animando) ||
      // ENTRADA/SAÍDA DO ATLAS: o véu em curso (ou já pedido e ainda
      // não fechado) é movimento na tela como qualquer outro. O rig do
      // Atlas em si não anima — o reposicionamento acontece atrás do
      // véu —, então este é o único termo novo que a fase traz.
      this.veu > 0 ||
      this.veuPendente !== null ||
      // A MÁQUINA DO TEMPO (F4): relógio andando é cena mudando, e
      // efeméride em voo é uma mudança JÁ PEDIDA que ainda não chegou.
      // Sem os dois termos, o `?jd=` do gate poderia ser capturado no
      // quadro anterior à escrita do instante — e a captura mediria a
      // corrida, não a imagem.
      this.aoVivo ||
      this.sentidoDoTempo !== 0 ||
      this.faseDaEfemeride === 'buscando' ||
      // A TERRA (F2a) e A LUA (F2b) e OS ROCHOSOS (F3): textura em voo
      // é uma mudança JÁ PEDIDA que ainda não chegou — capturar antes
      // dela mediria a corrida, não a imagem (o mesmo argumento da
      // efeméride acima).
      this.terraCarregando ||
      this.luaCarregando ||
      this.rochosos.some((r) => r.carregando) ||
      this.gigantes.some((g) => g.carregando) ||
      // A RAMPA ENTRE DEGRAUS (F2b/D7): o rig anima entre dois
      // enquadramentos — cena mudando por construção até assentar
      this.atlas.animando;
    // CORPO NO GATE A FRIO (auditoria item 5b): o gate diz que o corpo
    // devia estar na tela e a textura não está quente — capturar agora
    // fotografaria o ponto (ou nada) fingindo a vista do globo. O
    // precedente é `sun.assentado`: prontidão espera o retrato completo.
    const corposAssentados =
      !this.terraFriaNoGate &&
      !this.luaFriaNoGate &&
      !this.rochosos.some((r) => r.friaNoGate) &&
      !this.gigantes.some((g) => g.friaNoGate);
    // O RETRATO ACUSADO (item 5c): efeméride PEDIDA indisponível com os
    // corpos em cena segura a janela da retentativa (o tick conta os
    // quadros e dá o aviso único quando ela esgota — ver o bloco no tick).
    const fonteAssentada = !(
      this.palco.ligado &&
      this.faseDaEfemeride === 'indisponivel' &&
      this.quadrosTentandoFonte < QUADROS_TENTANDO_FONTE
    );
    return {
      pronto:
        this.phase !== 'loading' &&
        !andando &&
        this.sun.assentado &&
        corposAssentados &&
        fonteAssentada &&
        this.quadrosEstaveis >= QUADROS_ESTAVEIS,
      quadros: this.quadrosEstaveis,
      fase: this.phase,
      andando,
      sol: this.sun.assentado,
      corpos: corposAssentados,
      fonte: fonteAssentada,
      tier: this.engine.quality,
    };
  }

  /** nuvens CO/complexos em coords de cena para semear o raymarch */
  private buildSeedCloudPool(galactic: {
    molecularClouds: { data: Float32Array; count: number; stride: number };
    largeMolecularClouds: { data: Float32Array; count: number; stride: number };
  }) {
    const out: number[] = [];
    const scratch = new THREE.Vector3();
    {
      const { data, count, stride } = galactic.molecularClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        if (data[o + 10] < 0.5) continue;
        const surface = data[o + 5];
        const amp = (surface / (surface + 130)) * 2.0;
        if (amp < 0.08) continue;
        galactocentricToScene(data[o], data[o + 1], data[o + 2], scratch);
        out.push(scratch.x, scratch.y, scratch.z, Math.max(data[o + 3] * 1.6, 14), amp);
      }
    }
    {
      const { data, count, stride } = galactic.largeMolecularClouds;
      for (let i = 0; i < count; i++) {
        const o = i * stride;
        const density = data[o + 4];
        galactocentricToScene(data[o], data[o + 1], data[o + 2], scratch);
        out.push(
          scratch.x, scratch.y, scratch.z,
          Math.max(data[o + 3] * 1.2, 60),
          (density / (density + 116)) * 1.6
        );
      }
    }
    this.seedCloudPool = new Float32Array(out);
  }

  /** seleciona as ≤32 nuvens do catálogo mais próximas da câmera */
  private updateSeedClouds(camPos: THREE.Vector3) {
    const pool = this.seedCloudPool;
    if (!pool) return;
    const reach = 900; // pc — alcance do raymarch + margem
    // rank pela distância à SUPERFÍCIE: um complexo que envolve a
    // câmera nunca é expulso por nuvens pequenas próximas
    const nearest: Array<{ sd: number; o: number }> = [];
    for (let o = 0; o < pool.length; o += 5) {
      const dx = pool[o] - camPos.x;
      const dy = pool[o + 1] - camPos.y;
      const dz = pool[o + 2] - camPos.z;
      const sd = Math.max(
        0,
        Math.sqrt(dx * dx + dy * dy + dz * dz) - pool[o + 3]
      );
      if (sd > reach) continue;
      nearest.push({ sd, o });
    }
    nearest.sort((a, b) => a.sd - b.sd);
    const n = Math.min(nearest.length, 32);
    // amplitude → 0 na fronteira de seleção: nuvens entram e saem do
    // conjunto invisíveis — sem popping a cada refresh de 0,25 s
    const cut = Math.max(nearest.length > 32 ? nearest[32].sd : reach, 1);
    for (let i = 0; i < n; i++) {
      const o = nearest[i].o;
      const t = i * 5;
      const edge = 1 - THREE.MathUtils.smoothstep(nearest[i].sd, cut * 0.8, cut);
      this.seedCloudScratch[t] = pool[o];
      this.seedCloudScratch[t + 1] = pool[o + 1];
      this.seedCloudScratch[t + 2] = pool[o + 2];
      this.seedCloudScratch[t + 3] = pool[o + 3];
      this.seedCloudScratch[t + 4] = pool[o + 4] * edge;
    }
    this.nebula.setSeedClouds(this.seedCloudScratch, n);
  }

  /** posiciona a câmera em modo livre (deep-links/screenshots ?pos=) */
  placeCamera(pos: [number, number, number], look?: [number, number, number]) {
    const cam = this.engine.camera;
    cam.position.set(pos[0], pos[1], pos[2]);
    if (look) cam.lookAt(look[0], look[1], look[2]);
    // quem liga o escritor é o `setPhase` lá embaixo (mapa fase→rig);
    // `syncFromCamera`/`snapCanonical` não dependem do `enabled`
    this.roam.syncFromCamera();
    // captura/deep-link: sem slerp de entrada — orientação exata no frame 1
    this.roam.snapCanonical();
    // o primeiro frame já renderiza com as nuvens-semente do lugar —
    // capturas ?pos= são determinísticas desde o frame 1
    this.updateSeedClouds(cam.position);
    this.seedCloudTimer = 0;
    this.setPhase('free'); // e o setPhase zera a contagem de estabilidade
    this.events.onCaption(-1, '', '');
    this.events.onWarp(0);
  }

  play() {
    this.journeyT = 0;
    this.lastCaptionIdx = -1;
    this.freezeJourney = false;
    this.playbackRate = 1;
    this.leftDisk = false;
    this.rig.reset();
    this.rig.paused = false;
    this.setPhase('journey');
  }

  /**
   * Salta para um instante da viagem (segundos) — usado por deep-links.
   *
   * O TETO É PARTE DO CONTRATO: `?t=` vem de fora e não tem limite, e sem
   * ele o `journeyT` guardava o número cru (99999 com duração 321, medido
   * no navegador). Ele vaza para o link de retomada, que o HUD monta a
   * partir do `currentTime`, e faz `onProgress` depender de um `min` a
   * jusante para não passar de 1. Achado de auditoria externa.
   */
  seek(t: number) {
    this.journeyT = Math.min(t, this.rig.duration);
    this.leftDisk = false;
    this.rig.reset(); // a mira suavizada também salta para o instante certo
    this.perturbar();
  }

  get journeyDuration() {
    return this.rig.duration;
  }

  /** instante atual da viagem — para gravar o momento num link */
  get currentTime() {
    return this.journeyT;
  }

  /** pausa/retoma a viagem; retorna o novo estado (true = pausado) */
  togglePause(): boolean {
    if (this.phase !== 'journey') return false;
    this.freezeJourney = !this.freezeJourney;
    this.rig.paused = this.freezeJourney;
    this.perturbar();
    return this.freezeJourney;
  }

  /** início do Ato IV — o botão "Ver a galáxia" salta para cá */
  get revealTime() {
    return REVEAL_T;
  }

  /**
   * Troca AO VIVO uma camada — TODAS as do painel, desde 2026-08-12.
   * As três da galáxia (nodisc/nogdust/noglow) recarregavam a página por
   * um motivo que nunca existiu ("são lidas no bake"): o bake roda
   * inteiro de qualquer jeito, e elas só governam visibilidade e bind
   * por quadro. Aqui elas são ROTEADAS para quem as lê — a Galaxy —, sem
   * o Director repetir a lista de flags dela.
   */
  setLayerHidden(flag: string, hidden: boolean) {
    // antes do desvio: o ramo da nebulosa também muda a tela, e sair por
    // ele sem zerar a contagem daria cena "estável" com a camada trocando
    this.perturbar();
    if (flag === 'nonebula') {
      this.noNebula = hidden;
      return;
    }
    if (hidden) this.hide.add(flag);
    else this.hide.delete(flag);
    this.galaxy?.setLayerHidden(flag, hidden);
  }

  // ---- pausar-e-olhar (viagem congelada) -------------------------
  private get pauseLookActive() {
    return this.phase === 'journey' && this.freezeJourney;
  }

  /**
   * Os MESMOS listeners servem o Atlas — arrastar orbita o alvo, clique
   * curto foca o nome mais próximo. Registrar um segundo conjunto para
   * a fase nova compraria dois donos do mesmo gesto no mesmo canvas; o
   * dono muda com a fase, o listener não.
   */
  private onPausePointerDown = (event: PointerEvent) => {
    if (!this.pauseLookActive && this.phase !== 'atlas') return;
    this.arrastoDaPausa.comecar(event, performance.now());
  };

  private onPausePointerMove = (event: PointerEvent) => {
    // o passo vem `null` para qualquer ponteiro que não seja o dono do
    // gesto: é ISSO que impede o segundo dedo de girar 25° medido
    // contra a última posição do primeiro (ver `arrastoDePonteiro.ts`)
    const passo = this.arrastoDaPausa.mover(event);
    if (!passo) return;
    if (this.phase === 'atlas') {
      // OS DOIS EIXOS (Onda 7): o `dy` era calculado e jogado fora — a
      // dica prometia "girar em torno do alvo" e o que existia era uma
      // subida em latitude. Agora a horizontal dá a volta e a vertical
      // sobe e desce, cada uma no seu eixo (ver `addOrbitDelta`).
      this.atlas.addOrbitDelta(passo.dx, passo.dy);
      this.perturbar();
    } else if (this.pauseLookActive) {
      this.rig.addLookDelta(passo.dx, passo.dy);
    }
  };

  private onPausePointerUp = (event: PointerEvent) => {
    // clique curto e parado no Atlas = focar. Os dois limiares (6 px,
    // 400 ms) são os do voo livre, não números novos — hoje moram em
    // `CLIQUE_PX`/`CLIQUE_MS`, um lugar só para os dois gestos.
    const curto = this.arrastoDaPausa.soltar(event, performance.now());
    if (curto && this.phase === 'atlas') {
      this.tryVisit(
        event.clientX / window.innerWidth,
        event.clientY / window.innerHeight
      );
    }
  };

  /**
   * O SISTEMA LEVOU O PONTEIRO: gesto do iOS, palma rejeitada, trocar
   * de janela com o botão preso. Nesses casos o `pointerup` NUNCA
   * chega, e sem este tratador o arrasto ficava ligado para sempre — a
   * cena passava a girar com o ponteiro solto, e o único caminho de
   * volta era recarregar. Encerra pelo mesmo lugar do soltar, MENOS o
   * clique curto: gesto abortado pelo sistema não é clique de ninguém.
   * O `lostpointercapture` entra junto porque o toque tem captura
   * IMPLÍCITA no alvo — quando ela cai sem `pointerup` (o navegador
   * assumiu o gesto), este é o único aviso que chega.
   */
  private onPausePointerCancel = (event: PointerEvent) => {
    this.arrastoDaPausa.cancelar(event);
  };

  /**
   * A RODA E A PINÇA MOVEM A ESCADA (Onda 7) — e este é o único lugar
   * do projeto que trata `wheel` fora do voo livre.
   *
   * O `preventDefault` é INCONDICIONAL dentro da fase, e vem antes de
   * qualquer decisão de degrau: mesmo o giro que não completa um degrau
   * (o acumulador ainda somando) tem de morrer aqui, senão metade dos
   * eventos de um gesto rolaria a página enquanto a outra metade move a
   * escada. E ele vale para a PINÇA pelo mesmo `wheel` — no Chrome e no
   * Safari de Mac a pinça de trackpad chega como `wheel` com `ctrlKey`,
   * e o padrão dela é DAR ZOOM NA PÁGINA inteira, HUD e canvas juntos.
   *
   * Quem traduz pixels em degrau é a `RodaDaEscada` (limiar, trava e
   * `deltaMode`); aqui só se decide o que é subir e o que é descer.
   */
  private onRodaDoAtlas = (evento: WheelEvent) => {
    if (this.phase !== 'atlas') return;
    evento.preventDefault();
    const passo = this.roda.girar(evento, performance.now(), window.innerHeight);
    if (passo < 0) this.descerDegrau();
    else if (passo > 0) this.subirDegrau();
  };

  /**
   * O MENU DO SISTEMA NÃO ABRE SOBRE A CENA. Mora aqui, e não no
   * `FreeRoam`, porque o canvas é UM e os dois conjuntos de listeners
   * são dele: dois `preventDefault` no mesmo evento seriam a mesma
   * decisão escrita em dois lugares. Vale em TODAS as fases de
   * propósito — o canvas ocupa a tela inteira, e um menu de navegador
   * por cima do filme é a mesma quebra de imersão em qualquer uma
   * delas. As peças do HUD são outros nós do DOM: clicar com o direito
   * nelas continua abrindo o menu normal.
   */
  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  /** etiqueta forçada do assunto do shot ('SOL' | 'SGR' | nome HYG) */
  private resolveForcedLabel(cam: THREE.PerspectiveCamera, name: string): StarLabel | null {
    if (name === 'SOL') {
      return projectForced(cam, 'SOL', 'G2V', { x: 0, y: 0, z: 0 }, 'sol-home');
    }
    if (name === 'SGR') {
      return projectForced(cam, 'Sagittarius A✱', 'SMBH', GAL.GC_POS, 'sgr-a');
    }
    const star = this.meta.named.find((s) => s.n === name);
    return star ? projectForced(cam, star.n, star.s, star, star.n) : null;
  }

  /** "→ DESTINO · distância viva" — só emite quando o texto muda */
  private emitDest(dest: string | undefined, camPos: THREE.Vector3) {
    let text = '';
    if (dest) {
      const target =
        dest === 'SGR' ? GAL.GC_POS : this.meta?.named.find((s) => s.n === dest);
      if (target) {
        const d = camPos.distanceTo(
          target instanceof THREE.Vector3
            ? target
            : new THREE.Vector3(target.x, target.y, target.z)
        );
        const al = d * 3.262;
        const fmt =
          al < 100
            ? `${al.toFixed(1)} AL`
            : al < 10_000
              ? `${Math.round(al)} AL`
              : `${(al / 1000).toFixed(1)} MIL AL`;
        const label = dest === 'SGR' ? 'SAGITTARIUS A✱' : dest.toUpperCase();
        text = `→ ${label} · ${fmt}`;
      }
    }
    // aparecer/sumir é imediato; o contador vivo atualiza a 4 Hz
    const changedKind = (text === '') !== (this.lastDest === '');
    if (text !== this.lastDest && (changedKind || this.destTimer > 0.25)) {
      this.lastDest = text;
      this.destTimer = 0;
      this.events.onDest(text);
    }
  }

  /**
   * Clique curto no rótulo mais próximo. Duas fases, dois modos: no voo
   * livre a câmera VOA até lá; no Atlas ela ENQUADRA de onde estiver.
   */
  private tryVisit(x: number, y: number) {
    if ((this.phase !== 'free' && this.phase !== 'atlas') || !this.meta) return;
    let best: StarLabel | null = null;
    let bestD = 0.0035; // ~6% da tela ao quadrado
    for (const label of this.lastLabels) {
      if (label.opacity < 0.15) continue;
      const dx = label.x - x;
      const dy = label.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = label;
      }
    }
    if (!best) return;
    // no Atlas o Sol não é "uma estrela a 0 pc": clicar nele é voltar
    // para casa, o enquadramento de abertura
    if (best.key === 'sol-home' && this.phase === 'atlas') {
      this.focarNoSistema();
      return;
    }
    // um CORPO do sistema: enquadra pela ÓRBITA dele, que é o que o
    // AtlasRig já sabe fazer com a abertura
    if (best.key.startsWith(CHAVE_DE_CORPO)) {
      const id = best.key.slice(CHAVE_DE_CORPO.length);
      // O GESTO DA DESCIDA NO SOL — o mesmo de todo corpo (D7: "clicar
      // no MESMO corpo já focado desce um degrau"), traduzido para o
      // único da casa cujo degrau de cima é a ABERTURA: a esfera do
      // degrau `sistema` já é centrada no Sol, então quem clica no Sol
      // estando em casa está clicando no alvo que já está em foco, e
      // desce ao corpo dele. Clicar no Sol de QUALQUER outro degrau
      // continua sendo voltar para casa, palavra por palavra.
      //
      // AQUI e não dentro de `focarNoCorpo` porque isto é GESTO: a
      // porta `?foco=sol` também chama aquele método, e no boot ela
      // chega com a abertura já na tela — dentro de lá as duas seriam
      // indistinguíveis, e `?foco=sol` (sem `ver=`) passaria a cair no
      // Sol em vez da casa, quebrando a baseline.
      if (id === 'sun' && this.escada.degrau === 'sistema') {
        this.focarNoCorpo('sun', 'corpo');
        return;
      }
      this.focarNoCorpo(id);
      return;
    }
    if (best.key === 'sgr-a') {
      this.irAte(GAL.GC_POS.clone(), 7, best.name);
      return;
    }
    const star =
      best.key === 'sol-home'
        ? { n: 'Sol', x: 0, y: 0, z: 0 }
        : this.meta.named.find((s) => s.n === best.name);
    if (!star) return;
    this.visitarEstrela(star);
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
   * `nome` só serve ao Atlas: é o que a ContextLine passa a ler. No voo
   * livre quem anuncia o destino é a linha de rumo, que já existe.
   */
  private irAte(pos: THREE.Vector3, arriveDist: number, nome: string | null = null) {
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
    if (!this.efemeride) return null;
    const jd = grampearJd(this.jdPedido);
    let raioUA = 0;
    const externo = { x: 0, y: 0, z: 0 };
    for (const c of CORPOS_DO_SISTEMA) {
      if (c.id === 'sun') continue;
      const p = this.efemeride.posicaoHeliocentrica(c.id, jd);
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
    const casa = this.casaViva();
    if (casa) {
      this.atlas.focar(ORIGEM, casa.raio, casa.eixo, { rampa: this.rampaDaEscada() });
    } else {
      this.atlas.focarNoSistema();
    }
    this.enquadrarAgora();
    this.focoCorpoId = null;
    this.focoEstrela = false;
    this.ver = 'orbita';
    this.events.onFoco(null);
    this.emitirEscada();
    this.teletransportou();
  }

  /**
   * A rampa entre degraus (F2b/D7) só anima com o modo VIVO na tela:
   * dentro da fase, sem `?shot=` e sem reduced-motion — entrada,
   * deep-link e captura seguem instantâneos (contrato da Onda 5).
   */
  private rampaDaEscada(): boolean {
    return this.phase === 'atlas' && !this.shotMode && !this.reducedMotion;
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
   * ENQUADRA A ÓRBITA, não o corpo: a esfera é centrada no SOL e tem o
   * raio da distância heliocêntrica VIVA do alvo. É a mesma forma da
   * vista de abertura (que é este método com o corpo mais externo), e é o
   * que a D5 manda — corpos são pontos até a Onda 6, e uma tabela nova de
   * raios físicos seria a segunda fonte de verdade que a Onda 7 refaria.
   * A DIREÇÃO sai do corpo, e é ela que dá a vista privilegiada dele.
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
    this.atlas.focar(ORIGEM, pos.length(), pos, { rampa: this.rampaDaEscada() });
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
  private poloDoCorpo(id: string): THREE.Vector3 | null {
    const o = IAU_ORIENTATIONS[id];
    if (!o) return null;
    const p = baseCorpoEquatorial(o, grampearJd(this.jdPedido)).polo;
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
    const jd = grampearJd(this.jdPedido);
    const p =
      id === 'earth'
        ? posicaoDaTerraUA(jd, this.efemeride)
        : ehGigante
          ? posicaoDoGiganteUA(id, jd, this.efemeride)
          : posicaoDoRochosoUA(id, jd, this.efemeride);
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

  /** escreve o centro vivo no slot da lua em `luaPosParaRotulo`. */
  private escreverPosicaoDeLua(id: string, centro: THREE.Vector3) {
    const i = LUAS_DO_SISTEMA.findIndex((l) => l.id === id);
    if (i < 0) return;
    this.luaPosParaRotulo[i * 3] = centro.x;
    this.luaPosParaRotulo[i * 3 + 1] = centro.y;
    this.luaPosParaRotulo[i * 3 + 2] = centro.z;
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
    if (!this.efemeride) {
      // a ContextLine já anuncia a lua; o enquadramento chega com a fonte
      // (`reenquadrarAposEfemeride`) — nenhuma posição inventada antes
      this.garantirEfemerides();
      return;
    }
    // centros pela MESMA cadeia dos meshes, calculados na hora (o boot
    // por URL chega antes do primeiro tick — ver aproximarDoCorpo)
    const jd = grampearJd(this.jdPedido);
    const paraPc = (p: { x: number; y: number; z: number }) => {
      const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
      return new THREE.Vector3(
        eq[0] * AU_PARA_PC,
        eq[1] * AU_PARA_PC,
        eq[2] * AU_PARA_PC
      );
    };
    const lua = paraPc(this.efemeride.posicaoHeliocentrica(id, jd));
    const pai = paraPc(this.efemeride.posicaoHeliocentrica(entrada.pai, jd));
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
    const jd = grampearJd(this.jdPedido);
    const paraPc = (p: { x: number; y: number; z: number }) => {
      const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
      return new THREE.Vector3(
        eq[0] * AU_PARA_PC,
        eq[1] * AU_PARA_PC,
        eq[2] * AU_PARA_PC
      );
    };
    const { degrau } = this.escada;
    if (degrau === 'estrela') return null;
    if (degrau === 'lua') {
      if (!this.efemeride) return null;
      const lua = paraPc(this.efemeride.posicaoHeliocentrica('moon', jd));
      return {
        alvo: lua,
        raio: RAIO_LUA_PC,
        eixoDe: lua,
        pai: paraPc(this.efemeride.posicaoHeliocentrica(LUAS_DO_SISTEMA[0].pai, jd)),
        polo: this.poloDoCorpo(LUAS_DO_SISTEMA[0].id)?.clone() ?? null,
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
      const centro = paraPc(posicaoDaTerraUA(jd, this.efemeride));
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
      const pos = this.efemeride
        ? paraPc(this.efemeride.posicaoHeliocentrica(id, jd))
        : this.posicaoDesenhada(id);
      if (!pos || pos.lengthSq() === 0) return null;
      return { alvo: ORIGEM, raio: pos.length(), eixoDe: pos, pai: null, polo: null };
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
  private recomporAlvo() {
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
   */
  subirDegrau(): boolean {
    if (this.phase !== 'atlas') return false;
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
   * A DESCIDA da escada (Onda 7): o gesto irmão do `subirDegrau`, e o
   * consumidor de runtime da roda e da pinça. Devolve se algum degrau
   * foi descido.
   *
   * Cada ramo cai num método que JÁ EXISTIA — não há enquadramento novo
   * nascendo aqui, só a ordem dos degraus dita uma vez:
   *
   *  · `sistema` → a ÓRBITA da casa. Um degrau abaixo do sistema precisa
   *    de um alvo, e no degrau "sistema" não há nenhum escolhido; o alvo
   *    sai do DADO e não de um literal novo — é o pai da única lua
   *    construída (`LUAS_DO_SISTEMA`), que é o mesmo que dizer "o único
   *    corpo cuja escada existe inteira até embaixo". Sem este ramo a
   *    roda não faria nada justamente na vista de ABERTURA, que é onde
   *    todo visitante a experimenta primeiro — e a queixa continuaria de
   *    pé com o conserto no lugar.
   *  · `orbita` → o CORPO, e só onde `podeAproximar` diz que há mesh
   *    resolvido: fingir um degrau que não existe seria pior que não ter
   *    roda.
   *  · `corpo` → a LUA dele, quando o corpo em foco é o pai de uma.
   *  · `lua` e `estrela` → não há degrau abaixo, e a roda cala.
   *
   * O CORPO DO SOL NÃO ENTRA NA DESCIDA, e a razão é que ele não é um
   * degrau ABAIXO de `sistema`: é o outro ramo que sai dali. Este ramo
   * já está gasto com a órbita da casa, e trocá-lo pelo Sol tiraria da
   * roda o único caminho que ela tem até a Terra — a queixa que a
   * Onda 7 consertou voltaria por outra porta. O corpo do Sol se
   * alcança pelo gesto irmão, o clique no Sol estando em casa
   * (`tryVisit`), e por `?foco=sol&ver=corpo`; a SUBIDA, essa sim,
   * atravessa a roda: do corpo do Sol a roda para cima volta à casa
   * pelo `subirDegrau` de sempre.
   */
  descerDegrau(): boolean {
    if (this.phase !== 'atlas') return false;
    const { degrau, podeAproximar } = this.escada;
    const paiDaLua = LUAS_DO_SISTEMA[0].pai;
    if (degrau === 'sistema') {
      this.focarNoCorpo(paiDaLua, 'orbita');
      return true;
    }
    if (degrau === 'orbita') {
      if (!podeAproximar) return false;
      this.aproximarDoCorpo();
      return true;
    }
    if (degrau === 'corpo') {
      if (this.focoCorpoId !== paiDaLua) return false;
      this.focarNaLua();
      return true;
    }
    return false;
  }

  /**
   * REAPLICA o enquadramento do degrau vivo quando a efeméride chega
   * TARDE (ela sempre chega tarde: o fetch nasce na entrada do modo).
   * Na época o resultado é o mesmo bit a bit (A/B de `?jd=EPOCA`); com
   * `?jd=` de outra data é aqui que a abertura vira a posição do DIA e
   * que o `?foco=lua` do boot ganha finalmente uma Lua para enquadrar.
   */
  private reenquadrarAposEfemeride() {
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
    const jd = grampearJd(this.jdPedido);
    const luas = LUAS_DO_SISTEMA.map((l) => {
      let rUA = Number.NaN;
      if (this.efemeride) {
        const p = this.efemeride.posicaoHeliocentrica(l.id, jd);
        const pai = this.efemeride.posicaoHeliocentrica(l.pai, jd);
        rUA = Math.hypot(p.x - pai.x, p.y - pai.y, p.z - pai.z);
      }
      return { id: l.id, nome: l.nome, classe: l.classe, rUA, pai: l.pai };
    });
    const anoes = HELIO_SEM_PONTO.map((a) => {
      let rUA = Number.NaN;
      if (this.efemeride) {
        const p = this.efemeride.posicaoHeliocentrica(a.id, jd);
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
    if (!this.efemeride) {
      this.garantirEfemerides();
      return;
    }
    const jd = grampearJd(this.jdPedido);
    const p = this.efemeride.posicaoHeliocentrica(id, jd);
    const eq = eclipticaParaEquatorial([p.x, p.y, p.z]);
    const pos = new THREE.Vector3(eq[0] * AU_PARA_PC, eq[1] * AU_PARA_PC, eq[2] * AU_PARA_PC);
    if (pos.lengthSq() === 0) return;
    this.atlas.focar(ORIGEM, pos.length(), pos, { rampa: this.rampaDaEscada() });
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

  /** scrub pela barra de progresso (fração 0..1) */
  seekFraction(fraction: number) {
    if (this.phase === 'end') this.play();
    this.seek(THREE.MathUtils.clamp(fraction, 0, 1) * this.rig.duration);
  }

  /** setas ←/→: salta para o capítulo anterior/seguinte (as legendas) */
  skipChapter(dir: 1 | -1) {
    if (this.phase !== 'journey') return;
    const times = this.rig.ticks.map((k) => k.t * this.rig.duration);
    if (dir > 0) {
      const next = times.find((x) => x > this.journeyT + 0.5);
      if (next !== undefined) this.seek(next);
    } else {
      // como em players de vídeo: volta ao início do capítulo atual;
      // apertando de novo (perto do início), ao anterior
      const prevs = times.filter((x) => x < this.journeyT - 2.5);
      this.seek(prevs.length ? prevs[prevs.length - 1] : 0);
    }
  }

  /** 1× → 2× → 4× → 1× */
  cyclePlaybackRate(): number {
    this.playbackRate = this.playbackRate >= 4 ? 1 : this.playbackRate * 2;
    return this.playbackRate;
  }

  enterFreeRoam() {
    this.roam.syncFromCamera();
    this.setPhase('free');
    this.events.onCaption(-1, '', '');
    this.events.onLabels([]);
    this.events.onWarp(0); // a vinheta de warp ficava presa no CSS
  }

  /**
   * A CAPTURA DE PONTEIRO do voo livre (Onda 5, F5). O HUD é quem
   * OFERECE o opt-in, e é por aqui que ele pede e pergunta; as quatro
   * defesas (backoff, dispose, soltar as teclas no unlock, listener de
   * movimento só com lock) moram no rig, que é o dono das teclas.
   */
  get capturaDePonteiro() {
    return this.roam.captura;
  }

  // ---- portal do Atlas ---------------------------------------------

  /**
   * ENTRAR NO ATLAS. Só o pause-look e o deep-link `?atlas=1` chamam
   * isto. Não é travessia física: o véu fecha, a câmera é reposta pelo
   * AtlasRig e o véu abre.
   *
   * `momento` semeia a volta a partir da URL (`?atlas=1&t=…`): sem ele
   * e sem viagem em curso, o portal guarda NADA — e "Partir" devolve a
   * tela de título, que é o candidato honesto (D3).
   */
  entrarNoAtlas(opcoes: { instantaneo?: boolean; momento?: number } = {}) {
    if (this.phase === 'atlas' || this.phase === 'loading') return;
    const daViagem = this.phase === 'journey' || this.phase === 'end';
    const olhar = this.rig.olhar;
    this.retomada =
      opcoes.momento !== undefined
        ? {
            journeyT: opcoes.momento,
            lookYaw: 0,
            lookPitch: 0,
            leftDisk: false,
            pausado: true,
          }
        : daViagem
          ? {
              journeyT: this.journeyT,
              lookYaw: olhar.yaw,
              lookPitch: olhar.pitch,
              leftDisk: this.leftDisk,
              pausado: this.freezeJourney,
            }
          : null;
    // F2b: o Atlas é o modo em que o céu é VIVO — a abertura na época
    // (o override declarado de `focarNoSistema`) e a Lua na busca/escada
    // precisam da fonte, então o fetch nasce na entrada do modo. Sem
    // rede a degradação é a existente: retrato congelado + badge do
    // tempo dizendo a verdade ("sem efeméride"). O filme continua sem
    // pagar um byte: só quem cruza o portal chega aqui.
    this.garantirEfemerides();
    this.atravessarVeu(opcoes.instantaneo === true, () => {
      // focar ANTES da fase virar: `rampaDaEscada()` ainda vê a fase
      // velha e a reposição é seca — a entrada acontece atrás do véu,
      // nunca por rampa (D3: não é travessia física)
      this.focarNoSistema();
      this.setPhase('atlas');
    });
  }

  /**
   * PARTIR. Devolve os CINCO do portal de uma vez — o instante, os dois
   * ângulos do olhar, o latch do disco e a pausa (que tem dois donos:
   * `freezeJourney` aqui e `rig.paused` no rig). O `reset()` antes do
   * `restaurarOlhar` é de propósito: ele arma o salto do primeiro
   * quadro, que recompõe mira e fov exatamente a partir do instante.
   *
   * E PARA O RELÓGIO DO CÉU, porque ele é do Atlas: o `andarORelogio`
   * roda no topo do tick sem olhar a fase, e os controles que o param só
   * existem no HUD do modo (`HUD_POR_FASE.atlas.tempo`). Sem esta parada,
   * quem partisse com ⏵ ou AO VIVO ligado voltava ao filme com os dez
   * corpos andando, o HUD re-renderizando a 4 Hz e o sinal de prontidão
   * da captura travado em `andando` — e sem nenhum botão para desfazer,
   * porque a barra do tempo ficou para trás.
   *
   * O `jdPedido` FICA: o instante escolhido é dado medido, viaja no link
   * (`urlComMomento`) e é a data em que os planetas estão. O que para é
   * o relógio, não o calendário.
   */
  partirDoAtlas() {
    if (this.phase !== 'atlas') return;
    const volta = this.retomada;
    this.sentidoDoTempo = 0;
    this.aoVivo = false;
    this.naParede = false;
    this.publicarTempo();
    this.atravessarVeu(false, () => {
      this.rig.reset();
      this.teletransportou();
      if (!volta) {
        this.setPhase('intro');
        return;
      }
      this.journeyT = volta.journeyT;
      this.rig.restaurarOlhar(volta.lookYaw, volta.lookPitch);
      this.leftDisk = volta.leftDisk;
      this.freezeJourney = volta.pausado;
      this.rig.paused = volta.pausado;
      this.setPhase('journey');
    });
  }

  /** o instante guardado pelo portal — o link copiado de dentro o carrega */
  get momentoGuardado(): number | null {
    return this.retomada?.journeyT ?? null;
  }

  // ---- a máquina do tempo (F4/D2) ----------------------------------

  /**
   * O MOSTRADOR, somente leitura — como o `captura` e o `selo`. A conta
   * inteira (grampo, aviso, rótulos) mora no módulo puro; aqui só se
   * juntam os cinco campos de estado que este objeto guarda.
   */
  get tempo(): EstadoDoTempo {
    return estadoDoTempo({
      jdPedido: this.jdPedido,
      jdDaEpoca: EPOCA_JD_TDB,
      degrau: this.degrau,
      sentido: this.sentidoDoTempo,
      aoVivo: this.aoVivo,
      efemeride: this.faseDaEfemeride,
      naParede: this.naParede,
    });
  }

  /**
   * BUSCA A EFEMÉRIDE, UMA VEZ E TARDE. Ninguém que só quer ver o filme
   * paga um byte disto: quem chama são a porta `?jd=` e os controles do
   * tempo no HUD do Atlas, e o download é abortado pelo mesmo signal de
   * todo o resto.
   *
   * SEM REDE NÃO HÁ GRITO — NESTE caminho. A camada continua no retrato
   * congelado e o badge do HUD conta a verdade ao visitante — um
   * `console.error` aqui seria ruído num caminho em que a degradação é
   * o comportamento projetado. Falhou uma vez, uma segunda tentativa é
   * permitida: quem clicou de novo pediu de novo.
   *
   * A ÚNICA exceção mora no tick (item 5c da auditoria): com CORPOS em
   * cena e a fonte pedida indisponível, o RETRATO ACUSA — um aviso por
   * sessão, depois da janela de retentativa (QUADROS_TENTANDO_FONTE).
   * O juiz atlas-smoke pina exatamente esse aviso, e nada além dele.
   */
  private garantirEfemerides() {
    if (this.efemeride || this.faseDaEfemeride === 'buscando') return;
    this.faseDaEfemeride = 'buscando';
    this.publicarTempo();
    carregarEfemerides(this.abortController.signal)
      .then(({ motor }) => {
        if (this.disposed) return;
        this.efemeride = motor;
        this.faseDaEfemeride = 'viva';
        // o instante vai ser reescrito no tick seguinte: a imagem pode
        // mudar, e a contagem de estabilidade da captura recomeça
        this.perturbar();
        this.publicarTempo();
        // F2b: o degrau vivo se reaplica com a fonte na mão — a
        // abertura vira a posição do DIA e o `?foco=lua` do boot ganha
        // a Lua que esperava (na época é bit a bit o que já estava)
        this.reenquadrarAposEfemeride();
      })
      .catch((error: unknown) => {
        if (this.disposed) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        this.faseDaEfemeride = 'indisponivel';
        this.publicarTempo();
      });
  }

  /**
   * ⏴ ⏸ ⏵ — o sentido em que o relógio anda. QUALQUER sentido desliga o
   * AO VIVO, inclusive o zero: os dois são modos de relógio, ter os dois
   * ligados seria o visitante disputando a data com o próprio calendário
   * — e o ⏸ diz "parar o tempo", que é parar QUALQUER relógio. Enquanto
   * o zero não desligava o AO VIVO, o botão ficava habilitado (o HUD lê
   * `sentido === 0 && !aoVivo`), o visitante o apertava e a data seguia
   * andando a 1 Hz: o rótulo prometia uma coisa e o método fazia outra.
   */
  andarNoTempo(sentido: SentidoDoTempo) {
    this.sentidoDoTempo = sentido;
    this.naParede = false;
    this.aoVivo = false;
    if (sentido !== 0) this.garantirEfemerides();
    this.perturbar();
    this.publicarTempo();
  }

  /** o próximo degrau da escada, dando a volta — precedente do `1×/2×/4×` */
  ciclarDegrau(): number {
    this.degrau = degrauValido((this.degrau + 1) % DEGRAUS_DE_TEMPO);
    this.garantirEfemerides();
    // troca de taxa muda o que a tela vai mostrar no quadro seguinte
    this.perturbar();
    this.publicarTempo();
    return this.degrau;
  }

  /**
   * AO VIVO: o céu no instante em que o visitante está. A data sai do
   * conversor único da casa (`dateToTDB`, regra M6) — nunca de uma
   * conta de milissegundos aqui dentro.
   */
  alternarAoVivo() {
    this.aoVivo = !this.aoVivo;
    this.naParede = false;
    if (this.aoVivo) {
      this.sentidoDoTempo = 0;
      this.relogioAoVivo = PASSO_DO_AO_VIVO_S; // o primeiro tick já lê o relógio
      this.garantirEfemerides();
    }
    this.perturbar();
    this.publicarTempo();
  }

  /**
   * VOLTAR À ÉPOCA — o retrato congelado de 2026, que é o que a cena
   * mostra quando ninguém mexeu em nada. Não busca efeméride nenhuma:
   * se ela nunca chegou, a camada já está exatamente aqui.
   */
  voltarAEpoca() {
    this.jdPedido = EPOCA_JD_TDB;
    this.sentidoDoTempo = 0;
    this.aoVivo = false;
    this.naParede = false;
    this.perturbar();
    this.publicarTempo();
  }

  /** o mostrador sai agora, e o relógio do mostrador recomeça */
  private publicarTempo() {
    this.mostradorTimer = 0;
    this.events.onTempo(this.tempo);
  }

  /**
   * O RELÓGIO, um passo. Fora de qualquer movimento no tempo o método
   * inteiro é um teste falso — o filme não paga por ele.
   *
   * O grampo PARA na borda em vez de deixar o pedido correr para fora:
   * ver `naParede`. O AO VIVO relê o calendário a 1 Hz (D2), que é a
   * resolução em que o mostrador fala.
   */
  private andarORelogio(dt: number) {
    if (!this.aoVivo && this.sentidoDoTempo === 0) return;
    if (this.aoVivo) {
      this.relogioAoVivo += dt;
      if (this.relogioAoVivo >= PASSO_DO_AO_VIVO_S) {
        this.relogioAoVivo = 0;
        const agora = dateToTDB(new Date());
        const grampeado = grampearJd(agora);
        this.naParede = grampeado !== agora;
        this.jdPedido = grampeado;
      }
    } else {
      const bruto =
        this.jdPedido + (this.sentidoDoTempo * taxaDoDegrau(this.degrau) * dt) / 86400;
      const grampeado = grampearJd(bruto);
      this.jdPedido = grampeado;
      if (grampeado !== bruto) {
        this.naParede = true;
        this.sentidoDoTempo = 0;
        this.publicarTempo();
        return;
      }
    }
    this.mostradorTimer += dt;
    if (this.mostradorTimer >= PASSO_DO_MOSTRADOR_S) this.publicarTempo();
  }

  /**
   * A CÂMERA SALTOU. Entrar no Atlas, partir dele e trocar de
   * enquadramento não são voo — a câmera aparece noutro lugar. Além de
   * recomeçar a contagem de estabilidade da captura, isto derruba a
   * LUT do raymarch: o reuso dela tolera 2 pc de deriva de VOO, e um
   * salto pode cair dentro dessa tolerância vindo de outro lugar do
   * disco (ver `Nebula.invalidarLut`, com a medida que o denunciou).
   */
  private teletransportou() {
    this.nebula.invalidarLut();
    // os corpos resolvidos fazem SNAP da cessão neste quadro — animar
    // um crossfade através de um teletransporte é movimento inventado
    this.saltoDeCamera = true;
    this.perturbar();
  }

  /**
   * Fecha o véu, faz a troca, abre o véu. Instantâneo (véu nenhum) sob
   * `prefers-reduced-motion`, sob `?shot=` e quando quem chama pede —
   * é o que mantém a captura headless determinística.
   */
  private atravessarVeu(instantaneo: boolean, aoFechar: () => void) {
    if (instantaneo || this.reducedMotion || this.shotMode) {
      this.veu = 0;
      this.veuAlvo = 0;
      this.veuPendente = null;
      this.events.onVeu(0);
      aoFechar();
      return;
    }
    this.veuPendente = aoFechar;
    this.veuAlvo = 1;
    this.perturbar();
  }

  setQuality(q: QualityLevel) {
    this.engine.applyQuality(q, true);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
    this.perturbar();
  }

  /**
   * Exposição escolhida à mão (painel ou ?exp=) DESLIGA a auto-exposição por
   * rampa — sem o latch o tick reescrevia o valor no quadro seguinte e o
   * controle ao vivo não fazia nada (o link com ?exp= só funcionava recarregando).
   */
  setExposure(v: number) {
    this.expOverride = true;
    this.engine.setExposure(v);
    this.perturbar();
  }

  /**
   * DESLIGA a exposição escolhida à mão e devolve a auto-exposição por
   * rampa. É o caminho de volta que o latch `expOverride` nunca teve: até
   * a Onda 5 ele só sabia ligar, e por isso a linha BRILHO do selo não
   * teria como cumprir "clicar volta ao real" (D1). O tick reescreve o
   * valor no quadro seguinte — não há número a restaurar aqui, porque a
   * rampa é função da vista.
   */
  limparExposicaoManual() {
    this.expOverride = false;
    this.perturbar();
  }

  /**
   * DESLIGA a gradação por contexto do Atlas — o gesto da linha BRILHO
   * do selo (D1: as linhas do selo são os próprios controles). Não tem
   * volta pelo mesmo caminho de propósito: quem quiser a gradação de
   * volta tira o `?grad=0` da URL, que é onde o estado vive.
   */
  desligarGradacao() {
    this.gradacaoLigada = false;
    this.perturbar();
  }

  /**
   * A ESCALA DO TEXTO DO HUD mudou (`?ui=`, F6). O Director precisa
   * saber porque o HUD do Atlas é parte do enquadramento: texto maior
   * come mais quadro, o retângulo útil encolhe e a câmera recua. É
   * troca de enquadramento como qualquer outra, e por isso zera a
   * contagem de quadros estáveis do sinal de prontidão — a captura do
   * harness não pode assentar no meio de uma troca de imagem.
   */
  escalaDaUiMudou() {
    this.perturbar();
  }

  /**
   * O RETÂNGULO ÚTIL que o enquadramento está usando agora — publicado
   * para o juiz de a11y poder comparar a declaração (`atlasRig.ts`) com
   * as áreas REAIS que o HUD ocupa na página. Sem esta ponte, as duas
   * fontes (o número no TS e a altura no CSS) só se encontrariam a olho.
   */
  get retanguloUtil() {
    return retanguloUtilDoAtlas(escalaDaUi(), larguraDeCss());
  }

  /**
   * A GRADAÇÃO POR CONTEXTO (F6), num lugar só: o fator do clarão desta
   * vista. Só na fase 'atlas' — fora dela é 1 EXATO, o termo do
   * `setWarp` fica neutro em IEEE754 e o filme não perde um pixel. A
   * conta e o porquê moram no config único (`atlasConfig.ts`).
   *
   * É um getter, e não um campo que o tick guarda, porque o SELO lê o
   * mesmo número: dois lugares calculando a mesma coisa é como o selo
   * começaria a divergir do quadro que ele declara.
   */
  private get claraoDoQuadro() {
    return this.phase === 'atlas' && this.gradacaoLigada
      ? claraoDoAtlas(this.engine.camera.position.length())
      : 1;
  }

  /**
   * O ESTADO DA VISTA que o selo de honestidade lê — somente leitura,
   * como o getter `captura`. Ele mora aqui porque só o Director conhece
   * os quatro donos do assunto de uma vez (o latch da exposição, o
   * conjunto de camadas escondidas, o tier vivo e a curva do renderer),
   * e porque a alternativa — o React guardar uma cópia de cada um —
   * seria a segunda fonte de verdade que o selo existe para não ter.
   *
   * As PORTAS saem de `window.location.search` a cada leitura, e não do
   * `this.debug` do construtor: o painel e a gaveta reescrevem a URL ao
   * vivo (`replaceState`), e um selo lendo a URL do boot declararia
   * desvio já desfeito — ou calaria um recém-feito.
   */
  get selo(): EstadoDaVista {
    return {
      distanciaPc: this.engine.camera.position.length(),
      portas: [...new URLSearchParams(window.location.search).keys()],
      exposicaoManual: this.expOverride,
      tom: modoDoToneMapping(this.engine.renderer.toneMapping),
      camadasEscondidas: [...this.hide, ...(this.noNebula ? ['nonebula'] : [])],
      tier: this.engine.quality,
      // a MESMA conta que o tick escreve no pós — não uma cópia do
      // último quadro: o selo e o quadro leem a mesma câmera e não têm
      // como discordar
      gradacao: this.claraoDoQuadro,
      luz: this.politicaDeLuz,
      evLuzDoFoco: this.evLuzDoFoco(),
    };
  }

  /**
   * O ΔEV da assistência sobre o corpo EM FOCO, para o rótulo vivo da
   * linha `?luz=` do selo ("+N passos de luz · por corpo"). Lê a
   * distância heliocêntrica VIVA do atributo da camada (a mesma que a
   * máquina do tempo reescreve) — nunca o retrato congelado. Sem corpo
   * em foco (ou com o Sol, que não tem assistência a declarar) devolve
   * null e o rótulo fica só com a copy: o selo não inventa número.
   */
  private evLuzDoFoco(): number | null {
    if (!this.focoCorpoId || !this.planetas) return null;
    // as luas (F2b/F3): o dUA é o da CADEIA heliocêntrica dela,
    // publicado pelo próprio mesh (NaN sem efeméride ⇒ o rótulo fica
    // sem número)
    if (LUAS_DO_SISTEMA.some((l) => l.id === this.focoCorpoId)) {
      const rUA =
        this.focoCorpoId === 'moon'
          ? this.lua?.estadoVivo.rUA
          : this.rochosos.find((r) => r.corpo.id === this.focoCorpoId)?.corpo
              .estadoVivo.rUA;
      return rUA !== undefined && Number.isFinite(rUA)
        ? deslocamentoEVAssistida(rUA)
        : null;
    }
    // anões/asteroides não têm ponto na camada: o dUA é o do mesh
    // (Kepler/retrato). Sem este ramo o selo dizia ASSISTIDO e omitia
    // os passos — justamente nos corpos de maior ΔEV.
    if (HELIO_SEM_PONTO.some((a) => a.id === this.focoCorpoId)) {
      const rUA = this.rochosos.find((r) => r.corpo.id === this.focoCorpoId)
        ?.corpo.estadoVivo.rUA;
      return rUA !== undefined && Number.isFinite(rUA)
        ? deslocamentoEVAssistida(rUA)
        : null;
    }
    const i = CORPOS_DO_SISTEMA.findIndex((c) => c.id === this.focoCorpoId);
    if (i <= 0) return null;
    const p = this.planetas.posicoes;
    const dUA =
      Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]) * UA_POR_PC;
    return deslocamentoEVAssistida(dUA);
  }

  /**
   * A AÇÃO da linha `?luz=` do selo (D2): troca a política de luz dos
   * corpos resolvidos AO VIVO — o tick entrega o escalar novo ao
   * material no próximo quadro ("volta ao real com o próximo estado
   * visível"). O estado mora aqui; a URL é espelho, escrita por quem
   * clicou (App), no mesmo protocolo do `?grad=0`.
   */
  definirLuz(politica: PoliticaDeLuz) {
    this.politicaDeLuz = politica;
    this.perturbar();
  }

  /**
   * O AMOSTRADOR DE MEMÓRIA (Onda 6, F8/D9) — somente leitura, como
   * `captura` e `selo`. É o que o juiz `scripts/visual/memoria.mjs` lê
   * para provar que entrar/sair do Atlas, trocar de qualidade e focar
   * corpos devolvem TUDO que alocaram: `renderer.info` é a contagem
   * viva do próprio three (texturas e geometrias na GPU, draws do
   * último quadro), e `heapMB` é o heap de JS quando o navegador o
   * expõe (`performance.memory` é só do Chrome — `null` não é zero, é
   * "este navegador não conta").
   *
   * LEITURA DIRETA POR CHAMADA, sem cadência interna: o D9 oferecia
   * 1 Hz, mas o `renderer.info` já é mantido pelo renderer a cada
   * quadro e o heap é uma leitura pronta do navegador — uma cadência
   * aqui seria estado novo (timer + cópia) para economizar uma leitura
   * que não custa nada. Custo ZERO quando ninguém lê: getter não
   * executa sem chamada, e nenhum caminho de render passa por aqui.
   *
   * PUBLICADO SÓ EM DEV, de carona no objeto inteiro: quem pendura o
   * Director em `window.__director` é o App.tsx, sob
   * `import.meta.env.DEV` — o mesmo portão do `captura` que os juízes
   * de CDP já usam. Em produção não há porta nenhuma.
   */
  get stats() {
    const info = this.engine.renderer.info;
    const heap = (
      performance as Performance & { memory?: { usedJSHeapSize: number } }
    ).memory;
    return {
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      render: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
      },
      heapMB: heap ? heap.usedJSHeapSize / 1048576 : null,
    };
  }

  get progressTicks(): { t: number; text: string }[] {
    return this.rig.ticks;
  }

  private tick(rawTime: number, dt: number) {
    // tempo VISUAL: congelado no modo foto (grão, pulsos, coroa e
    // deriva da poeira idênticos entre capturas do mesmo instante)
    const time = this.shotMode ? 0 : rawTime;
    const cam = this.engine.camera;
    let warp = 0;

    // VÉU DO ATLAS, antes de tudo: se ele terminar de fechar neste
    // quadro, a troca de fase acontece AQUI e o resto do tick já roda na
    // fase nova. Fora da travessia o ramo inteiro é um teste falso — o
    // filme não paga um ciclo por ele.
    if (this.veu !== this.veuAlvo || this.veuPendente) {
      const passo = dt / VEU_ATLAS_S;
      this.veu =
        this.veuAlvo > this.veu
          ? Math.min(1, this.veu + passo)
          : Math.max(0, this.veu - passo);
      if (this.veu >= 1 && this.veuPendente) {
        const acao = this.veuPendente;
        this.veuPendente = null;
        this.veuAlvo = 0;
        acao();
      }
      this.events.onVeu(this.veu);
    }

    // O RELÓGIO DO CÉU, antes de tudo que lê posição: se o instante
    // mudar neste quadro, a camada de planetas já o vê escrito. Parado
    // (o estado de nascimento, e o do filme inteiro) o método devolve
    // na primeira linha.
    this.andarORelogio(dt);

    // ...e o ENQUADRAMENTO DO ATLAS segue o corpo no instante novo
    // (Onda 7). Aqui, e não dentro do ramo da fase, porque tem de vir
    // ANTES de qualquer leitura de posição — inclusive a da câmera, que
    // é escrita logo abaixo. `jdDoEnquadre` é o limite de frequência:
    // uma recomposição por instante de céu, zero com o relógio parado.
    if (this.phase === 'atlas') {
      const jdAgora = grampearJd(this.jdPedido);
      if (jdAgora !== this.jdDoEnquadre) {
        this.jdDoEnquadre = jdAgora;
        this.recomporAlvo();
      }
    }

    if (this.phase === 'journey') {
      if (!this.freezeJourney) this.journeyT += dt * this.playbackRate;
      const t = this.journeyT;
      const r = this.rig.apply(cam, t, dt);
      warp = r.warp;
      this.events.onProgress(Math.min(t / this.rig.duration, 1));
      this.events.onWarp(this.reducedMotion ? 0 : warp);

      const { index, key } = this.rig.captionAt(t);
      if (index !== this.lastCaptionIdx) {
        this.lastCaptionIdx = index;
        this.events.onCaption(index, key.caption, key.sub);
      }

      // ...e a viagem CONGELADA não termina sozinha. O teto do `seek`
      // sozinho não bastava — medido: com ele `journeyT` vira `duration`
      // exato, `>=` continua verdadeiro e a fase virava `end` no quadro
      // seguinte. Quem chega por `?t=` (que congela, contrato das
      // capturas) ou `?freeze=1` pediu UM QUADRO parado, e a tela final
      // não é esse quadro. Congelado ninguém avança: só cai aqui quem
      // pediu o fim por deep-link. Correr até o fim (`&play=1`, ou o
      // filme rodando) segue terminando como sempre.
      if (this.journeyT >= this.rig.duration && !this.freezeJourney) {
        this.setPhase('end');
        this.events.onWarp(0);
      }
    } else if (this.escritorDeCamera === 'voo') {
      this.roam.update(dt);
    } else if (this.escritorDeCamera === 'atlas') {
      // o MESMO ponto do quadro em que a JourneyRig escreveria a dela —
      // inclusive o fov, que aqui é o pino do Atlas e não o resíduo
      // amortecido do shot onde o visitante pausou. O dt alimenta a
      // rampa entre degraus (F2b) — fora dela é ignorado.
      this.atlas.apply(cam, escalaDaUi(), larguraDeCss(), dt);
    } else {
      // intro/end: deriva lenta contemplativa
      if (this.phase === 'intro') {
        const r = this.rig.apply(cam, 0, dt);
        warp = r.warp;
      }
    }

    // a matriz da câmera precisa estar atual ANTES de projeções e
    // extrações de base — labels usavam a matriz do frame anterior
    cam.updateMatrixWorld(true);

    // mundo
    const hPx = this.engine.renderer.domElement.height;
    const dHome = cam.position.length();
    const dGC = cam.position.distanceTo(GAL.GC_POS);
    // o near acompanha a âncora mais PRÓXIMA (Sol ou centro galáctico):
    // na rasante de Sgr A* o near de dezenas de pc comeria o buraco negro.
    // E, desde a Onda 6 (F0/D1), a superfície RESOLVIDA mais próxima em
    // quadro: a porta escreve `ligado` ANTES do getter porque camada
    // desligada (?nocorpos) tira os corpos do quadro — o getter devolve
    // NaN e o par (near, far) fica no vigente bit a bit (pino de
    // neutralidade em engine.test.ts; sem corpo registrado, F0, idem).
    this.palco.ligado =
      (CORPOS_DEFAULT_ON || this.debug.has('corpos')) && !this.hide.has('nocorpos');

    // ------------------------------------------------------------
    // O SOL SOB A LEI DO PALCO (F2 da onda do Sol real)
    // ------------------------------------------------------------
    // Até aqui o disco do Sol era decidido por JANELA EM PARSEC
    // (`LOD_SOL`, calibrada para UM raio: o inflado). Agora ele passa
    // pela MESMA lei da Terra e da Lua — `diametroAparentePx` contra
    // `LIMIAR_DO_GATE_PX` (4 px de diâmetro), com o cushion 2× da
    // histerese. Não é troca de gosto: uma janela em pc só vale para um
    // raio, e é a régua de TAMANHO NA TELA que a Onda 7 (corpo por
    // estrela) pode herdar sem número novo.
    //
    // A ARITMÉTICA — desde a F3 ela é a lei ÚNICA do grupo do Sol, e não
    // mais uma segunda opinião por cima da janela em parsec (lente de
    // 58°, buffer efetivo do harness de 1.713 px de altura ⇒
    // 1.545,1 px/rad):
    //  · raio FÍSICO (2,2567e-8 pc): arma abaixo de 3,60 UA (4 px) e
    //    desarma acima de 7,19 UA (2 px).
    // Na F2 este gate era INERTE por aritmética (o disco artístico só
    // desenhava acima de 4.125 UA, 1.147× além de onde o corpo real
    // arma, e as duas faixas nunca coexistiam) — foi assim que ele
    // entrou sem custar um pixel. A F3 apagou a outra faixa, e o que era
    // inerte virou o único juiz: é ele que faz o Sol da abertura
    // refilmada existir a 5,74 raios solares e virar ponto por volta de
    // t≈8,5 s da hélice, sem uma janela em parsec no caminho.
    this.solArmado = gateBinario(
      this.solArmado,
      diametroAparentePx(this.solRaioPc, dHome, hPx, cam.fov)
    );
    // O SOL NO PALCO. Até a F3 havia aqui uma guarda a mais —
    // `solRaioPc !== WORLD.sunRadius` —, e ela NÃO era gate de fase: era
    // doutrina do palco. Ali moram SUPERFÍCIES REAIS (é delas que o near
    // deriva onde a câmera tem de parar), e um corpo inflado não é
    // superfície, é cenário. Medido na época: registrar o Sol artístico
    // poria uma superfície a 0,011 pc da origem no `min()` do near, e
    // para a câmera além de ~1,375 pc o ramo do corpo passaria a ganhar
    // do `distFromSun × 0,004` — mudando o plano de corte em `interno`,
    // `travessia`, `mergulho`, `edgeon`, `faceon` e nas quatro de hero.
    // A guarda saiu porque o corpo inflado saiu: não existe mais o caso
    // que ela recusava, e a doutrina continua valendo por construção —
    // o palco só recebe o raio físico porque é o único que existe.
    //
    // AQUI e não depois do `sun.update` (onde a F1 o deixou): o near lê
    // o palco umas 100 linhas abaixo, então registrar lá embaixo dava ao
    // clip a superfície do quadro ANTERIOR. É o mesmo lugar em que a
    // Terra e a Lua se registram, pela mesma razão escrita.
    if (this.solArmado && !this.hide.has('nosun')) {
      this.palco.registrar('sun', this.solRaioPc, ORIGEM);
    } else {
      this.palco.remover('sun');
    }

    // A TERRA RESOLVIDA (F2a) roda ANTES do near ler o palco: o globo
    // que entra em quadro NESTE tick já governa o clip NESTE tick. O
    // Director é quem registra a superfície (só corpo EM QUADRO entra
    // no min() — de longe o registro esvazia e o par (near, far) fica
    // no vigente bit a bit) e quem escreve a cessão do ponto na camada
    // de planetas; a Terra não conhece nem o palco nem a camada.
    if (this.terra && this.stars) {
      const t = this.terra.atualizar({
        jdTdb: grampearJd(this.jdPedido),
        fonte: this.efemeride,
        camPosPc: cam.position,
        screenHPx: hPx,
        fovDeg: cam.fov,
        ligado: this.palco.ligado,
        atlasQuente: this.phase === 'atlas',
        politica: this.politicaDeLuz,
        dtS: dt,
        psf: this.stars,
        salto: this.saltoDeCamera,
      });
      if (t.emQuadro) this.palco.registrar('earth', t.raioPc, t.centroPc);
      else this.palco.remover('earth');
      // a cessão SUAVE (F2b/D5): reafirmada TODO quadro — a escrita é
      // idempotente (`gravar`), então reafirmar não sobe upload
      this.planetas?.escreverCessao('earth', t.cede);
      this.terraCarregando = t.carregando;
      // o FALLBACK FRIO (item 5b): gate armado, camada ligada e nem
      // textura quente nem fetch em voo — o `captura` segura nisto
      this.terraFriaNoGate =
        this.palco.ligado && t.gateArmado && !t.emQuadro && !t.carregando;
      // globo entrando/saindo do quadro, textura que acabou de chegar e
      // a RAMPA da cessão andando são mudança de imagem: a contagem de
      // estabilidade recomeça (a captura nunca assenta no meio do fade)
      if (
        t.emQuadro !== this.terraEmQuadroAntes ||
        (this.terraCarregavaAntes && !t.carregando) ||
        t.emRampa
      ) {
        this.perturbar();
      }
      this.terraEmQuadroAntes = t.emQuadro;
      this.terraCarregavaAntes = t.carregando;
    }
    // A LUA (F2b), pelo MESMO fio — e sem cessão: ela não tem ponto
    // fotométrico na camada (dito em lua.ts; o slot 'moon' não existe
    // em IDS_FOTOMETRIA). Sem efeméride o corpo não nasce (não há Lua
    // no retrato congelado — o badge do tempo conta essa verdade).
    if (this.lua) {
      const l = this.lua.atualizar({
        jdTdb: grampearJd(this.jdPedido),
        fonte: this.efemeride,
        camPosPc: cam.position,
        screenHPx: hPx,
        fovDeg: cam.fov,
        ligado: this.palco.ligado,
        atlasQuente: this.phase === 'atlas',
        politica: this.politicaDeLuz,
      });
      if (l.emQuadro) this.palco.registrar('moon', l.raioPc, l.centroPc);
      else this.palco.remover('moon');
      this.luaCarregando = l.carregando;
      // o mesmo fallback frio da Terra — mas SÓ com fonte viva: sem
      // efeméride a Lua não existe por contrato (não é falha de textura)
      this.luaFriaNoGate =
        this.palco.ligado &&
        this.efemeride !== null &&
        l.gateArmado &&
        !l.emQuadro &&
        !l.carregando;
      if (
        l.emQuadro !== this.luaEmQuadroAntes ||
        (this.luaCarregavaAntes && !l.carregando)
      ) {
        this.perturbar();
      }
      this.luaEmQuadroAntes = l.emQuadro;
      this.luaCarregavaAntes = l.carregando;
      // a posição viva para o RÓTULO da Lua (NaN sem efeméride ⇒ o
      // projectCorpos não a projeta — rótulo só onde há corpo)
      this.escreverPosicaoDeLua('moon', l.centroPc);
    }
    // OS ROCHOSOS (F3), pelo MESMO fio das irmãs — a lista viva é o
    // dado; planeta escreve a cessão do ponto (D5), lua não tem ponto.
    // A guarda do `stars` é a da Terra: a PSF alimenta a cessão.
    if (this.stars) {
      for (const r of this.rochosos) {
      const e = r.corpo.atualizar({
        jdTdb: grampearJd(this.jdPedido),
        fonte: this.efemeride,
        camPosPc: cam.position,
        screenHPx: hPx,
        fovDeg: cam.fov,
        ligado: this.palco.ligado,
        atlasQuente: this.phase === 'atlas',
        politica: this.politicaDeLuz,
        dtS: dt,
        psf: this.stars!,
        salto: this.saltoDeCamera,
      });
      if (e.emQuadro) this.palco.registrar(r.corpo.id, e.raioPc, e.centroPc);
      else this.palco.remover(r.corpo.id);
      if (r.corpo.planeta) this.planetas?.escreverCessao(r.corpo.id, e.cede);
      r.carregando = e.carregando;
      // o fallback frio das irmãs — e o da Lua, palavra por palavra,
      // para Fobos/Deimos: sem efeméride a lua não EXISTE (não é falha
      // de textura); planeta sem fonte cai no retrato e o frio vale
      r.friaNoGate =
        this.palco.ligado &&
        (r.corpo.planeta || this.efemeride !== null) &&
        e.gateArmado &&
        !e.emQuadro &&
        !e.carregando;
      if (
        e.emQuadro !== r.emQuadroAntes ||
        (r.carregavaAntes && !e.carregando) ||
        e.emRampa
      ) {
        this.perturbar();
      }
      r.emQuadroAntes = e.emQuadro;
      r.carregavaAntes = e.carregando;
      if (!r.corpo.planeta) this.escreverPosicaoDeLua(r.corpo.id, e.centroPc);
      }
    }
    // OS GIGANTES (F4), pelo MESMO fio dos rochosos — a lista viva é o
    // dado; os quatro são planetas (retrato + cessão do ponto).
    if (this.stars) {
      for (const g of this.gigantes) {
      const e = g.corpo.atualizar({
        jdTdb: grampearJd(this.jdPedido),
        fonte: this.efemeride,
        camPosPc: cam.position,
        screenHPx: hPx,
        fovDeg: cam.fov,
        ligado: this.palco.ligado,
        atlasQuente: this.phase === 'atlas',
        politica: this.politicaDeLuz,
        dtS: dt,
        psf: this.stars!,
        salto: this.saltoDeCamera,
      });
      if (e.emQuadro) this.palco.registrar(g.corpo.id, e.raioPc, e.centroPc);
      else this.palco.remover(g.corpo.id);
      this.planetas?.escreverCessao(g.corpo.id, e.cede);
      g.carregando = e.carregando;
      g.friaNoGate =
        this.palco.ligado &&
        e.gateArmado &&
        !e.emQuadro &&
        !e.carregando;
      if (
        e.emQuadro !== g.emQuadroAntes ||
        (g.carregavaAntes && !e.carregando) ||
        e.emRampa
      ) {
        this.perturbar();
      }
      g.emQuadroAntes = e.emQuadro;
      g.carregavaAntes = e.carregando;
      }
    }
    // O RETRATO NUNCA FINGE EFEMÉRIDE (item 5c da auditoria): com os
    // corpos em cena e a fonte PEDIDA indisponível, o tick tenta a fonte
    // uma SEGUNDA vez (a permitida por `garantirEfemerides`: "quem pediu
    // de novo") e o `captura` segura a prontidão pela janela de
    // QUADROS_TENTANDO_FONTE; se ela ainda não veio, o aviso único ACUSA
    // — quem ler o quadro dali em diante sabe que os corpos estão no
    // retrato congelado, nunca numa efeméride que não chegou.
    if (this.palco.ligado && this.faseDaEfemeride === 'indisponivel') {
      if (!this.retentouFonte) {
        this.retentouFonte = true;
        this.garantirEfemerides();
      } else if (this.quadrosTentandoFonte < QUADROS_TENTANDO_FONTE) {
        this.quadrosTentandoFonte++;
        if (this.quadrosTentandoFonte >= QUADROS_TENTANDO_FONTE && !this.acusouRetrato) {
          this.acusouRetrato = true;
          console.warn(
            '[captura] efeméride pedida indisponível: os corpos seguem no RETRATO congelado'
          );
        }
      }
    } else if (this.faseDaEfemeride === 'viva') {
      this.quadrosTentandoFonte = 0;
    }
    this.saltoDeCamera = false;
    const superficie = this.palco.superficieMaisProxima(cam.position);
    this.engine.updateClip(Math.min(dHome, dGC), superficie.dSuperficiePc, superficie.raioPc);

    // A Via Láctea não é um plano: os fades de AMBIENTE respondem à
    // posição da câmera no DISCO (R, z galactocêntricos), não à
    // distância do Sol — o volume local existe em qualquer ponto da
    // galáxia. Só camadas fisicamente solares continuam com dHome.
    const qx = cam.position.x - GAL.GC_POS.x;
    const qy = cam.position.y - GAL.GC_POS.y;
    const qz = cam.position.z - GAL.GC_POS.z;
    const zg = Math.abs(qx * EZ.x + qy * EZ.y + qz * EZ.z);
    const rg = Math.hypot(
      qx * EX.x + qy * EX.y + qz * EX.z,
      qx * EY.x + qy * EY.y + qz * EY.z
    );
    const inDisk =
      (1 - THREE.MathUtils.smoothstep(zg, 600, 2100)) *
      (1 - THREE.MathUtils.smoothstep(rg, 16800, 20500));
    if (this.phase === 'journey') {
      if (inDisk <= 0.001) this.leftDisk = true;
    } else {
      this.leftDisk = false;
    }
    const env = this.leftDisk ? 0 : inDisk;

    // camadas solares (HYG, poeira próxima, hero stars): dHome
    const localFade = 1 - THREE.MathUtils.smoothstep(dHome, 1100, 2300);
    // gás volumétrico + faixa interna: qualquer ponto dentro do disco
    const nebulaFade = env;
    const galaxyFade = 1 - env;
    const localBandFade = env * 0.76;
    const markerFade = THREE.MathUtils.smoothstep(dHome, 1700, 3300);

    this.destTimer += dt;
    // nuvens-semente do raymarch + cavidade do observador itinerante
    this.seedCloudTimer += dt;
    if (this.seedCloudTimer > 0.25) {
      this.seedCloudTimer = 0;
      // o MESMO 0,02 do gate do raymarch lá embaixo: abaixo dele o
      // `nebula.render` não roda, e varrer o pool de nuvens-semente
      // alimentava um shader que ninguém ia executar
      if (nebulaFade > 0.02) this.updateSeedClouds(cam.position);
    }
    // a MESMA cavidade em todos os consumidores da densidade: raymarch,
    // extinção das estrelas e brilho da poeira próxima
    const cavityGate = THREE.MathUtils.smoothstep(dHome, 600, 1300);
    this.nebula.setCavity(cam.position, cavityGate);
    this.stars?.setCavity(cam.position, cavityGate);
    this.dust.setCavity(cam.position, cavityGate);

    if (this.debug.has('dbgfade')) {
      // quem está CEDENDO agora (Onda 3, fase 3): o único jeito de ver a
      // política de dominância viva sem abrir um profiler
      const cedendo = this.heroCatalogIdx
        .map((idx, i) => (idx >= 0 && this.stars?.fadeAt(idx) ? `${this.heroes.chosen[i].n}:${this.stars.fadeAt(idx).toFixed(2)}` : null))
        .filter(Boolean);
      console.log(
        `[dbgfade] dHome=${dHome.toFixed(0)} gal=${galaxyFade.toFixed(2)} ` +
          `loc=${localFade.toFixed(2)} hide=[${[...this.hide].join(',')}] ` +
          `galVis=${this.galaxy?.group.visible} phase=${this.phase} jt=${this.journeyT.toFixed(1)} ` +
          `cede=[${cedendo.join(' ')}]`
      );
    }

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    this.stars?.update(cam.position, hPx);
    const catFade = this.hide.has('nocat') ? 0 : localFade;
    this.wrappedStars?.update(
      cam.position,
      hPx,
      this.hide.has('nowrap') ? 0 : 1,
      catFade
    );
    this.stars?.setFade(catFade);
    this.dust.setFade(this.hide.has('nodust') ? 0 : localFade);
    this.nebula.setFade(nebulaFade);
    // o MESMO catFade das cascas: a LUT da faixa desconta do termo
    // estelar a luz que o catálogo já desenha como estrela individual
    this.nebula.setCatalogueFade(catFade);
    // heroes esmaecem a zero em farFade (900 pc) — além disso os
    // draws são garantidamente invisíveis
    if (this.heroes) {
      this.heroes.group.visible = !this.hide.has('nohero') && dHome < 1200;
    }
    this.heroes?.update(time, cam.position, tanHalfFov);
    this.writeHeroFades(hPx, tanHalfFov);
    // `solArmado` entra AQUI, junto do `?nosun`, e não dentro do
    // `StellarBody`: o corpo não conhece a tela (não tem altura de buffer
    // nem lente), e o gate do palco é medido em PIXELS. O `sun.update`
    // continua fazendo o seu próprio corte de custo por cima
    // (`isDiscGroupVisible`) — os dois se somam com `&&`, e no raio
    // artístico o de lá sempre fecha primeiro (ver a conta lá em cima).
    this.sun.group.visible = !this.hide.has('nosun') && this.solArmado;
    // a PSF do Sol vive FORA do group (o group some no crossfade) — só
    // ?nosun a desliga
    this.sunStar.quad.visible = !this.hide.has('nosun');
    this.sunStar.update(time, dHome, tanHalfFov);
    // journeyT dirige a dramaturgia do ciclo (mínimo→máximo na hélice);
    // dentro do Atlas ele é PINADO, senão cada entrada daria um Sol
    // diferente conforme o instante da pausa (ver ATLAS_JOURNEY_T)
    this.sun.update(
      time,
      this.engine.camera,
      this.phase === 'atlas' ? ATLAS_JOURNEY_T : this.journeyT
    );
    // O OCLUSOR DA NEBULOSA. A fotosfera está na ORIGEM (o grupo do Sol
    // só é escalado, nunca posicionado) e o raio de mundo dele é
    // `solRaioPc` por construção (esfera de 2,2 do doador × escala
    // solRaioPc/2,2). Enquanto ela estiver na cena, o raymarch da
    // nebulosa não precisa integrar o que ela cobre — ver o cone em
    // nebula.ts, que já encolhe sozinho e desliga quando o ângulo seguro
    // fica abaixo de um texel. Com o raio FÍSICO da F3 esse
    // desligamento é a regra em quase toda a viagem: a cavidade que a
    // casa pulava tinha 2.269 UA de raio, e a de agora cabe dentro da
    // órbita de Mercúrio.
    this.nebula.setSunOccluder(ORIGEM, this.sun.group.visible ? this.solRaioPc : 0);
    // (o registro do Sol no palco SUBIU para junto do da Terra e da Lua
    // na F2 — o near lê o palco antes daqui, e da F1 até agora o clip
    // recebia a superfície do quadro anterior.)
    // A CAMADA DE PLANETAS (Onda 4, D3/D7), logo depois do Sol porque é
    // a continuação dele: abaixo de 0,05 pc quem desenha o Sol é o
    // vértice 0 desta camada, com `uGain = deepPointGain(dHome)` — e
    // desde a F3 esse ganho é o complemento EXATO do clarão do
    // `SunStar`, de modo que a soma dos dois é 1 em toda distância e o
    // Sol nunca fica sem dono. A chave mora em `planetas.ts`
    // (`PLANETAS_DEFAULT_ON`); aqui ficam só as duas portas de URL.
    if (this.planetas) {
      this.planetas.ligado =
        (PLANETAS_DEFAULT_ON || this.debug.has('plan')) && !this.hide.has('noplan');
      // A MÁQUINA DO TEMPO (F4/D2), ANTES do quadro e fora dele: o
      // método vivo tem cache por jd e devolve na primeira linha quando
      // o instante não mudou, que é o caso de todo quadro do filme e de
      // todo quadro do Atlas parado. Sem efeméride carregada a camada
      // fica exatamente no retrato — o caminho honesto do "sem rede".
      // `grampearJd` e não `this.tempo`: o mostrador formata strings e
      // aloca um objeto — ele é para o HUD, a 4 Hz, não para o quadro.
      if (this.efemeride) {
        this.planetas.escreverInstante(grampearJd(this.jdPedido), this.efemeride);
      }
      this.planetas.update(dHome, hPx, cam.position);
      // A CESSÃO DO SOL-PONTO (F2), na MESMA máquina da Terra (F2b/D5):
      // o vértice 0 desta camada e a fotosfera desenham a mesma estrela
      // no mesmo lugar, somadas em `AdditiveBlending`. É a dupla-luz que
      // a Onda 3 desfez entre hero e catálogo, agora entre ponto e corpo.
      //
      // POR DOMINÂNCIA E NÃO POR GATE, e a diferença é de honestidade:
      // um corte binário no armar do gate (4 px) apagaria um halo de
      // ~25 px para pôr um disco de 4 no lugar — um passo para trás na
      // luz, exatamente o que a prova de continuidade da Onda 3 proíbe.
      // `cessaoAlvo` só faz o ponto ceder quando o disco de fato o
      // DOMINA na tela (g(r) de 1 a 2,5), o que para o Sol real cai por
      // volta de 0,55 UA — bem depois do gate. Até lá os dois somam, que
      // é o comportamento herdado.
      // MEDIDO, e é o que mantém a `solreal1ua` no md5 da F1: a 1 UA o
      // disco tem 14,4 px contra 25,2 px de halo previsto ⇒ r = 0,57 ⇒
      // cessão 0 EXATA. A tela branca de dentro do sistema solar continua
      // sendo o que o bastão diz que ela é — defeito de EXPOSIÇÃO, da
      // onda do clarão, e não desta. Esta fase não a apaga por acidente.
      //
      // A F3 TIROU A GUARDA DO RAIO daqui (`solRaioPc !==
      // WORLD.sunRadius`), que até então mantinha esta cessão em ZERO
      // PIXEL no filme inteiro porque o Sol da cena era o inflado e o
      // palco o recusava. Agora ela é a peça que faz a ESCADA da
      // abertura não ter degrau: descendo, o ponto cede ao corpo por
      // dominância; subindo, o corpo desarma nos 4 px com o ponto já
      // inteiro (a 3,60 UA o disco tem 4 px contra ~25 px de halo,
      // r ≈ 0,16 ⇒ cessão 0), e depois o ponto entrega ao clarão na
      // janela de 0,02–0,05 pc. Nenhum passo para trás na luz em
      // nenhum dos três degraus.
      const solCorpoEmQuadro = this.sun.group.visible;
      this.planetas.escreverCessao(
        'sun',
        cessaoAlvo(
          solCorpoEmQuadro,
          diametroAparentePx(this.solRaioPc, dHome, hPx, cam.fov),
          this.stars
            ? psfPointSizePx(
                // fase 1: o Sol é o ILUMINANTE, não tem fase (é o mesmo
                // `mix(fase, 1.0, aEhSol)` do VERT da camada)
                magDoVertice(PONTO_ZERO_SOL_PC, dHome, 1),
                this.stars.expoM0,
                this.stars.sigmaPx,
                hPx
              )
            : 0
        )
      );
    }
    this.dust.update(cam.position, hPx, time);
    // Sgr A*: só de perto (a extinção real esconde o centro de longe);
    // as capturas de medição ficam a 24/33 kpc — fade 0, passe desligado
    this.blackHole?.updateFrame(
      cam.position,
      cam,
      time,
      this.hide.has('nobh') ? 0 : 1 - THREE.MathUtils.smoothstep(dGC, 1400, 2400)
    );
    // AUTO-EXPOSIÇÃO: a vista externa é outro assunto fotográfico. A
    // rodada 18 venceu com 1,40 (sem knee); a rodada 20, com o knee
    // asinh no pós e chromsat na extinção assumindo a compressão, mediu
    // o ótimo CONJUNTO em 1,05 (edge 0,8275, face 0,0517 — os dois
    // recordes). Dentro do disco (fade 0) fica o 1,02 de sempre — a
    // vista interna não tem gate e satura fácil de branco.
    if (!this.expOverride) {
      this.engine.setExposure(1.02 + 0.03 * galaxyFade);
    }
    // ?galstat=1 — quantos dos 4,02 M pontos da galáxia estão DENTRO do
    // frustum. Roda uma vez, no primeiro quadro, e guarda em window.__galstat.
    // Existe porque o custo do passe é LINEAR na contagem submetida (medido:
    // 1,22 ms por milhão, intercepto zero), então esta fração é o outro fator
    // do produto — e sem ela qualquer conta sobre recorte é fé. Medido:
    // 2,55% em t=0 · 2,00% em t=100 · 49,3% em t=180 · 99,98% no face-on.
    if (this.debug.has('galstat') && !(window as unknown as { __galstat?: unknown }).__galstat) {
      const pts = (this.galaxy as unknown as { brightPts?: THREE.Points })?.brightPts;
      if (pts) {
        const fr = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
        );
        const pos = pts.geometry.attributes.position;
        const v = new THREE.Vector3();
        // margem: ponto FORA do frustum ainda aparece pelo tamanho dele (até
        // uMaxPx = 20 px). A 8 kpc, 10 px valem ~37 pc; 50 é folga honesta.
        const sp = new THREE.Sphere(new THREE.Vector3(), 50);
        let dentro = 0;
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          sp.center.copy(v);
          if (fr.intersectsSphere(sp)) dentro++;
        }
        (window as unknown as { __galstat: unknown }).__galstat = {
          total: pos.count, dentro, pct: +((100 * dentro) / pos.count).toFixed(2),
        };
      }
    }
    this.galaxy?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      this.hide.has('nogal') ? 0 : galaxyFade,
      this.hide.has('nomarker') ? 0 : markerFade,
      this.hide.has('nogal') ? 0 : localBandFade
    );
    // Nuvens moleculares já entram integradas no structureMap da vista
    // externa. Billboards 3D ficam só no disco, onde a paralaxe comunica
    // profundidade; no zoom-out duplicavam o dado como buracos circulares.
    // Traçadores estelares continuam visíveis em ambas as escalas.
    const cartHidden = this.hide.has('nocart') || this.hide.has('nogal');
    this.observedClouds?.update(
      tanHalfFov,
      // As nuvens CO medidas são as fendas REAIS da Via Láctea; ficarem
      // em fade 0 na vista externa era jogar fora a tonalidade delas
      // justamente na vista que a mostra melhor.
      // soma, não max: rampas complementares (ver galaxy.ts, mesmo defeito)
      cartHidden || this.hide.has('noco')
        ? 0
        : galaxyFade * 0.55 + localBandFade * 0.72
    );
    this.starForges?.update(
      cam.position,
      hPx,
      tanHalfFov,
      time,
      cartHidden || this.hide.has('noforge')
        ? 0
        : galaxyFade + localBandFade * 0.6
    );

    // debug: posição projetada de Betelgeuse
    if (this.debug.has('dbgstar') && this.meta) {
      const b = this.meta.named.find((s) => s.n === 'Betelgeuse');
      if (b) {
        const v = new THREE.Vector3(b.x, b.y, b.z).project(cam);
        console.log(
          `[dbgstar] cam=${cam.position.toArray().map((n) => n.toFixed(1))} ` +
            `betel_ndc=(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(3)}) ` +
            `dist=${cam.position.distanceTo(new THREE.Vector3(b.x, b.y, b.z)).toFixed(2)}`
        );
      }
    }

    // debug: a régua 2 da Onda 4 (D10) — posição projetada dos 10 corpos
    // lida do Float32Array REAL do atributo, com a câmera DESTE quadro.
    // Um `console.log` por quadro com o bloco inteiro (e não dez): o
    // leitor por CDP recebe a tabela em UMA mensagem.
    if (this.debug.has('dbgplan') && this.planetas) {
      console.log(this.planetas.dbg(cam, this.engine.renderer.domElement.width, hPx));
    }

    // rótulos a cada frame — a 10 Hz eles "nadavam" contra as estrelas
    // (7 projeções + um canvas 2D pequeno: custo desprezível).
    // Na viagem, menos rótulos (cinema); no voo livre, mais (são os
    // alvos do clicar-para-visitar).
    // O Atlas entra pelo ramo do voo livre: rótulos fartos e sem filtro
    // editorial de centro — lá eles são os ALVOS do clicar-para-focar,
    // não a moldura de um beat (fundação da busca da F3).
    if (
      (this.phase === 'journey' || this.phase === 'free' || this.phase === 'atlas') &&
      this.meta
    ) {
      if (this.phase === 'journey') {
        // REGRA EDITORIAL da revisão: o assunto do beat sempre tem nome
        // (target, etiqueta forçada, sem fades) e o fundo fica mudo
        // (quiet) ou limitado a 2 durante o beat. SOL e Sagittarius A✱
        // são sempre isentos do filtro de centro.
        const meta = this.rig.metaAt(this.journeyT);
        let labels = meta.quiet
          ? []
          : projectLabels(cam, this.meta.named, 4, this.prevLabelKeys).filter(
              (l) => {
                if (l.key === 'sol-home' || l.key === 'sgr-a') return true;
                const dx = l.x - 0.5;
                const dy = l.y - 0.5;
                return dx * dx + dy * dy > 0.012; // ~11% do quadro
              }
            );
        if (dHome < 1.5 && !meta.target) labels = [];
        if (meta.target) {
          const forced: StarLabel[] = [];
          for (const name of meta.target) {
            const l = this.resolveForcedLabel(cam, name);
            if (l) forced.push(l);
          }
          const keys = new Set(forced.map((l) => l.key));
          labels = labels.filter((l) => !keys.has(l.key)).slice(0, 2);
          labels.push(...forced);
        }
        this.lastLabels = labels;
        // linha de rumo com distância viva
        this.emitDest(meta.dest, cam.position);
      } else {
        // OS DEZ CORPOS PRIMEIRO, e só onde eles estão DESENHADOS (a
        // camada ligada e dentro do domínio profundo — o mesmo critério
        // que decide `points.visible`). Primeiro na lista porque o
        // desempate de colisão do `LabelCanvas` é a ordem: dentro do
        // sistema solar o assunto são eles, e uma vizinha a 40 pc não
        // pode expulsar Netuno do quadro que o Atlas abriu mostrando.
        const corpos =
          this.phase === 'atlas' && this.planetas?.points.visible
            ? projectCorpos(cam, CORPOS_DO_SISTEMA, this.planetas.posicoes)
            : [];
        // AS LUAS (F2b/F5): rótulo pela posição VIVA da efeméride —
        // não têm vértice na camada de pontos, então entram por uma
        // projeção própria. NaN (sem efeméride) o projectCorpos ignora.
        const luas =
          this.phase === 'atlas' && this.planetas?.points.visible
            ? projectCorpos(cam, LUAS_DO_SISTEMA, this.luaPosParaRotulo)
            : [];
        this.lastLabels = [
          ...corpos,
          ...luas,
          ...projectLabels(cam, this.meta.named, 7, this.prevLabelKeys),
        ];
        this.emitDest(undefined, cam.position);
      }
      this.prevLabelKeys = new Set(this.lastLabels.map((l) => l.key));
      this.events.onLabels(this.lastLabels);
    } else if (this.phase !== 'journey') {
      this.lastLabels = [];
      this.events.onLabels([]);
      this.emitDest(undefined, cam.position);
    }

    this.post.setGradacao(this.claraoDoQuadro);
    this.post.setGalaxy(galaxyFade);
    this.post.setWarp(this.reducedMotion ? 0 : warp);
    // gate 0.02: na casca externa do fade a contribuição é invisível
    // pós-ACES, mas o raymarch custaria integral
    if (this.noNebula || nebulaFade <= 0.02) {
      // longe de casa o céu é o preto profundo — a galáxia é a luz
      this.engine.scene.background = this.noNebula ? this.deepBg : this.bgColor;
    } else {
      this.engine.scene.background = this.nebula.texture;
      this.nebula.render(this.engine.renderer, cam);
    }
    this.post.render(time);
    // DEPOIS do render, e é o único lugar que soma: o sinal de prontidão
    // conta quadros DESENHADOS, não quadros agendados (ver `captura`).
    this.quadrosEstaveis++;
  }

  /**
   * O FIM DA DUPLA-LUZ hero↔catálogo, por quadro (decisão D2 da Onda 3).
   * Escreve `aFade` nos 16 pontos do catálogo casados com as heroes: o
   * ponto cede na medida em que o billboard DOMINA a representação na
   * tela (razão de tamanhos em px — `lodStellar` seção 5), e fica
   * inteiro enquanto o hero for menor que ele. É por isso que das quatro
   * vistas de Betelgeuse só a de 8 pc muda: a 200/600/950 pc o billboard
   * tem menos de 1 px contra os 5,9 px do ponto, a razão nem chega a 1 e
   * o fade é 0 EXATO.
   *
   * As duas redes de segurança que são estado de runtime moram aqui: com
   * `?nohero=1` ou além de 1.200 pc de casa o grupo inteiro está
   * desligado (a linha `heroes.group.visible = ...` do `frame`, logo
   * antes desta chamada) e o que se escreve é o NEUTRO — o catálogo volta
   * inteiro no mesmo quadro, e o gate do céu (que roda com `nohero=1`)
   * continua medindo exatamente o que media. A terceira (o hero apagado
   * pelo `farFade` além de 900 pc) é da própria política, por
   * construção. A quarta é a CHAVE `DOMINANCE_DEFAULT_ON`, `true` desde
   * a fase 4a (ver a decisão e o A/B medido ao lado dela, em
   * `lodStellar`): `?nodom=1` é o caminho de volta e `?dom=1` liga mesmo
   * se a constante voltar a `false`.
   *
   * ONDE ISSO MUDA A TELA (medido com `?dom=1`, não suposto): das 15
   * vistas do `ab-identidade`, cinco. As quatro do Sol (α Centauri, a
   * 1,4 pc, com o PONTO dentro do quadro) e a `hero8`. As outras dez
   * ficam bit-idênticas — inclusive a `sol` e a `interno`, onde as
   * heroes que cedem estão fora do frustum e só o clarão delas sangra
   * para dentro. As cinco viraram BASELINE nova na fase 4a. Custo: 16
   * comparações por quadro; a escrita é no-op enquanto nada muda (C2).
   */
  private writeHeroFades(screenH: number, tanHalfFov: number) {
    const stars = this.stars;
    const heroes = this.heroes;
    if (!stars || !heroes) return;
    // a chave da cessão mora em `lodStellar` (DOMINANCE_DEFAULT_ON), com
    // a decisão de estar em `true` escrita ao lado dela; aqui ficam só as
    // duas portas de URL que a auditoria usa
    const cessao = this.debug.has('dom') || (DOMINANCE_DEFAULT_ON && !this.hide.has('nodom'));
    // a política inteira é PURA e mora em `lodStellar.fadesDoQuadro`
    // (testada por comportamento); o que sobra aqui é o fio: ler o estado
    // do quadro, entregar, escrever. `heroes.camDistPc` é do `update`
    // logo acima — invertê-los daria o fade do quadro ANTERIOR (e
    // `Infinity` no primeiro), e é por isso que a ORDEM está pinada no
    // teste.
    fadesDoQuadro(
      this.heroCatalogIdx,
      heroes.camDistPc,
      heroes.sizePc,
      this.heroCatalogLogLum,
      { screenH, tanHalfFov, expoM0: stars.expoM0, sigmaPx: stars.sigmaPx },
      heroes.group.visible && cessao,
      this.heroFades
    );
    for (let i = 0; i < this.heroCatalogIdx.length; i++) {
      const idx = this.heroCatalogIdx[i];
      if (idx < 0) continue;
      stars.writeFade(idx, this.heroFades[i]);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    // aborta JÁ (os fetches em voo não interessam mais); o resto pode
    // esperar
    this.abortController.abort();
    // A pré-compilação do three faz polling por setTimeout lendo
    // `materialProperties.currentProgram` de cada material da lista.
    // Qualquer material.dispose() nosso remove essas propriedades e o
    // polling seguinte estoura com "isReady of undefined" — dentro de um
    // timer, fora de qualquer try/catch. Então o teardown INTEIRO espera
    // o warm-up assentar. (Só aparecia em dev: a limpeza do efeito do
    // React durante o Fast Refresh caía no meio da carga.)
    if (this.warmup) {
      void this.warmup.catch(() => {}).then(() => this.teardown());
      return;
    }
    this.teardown();
  }

  private teardown() {
    // `disposed` já está travado: um passo que estoure NÃO pode levar
    // junto o resto do teardown. Sem isto, uma exceção no meio deixava
    // o Engine vivo — RAF rodando uma cena zumbi e o contexto WebGL
    // preso para sempre, porque a segunda chamada retorna no início.
    const step = (label: string, fn: () => void) => {
      try {
        fn();
      } catch (error) {
        console.warn(`[dispose] ${label} falhou; seguindo.`, error);
      }
    };
    step('roam', () => this.roam.dispose());
    step('listeners', () => {
      this.engine.renderer.domElement.removeEventListener('pointerdown', this.onPausePointerDown);
      window.removeEventListener('pointermove', this.onPausePointerMove);
      window.removeEventListener('pointerup', this.onPausePointerUp);
      window.removeEventListener('pointercancel', this.onPausePointerCancel);
      window.removeEventListener('lostpointercapture', this.onPausePointerCancel);
      this.engine.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
      this.engine.renderer.domElement.removeEventListener('wheel', this.onRodaDoAtlas);
      // o HMR do vite chama o dispose a cada salvamento: gesto vivo de
      // uma sessão morta não pode sobreviver ao próprio Director
      this.arrastoDaPausa.esquecer();
    });
    step('blackHole', () => this.blackHole?.dispose());
    // recursos do mundo ANTES do renderer: material descartado depois
    // de renderer.dispose() não chama deleteProgram
    step('stars', () => this.stars?.dispose());
    step('heroes', () => this.heroes?.dispose());
    step('galaxy', () => this.galaxy?.dispose());
    step('observedClouds', () => this.observedClouds?.dispose());
    step('starForges', () => this.starForges?.dispose());
    step('wrappedStars', () => this.wrappedStars?.dispose());
    step('dustMap', () => this.dustMapTexture?.dispose());
    step('structureMap', () => this.structureMapTexture?.dispose());
    step('sun', () => this.sun.dispose());
    // sunStar nasce depois do await do init: falha de carga chega aqui
    // com ele indefinido
    step('sunStar', () => this.sunStar?.dispose());
    // idem: a camada nasce depois do await do init
    step('planetas', () => this.planetas?.dispose());
    step('terra', () => this.terra?.dispose());
    step('lua', () => this.lua?.dispose());
    step('rochosos', () => {
      for (const r of this.rochosos) r.corpo.dispose();
    });
    step('gigantes', () => {
      for (const g of this.gigantes) g.corpo.dispose();
    });
    step('palco', () => this.palco.dispose());
    step('dust', () => this.dust.dispose());
    step('nebula', () => this.nebula.dispose());
    step('post', () => this.post.dispose());
    step('engine', () => this.engine.dispose());
  }
}
