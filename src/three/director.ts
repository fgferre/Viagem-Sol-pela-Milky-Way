// ============================================================
// Director — orquestra engine, mundo e cinemática.
// API consumida pelo React: eventos de legenda/progresso/fase.
// ============================================================
import * as THREE from 'three';
import { Engine, GRAMPO_DO_PASSO_S, modoDoToneMapping } from './core/engine';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  MedicaoDoQuadro,
  QualityLevel,
} from './core/engine';
import type { EstadoDaVista } from './selo';
import type { MotorEfemerides } from '../lib/atlas/efemerides';
import { CAMADA_DO_CAMPO, Post } from './core/post';
// (A PUPILA morreu INTEIRA no M2 da LEI-DA-ESTRELA — arquivo, teste e a
// espinha de `uExposicao`. O que substitui a adaptação é a compressão
// fixa em dois pontos, que é padrão desde 15/08; a medição que ela fez
// vive na LEI §7.)
import { StarField } from './world/stars';
import { Nebula } from './world/nebula';
import { StellarBody, SOL_PARAMS } from './world/stellarBody';
import { Dust } from './world/dust';
import type { StarLabel } from './world/labels';
// O CLARÃO DE ASAS (M2): a camada única da óptica das fontes fortes,
// por orçamento de fluxo — no lugar das 16 heroes de autor. Quem o
// alimenta por quadro é o módulo do Sol (director/solNoQuadro.ts).
import { ClaraoDeAsas } from './world/clarao';
import { HeroStars } from './world/heroStars';
import { Galaxy, GAL, LIMIAR_FORA_DO_DISCO, dentroDoDisco } from './world/galaxy';
import type { CartographyMode } from './world/galaxy';
import { ObservedClouds } from './world/observedClouds';
import { StarForges } from './world/starForges';
import { WrappedStars, resolvedCatalogCurve } from './world/wrappedStars';
import { CORPOS_DEFAULT_ON, CorposResolvidos } from './world/corpos/corpos';
import { LuaResolvida } from './world/corpos/lua';
import { RochosoResolvido } from './world/corpos/rochoso';
import { GiganteResolvido } from './world/corpos/gigante';
import { Planetas, UA_POR_PC } from './world/planetas/planetas';
import { Orbitas } from './world/orbitas';
import { deslocamentoEVAssistida } from '../lib/atlas/luz';
import type { PoliticaDeLuz } from '../lib/atlas/luz';
import { lerPortaLuz } from './selo';
import type { VerDaEscada } from './selo';
import { sondarGl } from '../lib/glProbe';
import { EPOCA_JD_TDB } from './world/planetas/retrato2026';
import { lerPortaJd } from './tempoDoAtlas';
import type { EstadoDoTempo, SentidoDoTempo } from './tempoDoAtlas';
import { RAIO_DO_SOL_NA_CENA } from './escala';
import { EXPO_M0, SIGMA_PX } from './luzDaCasa';
// A LEI DA ESTRELA (M1): a repartição única do Sol virou UMA função
// pura (`repartir`, estrela.ts) — quem a chama por quadro é o módulo
// do Sol (director/solNoQuadro.ts), com a câmera e o instrumento que
// o director lhe entrega no tick.
import { loadGalacticAssets } from './cartography/galacticAssets';
import { JourneyRig, FreeRoam } from './cinematic/cameraRig';
import { NuvensSemente } from './director/nuvensSemente';
import { VeuDoAtlas } from './director/veu';
import { QUADROS_TENTANDO_FONTE, julgarProntidao } from './director/prontidao';
import { MaquinaDoTempo } from './director/maquinaDoTempo';
import { ligarGestos } from './director/gestos';
import { distanciaAposEstalos } from './zoomDaRoda';
import { Rotulos } from './director/rotulos';
import { SolNoQuadro } from './director/solNoQuadro';
import { doseDaDramaturgia } from './director/doseDoSol';
import { faseDoCiclo } from './estrela';
import type { CalibracaoDaCasa } from './estrela';
import { BETA_DA_EMISSAO } from './shaders/starShaders';
import { Escada } from './director/escada';
import type { EstadoDaEscada } from './director/escada';
import {
  descartarCarga,
  montarCarga,
  montarCenaDeAquecimento,
  montarCorposDoPalco,
} from './director/carregamento';
import { passoDoPalco, quadroDoPalcoVazio } from './director/palco';
import type { PostoNoPalco } from './director/palco';
import type { GalacticAssets } from './cartography/galacticAssets';
import { AtlasRig, retanguloUtilDoAtlas } from './cinematic/atlasRig';
import { ORIGEM } from './cinematic/enquadramento';
import { escalaDaUi, larguraDeCss } from '../lib/uiScale';
import {
  CAMADAS,
  CORPOS_DO_SISTEMA,
  LUAS_DO_SISTEMA,
  HELIO_SEM_PONTO,
} from './atlasConfig';
import { ESCRITOR_DE_CAMERA } from './fases';
import type { EscritorDeCamera, Phase } from './fases';
import {
  REVEAL_T,
  T_SAIDA_DO_DISCO,
  jdDoFilme,
} from './cinematic/journey';
import { BlackHolePass } from './world/blackHole';
import { loadStarData } from './config';
import type { NamedStar, StarsMeta } from './config';
import type { CorpoBuscavel } from '../lib/buscaEstrelas';

/**
 * O INSTRUMENTO DA CASA na parte que não muda com o quadro (M4 da Lei
 * da Estrela, §3: "o que a CASA é — um por quadro"). Montado AQUI
 * porque é aqui que as duas metades se encontram: a exposição de
 * referência e a largura da PSF são da lei (`luzDaCasa`), e o β da
 * emissão é o valor JÁ RESOLVIDO da porta `?bemis=` — `lerBetaDaEmissao`
 * é pura de propósito (não lê `window`, para a suíte poder julgá-la em
 * `node`), e quem a resolve uma vez é `shaders/starShaders`.
 *
 * Quem o recebe: o campo de catálogo e a camada dos dez corpos. Eles já
 * usavam os mesmos três números — a diferença é que agora usam o MESMO
 * OBJETO, e a igualdade deixou de depender de duas listas coincidirem.
 */
const CALIBRACAO_DA_CASA: CalibracaoDaCasa = {
  expoM0: EXPO_M0,
  sigmaPx: SIGMA_PX,
  beta: BETA_DA_EMISSAO,
};

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

/*
 * (O PINO DO SOL DENTRO DO ATLAS morreu em 21/08 — item 5. Ele existia
 * porque a fase do ciclo era torcida pelo tempo de VIAGEM, e sem pino
 * entrar no Atlas de t=10 ou de t=250 daria dois Sóis. Ele nem entregava
 * o que prometia: o que alimentava as regiões era um acumulador, e o
 * resíduo do trajeto atravessava o portal. Agora a fase é a DATA e o
 * estado das regiões é função pura dela — a reprodutibilidade não vem
 * mais de congelar nada, vem de o Sol ser recalculável. E o Atlas ganhou
 * calendário: o Sol de 2019 é o de um mínimo, o de 2024 é o de um
 * máximo.)
 */

/** etapa viva do carregamento: `{ id, index, total, label }`, index 1…total */
export type LoadStage = (typeof LOAD_STAGES)[number];
export type LoadStageId = LoadStage['id'];

// O ESTADO DA QUALIDADE mora no vocabulário do engine (`core/engine`),
// junto de `QualityLevel` e `MedicaoDoQuadro`; reexportado porque
// `import { EstadoDaQualidade } from './three/director'` é o endereço
// que o HUD usa — o mesmo caso do `Phase` e do `EstadoDaEscada`.
export type { EstadoDaQualidade } from './core/engine';

interface DirectorEvents {
  onPhase: (p: Phase) => void;
  onCaption: (index: number, caption: string, sub?: string) => void;
  onProgress: (k: number) => void;
  onLabels: (labels: StarLabel[]) => void;
  onWarp: (k: number) => void;
  onQuality: (estado: EstadoDaQualidade) => void;
  /** linha de rumo ("→ DESTINO · distância viva"); vazio = esconder */
  onDest: (text: string) => void;
  /** distância viva do Sol ("SOL · 40,2 UA"); vazio = esconder */
  onSol: (text: string) => void;
  /**
   * ONDE A CÂMERA ESTÁ, em eclíptica heliocêntrica UA — só no Atlas, a
   * 4 Hz e só quando ela se move (item 74, parte B). É com ela que a ficha
   * do objeto diz quanto do disco está iluminado visto DAQUI, ao lado do
   * "visto da Terra". `null` fora do Atlas.
   */
  onCamera: (posUA: readonly [number, number, number] | null) => void;
  /** etapa viva do carregamento — a mesma que o HUD desenha */
  onStage: (stage: LoadStage) => void;
  /** opacidade do véu do Atlas (0..1); custom property, não estado */
  onVeu: (k: number) => void;
  /**
   * O QUE ESTÁ EM QUADRO no Atlas — o nome do alvo enquadrado, ou
   * `null` quando é o enquadramento de abertura (o degrau `sistema`) ou
   * quando o Director não tem nome para dar. `null` não é "vazio": é a
   * a ficha do objeto NÃO montando, em vez de chutar um nome (D6).
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
   * enquadramento troca. É dele que o cabeçalho da ficha do objeto decide
   * quais botões mostrar (aproximar/sistema), que a barra decide se oferece
   * a ficha, e que o `urlComMomento` decide se `?ver=corpo` entra no link.
   * Desde o item 74 ele carrega também o `corpoId` — o NOME serve para
   * escrever, e o id para procurar.
   */
  onEscada: (estado: EstadoDaEscada) => void;
  /**
   * O PRIMEIRO ARRASTO dentro do Atlas, uma vez por sessão (item 73).
   * Serve à dica dos gestos: quem girou aprendeu o gesto, e a linha
   * apaga por opacidade — a caixa fica, senão o rodapé encolheria e a
   * câmera recuaria no meio da sessão. Uma vez e não por quadro porque
   * o consumidor é `setState` do React: um por movimento de ponteiro
   * redesenharia o HUD inteiro a 60 Hz.
   */
  onGirou: () => void;
  /**
   * O TOQUE NO CÉU FECHOU A GAVETA (item 62). Quem decide QUAL toque
   * fecha é `director/gestos.ts`; este fio só entrega o recado ao React,
   * que é quem tem o estado das gavetas.
   */
  onFecharGavetas: () => void;
  /**
   * A SESSÃO MORREU DEPOIS DO BOOT — contexto WebGL perdido ou exceção
   * em quadro. É o MESMO canal do véu de erro do carregamento (o App
   * escreve `loadError`): a casa tem um véu de falha só, e o que muda
   * entre "não pôde começar" e "parou no meio" é a copy, não o
   * componente. Sem este fio as duas falhas eram invisíveis — a tela
   * congelava com o HUD inteiro no ar e nada dizia que acabou.
   */
  onErro: (mensagem: string) => void;
}

// A ESCADA DE NAVEGAÇÃO (D7) mora em `director/escada.ts` (corte 9);
// reexportado porque `import { EstadoDaEscada } from './three/director'`
// é o endereço que o resto da casa já usa — o mesmo caso do `Phase`.
export type { EstadoDaEscada } from './director/escada';

export class Director {
  /** o painel de ajustes mexe em tom e exposição ao vivo */
  readonly engine: Engine;
  private post: Post;
  private nebula: Nebula;
  private stars!: StarField;
  /** O CLARÃO DE ASAS (M2 da Lei): a óptica das fontes fortes, por
   *  orçamento de fluxo com histerese — camada única, sempre acesa.
   *  (A identidade "as 16", o casamento hero↔catálogo e a política de
   *  dominância morreram com as heroes de autor: o clarão soma óptica
   *  POR CIMA do ponto e não pede cessão a ninguém.) */
  private clarao!: ClaraoDeAsas;
  private heroes!: HeroStars;
  private galaxy!: Galaxy;
  /** os 10 pontos fotométricos do domínio profundo (Onda 4, D3) —
   *  camada IRMÃ do `sun.group`, nunca filha dele */
  private planetas: Planetas | null = null;
  /** AS LINHAS DE ÓRBITA (item 77) — o QUARTO irmão do `sun.group`, pela
   *  mesma razão dos outros três: de dentro do grupo do Sol herdaria a
   *  escala do doador. Só desenha com efeméride viva (ver `orbitas.ts`,
   *  §6): a curva sai do estado do instante, nunca do retrato. */
  private orbitas: Orbitas | null = null;
  /** O PALCO LOCAL (Onda 6, F0 — D1): o grupo dos corpos resolvidos,
   *  vazio nesta fase. Irmão do `sun.group` e do `planetas.points`; a
   *  superfície mais próxima dele entra no `updateClip` a cada tick.
   *  `palco` e não `corpos`: o nome `corpos` já é do getter público da
   *  BUSCA (os dez do retrato), que é outra coisa. */
  private readonly palco = new CorposResolvidos();
  /**
   * OS DOZE CORPOS DO PALCO — a LISTA ÚNICA que o tick percorre (item
   * 63): Terra, Lua, os rochosos (F3+F5) e os gigantes (F4), nesta
   * ordem, cada um com os quatro traços que o distinguem e as digitais
   * do quadro anterior (pop do mesh, chegada de textura, gate a frio e
   * rampa de cessão recomeçam a contagem da captura). Montada no init
   * por `montarCorposDoPalco`; o laço mora em `director/palco.ts`.
   */
  private noPalco: readonly PostoNoPalco[] = [];
  /** A LUA pelo nome — o único posto que alguém procura fora do laço
   *  (o rUA da cadeia dela alimenta a linha BRILHO do selo). A Terra
   *  não precisa de handle: quem a quer de fora (o juiz de z-fighting)
   *  a acha em `noPalco` pelo id, que é o endereço único desde 22/08. */
  private lua: PostoNoPalco<LuaResolvida> | null = null;
  /** as duas fatias que a ESCADA percorre por tipo — os MESMOS objetos
   *  de `noPalco`: uma lista, duas leituras. */
  private rochosos: readonly PostoNoPalco<RochosoResolvido>[] = [];
  private gigantes: readonly PostoNoPalco<GiganteResolvido>[] = [];
  /** o quadro dos doze, montado UMA vez e reusado — doze objetos por
   *  tick era alocação que o M4 da casa não deixa passar. */
  private readonly quadroDoPalco = quadroDoPalcoVazio();
  /** `perturbar` já ligado ao this — um fio por tick, não doze */
  private readonly perturbarDoPalco = () => this.perturbar();
  /**
   * A DOSE DO PRÉ-AQUECIMENTO (22/08) — o gatilho 2 da carga preguiçosa,
   * agora POR CORPO. Era um booleano só (`palcoQuente`) valendo para os
   * doze, e o preço estava medido: abrir o Atlas em cinema deixava
   * residentes **1.147 MiB de texel de corpo** (38 texturas, 36,5 MiB
   * baixados) sem o visitante chegar perto de nada — e a coda do filme
   * fazia o mesmo com os que ela nunca resolve.
   *
   * A DOSE NOVA, e o número que a autoriza. Medido nesta máquina, com o
   * cache HTTP DESLIGADO e o pré-aquecimento desligado: um corpo sozinho
   * vai de 'fria' a 'pronta' em 90–113 ms, e na descida ao degrau do
   * corpo o gate de 4 px arma 222–479 ms antes da chegada da câmera — a
   * textura pousa 124 a 230 ms ANTES do fim da rampa nos três corpos
   * medidos (Marte, Terra, Saturno). O gate acorda cedo o bastante, e é
   * ele quem manda para quem não está em foco.
   *
   * Quem AINDA pré-aquece, e por quê:
   *  - no ATLAS, o corpo EM FOCO (e o pai, quando o foco é uma lua — o
   *    degrau da lua enquadra os dois, D7): o clique dá segundos de
   *    folga, não milissegundos, e é o único corpo que o visitante
   *    declarou querer ver;
   *  - no FILME, TERRA e LUA a partir de REVEAL_T — as duas que a coda
   *    resolve, e só elas. As outras dez nunca chegam aos 4 px no filme:
   *    aqueciam por engano, dentro do ato mais pesado.
   */
  private readonly preAquecerCorpo = (id: string): boolean => {
    if (this.phase === 'journey') {
      return this.journeyT >= REVEAL_T && (id === 'earth' || id === 'moon');
    }
    if (this.phase !== 'atlas') return false;
    const foco = this.escada.focoCorpoId;
    if (!foco) return false;
    return id === foco || id === LUAS_DO_SISTEMA.find((l) => l.id === foco)?.pai;
  };
  /** quadros já gastos segurando a captura com a efeméride pedida
   *  indisponível — ver QUADROS_TENTANDO_FONTE (auditoria item 5c). */
  private quadrosTentandoFonte = 0;
  /** a segunda tentativa de `garantirEfemerides` já foi disparada */
  private retentouFonte = false;
  /** o aviso único do retrato sob corpos já saiu no console */
  private acusouRetrato = false;
  /**
   * A CÂMERA SALTOU neste quadro (portal, enquadramento, ?pos=) — os
   * corpos resolvidos fazem SNAP da cessão em vez de animar através do
   * teletransporte (cicatriz "reset no salto de foco", D5). Armado por
   * `teletransportou()` e consumido por UM tick.
   */
  private saltoDeCamera = false;
  /**
   * A POLÍTICA DE LUZ dos corpos resolvidos (Onda 6, D2/D8). Default
   * `assistida` — o do Atlas; `?luz=` semeia no boot e a linha BRILHO
   * do selo troca ao vivo (`definirLuz`). Fora do Atlas o estado é
   * neutro por construção: não há superfície resolvida no filme.
   */
  private politicaDeLuz: PoliticaDeLuz = 'assistida';
  private observedClouds: ObservedClouds | null = null;
  private starForges: StarForges | null = null;
  private wrappedStars!: WrappedStars;
  private dustMapTexture: THREE.Texture | null = null;
  private structureMapTexture: THREE.Texture | null = null;
  /**
   * O TIER COM QUE O MUNDO FOI ASSADO — e ele NÃO é `engine.quality`.
   * Metade da qualidade é viva (pixelRatio, passos do raymarch) e vale
   * no quadro seguinte ao clique; a outra metade é ALOCAÇÃO (a população
   * da galáxia e o tier do Sol) e leva segundos de worker para nascer.
   * Entre o clique e o swap os dois números divergem de propósito: um
   * diz o que o instrumento já faz, este diz o que está na tela. Nasce
   * no init com o tier que `montarCarga` recebeu.
   */
  private tierDoMundo: QualityLevel | null = null;
  /**
   * QUEM ESCOLHE O TIER (Ajustes D). `manual` é o padrão de produto e a
   * fronteira política do dono: com ele, nada troca de tier sem clique.
   * `auto` é o 4º estado do seletor — o visitante delegando a escolha à
   * medição, que continua sendo medição e nunca detecção.
   */
  private politicaDeQualidade: 'manual' | 'auto' = 'manual';
  /** o tier PEDIDO e ainda a caminho (`null` = nenhuma troca em voo) —
   *  é ele que faz a captura esperar */
  private trocaPedida: QualityLevel | null = null;
  /**
   * O NÚMERO DE SEQUÊNCIA DO PEDIDO, e quem CANCELA o mundo em forno
   * quando o visitante muda de ideia no meio. Cada passagem por
   * `reassarMundo` toma o próximo número; o forno só pousa o mundo cujo
   * número ainda é o último (`mundoAindaVale`). Quem perdeu a vez
   * descarta o que assou.
   *
   * Por que não bastava o tier pedido: em Alta → Performance → Alta o
   * terceiro clique é um NÃO-PEDIDO pela régua do tier (o mundo já é
   * alta) e saía sem tocar em `trocaPedida`, deixando o forno de
   * Performance com licença para pousar. Medido em 21/08, 3 de 3 vezes
   * com 100/250/500 ms entre cliques: seletor, URL e `engine.quality` em
   * Alta, mundo em Performance, e clicar Alta de novo não consertava.
   */
  private geracaoDaTroca = 0;
  /** os catálogos do boot, guardados porque o mundo pode ser reassado.
   *  Os arrays são os MESMOS de sempre: o worker os recebe por CÓPIA. */
  private catalogos: GalacticAssets | null = null;
  /** o modo de cartografia decidido no boot (`?cart=`) — o mundo novo
   *  nasce com o mesmo, senão a troca de tier viraria troca de mapa */
  private cartMode: CartographyMode = 'blend';
  /** nuvens do catálogo em coords de cena: x,y,z,raio,amp por registro */
  /** as nuvens-semente do raymarch — corte 1 da Parte 1 da onda */
  private readonly nuvensSemente = new NuvensSemente();
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
  /** o punho dos gestos do canvas — corte 6 da Parte 1 (director/gestos.ts) */
  private gestos: ReturnType<typeof ligarGestos> | null = null;
  /** o visitante já arrastou dentro do Atlas? (item 73 — apaga a dica) */
  private jaGirouNoAtlas = false;

  /**
   * O QUE O PORTAL GUARDA quando o visitante entra no Atlas — e devolve
   * inteiro quando ele parte. Não é só o `journeyT`: o `seek()` sozinho
   * zera o olhar do pausar-e-olhar, e o tick zera o latch `leftDisk`
   * fora da viagem. Faltando qualquer um dos cinco, "Partir" devolveria
   * um quadro parecido — e o gate mede PIXEL. (A pausa teve dois donos
   * até 21/08; hoje o `freezeJourney` é o dono único e escreve o
   * `rig.paused` por dentro.)
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
  // que a pausa teve até 21/08, quando `freezeJourney` e `rig.paused`
  // eram escritos separadamente e o boot só escrevia um.

  /**
   * O instante em que o enquadramento do Atlas foi composto pela última
   * vez — o limite de frequência do religador (ver `recomporAlvo`).
   * `NaN` nunca é igual a nada, então o primeiro quadro da fase sempre
   * recompõe uma vez.
   */
  private jdDoEnquadre = Number.NaN;
  /** a máquina do tempo — corte 4 da Parte 1; os fios são arrows (só
   *  executam bem depois de todos os campos nascerem) */
  private readonly maquinaDoTempo = new MaquinaDoTempo({
    onTempo: (e) => this.events.onTempo(e),
    perturbar: () => this.perturbar(),
    aoChegarFonte: () => this.escada.reenquadrarAposEfemeride(),
    signal: () => this.abortController.signal,
    disposed: () => this.disposed,
  });

  /** o véu do Atlas — corte 2 da Parte 1 da onda */
  private readonly veuDoAtlas = new VeuDoAtlas({
    onVeu: (k) => this.events.onVeu(k),
    perturbar: () => this.perturbar(),
  });

  /** os rótulos do céu — corte 7 da Parte 1 (director/rotulos.ts); o
   *  beat é fio porque só o ramo da viagem o paga */
  private readonly rotulos = new Rotulos({
    onLabels: (labels) => this.events.onLabels(labels),
    onDest: (text) => this.events.onDest(text),
    onSol: (text) => this.events.onSol(text),
    onCamera: (posUA) => this.events.onCamera(posUA),
    beatDaViagem: () => this.rig.metaAt(this.journeyT),
  });

  private phase: Phase = 'loading';
  private journeyT = 0;
  /**
   * A viagem ROTEIRIZADA sai do envelope do disco em `T_SAIDA_DO_DISCO`
   * (148,394 s) e a CODA volta a entrar nele em t≈176,5, mergulhando
   * para casa; uma vez fora, o ambiente fica desligado (latch) — o
   * pull-back e a volta mostram o modelo da galáxia, não uma nebulosa
   * ressuscitada. Free-roam/?pos= não usam o latch: lá o comportamento
   * relocável instantâneo é o desejado.
   *
   * O TICK só o ARMA (câmera fora); quem SALTA no tempo o recebe do
   * roteiro, no `seek` e na semente do portal — o latch é história, e o
   * salto não tem história.
   */
  private leftDisk = false;
  private lastCaptionIdx = -1;
  private relogioParado = false;
  /**
   * CONGELA A VIAGEM — e é o DONO ÚNICO da pausa, que sempre teve dois
   * campos: este relógio e o `rig.paused`, que é quem desliga o
   * decaimento do olhar-ao-redor (τ = 0,5 s, `JourneyRig.apply`). Quem
   * escrevesse só um entregava meia pausa, e era o que o boot fazia com
   * `?t=` sem `play`: medido em 21/08, um arrasto de −0,44 rad
   * escorregava para −0,064 em 2 s, enquanto o botão Pausar segurava os
   * −0,44 inteiros. Agora o botão, o portal e o boot escrevem AQUI, e a
   * porta de captura entra no MESMO estado que o botão.
   */
  get freezeJourney() {
    return this.relogioParado;
  }

  set freezeJourney(parada: boolean) {
    this.relogioParado = parada;
    this.rig.paused = parada;
  }
  /** multiplicador do relógio da viagem (1× · 2× · 4×) */
  playbackRate = 1;
  private noNebula = false;
  private deepBg = new THREE.Color(0x010208);
  /** ?shot=1 congela o tempo visual — capturas determinísticas */
  private shotMode = false;
  /** prefers-reduced-motion: sem shake, sem pulso de warp/CA */
  private reducedMotion = false;
  /** toggles de debug: ?nogal=1&nosun=1&nodust=1&noclarao=1&nocat=1 */
  private hide = new Set<string>();
  /** ?exp= na query desliga a auto-exposição (App.tsx aplica o valor fixo) */
  private expOverride = false;

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
  /** o Sol no quadro — corte 8 da Parte 1 (director/solNoQuadro.ts):
   *  o gate do palco, a repartição da lei e a cessão do ponto, com o
   *  estado da histerese (`solArmado`) dentro; os punhos tardios
   *  entram por fio e o raio único entra UMA vez, daqui */
  private readonly solNoQuadro = new SolNoQuadro({
    solRaioPc: this.solRaioPc,
    sun: () => this.sun,
    palco: () => this.palco,
    clarao: () => this.clarao,
    planetas: () => this.planetas,
    stars: () => this.stars,
    escondido: (flag) => this.hide.has(flag),
  });
  /** a escada do Atlas — corte 9 da Parte 1 (director/escada.ts): o
   *  clique, a busca, os degraus, o religador do relógio e o trio do
   *  foco (`ver`/`focoEstrela`/`focoCorpoId`) com UM dono; os punhos
   *  de instância entram com o nome preservado, o que nasce depois do
   *  construtor (engine, roam) e o que muda por quadro entram por fio */
  private readonly escada = new Escada({
    atlas: this.atlas,
    maquinaDoTempo: this.maquinaDoTempo,
    rotulos: this.rotulos,
    solRaioPc: this.solRaioPc,
    teletransportou: () => this.teletransportou(),
    // o gesto que pede a casa desarma a trava do disco (item 61, §6) —
    // a trava é campo do director, o gesto nasce na escada
    pediuACasa: () => {
      this.leftDisk = false;
    },
    events: {
      onFoco: (nome) => this.events.onFoco(nome),
      onEscada: (estado) => this.events.onEscada(estado),
    },
    fios: {
      engine: () => this.engine,
      roam: () => this.roam,
      fase: () => this.phase,
      quadrosDaFase: () => this.quadrosDaFase,
      shotMode: () => this.shotMode,
      reducedMotion: () => this.reducedMotion,
      planetas: () => this.planetas,
      meta: () => this.meta,
      rochosos: () => this.rochosos,
      gigantes: () => this.gigantes,
    },
  });
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
      this.engine.quality,
      // a fase do ciclo NO NASCIMENTO: o `prime` do construtor assa um
      // retrato completo, e assá-lo na data certa é o que evita um
      // re-bake no primeiro quadro de toda sessão
      faseDoCiclo(this.maquinaDoTempo.jdVivo)
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
      this.publicarQualidade();
      // troca de tier muda pixelRatio e passos do raymarch: a contagem de
      // estabilidade da captura recomeça (ver o getter `captura`)
      this.perturbar();
    });
    // A MEDIÇÃO (Ajustes D). O engine mede e avisa; a decisão é daqui —
    // é esta linha que faz o Auto trocar o MUNDO (a alocação inteira,
    // pela via viva da letra C) em vez de só o instrumento, que era todo
    // o alcance do auto-quality que morreu no engine.
    this.engine.onMedicao((m) => this.aoMedirOQuadro(m));
    // o Engine já aplicou a qualidade no próprio construtor, antes destes
    // ouvintes existirem — o estado inicial precisa ser semeado à mão.
    // O setScale faltava desta lista: em performance inicial o raymarch
    // rodava a 0,5 (o default do construtor) em vez de 0,35 até a primeira
    // troca de tier — exatamente onde a economia mais importa (Onda 1e).
    this.nebula.setScale(this.engine.quality === 'performance' ? 0.35 : 0.5);
    this.nebula.setSteps(this.engine.preset.nebulaSteps);
    this.post.setGrain(this.engine.preset.grain);
    // e o React TAMBÉM é ouvinte tardio: sem esta semente o painel de
    // Ajustes nasceria mostrando o que ele chutou no `useState` em vez do
    // que o engine aplicou — e o clique no tier certo virava no-op
    // (achado da revisão de olhos frescos da Onda 1, verificado ao vivo).
    this.publicarQualidade();

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
    // (A GRADAÇÃO POR CONTEXTO do Atlas — `claraoDoAtlas` — e a porta
    // `?grad=` morreram no M1 da Lei da Estrela: o clarão do Sol passou a
    // sair da repartição única, e o curativo de apagá-lo 100× no Atlas
    // ficou sem doença. Item 4 das pendências.)
    this.noNebula = this.debug.has('nonebula');
    this.shotMode = this.debug.has('shot');
    this.expOverride = this.debug.has('exp');
    // ?luz= — a política da primeira lei de luz (Onda 6, D2/D8), pela
    // lei única da porta (`lerPortaLuz`, selo.ts); pedido inválido cai
    // no default do Atlas, nunca num caminho terceiro.
    this.politicaDeLuz = lerPortaLuz(this.debug.get('luz')) ?? 'assistida';
    // (a porta `?bcede=` morreu no M1: a cessão do Sol-ponto é
    // `wResolvido` da repartição única — regra iv do §4 da Lei.)
    // ?jd= — O INSTANTE DO CÉU (Onda 5, F4/D2), no precedente de
    // `?corpos/?nocorpos`: uma porta que o A/B usa com o MESMO binário dos
    // dois lados. `?jd=EPOCA` pede o instante do retrato e é o lado
    // "com a porta" desse A/B — ele acende o caminho vivo INTEIRO
    // (busca, decodificação, escrita dos dois atributos) num instante
    // em que o resultado tem de ser o retrato bit a bit.
    if (this.debug.has('jd')) {
      const pedido = lerPortaJd(this.debug.get('jd'), EPOCA_JD_TDB);
      if (pedido === null) console.warn('?jd= inválido:', this.debug.get('jd'));
      else {
        this.maquinaDoTempo.jdPedido = pedido;
        this.maquinaDoTempo.garantirEfemerides();
      }
    }
    this.reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // As flags de camada semeiam da URL DERIVADAS da tabela única
    // (`atlasConfig.CAMADAS`) — este laço era a quarta lista digitada à
    // mão, e foi por fora dela que quatro flags só-URL viveram sem nome
    // nem caixa até o item 33. Todas entram em `hide` porque o `hide` é
    // o que o SELO declara: sem isto, chegar com `?nodisc=1` apagava
    // uma camada e o selo dizia "brilho real", enquanto o mesmo
    // desligamento pelo painel se declarava. Uma opção, um veredito.
    // `nonebula` é a exceção de morada: vive em `this.noNebula` (semeada
    // acima, trocada por `setLayerHidden`) e o selo a re-injeta na
    // leitura de `camadasEscondidas`.
    for (const { flag } of CAMADAS) {
      if (flag !== 'nonebula' && this.debug.has(flag)) this.hide.add(flag);
    }

    // os gestos do canvas moram em director/gestos.ts (corte 6)
    this.gestos = ligarGestos(canvas, {
      pauseLookAtivo: () => this.pauseLookActive,
      noAtlas: () => this.phase === 'atlas',
      orbitar: (dx, dy) => {
        this.atlas.addOrbitDelta(dx, dy);
        this.perturbar();
        // o primeiro arrasto apaga a dica dos gestos (item 73) — uma vez
        // por sessão, nunca por quadro: do outro lado do fio há setState
        if (!this.jaGirouNoAtlas) {
          this.jaGirouNoAtlas = true;
          this.events.onGirou();
        }
      },
      olhar: (dx, dy) => this.rig.addLookDelta(dx, dy),
      // UM CLIQUE ESCOLHE, DOIS VÃO (item 73). São dois fios porque são
      // dois gestos: o primeiro troca o alvo com a câmera parada, o
      // segundo é o preset da escada, com rampa.
      selecionar: (x, y) => this.escada.selecionarNoPonto(x, y),
      fecharGavetas: () => this.events.onFecharGavetas(),
      mergulhar: () => this.escada.mergulharNoEscolhido(),
      // A RODA ESCREVE DISTÂNCIA, e só distância (item 73): nem
      // `focoCorpoId`, nem alvo, nem degrau. É por construção que o
      // objeto escolhido nunca troca sozinho — a queixa "nem conseguimos
      // mais selecionar para onde vamos" morre aqui, não num remendo.
      zoom: (estalos) => {
        const d = distanciaAposEstalos(
          this.atlas.distancia,
          this.atlas.pisoDeZoom,
          this.atlas.tetoDeZoom,
          estalos
        );
        this.atlas.pinarDistancia(d);
        // o `?d=` que veio no link deixa de mandar no primeiro gesto
        this.escada.esquecerPinoDoLink();
        this.perturbar();
      },
    });

    // clique curto no voo livre → mini-viagem até a estrela nomeada
    this.roam.onTap = (x, y) => this.escada.tryVisit(x, y);

    // O TICK NÃO PODE ESTOURAR PARA O NADA. Sem este try, uma exceção
    // em quadro saía do rAF como "Uncaught" e o laço a repetia 60×/s
    // para sempre: console em cascata, tela congelada e nenhum aviso ao
    // visitante. Medido em 21/08 — três "Uncaught" no console e nada na
    // tela. O try mora AQUI, no registro, e não em volta do corpo do
    // tick: é a mesma cobertura com 3 linhas em vez de reindentar 550.
    this.engine.onTick((t, dt) => {
      try {
        this.tick(t, dt);
      } catch (e) {
        console.error(e);
        this.desistir(
          'A Viagem parou de desenhar: '
            + (e instanceof Error ? e.message : String(e))
        );
      }
    });
    // A PLACA DE VÍDEO DESISTIU (o listener e o porquê de não restaurar
    // moram no Engine, que é quem tem o canvas e o laço).
    this.engine.onContextoPerdido(() =>
      this.desistir(
        'A placa de vídeo desistiu de desenhar a Viagem — o navegador '
          + 'tirou o contexto 3D desta página.'
      )
    );
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
   * SÓ O RÓTULO, sem fôlego: é o que a carga em worker precisa. Os ~5 s
   * de CPU pesada (os dois bakes de mapa e a população) rodam fora da
   * thread desde os Ajustes B, e é o próprio worker quem avisa a etapa
   * que está começando — a thread está livre para pintar sozinha, e um
   * `setTimeout(0)` no meio do aviso só atrasaria o rótulo.
   */
  private rotular(id: LoadStageId) {
    const stage = LOAD_STAGES.find((s) => s.id === id);
    if (stage) this.events.onStage(stage);
  }

  /**
   * Rótulo de etapa + fôlego para o browser PINTAR o rótulo, para as
   * etapas que AINDA congelam a thread. O init tinha ~5 s de CPU
   * síncrona (bakes 1,6 s + buildGalaxy 3,27 s) e o loader congelava
   * junto — parecia travado exatamente enquanto mais trabalhava. Barra
   * por byte não conserta (a rede é a fatia pequena; ela pararia em
   * 100%). setTimeout(0) e não rAF: em aba de fundo o rAF é estrangulado
   * e o init nunca terminaria. O conserto DEFINITIVO é o Worker, e ele
   * já cobre `dust`, `structure` e `galaxy` (`montarCarga`); o que
   * sobra bloqueando é `layers` (bake por GPU) e o prime do Sol — fila
   * do C. Para essas, isto continua sendo o que dá para honestamente
   * prometer: o espectador vê O QUE está acontecendo.
   */
  private async stage(id: LoadStageId) {
    this.rotular(id);
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
    this.stars = new StarField(starArrays, {
      expoM0: CALIBRACAO_DA_CASA.expoM0,
      sigmaPx: CALIBRACAO_DA_CASA.sigmaPx,
      tau: 0.045,
    });
    // ...e a LUT da faixa deixa de emitir de novo a luz que este campo
    // acabou de desenhar. A curva é MEDIDA nestes mesmos arrays, então
    // não tem como divergir do binário — regerar o catálogo a move
    // sozinha, o mesmo contrato que as cascas já têm com magLimit.
    this.nebula.setResolvedCurve(
      resolvedCatalogCurve(starArrays.position, starArrays.logLum)
    );
    // O CLARÃO DE ASAS (M2 da Lei): a óptica das fontes fortes por
    // orçamento de fluxo. As 16 heroes de autor, o casamento posicional
    // hero↔catálogo e a política de dominância (`aFade`) morreram com a
    // migração: o clarão é LENTE — soma óptica por cima do ponto, do
    // raio do sprite para fora, e não pede cessão a ninguém. Quem
    // decide quem o tem é o fluxo, por quadro, com histerese (§5.21).
    this.clarao = new ClaraoDeAsas(this.meta.named);
    // (o `SunStar` morreu no M1 da Lei da Estrela: o Sol de longe é o
    // ponto fotométrico da camada dos dez, em toda distância — a mesma
    // PSF do campo, sem clarão de autor por cima.)

    // AS 16 HEROES DO FILME, RESGATADAS (16/08, ordem do dono): a arte
    // de 30/07 — braço fino, halo e cruz na cor da estrela — volta como
    // era, byte a byte, e o clarão da lei fica só com o Sol. Palavras
    // dele: "resgata no git a versão certa antes de entrar o atlas".
    this.heroes = new HeroStars(this.meta.named);

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
    // AS TRÊS ETAPAS PESADAS NASCEM NO WORKER (montarCarga,
    // carregamento.ts): poeira, campo acoplado e população saem da
    // thread juntos, e os rótulos `structure`/`galaxy` andam pelo aviso
    // do próprio worker em vez de congelar. Sem contagem no rótulo da
    // galáxia: cinema semeia 4,02 M, performance 1,1 M — um número fixo
    // mentiria em metade dos aparelhos. Dispose durante o await é o caso
    // dos stage(): o teardown já correu e ninguém mais descartaria estes
    // objetos — descarta os três e sai.
    //
    // O QUE FICA GUARDADO AQUI é o que a troca de tier viva (Ajustes C)
    // precisa para pedir o MESMO mundo com outro número: os catálogos
    // (que o worker leva por cópia e por isso continuam intactos), o
    // modo de cartografia e o tier que de fato foi assado.
    this.catalogos = cartOn ? galactic : null;
    this.cartMode = cartOn ? cartMode : 'off';
    this.tierDoMundo = this.engine.quality;
    const carga = await montarCarga({
      catalogos: this.catalogos,
      tier: this.tierDoMundo,
      aoAvancar: (etapa) => this.rotular(etapa),
    });
    if (this.disposed) {
      descartarCarga(carga);
      return;
    }
    this.dustMapTexture = carga.dustMapTexture;
    this.structureMapTexture = carga.structureMapTexture;
    this.galaxy = carga.galaxy;
    this.vestirGalaxia(this.galaxy);
    // congela as lâminas (estáticas) em texturas — depois do modo
    await this.stage('layers');
    if (this.disposed) return;
    // FATIADO POR LÂMINA (Ajustes C): eram oito render targets de 1024²
    // num bloco só — a maior tarefa longa que sobrou na thread depois
    // que a carga foi para o worker, e o loader congelava nela. O
    // fôlego entre lâminas devolve a thread ao browser; um `dispose()`
    // que caia no meio para o forno em vez de assar numa cena morta.
    if (!(await this.galaxy.bakeDiscLayers(this.engine.renderer, () => this.folego(null)))) {
      return;
    }
    const tauTex = this.galaxy.tauMapTexture;
    this.nebula.setDustMap(carga.dustMapTexture, cartOn ? 1 : 0);
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
      this.nuvensSemente.construir(galactic);
      console.info(
        `[cartografia] APOGEE ${(carga.coberturaDaPoeira * 100).toFixed(1)}% ` +
          'do disco; campo acoplado com ' +
          `${(carga.coberturaDeGas * 100).toFixed(1)}% ` +
          'de suporte material e ' +
          `${(carga.coberturaDeJovens * 100).toFixed(1)}% ` +
          'de suporte em traçadores jovens.'
      );
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
    this.engine.scene.add(this.clarao.group);
    this.engine.scene.add(this.heroes.group);
    this.engine.scene.add(this.galaxy.group);
    // O COBERTOR DO CAMPO (R2 do item 44, "cada camada com seu cobertor"):
    // as três camadas de estrelas vivem TAMBÉM na CAMADA_DO_CAMPO — é por
    // ela que o ClaraoDoCampo (post.ts) as re-desenha para vestir o kernel
    // do filme SÓ nelas. Sol, clarão, planetas, poeira, galáxia e nebulosa
    // ficam na camada 0, sob a pirâmide da lei.
    this.stars.points.layers.enable(CAMADA_DO_CAMPO);
    this.wrappedStars.points.layers.enable(CAMADA_DO_CAMPO);
    this.heroes.group.traverse((o) => o.layers.enable(CAMADA_DO_CAMPO));
    // Os 10 pontos fotométricos (Onda 4, D3). Grupo PRÓPRIO na cena,
    // NUNCA dentro de `sun.group` — de lá herdaria a escala 0,005 do
    // doador e o `return` antecipado quando o disco apaga.
    //
    // O INSTRUMENTO É O DA CASA (M4 da Lei): a MESMA `CALIBRACAO_DA_CASA`
    // que o campo de catálogo recebe acima. A camada era construída com
    // o PRÓPRIO `StarField` no lugar do instrumento — lia a PSF do
    // material do campo —, e o efeito colateral disso era mudo: mover o
    // ponto-zero do catálogo (o gate do M3) teria
    // movido os dez corpos junto, sem uma linha dizendo isso. Passando os
    // dois pelo mesmo objeto, a fotometria planeta↔estrela continua
    // relativa de verdade PORQUE ambos são clientes da lei, não porque um
    // deles copia do outro.
    this.planetas = new Planetas(CALIBRACAO_DA_CASA);
    this.engine.scene.add(this.planetas.points);
    // AS LINHAS DE ÓRBITA (item 77): quarto irmão, pela mesma razão da
    // linha acima. Construtor barato — 30 laços vazios (os nove do
    // retrato e as 21 luas), sem uma pergunta à efeméride: a primeira
    // cônica é escrita no tick, quando o motor existir (`orbitas.ts`, §6).
    this.orbitas = new Orbitas();
    this.engine.scene.add(this.orbitas.group);
    // O PALCO LOCAL (Onda 6, F0): o grupo dos corpos resolvidos entra
    // irmão dos dois acima. Desde a F2a ele tem o primeiro morador: a
    // Terra — construtor barato, sem geometria e sem um byte de textura
    // (a carga é preguiçosa por contrato; as 18 vistas não fazem fetch).
    // O teto de textura congela AQUI (é do aparelho); o TIER, não — ele
    // entra por FUNÇÃO e é lido no instante da carga, que é quando ele
    // decide alguma coisa. É o que faz a troca de tier viva (Ajustes C)
    // alcançar os corpos sem os reconstruir — reconstruir tirava o globo
    // da tela por ~2 s, o véu que a letra C proíbe.
    const corpos = montarCorposDoPalco({
      tier: () => this.engine.quality,
      maxTextureSize: sondarGl().maxTextureSize,
      base: import.meta.env.BASE_URL,
    });
    this.lua = corpos.lua;
    this.rochosos = corpos.rochosos;
    this.gigantes = corpos.gigantes;
    this.noPalco = corpos.noPalco;
    for (const { corpo } of this.noPalco) {
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
      // A chave de programa do three inclui o colorSpace de SAÍDA, que é
      // "tela" quando nenhum render target está amarrado — e no frame real
      // tudo renderiza DENTRO do composer (linear). Compilar sem RT gera a
      // variante errada e o primeiro frame re-linka tudo (medido: 8,7 s).
      const { warm, warmRt, descartar } = montarCenaDeAquecimento({
        comNormal: this.nebula.warmupMaterials,
        semNormal: [
          ...(this.blackHole?.warmupMaterials ?? []),
          ...this.post.warmupMaterials,
        ],
      });
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
        descartar();
      }
      if (this.disposed) return;
    }

    this.setPhase('intro');
    this.engine.start();
    // A CORRIDA DO PAINEL ABERTO DURANTE A CARGA (`?ajustes=1`): um
    // clique em outro tier no meio do init muda o instrumento na hora,
    // mas o mundo já saiu do forno com o tier anterior. Aqui os dois se
    // reconciliam — sem esta linha o app ficaria com "performance" no
    // seletor e a população de cinema na placa, e nenhum clique
    // seguinte consertaria (o tier pedido já é o vivo).
    if (this.engine.quality !== this.tierDoMundo) {
      void this.reassarMundo(this.engine.quality);
    }
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
    // fase nova, tela nova: nada dela foi desenhado ainda (ver
    // `quadrosDaFase` — é o que mantém o deep-link seco)
    this.quadrosDaFase = 0;
    this.escritorDeCamera = ESCRITOR_DE_CAMERA[p];
    // trocar de fase encerra o gesto da roda: meio empurrão guardado não
    // pode virar degrau na próxima entrada no Atlas
    this.gestos?.esquecerRoda();
    this.roam.enabled = this.escritorDeCamera === 'voo';
    this.events.onPhase(p);
    // o HUD da fase nova pode ter mostrador de tempo, e ele monta com o
    // valor de agora em vez de esperar o primeiro passo do relógio
    this.maquinaDoTempo.publicarTempo();
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

  /**
   * Quadros DESENHADOS desde a última troca de fase — a resposta a "o
   * visitante já viu alguma coisa NESTE modo?". Separado do
   * `quadrosEstaveis` de propósito: aquele zera a cada gesto (é sobre
   * estabilidade da cena), e este só zera ao trocar de fase (é sobre o
   * modo já estar na tela). Quem o lê é `rampaDaEscada` — sem um quadro
   * do modo desenhado não existe pose de partida para o olho seguir, e
   * é essa a diferença entre o `?foco=` do boot (seco) e o clique do
   * visitante (com rampa).
   */
  private quadrosDaFase = 0;

  /** algo mudou o que a cena mostra — a contagem de estabilidade recomeça */
  private perturbar() {
    this.quadrosEstaveis = 0;
  }

  /**
   * A CENA ESTÁ ESTÁVEL PARA CAPTURAR? Bandeira somente-leitura que o
   * harness de identidade espera no lugar de contar 700 quadros no
   * escuro. A COLETA dos termos é daqui (só o director conhece os
   * donos); o JULGAMENTO e a doutrina inteira moram em
   * `director/prontidao.ts` (Parte 1, corte 3). Preserva
   * `window.__director.captura.pronto` — o contrato do harness.
   */
  get captura() {
    const andando =
      (this.phase === 'journey' && !this.freezeJourney) ||
      (this.phase === 'free' && this.roam.animando) ||
      // ENTRADA/SAÍDA DO ATLAS: o véu em curso (ou já pedido e ainda
      // não fechado) é movimento na tela como qualquer outro. O rig do
      // Atlas em si não anima — o reposicionamento acontece atrás do
      // véu —, então este é o único termo novo que a fase traz.
      this.veuDoAtlas.emCurso ||
      // A MÁQUINA DO TEMPO (F4): relógio andando é cena mudando, e
      // efeméride em voo é uma mudança JÁ PEDIDA que ainda não chegou.
      // Sem os dois termos, o `?jd=` do gate poderia ser capturado no
      // quadro anterior à escrita do instante — e a captura mediria a
      // corrida, não a imagem.
      this.maquinaDoTempo.aoVivo ||
      this.maquinaDoTempo.sentidoDoTempo !== 0 ||
      this.maquinaDoTempo.faseDaEfemeride === 'buscando' ||
      // A TERRA (F2a) e A LUA (F2b) e OS ROCHOSOS (F3): textura em voo
      // é uma mudança JÁ PEDIDA que ainda não chegou — capturar antes
      // dela mediria a corrida, não a imagem (o mesmo argumento da
      // efeméride acima).
      this.noPalco.some((p) => p.carregando) ||
      // A RAMPA ENTRE DEGRAUS (F2b/D7): o rig anima entre dois
      // enquadramentos — cena mudando por construção até assentar
      this.atlas.animando ||
      // TROCA DE TIER EM VOO (Ajustes C): mudança JÁ PEDIDA que ainda
      // não chegou — o mesmo argumento da efeméride e da textura acima.
      // Sem este termo o gate fotografaria o mundo VELHO com o `?q=`
      // novo no selo, e mediria a corrida em vez da imagem.
      this.trocaPedida !== null;
    // CORPO NO GATE A FRIO (auditoria item 5b): o gate diz que o corpo
    // devia estar na tela e a textura não está quente — capturar agora
    // fotografaria o ponto (ou nada) fingindo a vista do globo. O
    // precedente é `sun.assentado`: prontidão espera o retrato completo.
    const corposAssentados = !this.noPalco.some((p) => p.friaNoGate);
    // O RETRATO ACUSADO (item 5c): efeméride PEDIDA indisponível com os
    // corpos em cena segura a janela da retentativa (o tick conta os
    // quadros e dá o aviso único quando ela esgota — ver o bloco no tick).
    const fonteAssentada = !(
      this.palco.ligado &&
      this.maquinaDoTempo.faseDaEfemeride === 'indisponivel' &&
      this.quadrosTentandoFonte < QUADROS_TENTANDO_FONTE
    );
    return julgarProntidao({
      fase: this.phase,
      andando,
      solAssentado: this.sun.assentado,
      corposAssentados,
      fonteAssentada,
      quadrosEstaveis: this.quadrosEstaveis,
      tier: this.engine.quality,
      tierDoMundo: this.tierDoMundo,
    });
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
    this.nuvensSemente.zerar(cam.position, this.nebula);
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
   *
   * E O LATCH DO DISCO NASCE DO ROTEIRO, não zerado. Ele é HISTÓRIA — o
   * tick só o arma com a câmera FORA —, e o salto não tem história: na
   * coda a câmera está em casa, dentro do disco, e o latch zerado
   * ressuscitava a nebulosa e apagava o cartão da galáxia atrás da
   * Terra. Quem salta para depois de `T_SAIDA_DO_DISCO` chega com o
   * mesmo latch de quem chegou voando.
   */
  seek(t: number) {
    this.journeyT = Math.min(t, this.rig.duration);
    this.leftDisk = this.journeyT >= T_SAIDA_DO_DISCO;
    this.rig.reset(); // a mira suavizada também salta para o instante certo
    this.perturbar();
  }

  get journeyDuration() {
    return this.rig.duration;
  }

  /**
   * O PALCO ESTÁ EM CENA — no Atlas e na reta final do filme (a coda "a
   * volta para casa" resolve Terra e Lua em segundos; REVEAL_T dá ~64 s
   * de folga antes da chegada). Quem lê isto hoje é a EFEMÉRIDE, que
   * precisa estar viva antes de o raspão chegar.
   *
   * A TEXTURA já NÃO lê mais este booleano: o pré-aquecimento virou dose
   * POR CORPO em 22/08 (`preAquecerCorpo`), porque um booleano só para os
   * doze custava 1.146 MiB de texel de corpo ao abrir o Atlas em cinema.
   */
  private get palcoQuente(): boolean {
    return this.phase === 'atlas' || (this.phase === 'journey' && this.journeyT >= REVEAL_T);
  }

  /** instante atual da viagem — para gravar o momento num link */
  get currentTime() {
    return this.journeyT;
  }

  /** pausa/retoma a viagem; retorna o novo estado (true = pausado) */
  togglePause(): boolean {
    if (this.phase !== 'journey') return false;
    this.freezeJourney = !this.freezeJourney;
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

  // ---- a escada do Atlas (corte 9 — director/escada.ts) ------------
  // O assunto inteiro — clique, busca, casa viva, degraus, religador do
  // relógio e reaplicação pós-efeméride — mora no módulo `Escada`; aqui
  // ficam as delegações de 1 linha que o App, o HUD, os gates
  // (`window.__director`) e as fiações do construtor já chamavam, com
  // as MESMAS assinaturas. O tick segue chamando `recomporAlvo()` no
  // mesmo ponto, e `entrarNoAtlas` segue chamando `focarNoSistema()`.

  focarNoSistema() {
    this.escada.focarNoSistema();
  }

  /** o destino do clique num rótulo, escolhido pelo NOME (busca, F3) */
  visitarEstrela(estrela: { n: string; x: number; y: number; z: number }) {
    this.escada.visitarEstrela(estrela);
  }

  /** as 1.726 nomeadas — o índice da busca monta sobre esta lista */
  get nomeadas(): readonly NamedStar[] {
    return this.escada.nomeadas;
  }

  /** os dez + luas + anões, para o índice da busca (F5) */
  get corpos(): readonly CorpoBuscavel[] {
    return this.escada.corpos;
  }

  focarNoCorpo(id: string, ver: VerDaEscada = 'orbita') {
    this.escada.focarNoCorpo(id, ver);
  }

  aproximarDoCorpo() {
    this.escada.aproximarDoCorpo();
  }

  focarNaLua(id: string = 'moon') {
    this.escada.focarNaLua(id);
  }

  subirDegrau(): boolean {
    return this.escada.subirDegrau();
  }

  /**
   * O `ver` vivo. Desde 22/08 (item 73) ele é LIDO e não ESCRITO: a
   * porta `?ver=` continua abrindo todo link antigo, e quem espelha a
   * vista é `?d=` — duas portas para a mesma grandeza seriam duas
   * verdades (AGENTS §4), e `?ver=` não sabe dizer "2,4 raios". O
   * getter fica porque a escada o publica e a bancada o lê.
   */
  get verDaEscada(): VerDaEscada {
    return this.escada.verDaEscada;
  }

  /**
   * A DISTÂNCIA AO ALVO EM RAIOS DELE — o que a porta `?d=` espelha.
   * `null` quando o visitante não pinou nada: aí a URL cala e o link
   * reproduz o ENQUADRAMENTO, que é a conta de sempre, bit a bit.
   */
  get distanciaEmRaios(): number | null {
    return this.atlas.distanciaEstaPinada ? this.atlas.distanciaEmRaios : null;
  }

  /** a porta `?d=` do boot — ver `Escada.pinarEmRaios`. */
  pinarEmRaios(raios: number | null) {
    this.escada.pinarEmRaios(raios);
    this.perturbar();
  }

  get escadaViva(): EstadoDaEscada {
    return this.escada.escadaViva;
  }

  /** o religador do relógio — o tick o chama quando o instante muda */
  private recomporAlvo() {
    this.escada.recomporAlvo();
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

  /**
   * O ZOOM DA RODA AINDA TEM EMBALO? Porta de LEITURA, publicada junto
   * com `captura` em `window.__director` pelo mesmo motivo dela: quem
   * observa o app de fora pergunta "CHEGOU?" e não "passaram N ms?"
   * (§7 — se o juiz não cobre, cria-se a vista que cobre). Não move um
   * pixel: só conta o que o gesto já sabia.
   *
   * `undefined` SEM PUNHO DE GESTOS, e não `false`: "não sei" não é "o
   * gesto acabou". Um `?? false` aqui desligaria sozinho o juiz que
   * espera por `=== false` no dia em que o punho sumisse.
   */
  get zoomEmbalando(): boolean | undefined {
    return this.gestos?.embalandoZoom;
  }

  /**
   * A FICHA ABRIU (ou fechou). O React é quem sabe, e a posição da
   * câmera só sobe para lá enquanto alguém a lê — a doutrina inteira
   * mora em `emitCamera`, em `director/rotulos.ts`.
   */
  lerCamera(quer: boolean) {
    this.rotulos.lerCamera(quer);
  }

  /**
   * O PASSO MÁXIMO QUE O INTEGRADOR ANDA num quadro, em segundos
   * (`GRAMPO_DO_PASSO_S`, em `core/engine.ts`). Mesma porta de leitura
   * das duas acima, e pelo mesmo motivo: o juiz do filme mede "o relógio
   * andou?" em QUADROS do app, e um quadro de filme vale este número.
   * Redigitá-lo no gate faria a régua e o integrador discordarem no dia
   * em que um dos dois mudasse.
   */
  get grampoDoPasso(): number {
    return GRAMPO_DO_PASSO_S;
  }

  // ---- portal do Atlas ---------------------------------------------

  /**
   * ENTRAR NO ATLAS. Só o pause-look e o deep-link `?atlas=1` chamam
   * isto. Não é travessia física: o véu fecha, a câmera é reposta pelo
   * AtlasRig e o véu abre.
   *
   * `momento` semeia a volta a partir da URL (`?atlas=1&t=…`): sem ele
   * e sem viagem em curso, o portal guarda NADA — e "Partir" devolve a
   * tela de título, que é o candidato honesto (D3). O latch do disco
   * dessa semente sai do roteiro pela MESMA lei do `seek`: um link para
   * a coda tem de partir com o disco já para trás.
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
            leftDisk: opcoes.momento >= T_SAIDA_DO_DISCO,
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
    this.maquinaDoTempo.garantirEfemerides();
    this.veuDoAtlas.atravessar(
      opcoes.instantaneo === true || this.reducedMotion || this.shotMode,
      () => {
      // O PORTAL LEVA A CÂMERA (item 61, §2 — 23/08). Até aqui a entrada
      // chamava `focarNoSistema()` e jogava a pose fora: t=12, t=90 e
      // t=160 saíam todos na MESMA vista, a 224 UA de casa. Agora ela
      // POUSA — posição exata, alvo derivado em três degraus (o corpo no
      // eixo de vista, senão o Sol, senão o degrau `céu`) — e o fov corta
      // para os 35° do Atlas ATRÁS DO VÉU, que é o que o véu existe para
      // cobrir.
      //
      // Sem pose de filme atrás (o `?atlas=1` puro e o botão da abertura)
      // não há o que pousar, e a vista de abertura continua sendo a
      // resposta: é o mesmo caminho de sempre, bit a bit.
      //
      // Focar ANTES da fase virar, nos dois ramos: `rampaDaEscada()`
      // ainda vê a fase velha e a reposição é seca — a entrada acontece
      // atrás do véu, nunca por rampa (D3: não é travessia física).
      // e o pouso é de quem vem do FILME COM CÂMERA VIVA (`daViagem`),
      // não de quem tem `retomada`: o deep-link `?atlas=1&t=100` também
      // guarda uma volta, mas a câmera dele é a do boot e não a do
      // instante — pousar ali fotografaria o lugar onde a intro parou.
      if (daViagem) {
        this.escada.pousarDoFilme(this.engine.camera.position.clone());
      } else {
        this.focarNoSistema();
      }
      // A TRAVA DO DISCO ATRAVESSA O PORTAL NOS DOIS SENTIDOS (item 61,
      // §6). O `partirDoAtlas` já a devolvia; a ENTRADA passa a aplicá-la.
      // Vem DEPOIS do foco de propósito: `focarNoSistema` é o gesto "me
      // leve para casa" e por isso DESARMA a trava — mas ali ele não é
      // gesto nenhum, é só como a entrada põe a câmera. A história é do
      // visitante, não da colocação.
      if (this.retomada) this.leftDisk = this.retomada.leftDisk;
      this.setPhase('atlas');
      // O RELÓGIO DO CÉU ABRE ANDANDO (item 61, §3 — 23/08). O Atlas é o
      // relógio do VISITANTE, e nascia parado: o mostrador dizia uma data
      // e ficava nela para sempre, como se o céu fosse um retrato. É o
      // que o NASA Eyes faz, e é o que faz o app parecer ligado ao mundo.
      //
      // O CUSTO EM QUADRO É ZERO NA PRÁTICA: `andarORelogio` relê o
      // calendário a 1 Hz (`PASSO_DO_AO_VIVO_S`) e `recomporAlvo` roda uma
      // vez por INSTANTE de céu, não por quadro.
      //
      // E A HONESTIDADE QUE ISTO PEDE, escrita aqui porque é aqui que a
      // decisão mora: 1× NÃO MOVE PIXEL, e a vista de abertura ter
      // encolhido 24× (item 61: 224 UA → ~9,1 UA, a borda do sistema
      // interno) não muda a conclusão, só o quanto ela sobra. Ali 1 UA
      // vale ~156 px em vez de ~6,4, e a Terra anda 2,0e-7 UA/s: são
      // 3,1e-5 px/s, um pixel a cada nove horas. O que ganha vida é o
      // MOSTRADOR (a data corre) e o Sol de perto, onde o relógio rápido
      // já mexia. Quem quiser o quadro cheio muda a VISTA, não o relógio.
      //
      // AS TRÊS PORTAS QUE O CALAM são as três que pedem uma cena
      // REPRODUZÍVEL: `?jd=` (o operador escolheu o instante), `?shot=`
      // (é foto) e `?t=` (veio de um instante do filme). Consequência
      // declarada: uma captura SEM nenhuma das três nunca vai assentar
      // pelo sinal — e está certo, porque a cena de fato não assenta.
      // Quem fotografa o Atlas pina `&jd=`.
      if (
        !this.maquinaDoTempo.aoVivo &&
        !this.debug.has('jd') &&
        !this.debug.has('shot') &&
        !this.debug.has('t')
      ) {
        this.maquinaDoTempo.alternarAoVivo();
      }
    });
  }

  /**
   * PARTIR. Devolve os CINCO do portal de uma vez — o instante, os dois
   * ângulos do olhar, o latch do disco e a pausa (um campo só desde
   * 21/08: o `freezeJourney` escreve o `rig.paused`). O `reset()` antes do
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
    this.maquinaDoTempo.sentidoDoTempo = 0;
    this.maquinaDoTempo.aoVivo = false;
    this.maquinaDoTempo.naParede = false;
    this.maquinaDoTempo.publicarTempo();
    this.veuDoAtlas.atravessar(this.reducedMotion || this.shotMode, () => {
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
      this.setPhase('journey');
    });
  }

  /** o instante guardado pelo portal — o link copiado de dentro o carrega */
  get momentoGuardado(): number | null {
    return this.retomada?.journeyT ?? null;
  }

  // ---- a máquina do tempo (F4/D2) ----------------------------------

  /** o mostrador, somente leitura — o corpo inteiro mora em
   *  `director/maquinaDoTempo.ts` (Parte 1, corte 4); o contrato
   *  `window.__director.tempo` do atlas-smoke segue daqui */
  get tempo(): EstadoDoTempo {
    return this.maquinaDoTempo.tempo;
  }

  andarNoTempo(sentido: SentidoDoTempo) {
    this.maquinaDoTempo.andarNoTempo(sentido);
  }

  ciclarDegrau(): number {
    return this.maquinaDoTempo.ciclarDegrau();
  }

  alternarAoVivo() {
    this.maquinaDoTempo.alternarAoVivo();
  }

  voltarAEpoca() {
    this.maquinaDoTempo.voltarAEpoca();
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
   * A ESCOLHA DO SELETOR — os três tiers e o `auto` (Ajustes D do
   * NORTE). Porta ÚNICA: quem troca de qualidade nesta casa passa por
   * aqui, venha do painel, da barra, da URL ou do console.
   *
   * TROCA DE TIER — a metade viva na hora, a metade assada em segundo
   * plano (Ajustes C, a régua do dono: nada recarrega).
   *
   * O que muda AGORA é o instrumento: pixel ratio, passos do raymarch,
   * grão, passos do buraco negro. O que muda DEPOIS é a alocação — a
   * população da galáxia e o tier do Sol —, e ela nasce num mundo
   * paralelo enquanto o atual continua desenhando. Até o swap, a tela
   * segue mostrando o mundo velho com o instrumento novo: nenhum véu,
   * nenhum quadro preto, nenhum "carregando".
   *
   * `auto` NÃO É TIER: é a política de aceitar a sugestão da medição.
   * Escolhê-lo aplica a sugestão que já houver (e se não houver
   * nenhuma, espera a próxima janela de medida) — pela MESMA via viva
   * de qualquer outra troca. Um tier explícito devolve a política ao
   * manual: escolher Cinema é dizer *cinema*, não *cinema por ora*.
   */
  setQuality(escolha: EscolhaDeQualidade) {
    this.politicaDeQualidade = escolha === 'auto' ? 'auto' : 'manual';
    const q = escolha === 'auto' ? this.engine.medicao?.sugestao : escolha;
    if (q !== undefined && q !== this.engine.quality) {
      this.engine.applyQuality(q);
      this.nebula.setSteps(this.engine.preset.nebulaSteps);
      this.perturbar();
      void this.reassarMundo(q);
    } else this.publicarQualidade();
  }

  /**
   * A MEDIÇÃO CHEGOU. Em manual ela só ATRAVESSA — vira a nota do
   * painel e para aí, que é a fronteira política da letra D: nada muda
   * de tier sem o visitante ter escolhido Auto. Em Auto ela vira troca,
   * e pela mesma porta de sempre, ou seja, com o mundo assado por trás
   * e sem véu.
   */
  private aoMedirOQuadro(m: MedicaoDoQuadro) {
    if (this.politicaDeQualidade === 'auto' && m.sugestao !== this.engine.quality) {
      this.setQuality('auto');
      return;
    }
    this.publicarQualidade();
  }

  /** o estado inteiro da qualidade, para o HUD desenhar sem adivinhar */
  private publicarQualidade() {
    this.events.onQuality({
      escolha: this.politicaDeQualidade === 'auto' ? 'auto' : this.engine.quality,
      tier: this.engine.quality,
      // O MODO FOTO NÃO TEM INSTRUMENTO (item 66). A nota do painel
      // estreia em "medindo o quadro." e troca pelo NÚMERO na primeira
      // janela do medidor — 50 quadros, porque o `dt` que a alimenta vem
      // grampeado em 0,05 s —, e essa janela fecha DEPOIS dos 10 quadros
      // estáveis da prontidão. Medido em 22/08 na mesma URL: md5
      // `91a7de848027` no `pronto` (quadro 21) e `d58cb662df01` no
      // quadro 60, sem ninguém tocar na cena — duas telas para uma URL
      // só, e o `atlas-smoke` reprovando 1 em ~100 conforme o quadro em
      // que a foto caía.
      //
      // ESPERAR o número seria pior: ele é medida VIVA, muda de máquina
      // para máquina e de boot para boot, e toda captura de HUD passaria
      // a carregar um dígito que ninguém controla. Então `?shot=`
      // congela o instrumento, exatamente como já congela o relógio
      // visual (`const time = this.shotMode ? 0 : rawTime`). A medição
      // segue rodando e o Auto segue ouvindo (`aoMedirOQuadro`): o que
      // para é o mostrador, não a régua.
      medicao: this.shotMode ? null : this.engine.medicao,
    });
  }

  /**
   * O QUE UMA GALÁXIA RECÉM-NASCIDA VESTE antes de assar: as camadas que
   * já estavam desligadas e o modo de cartografia do boot. Num lugar só
   * porque são DOIS os partos — o do init e o do mundo novo da troca de
   * tier —, e um mundo novo que nascesse sem isto acenderia de volta o
   * que o visitante tinha desligado, ou trocaria de mapa junto com o
   * tier. `this.hide` é lido AGORA, não no boot: o que vale é o que está
   * desligado no momento em que este mundo nasce.
   */
  private vestirGalaxia(g: Galaxy) {
    for (const f of this.hide) g.setLayerHidden(f, true);
    g.setCartography(this.debug.has('discoff') ? 'off' : this.cartMode);
  }

  /**
   * O mundo que está no forno ainda interessa? `null` é o do boot (só a
   * morte do Director o cancela); um número é a GERAÇÃO do pedido da
   * troca viva, e ele deixa de valer no instante em que qualquer outro
   * pedido nasce — inclusive o pedido de VOLTAR ao tier que já está na
   * tela, que não assa mundo nenhum e existe só para cancelar este.
   *
   * A régua era o TIER pedido, e isso tinha um buraco: Alta → Performance
   * → Alta devolvia `trocaPedida = 'performance'` intacto (o segundo
   * clique saía antes de escrevê-lo, porque "o tier já é alta"), o forno
   * de Performance se dava por válido e pousava sobre um seletor que
   * dizia Alta. Geração não tem esse buraco: ela é ÚNICA por pedido, e
   * um pedido só pousa se nenhum outro tiver nascido depois dele.
   */
  private mundoAindaVale(geracao: number | null) {
    return !this.disposed && (geracao === null || geracao === this.geracaoDaTroca);
  }

  /**
   * O fôlego entre duas fatias de trabalho pesado, com a resposta a
   * "continuo?" junto. `setTimeout(0)` e não rAF pelo mesmo motivo do
   * `stage()`: em aba de fundo o rAF é estrangulado e o forno nunca
   * terminaria.
   */
  private folego(geracao: number | null): Promise<boolean> {
    return new Promise((resolver) =>
      setTimeout(() => resolver(this.mundoAindaVale(geracao)), 0)
    );
  }

  /**
   * O MUNDO NOVO, ASSADO EM SEGUNDO PLANO, TROCADO NUM QUADRO SÓ.
   *
   * Isto é o double-buffer da letra C. A cadeia pesada (os dois mapas e
   * a população — 4,02 M partículas em cinema, 1,1 M em performance) vai
   * inteira para o worker que a letra B abriu; as lâminas do disco assam
   * na GPU FORA da cena, fatiadas uma a uma; o Sol novo nasce por
   * último, porque o `prime` dele é um bloco que não se fatia (o miolo
   * de `stellarBody.ts` é território da Lei da Estrela e não se toca
   * aqui). Só então os ponteiros trocam — e essa troca é síncrona de
   * ponta a ponta, sem um `await` no meio: nenhum quadro pode ser
   * desenhado com meio mundo velho e meio mundo novo.
   *
   * CANCELAMENTO: quem clica em três tiers seguidos gera três pedidos, e
   * só o ÚLTIMO vira mundo. Os outros descartam o que já assaram
   * (`descartarCarga`) em vez de virarem tela — é isso que impede a
   * troca de tier de ser uma máquina de vazar 122,7 MiB por clique. Quem
   * decide isso é a GERAÇÃO do pedido (`geracaoDaTroca`) e não o tier
   * pedido: o clique que VOLTA ao tier vivo também é um pedido, e pela
   * régua do tier ele passava batido — cancelando nada e deixando o
   * mundo do meio do caminho pousar sobre um seletor que já dizia outra
   * coisa.
   */
  private async reassarMundo(q: QualityLevel) {
    // DURANTE O INIT NÃO HÁ MUNDO A TROCAR, e a guarda é dupla de
    // propósito. O que o init assa já é o tier vivo, e a reconciliação
    // no fim dele cobre a corrida do painel aberto na carga
    // (`?ajustes=1`); sem esta linha, um clique no meio do init poria
    // DOIS mundos no forno e o segundo poderia pousar antes de o
    // primeiro terminar — sobre um `wrappedStars` que ainda não existe.
    if (this.disposed || this.phase === 'loading' || this.tierDoMundo === null) return;
    // O MESMO PEDIDO DUAS VEZES não abre um segundo forno — e não pode
    // tomar geração nova, senão o forno em curso se cancelaria sozinho.
    if (this.trocaPedida === q) return;
    // DAQUI PARA BAIXO É PEDIDO NOVO, e todo pedido novo invalida o
    // anterior: quem estiver no forno perde a vez neste instante.
    const geracao = ++this.geracaoDaTroca;
    // VOLTAR AO TIER QUE JÁ ESTÁ NA TELA É CANCELAR, e não é no-op: não
    // há mundo a assar, mas há um mundo em forno que precisa saber que
    // ninguém o espera mais. A geração acima já o invalidou; aqui só se
    // apaga o pedido em voo, para a captura parar de esperar por ele.
    if (q === this.tierDoMundo) {
      this.trocaPedida = null;
      return;
    }
    this.trocaPedida = q;
    const carga = await montarCarga({
      catalogos: this.catalogos,
      tier: q,
      // o loader não aparece: a troca é viva, e o rótulo de etapa é do
      // carregamento. O visitante vê o mundo velho até o mundo novo
      // estar pronto — que é a promessa inteira da letra C.
      aoAvancar: () => {},
    });
    if (!this.mundoAindaVale(geracao)) {
      descartarCarga(carga);
      return;
    }
    this.vestirGalaxia(carga.galaxy);
    const assou = await carga.galaxy.bakeDiscLayers(
      this.engine.renderer,
      () => this.folego(geracao)
    );
    if (!assou || !this.mundoAindaVale(geracao)) {
      descartarCarga(carga);
      return;
    }
    const solNovo = new StellarBody(
      SOL_PARAMS,
      this.engine.renderer,
      this.engine.camera,
      q,
      // o Sol do tier novo nasce NA DATA VIVA — é o que faz a troca ao
      // vivo sair igual ao boot direto naquele tier (Ajustes C)
      faseDoCiclo(this.maquinaDoTempo.jdVivo)
    );
    // ---- SWAP ATÔMICO — daqui até o fim nada cede a thread ----------
    const velho = {
      galaxy: this.galaxy,
      poeira: this.dustMapTexture,
      estrutura: this.structureMapTexture,
      sol: this.sun,
    };
    this.engine.scene.remove(velho.galaxy.group);
    this.galaxy = carga.galaxy;
    this.engine.scene.add(this.galaxy.group);
    this.dustMapTexture = carga.dustMapTexture;
    this.structureMapTexture = carga.structureMapTexture;
    // os dois consumidores dos mapas que SOBREVIVEM à troca (a
    // população deles não depende de tier): sem estes dois binds ficariam
    // lendo a textura que o teardown descarta duas linhas abaixo
    this.nebula.setDustMap(carga.dustMapTexture, this.catalogos ? 1 : 0);
    this.wrappedStars.setDustMap(carga.dustMapTexture);
    if (this.starForges && this.debug.has('forgetau')) {
      const tauTex = this.galaxy.tauMapTexture;
      if (tauTex) this.starForges.setTauMap(tauTex);
    }
    this.engine.scene.remove(velho.sol.group);
    this.sun = solNovo;
    this.engine.scene.add(this.sun.group);
    // O PALCO LOCAL NÃO É REFEITO AQUI, e isso é decisão medida: os doze
    // corpos leem o tier na HORA de pedir textura (`montarCorposDoPalco`
    // recebe uma função), então quem carregar daqui em diante já obedece
    // ao número novo. Reconstruí-los para alcançar os que JÁ estão
    // carregados foi tentado e medido em 20/08: a Terra em close-up some
    // por ~2 s enquanto a textura no tier novo vem pela rede — o globo
    // vira ponto e volta. É exatamente o véu que a letra C proíbe, e o
    // preço de não fazê-lo é modesto: textura de corpo é alocação
    // PREGUIÇOSA, do que se visitou, não peso residente do mundo.
    this.tierDoMundo = q;
    this.trocaPedida = null;
    // ---- fim do swap ------------------------------------------------
    // TEARDOWN DO MUNDO VELHO, passo a passo blindado: um dispose que
    // estoure não pode levar os outros junto (a mesma lei do `teardown`
    // da morte do Director) — a diferença é que aqui a sessão CONTINUA,
    // e um passo perdido no meio vazaria pelo resto da visita.
    const passo = (rotulo: string, fn: () => void) =>
      this.passoBlindado('troca de tier', rotulo, fn);
    passo('galaxy', () => velho.galaxy.dispose());
    passo('dustMap', () => velho.poeira?.dispose());
    passo('structureMap', () => velho.estrutura?.dispose());
    passo('sun', () => velho.sol.dispose());
    // o mundo novo tem OUTRO mapa de poeira: a LUT do raymarch foi
    // medida contra o que acabou de ser descartado
    this.nebula.invalidarLut();
    this.perturbar();
  }

  /**
   * Um passo de descarte que NÃO leva os outros junto. Nasceu no
   * `teardown` (uma exceção no meio deixava o Engine vivo, com RAF numa
   * cena zumbi) e serve agora aos dois desmontes da casa — o da morte do
   * Director e o do mundo velho na troca de tier, que é o mais exigente
   * dos dois: ali a sessão CONTINUA, e um passo perdido vaza pelo resto
   * da visita em vez de morrer com a página.
   */
  private passoBlindado(contexto: string, rotulo: string, fn: () => void) {
    try {
      fn();
    } catch (error) {
      console.warn(`[${contexto}] ${rotulo} falhou; seguindo.`, error);
    }
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
   * A EFEMÉRIDE VIVA, somente leitura — o que a ficha do objeto (item 74)
   * consulta a cada `onTempo` para escrever distância, velocidade e
   * geometria no céu do corpo em foco.
   *
   * `null` até ela chegar pela rede, e a ficha nasce útil assim mesmo: raio,
   * gravidade, massa e escape não dependem dela. Getter e não cópia no
   * React pelo mesmo motivo do `selo` logo abaixo — um segundo dono do
   * motor seria a segunda fonte de verdade sobre onde os corpos estão.
   */
  get efemerideViva(): MotorEfemerides | null {
    return this.maquinaDoTempo.efemeride;
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
      luz: this.politicaDeLuz,
      evLuzDoFoco: this.evLuzDoFoco(),
      // a DOSE de ocupação do Sol (item 5): < 1 só no arranque do filme,
      // e é aí que o selo tem o que declarar
      doseDoSol: this.phase === 'journey' ? doseDaDramaturgia(this.journeyT) : 1,
      // (stopsDaPupila saiu do estado no M2: a pupila morreu inteira, e
      // a compressão fixa não é desvio por quadro — é a lei, declarada
      // nas linhas de luz do próprio selo.)
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
    if (!this.escada.focoCorpoId || !this.planetas) return null;
    // as luas (F2b/F3): o dUA é o da CADEIA heliocêntrica dela,
    // publicado pelo próprio mesh (NaN sem efeméride ⇒ o rótulo fica
    // sem número)
    if (LUAS_DO_SISTEMA.some((l) => l.id === this.escada.focoCorpoId)) {
      const rUA =
        this.escada.focoCorpoId === 'moon'
          ? this.lua?.corpo.estadoVivo.rUA
          : this.rochosos.find((r) => r.corpo.id === this.escada.focoCorpoId)?.corpo
              .estadoVivo.rUA;
      return rUA !== undefined && Number.isFinite(rUA)
        ? deslocamentoEVAssistida(rUA)
        : null;
    }
    // anões/asteroides não têm ponto na camada: o dUA é o do mesh
    // (Kepler/retrato). Sem este ramo o selo dizia ASSISTIDO e omitia
    // os passos — justamente nos corpos de maior ΔEV.
    if (HELIO_SEM_PONTO.some((a) => a.id === this.escada.focoCorpoId)) {
      const rUA = this.rochosos.find((r) => r.corpo.id === this.escada.focoCorpoId)
        ?.corpo.estadoVivo.rUA;
      return rUA !== undefined && Number.isFinite(rUA)
        ? deslocamentoEVAssistida(rUA)
        : null;
    }
    const i = CORPOS_DO_SISTEMA.findIndex((c) => c.id === this.escada.focoCorpoId);
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

    // VÉU DO ATLAS, antes de tudo (o passo e a razão moram em
    // director/veu.ts — se ele fechar neste quadro, a fase vira AQUI)
    this.veuDoAtlas.tique(dt);

    // O RELÓGIO DO CÉU, antes de tudo que lê posição: se o instante
    // mudar neste quadro, a camada de planetas já o vê escrito. Parado
    // (o estado de nascimento, e o do filme inteiro) o método devolve
    // na primeira linha.
    this.maquinaDoTempo.andarORelogio(dt);

    // ...e o ENQUADRAMENTO DO ATLAS segue o corpo no instante novo
    // (Onda 7). Aqui, e não dentro do ramo da fase, porque tem de vir
    // ANTES de qualquer leitura de posição — inclusive a da câmera, que
    // é escrita logo abaixo. `jdDoEnquadre` é o limite de frequência:
    // uma recomposição por instante de céu, zero com o relógio parado.
    if (this.phase === 'atlas') {
      const jdAgora = this.maquinaDoTempo.jdVivo;
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
      // A INÉRCIA DA RODA gasta o embalo ANTES de a câmera ser escrita
      // (item 73): escrever depois deixaria o quadro com a distância do
      // anterior, e a 60 Hz isso é um quadro de atraso em todo estalo.
      // `pinarDistancia` recusa sozinho enquanto a rampa entre degraus
      // anda — a rampa termina EXATA na pose pura, e duas mãos na mesma
      // distância seriam duas leis.
      this.gestos?.avancarZoom(dt);
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
    // INVARIÂNCIA DE RESOLUÇÃO: pr² re-escala o pico para a régua de
    // referência (DPR 1) nos gatilhos do campo e do clarão — sem isso o
    // céu desarma no modo cinema (pista do dono, 16→17/08)
    const prAtual = this.engine.renderer.getPixelRatio();
    const pr2Atual = prAtual * prAtual;
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

    // A CODA RESOLVE A LUA, e a Lua não tem retrato congelado: a fonte
    // de efemérides precisa estar viva antes de o raspão chegar. Mesmo
    // relógio do pré-aquecimento de textura (palcoQuente, t≥REVEAL_T:
    // ~64 s de folga); `garantirEfemerides` é idempotente e abortável.
    if (this.palcoQuente) this.maquinaDoTempo.garantirEfemerides();

    // O FILME CORRE NA DATA DELE, do primeiro segundo ao último — o
    // calendário é do roteiro (`jdDoFilme`: o instante do retrato até
    // REVEAL_T, as 16:00 UTC do mesmo dia na coda, para o pouso sobre as
    // Américas). Até 21/08 esta linha só corria a partir de REVEAL_T e
    // vivia dentro do `palcoQuente`, e o buraco era o portal: quem
    // viajasse para 2035 no Atlas e partisse assistia aos atos com os
    // planetas de 2035 e via o relógio saltar sozinho para 2026 na coda,
    // sem nada dizendo. Um relógio só — e dentro do filme ele é do
    // filme. A porta ?jd= do operador mantém a precedência; sem rede a
    // fonte não chega e a coda degrada como a Lua: honesta e visível.
    if (this.phase === 'journey' && !this.debug.has('jd')) {
      this.maquinaDoTempo.jdPedido = jdDoFilme(this.journeyT);
    }

    // ------------------------------------------------------------
    // O SOL SOB A LEI DO PALCO (F2 da onda do Sol real) — o gate em
    // pixels e o registro no palco moram no módulo (corte 8;
    // director/solNoQuadro.ts, com a aritmética e a doutrina escritas).
    //
    // AQUI e não depois do `sun.update` (onde a F1 o deixou): o near lê
    // o palco umas 100 linhas abaixo, então registrar lá embaixo dava ao
    // clip a superfície do quadro ANTERIOR. É o mesmo lugar em que a
    // Terra e a Lua se registram, pela mesma razão escrita.
    this.solNoQuadro.armarGate({ dHome, hPx, fovDeg: cam.fov });

    // OS DOZE CORPOS DO PALCO num laço só (item 63, 22/08): o passo
    // mora em `director/palco.ts`, junto do contrato dos quatro traços
    // que distinguem um corpo do outro. Roda ANTES de o near ler o
    // palco — o corpo que entra em quadro NESTE tick já governa o clip
    // NESTE tick.
    if (this.stars) {
      const q = this.quadroDoPalco;
      q.jdTdb = this.maquinaDoTempo.jdVivo;
      q.fonte = this.maquinaDoTempo.efemeride;
      q.camPosPc = cam.position;
      q.screenHPx = hPx;
      q.fovDeg = cam.fov;
      q.ligado = this.palco.ligado;
      q.politica = this.politicaDeLuz;
      q.dtS = dt;
      q.psf = CALIBRACAO_DA_CASA;
      q.salto = this.saltoDeCamera;
      passoDoPalco(this.noPalco, q, {
        palco: this.palco,
        planetas: this.planetas,
        rotulos: this.rotulos,
        efemeride: this.maquinaDoTempo.efemeride,
        noFilme: this.phase === 'journey',
        preAquecer: this.preAquecerCorpo,
        perturbar: this.perturbarDoPalco,
      });
    }
    // O RETRATO NUNCA FINGE EFEMÉRIDE (item 5c da auditoria): com os
    // corpos em cena e a fonte PEDIDA indisponível, o tick tenta a fonte
    // uma SEGUNDA vez (a permitida por `garantirEfemerides`: "quem pediu
    // de novo") e o `captura` segura a prontidão pela janela de
    // QUADROS_TENTANDO_FONTE; se ela ainda não veio, o aviso único ACUSA
    // — quem ler o quadro dali em diante sabe que os corpos estão no
    // retrato congelado, nunca numa efeméride que não chegou.
    if (this.palco.ligado && this.maquinaDoTempo.faseDaEfemeride === 'indisponivel') {
      if (!this.retentouFonte) {
        this.retentouFonte = true;
        this.maquinaDoTempo.garantirEfemerides();
      } else if (this.quadrosTentandoFonte < QUADROS_TENTANDO_FONTE) {
        this.quadrosTentandoFonte++;
        if (this.quadrosTentandoFonte >= QUADROS_TENTANDO_FONTE && !this.acusouRetrato) {
          this.acusouRetrato = true;
          console.warn(
            '[captura] efeméride pedida indisponível: os corpos seguem no RETRATO congelado'
          );
        }
      }
    } else if (this.maquinaDoTempo.faseDaEfemeride === 'viva') {
      this.quadrosTentandoFonte = 0;
    }
    this.saltoDeCamera = false;
    const superficie = this.palco.superficieMaisProxima(cam.position);
    this.engine.updateClip(Math.min(dHome, dGC), superficie.dSuperficiePc, superficie.raioPc);

    // A Via Láctea não é um plano: os fades de AMBIENTE respondem à
    // posição da câmera no DISCO (R, z galactocêntricos), não à
    // distância do Sol — o volume local existe em qualquer ponto da
    // galáxia. Só camadas fisicamente solares continuam com dHome. A
    // conta mora em `baseGalactica` porque o roteiro também a lê.
    const inDisk = dentroDoDisco(cam.position);
    // A TRAVA DO DISCO É LEI DOS DOIS MODOS (item 61, §6 — 23/08). Até
    // aqui ela era só da viagem: `if (fase === 'journey') arma; else
    // leftDisk = false`. O `else` era o defeito — ele apagava HISTÓRIA
    // por troca de FASE, e o sintoma é medível: entrar no Atlas na coda
    // (t=188, câmera em casa, disco já para trás) devolvia `env = 1`
    // onde o filme mostrava `env = 0`. Nebulosa acendendo e cartão da
    // galáxia apagando no MESMO lugar, só porque o modo mudou — é
    // literalmente "os gráficos mudam de um modo para o outro".
    //
    // Agora a trava ARMA POR POSIÇÃO em toda fase que ESCREVE CÂMERA, e
    // quem responde quais são é o mapa (`ESCRITOR_DE_CAMERA`), nunca uma
    // cadeia de `if` — o idioma da casa desde a Onda 5. Em 'end' e
    // 'loading' ninguém escreve câmera e ninguém arma: a trava fica como
    // a última fase que escreveu a deixou, que é a verdade (a câmera
    // também ficou).
    //
    // E ela não é apagada por troca de fase nenhuma. Só DOIS gestos a
    // desarmam, e os dois PEDEM A CASA: `escada.focarNoSistema` (o Esc,
    // o botão "sistema" e a linha ESCALA do selo) e `play()`. Assim
    // `env` é função da POSIÇÃO mais uma HISTÓRIA que os dois modos
    // compartilham, e o par nebulosa/galáxia deixa de saber que existe
    // modo.
    if (ESCRITOR_DE_CAMERA[this.phase] !== 'nenhum' && inDisk <= LIMIAR_FORA_DO_DISCO) {
      this.leftDisk = true;
    }
    const env = this.leftDisk ? 0 : inDisk;

    // camadas solares (HYG, poeira próxima, hero stars): dHome
    const localFade = 1 - THREE.MathUtils.smoothstep(dHome, 1100, 2300);
    // gás volumétrico + faixa interna: qualquer ponto dentro do disco
    const nebulaFade = env;
    const galaxyFade = 1 - env;
    const localBandFade = env * 0.76;
    const markerFade = THREE.MathUtils.smoothstep(dHome, 1700, 3300);

    this.rotulos.tique(dt);
    // nuvens-semente do raymarch + cavidade do observador itinerante
    this.nuvensSemente.tique(dt, nebulaFade, cam.position, this.nebula);
    // a MESMA cavidade em todos os consumidores da densidade: raymarch,
    // extinção das estrelas e brilho da poeira próxima
    const cavityGate = THREE.MathUtils.smoothstep(dHome, 600, 1300);
    this.nebula.setCavity(cam.position, cavityGate);
    this.stars?.setCavity(cam.position, cavityGate);
    this.dust.setCavity(cam.position, cavityGate);

    if (this.debug.has('dbgfade')) {
      // quem ocupa o orçamento do clarão agora (M2): o único jeito de
      // ver a histerese da seleção viva sem abrir um profiler
      const claroes = this.clarao
        ?.ocupacao()
        .map((o) => `${o.indice}:${o.ganho.toFixed(2)}`)
        .join(' ');
      console.log(
        `[dbgfade] dHome=${dHome.toFixed(0)} gal=${galaxyFade.toFixed(2)} ` +
          `loc=${localFade.toFixed(2)} hide=[${[...this.hide].join(',')}] ` +
          `galVis=${this.galaxy?.group.visible} phase=${this.phase} jt=${this.journeyT.toFixed(1)} ` +
          `clarao=[${claroes ?? ''}]`
      );
    }

    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    this.stars?.update(cam.position, hPx, pr2Atual);
    const catFade = this.hide.has('nocat') ? 0 : localFade;
    this.wrappedStars?.update(
      cam.position,
      hPx,
      this.hide.has('nowrap') ? 0 : 1,
      catFade,
      pr2Atual
    );
    this.stars?.setFade(catFade);
    this.dust.setFade(this.hide.has('nodust') ? 0 : localFade);
    this.nebula.setFade(nebulaFade);
    // o MESMO catFade das cascas: a LUT da faixa desconta do termo
    // estelar a luz que o catálogo já desenha como estrela individual
    this.nebula.setCatalogueFade(catFade);
    // AS HEROES RESGATADAS: a mesma chave de isolamento da óptica das
    // fortes (?noclarao) esconde as duas camadas — heroes e clarão do Sol
    if (this.heroes) {
      this.heroes.group.visible = !this.hide.has('noclarao');
      this.heroes.update(
        time,
        cam.position,
        Math.tan((this.engine.camera.fov * Math.PI) / 360)
      );
    }
    // O CORPO E O CLARÃO DO SOL PELA LEI (corte 8): a repartição decide
    // filtro, peso e soltura, e o clarão consome a soltura no MESMO
    // quadro — o assunto inteiro em director/solNoQuadro.ts; a cessão
    // do ponto sai da mesma repartição, no bloco da camada (abaixo)
    this.solNoQuadro.atualizarCorpoEClarao({
      dHome,
      hPx,
      prAtual,
      tanHalfFov,
      camPos: cam.position,
      dtS: dt,
      fase: this.phase,
    });
    // O SOL OBEDECE AO CALENDÁRIO (item 5): a fase do ciclo sai da data
    // simulada, e o filme só atenua a OCUPAÇÃO no arranque — uma dose
    // declarada no selo, nunca uma fase inventada. Escrito ANTES do
    // `update` porque o passe do disco (`spotsUpdate`, no
    // `onBeforeRender`) lê a fase: escrever depois desenharia um quadro
    // com as manchas da data anterior.
    this.sun.escreverCiclo(faseDoCiclo(this.maquinaDoTempo.jdVivo));
    this.sun.escreverDose(
      this.phase === 'journey' ? doseDaDramaturgia(this.journeyT) : 1
    );
    this.sun.update(time, this.engine.camera);
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
    // a continuação dele: o Sol de longe É o vértice 0 desta camada, em
    // TODA distância de ponto — a entrega ao `SunStar` e o corte de
    // 0,05 pc morreram no M1 da Lei da Estrela. Quem apaga o Sol-ponto
    // de longe é a magnitude; quem o cede de perto é a repartição. A
    // A CHAVE e a porta `?plan=1` morreram no M4 (regra iv do §4 da
    // Lei): a camada é o padrão desde 2026-08-11 e o ramo de "forçar
    // ligado" não tinha mais lado A para proteger. Fica `?noplan=1`,
    // que é LENTE de régua, não porta de migração.
    if (this.planetas) {
      this.planetas.ligado = !this.hide.has('noplan');
      // A MÁQUINA DO TEMPO (F4/D2), ANTES do quadro e fora dele: o
      // método vivo tem cache por jd e devolve na primeira linha quando
      // o instante não mudou, que é o caso de todo quadro do filme e de
      // todo quadro do Atlas parado. Sem efeméride carregada a camada
      // fica exatamente no retrato — o caminho honesto do "sem rede".
      // `grampearJd` e não `this.tempo`: o mostrador formata strings e
      // aloca um objeto — ele é para o HUD, a 4 Hz, não para o quadro.
      if (this.maquinaDoTempo.efemeride) {
        this.planetas.escreverInstante(this.maquinaDoTempo.jdVivo, this.maquinaDoTempo.efemeride);
      }
      this.planetas.update(hPx, cam.position, pr2Atual);
      // a cessão do Sol-ponto é a MESMA repartição do quadro (corte 8;
      // a doutrina inteira em director/solNoQuadro.ts, §8.5 incluído)
      this.solNoQuadro.cederPonto(this.planetas);
    }
    // AS LINHAS DE ÓRBITA (item 77), logo depois dos pontos porque são a
    // leitura deles: o ponto diz ONDE o corpo está, a linha diz por onde
    // ele anda. A chave governa a CAMADA e só ela, no mesmo idioma de
    // `?noplan`.
    //
    // O INSTANTE VIVO ANTES DO QUADRO, e pela mesma disciplina da camada
    // de cima: o método tem guarda por jd e por linha apagada, então
    // todo quadro de Atlas parado (e todo quadro do filme, que nem
    // chega aqui sem efeméride) sai dele na primeira comparação. SEM
    // EFEMÉRIDE NÃO HÁ LINHA — a curva sai do estado do instante, e o
    // retrato congelado desenharia a órbita de 2026 sob o ponto de 2035
    // (`orbitas.ts`, §6). Nenhum download novo nasce daqui: o Atlas já
    // acende a efeméride ao entrar (`palcoQuente`).
    if (this.orbitas) {
      this.orbitas.ligado = !this.hide.has('noorbitas');
      if (this.orbitas.ligado && this.maquinaDoTempo.efemeride) {
        this.orbitas.escreverInstante(
          this.maquinaDoTempo.jdVivo,
          this.maquinaDoTempo.efemeride
        );
      }
      this.orbitas.update(this.engine.camera, hPx, tanHalfFov);
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
        // o teto da lei de tela, 20 px). A 8 kpc, 10 px valem ~37 pc; 50 é folga.
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

    // debug: as linhas de órbita ACESAS (item 77) — a régua do fade por
    // tamanho angular, que a olho só se julga por ausência ("sumiu por
    // quê?"). Uma mensagem por quadro, no molde do `?dbgplan`.
    if (this.debug.has('dbgorbitas') && this.orbitas) {
      console.log(this.orbitas.dbg());
    }

    // rótulos a cada frame — projeção, linha de rumo e distância do Sol
    // moram no módulo (corte 7); o quadro entrega fase, catálogo, dHome
    // e a camada dos corpos, e o clique lê a MESMA lista por `alvos`
    this.rotulos.projetar(cam, {
      fase: this.phase,
      named: this.meta?.named ?? null,
      dHome,
      planetas: this.planetas,
      // o alvo escolhido tem prioridade 100 na disputa dos nomes (item
      // 73): o dono do foco é a escada, e o rótulo só precisa do id
      foco: this.escada.focoCorpoId,
    });
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
    // e o mesmo critério — DESENHADO — para "o modo já está na tela"
    this.quadrosDaFase++;
  }


  /**
   * A SESSÃO ACABOU NO MEIO — para o laço e manda a falha para o véu.
   *
   * Uma vez só (`desistiu`): contexto perdido e exceção em quadro podem
   * chegar juntos, e o segundo aviso só trocaria a mensagem do primeiro
   * pela consequência dele.
   *
   * NÃO CHAMA `dispose()`, ao contrário do `.catch` do boot. Ali não há
   * nada na tela a preservar; aqui o véu desenha POR CIMA do último
   * quadro, e desmontar o mundo trocaria a imagem congelada por um
   * canvas vazio sem devolver nada — a página inteira morre no
   * "Tentar novamente", que recarrega.
   */
  private desistiu = false;
  private desistir(mensagem: string) {
    if (this.desistiu || this.disposed) return;
    this.desistiu = true;
    this.engine.parar();
    this.events.onErro(mensagem);
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
    // (A blindagem é a MESMA do desmonte do mundo velho na troca de
    // tier — uma lei, um lugar: `passoBlindado`.)
    const step = (label: string, fn: () => void) =>
      this.passoBlindado('dispose', label, fn);
    step('roam', () => this.roam.dispose());
    step('listeners', () => this.gestos?.desligar());
    step('blackHole', () => this.blackHole?.dispose());
    // recursos do mundo ANTES do renderer: material descartado depois
    // de renderer.dispose() não chama deleteProgram
    step('stars', () => this.stars?.dispose());
    step('clarao', () => this.clarao?.dispose());
    // as heroes andam com o clarão (as duas camadas de asa) e faltavam
    // desta lista desde que nasceram: medido em 21/08, um `dispose()` do
    // Director deixava 16 geometrias e 16 materiais vivos, que são
    // exatamente os das 16 nomeadas de autor
    step('heroes', () => this.heroes?.dispose());
    step('galaxy', () => this.galaxy?.dispose());
    step('observedClouds', () => this.observedClouds?.dispose());
    step('starForges', () => this.starForges?.dispose());
    step('wrappedStars', () => this.wrappedStars?.dispose());
    step('dustMap', () => this.dustMapTexture?.dispose());
    step('structureMap', () => this.structureMapTexture?.dispose());
    step('sun', () => this.sun.dispose());
    // a camada nasce depois do await do init: falha de carga chega aqui
    // com ela indefinida
    step('planetas', () => this.planetas?.dispose());
    step('orbitas', () => this.orbitas?.dispose());
    // um passo por corpo, e não um por grupo: `passoBlindado` isola a
    // falha (teardown que falha não leva os outros junto — NORTE)
    for (const posto of this.noPalco) {
      step(posto.id, () => posto.corpo.dispose());
    }
    step('palco', () => this.palco.dispose());
    step('dust', () => this.dust.dispose());
    step('nebula', () => this.nebula.dispose());
    step('post', () => this.post.dispose());
    step('engine', () => this.engine.dispose());
  }
}
