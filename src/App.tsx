// ============================================================
// App — canvas WebGL + HUD cinematográfico sobre a simulação.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { Director, LOAD_STAGES } from './three/director';
import type {
  EstadoDaEscada,
  EstadoDaQualidade,
  LoadStage,
  Phase,
} from './three/director';
import type { NamedStar } from './three/config';
import { cartografiaMedida } from './three/cartography/galacticAssets';
import { HUD_POR_FASE, arrastoFazAlgo } from './three/fases';
import { TIER_DE_PRODUTO } from './three/core/engine';
import { LabelCanvas } from './components/LabelCanvas';
import { sondarGl } from './lib/glProbe';
import { t } from './lib/idioma';
import { useIdioma } from './hooks/useIdioma';
import { TitleVeil, LoadingVeil, Caption, ProgressBar } from './components/Hud';
import { BarraOuAlcas } from './components/BarraOuAlcas';
import {
  Bussola,
  GavetaDeCamadas,
  GavetaDoTempo,
  Selo,
  BarraDoTempo,
} from './components/HudDoAtlas';
import type { EstadoDoTempo, SentidoDoTempo } from './three/tempoDoAtlas';
import { PaletaDeBusca } from './components/PaletaDeBusca';
import { FichaDoObjeto } from './components/FichaDoObjeto';
import { construirIndice } from './lib/buscaEstrelas';
import {
  Convite,
  PASSOS_DO_CONVITE_DO_ATLAS,
  PASSOS_DO_CONVITE_DO_ATLAS_TOQUE,
} from './components/Spotlight';
import { Ajustes } from './components/Ajustes';
import { gravarPreferencia, lerPreferencias } from './lib/preferencias';
import { useDirector, escolherAlvo, LUGARES_DA_BUSCA } from './hooks/useDirector';
import { useAtalhos } from './hooks/useAtalhos';
import { useChromeDoFilme } from './hooks/useChromeDoFilme';
import { useEspelhoDaUrl } from './hooks/useEspelhoDaUrl';
import { useGavetas } from './hooks/useGavetas';
import { useCelular } from './hooks/useCelular';
// O HUD em 9 fatias contíguas — a ORDEM destes imports é a cascata do
// antigo hud.css e não pode se reordenar (empates de especificidade,
// @media e .shot-mode dependem dela).
import './hud/01-base.css';
import './hud/02-filme.css';
import './hud/03-controles.css';
import './hud/04-atlas.css';
import './hud/05-loading.css';
import './hud/06-responsivo.css';
import './hud/07-foto.css';
import './hud/08-ajustes.css';
import './hud/09-celular.css';

/** tempo do merge (núcleo 1,8 s) + folga antes de desmontar a loading */
const MERGE_MS = 2200;

/**
 * O QUE OS RÓTULOS CONTORNAM — a lista de peças de HUD cujo retângulo o
 * App MEDE e entrega ao `LabelCanvas`.
 *
 * Os diálogos entraram em 2026-08-14; o HUD FIXO entrou em 2026-08-20
 * (item 56), e o que faltava era exatamente isto: uma lista de um item
 * só. O canvas dos rótulos desviava dos `[data-dialogo]` e de mais nada,
 * e cedia o resto do quadro a DUAS FRAÇÕES de tela escritas à mão (a
 * faixa de baixo e o canto dos controles, em `LabelCanvas`). Numa tela
 * de mesa a fração cobre o HUD e ninguém vê; a 375 px o rodapé do Atlas
 * ocupa um terço da altura — começa em ~0,61 da tela, a fração só corta
 * a partir de 0,76 — e o encontro é certo: "E IND · 11,9 anos-luz"
 * escrito atravessado na data do céu.
 *
 * SÃO AS PEÇAS QUE MUDAM DE TAMANHO OU DE ARRANJO, que é onde fração de
 * tela sempre erra:
 *  - `.controls-bar > *` — os CONTROLES, e não a caixa deles. A barra
 *    tem `flex-wrap` com `justify-content: flex-end`, então quando ela
 *    quebra em duas linhas a última fica encostada à direita e a caixa
 *    passa a declarar um vão vazio à esquerda que ninguém ocupa: medido
 *    em 800×600, reservar a CAIXA apagava "ALDHANAB · B8III · 183
 *    anos-luz" a 290 px do botão mais próximo. Reservar o que tem tinta
 *    não apaga nada por engano.
 *  - `.atlas-rodape` empilha três blocos numa coluna só abaixo de 761 px;
 *  - `.atlas-selo` é `fixed` no canto de mesa e volta ao FLUXO na tela
 *    estreita — os dois arranjos com a mesma lei, e de quebra o rótulo
 *    para de nascer atrás do selo também na tela de mesa; desde o item
 *    61 ele é UMA linha fechada, e a gaveta que sobe dele reserva o
 *    próprio retângulo enquanto está aberta;
 *  - `.filme-rodape` cresce com a legenda do beat e com a dica do
 *    pausar-e-olhar.
 * A linha de rumo, a distância do Sol e a barra de progresso ficam de
 * FORA porque são réguas de uma linha coladas na borda de baixo, dentro
 * da margem que o `LabelCanvas` já guarda em qualquer arranjo.
 */
const AREAS_RESERVADAS = [
  // O CONTRATO É O DO `dialogFocus` (D7), o mesmo que o juiz de a11y
  // varre: todo diálogo da casa se declara com `data-dialogo`, então um
  // diálogo novo passa a afastar os rótulos no dia em que nascer.
  ':scope > [data-dialogo]',
  // AS TARJAS (item 73, 22/08). Elas são tinta PRETA OPACA por cima do
  // canvas dos rótulos (`z-index: 30` contra 25), então um nome escrito
  // ali não existe para quem olha — e desde que o rótulo ganhou cinco
  // lugares por âncora ele passou a alcançá-las: medido, um traço
  // saindo de uma âncora a 150 px do topo com o nome escondido debaixo
  // da tarja. Quando a tarja está recolhida (`height: 0`) o retângulo
  // não tem altura e não reserva nada.
  '.letterbox',
  '.controls-bar > *',
  // A FICHA DO OBJETO não precisa de linha própria (item 74): ela é um
  // diálogo de verdade, então o `[data-dialogo]` lá em cima já a alcança —
  // que é exatamente o que aquele seletor promete ("diálogo novo passa a
  // afastar os rótulos no dia em que nascer"). A `.atlas-contexto`, que
  // morava aqui, virou o cabeçalho dela e deixou de existir.
  '.atlas-rodape',
  '.atlas-selo',
  // A FILEIRA DE ALÇAS (item 62): só existe no Atlas em telefone, e ali
  // ela é a peça mais baixa do HUD — um rótulo escrito atrás dela é um
  // nome que ninguém lê. Fora do telefone o seletor não casa com nada e
  // não reserva nada.
  '.atlas-alcas',
  // A GAVETA DO SELO (item 61, 22/08) entra por conta própria: ela é
  // `absolute` e SOBE da linha fechada, então o retângulo dela não está
  // dentro do `.atlas-selo` acima. Enquanto está aberta é um cartão
  // opaco sobre a cena, e um nome escrito por baixo dele não existe para
  // quem olha — a mesma razão das tarjas. Fechada, o seletor não casa
  // com nada e não reserva nada.
  '.atlas-selo-detalhe',
  // A BÚSSOLA (item 102): botão redondo preso na borda direita, à meia
  // altura — bem no meio da faixa em que os rótulos de estrela vivem.
  // Apagada ela tem `visibility: hidden` e retângulo de largura cheia,
  // então reservaria espaço à toa; o `.acesa` é o que a faz reservar
  // só quando está lá para ser vista.
  '.atlas-bussola.acesa',
  '.filme-rodape',
].join(', ');

/**
 * A TELA É DE TOQUE? — `pointer: coarse`, lido num lugar só. Ele é
 * CAPACIDADE e não largura: quem decide GEOMETRIA é
 * `LARGURA_DO_CELULAR_PX` (o `useCelular`), e a casa reservou o `coarse`
 * para CONTEÚDO — quais gestos a dica nomeia e se o convite abre. Fora
 * do componente porque não tem estado e é chamado de dois lugares.
 */
const telaDeToque = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

export default function App() {
  // A LÍNGUA COMO DEPENDÊNCIA DE RENDER (item 130): as dicas de gesto e
  // o rótulo do canvas moram neste componente, e sem esta assinatura a
  // troca no painel de Ajustes deixaria as duas na língua anterior.
  useIdioma();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const directorRef = useRef<Director | null>(null);
  /** o pintor dos nomes das estrelas — o HUD lhe diz onde NÃO desenhar */
  const labelsRef = useRef<LabelCanvas | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [caption, setCaption] = useState<{ idx: number; text: string; sub?: string }>({
    idx: -1,
    text: '',
  });
  const [ticks, setTicks] = useState<{ t: number; text: string }[]>([]);
  const [runtime, setRuntime] = useState(0);
  const [dest, setDest] = useState('');
  const [sol, setSol] = useState('');
  /** o indicador de fotografia do filme ("LENTE 34° · SOL 412 UA",
   *  item 100); vazio = escondido */
  const [lente, setLente] = useState('');
  /**
   * ONDE A CÂMERA ESTÁ, em eclíptica heliocêntrica UA — só no Atlas, a
   * 4 Hz e só quando ela anda (item 74, parte B). A ficha do objeto a usa
   * para dizer quanto do disco está iluminado visto DAQUI, ao lado do
   * "visto da Terra". `null` fora do Atlas, e aí a linha some.
   */
  const [camera, setCamera] = useState<readonly [number, number, number] | null>(null);
  // A semente é o padrão de produto e nada mais: quem publica a verdade
  // é o Director, no fim do construtor (`publicarQualidade`).
  const [quality, setQuality] = useState<EstadoDaQualidade>({
    escolha: TIER_DE_PRODUTO,
    tier: TIER_DE_PRODUTO,
    medicao: null,
  });
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  // Sonda de GL na PRIMEIRA renderização (Onda 1d/1e): o construtor do
  // Engine cria o WebGLRenderer sincronamente e o three LANÇA quando não
  // há contexto — uma exceção síncrona que o .catch() do init() nunca
  // pegava. Sondar antes deixa o véu mostrar a falha com retry em vez de
  // tela preta muda. A sonda é memoizada: o Engine reusa este veredito.
  // ...e o véu DIZ QUAL DOS DOIS é o problema (auditoria 2026-08-12): a
  // sonda aceitava WebGL1 como suportado e o navegador que só tem o 1
  // caía no catch da criação do renderer, com a mensagem em inglês do
  // three. "Sem WebGL utilizável" manda quem TEM WebGL procurar no lugar
  // errado — a Viagem exige o 2 (three 0.185 não fala mais o 1).
  const [loadError, setLoadError] = useState(() => {
    const gl = sondarGl();
    if (gl.webgl2) return '';
    return t(gl.suportado ? 'hud.semWebgl2' : 'hud.semWebgl');
  });
  const [loadStage, setLoadStage] = useState<LoadStage>(LOAD_STAGES[0]);
  // a loading é camada persistente: só desmonta DEPOIS do merge terminar
  const [loadingMontada, setLoadingMontada] = useState(true);
  /**
   * `?cart=off` — a cartografia procedural POR ESCOLHA. Lida uma vez,
   * como o tier do boot: é porta de alocação e não troca ao vivo. Quem a
   * consome é só o selo, para não chamar de falha da rede o que o
   * visitante pediu (conferido no navegador em 22/08: os mapas
   * bloqueados e o `?cart=off` imprimiam a MESMA frase).
   */
  const [cartografiaDesligada] = useState(
    () => new URLSearchParams(window.location.search).get('cart') === 'off'
  );
  /**
   * AS 1.726 NOMEADAS, publicadas pelo Director quando o `init` termina
   * — a paleta da busca monta o índice sobre elas (F3). Estado e não
   * leitura direta: o índice é `useMemo` e precisa de um render para
   * nascer, e este é o render.
   */
  const [nomeadas, setNomeadas] = useState<readonly NamedStar[]>([]);
  /**
   * O CONVITE DE BOAS-VINDAS, e ele agora é DOIS (item 73, 22/08): o do
   * voo livre e o do Atlas, cada um com os seus gestos e a sua chave de
   * storage. Um estado só, com o `onde` dentro, porque os dois nunca
   * podem estar na tela ao mesmo tempo — o visitante está numa fase de
   * cada vez, e dois overlays sobre o mesmo furo seriam dois véus.
   */
  const [convite, setConvite] = useState<{ onde: 'voo' | 'atlas'; passo: number } | null>(
    null
  );
  /** o ponteiro está capturado AGORA? (F5 — o opt-in do voo livre) */
  const [capturado, setCapturado] = useState(false);
  /** o navegador negou a captura vezes demais e ela parou de se oferecer */
  const [capturaNegada, setCapturaNegada] = useState(false);
  /** o que está EM QUADRO no Atlas; null = o enquadramento de abertura */
  const [foco, setFoco] = useState<string | null>(null);
  /** o DEGRAU da escada (F2b/D7) — decide os botões do cabeçalho da ficha
   *  e o `?ver=corpo` do link; publicado pelo Director junto com o foco */
  const [escada, setEscada] = useState<EstadoDaEscada>({
    degrau: 'sistema',
    podeAproximar: false,
    corpoId: null,
  });
  /**
   * O MOSTRADOR DA MÁQUINA DO TEMPO (F4). Estado e não leitura direta
   * como a do selo: o relógio do céu anda sozinho, e é a chegada deste
   * evento — a 4 Hz, nunca por quadro — que faz o HUD redesenhar.
   */
  const [tempo, setTempo] = useState<EstadoDoTempo | null>(null);
  /**
   * O VISITANTE JÁ ARRASTOU dentro do Atlas (item 73)? Uma vez só por
   * sessão, e só para APAGAR a dica dos gestos: quem girou aprendeu o
   * gesto e não precisa mais da linha, e a linha ocupa altura de rodapé
   * que é distância de câmera. Não volta a acender ao sair e entrar de
   * novo — a lição é do visitante, não da fase.
   */
  const [girouNoAtlas, setGirouNoAtlas] = useState(false);

  /**
   * A BÚSSOLA DO ATLAS ESTÁ ACESA? (item 102) — o horizonte ficou torto
   * o bastante para valer o botão de endireitar. Quem decide é o rig,
   * com histerese, e o fio só entrega a VIRADA: o desvio anda a cada
   * quadro do arrasto, e um `setState` por quadro redesenharia o HUD
   * inteiro a 60 Hz.
   */
  const [bussolaAcesa, setBussolaAcesa] = useState(false);

  /**
   * A JANELA É DE CELULAR? (item 62) — `LARGURA_DO_CELULAR_PX`, lida por
   * `matchMedia` com ouvinte. Vem antes das gavetas porque elas precisam
   * dela: no telefone a folha DESCE antes de sumir, e na mesa não há o
   * que descer.
   */
  const celular = useCelular();

  // AS CINCO GAVETAS (Ajustes, Camadas, Busca, Ficha, Tempo) — uma aberta por
  // vez, e o mecanismo inteiro mora em `useGavetas`: o enum, os dois gatilhos,
  // a regra "há seleção ⇒ há ficha" (por onde a escada as abre) e a saída de
  // 260 ms da folha do telefone. `montada` é a que está DESENHADA — a aberta,
  // ou a que está descendo.
  const { gaveta, montada, alternarGaveta, fecharGaveta, fecharTodas } =
    useGavetas(escada, foco, phase, celular);

  // O BOOT do Director e os atalhos do teclado moram em hooks próprios
  // (onda da arquitetura, corte 6) — os fios são os mesmos de sempre.
  useDirector({
    canvasRef,
    labelCanvasRef,
    rootRef,
    progressRef,
    directorRef,
    labelsRef,
    setPhase,
    setCaption,
    setTicks,
    setRuntime,
    setDest,
    setSol,
    setLente,
    setCamera,
    setQuality,
    setLoadStage,
    setLoadError,
    setNomeadas,
    setFoco,
    setTempo,
    setEscada,
    girou: () => setGirouNoAtlas(true),
    orientacao: setBussolaAcesa,
    fecharGavetas: fecharTodas,
  });

  // ?loader=<id> fixa uma etapa da tela de carregamento e a mantém no ar
  // depois que o init termina — com &shot=1 (que congela transições e o
  // relógio visual) a captura de cada etapa é determinística.
  // FERRAMENTA DE CAPTURA, e só isso (auditoria item 4): sem ?shot= a
  // porta é IGNORADA — solta numa URL de visita ela deixaria o véu preto
  // por cima da cena para sempre, sem botão nenhum para tirá-lo.
  const [loaderFixo] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    if (!q.has('shot')) return null;
    return LOAD_STAGES.find((s) => s.id === q.get('loader')) ?? null;
  });
  // prefers-reduced-motion: composição estática, crossfade simples
  const [movimentoReduzido] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );



  /**
   * ONDE O HUD JÁ ESTÁ OCUPADO — medido, não estimado. Um efeito só,
   * porque as duas perguntas que ele responde são a mesma: "até onde
   * vai a barra de controles" e "que retângulo os diálogos abertos
   * cobrem". Ambas eram respondidas por números escritos à mão, e
   * ambas estavam erradas (2026-08-14):
   *
   *  1. A BARRA E OS PAINÉIS ESTAVAM EM RÉGUAS DIFERENTES. A barra
   *     desce com a altura da janela (`top: 8.5vh`) e os três painéis
   *     paravam sempre no mesmo ponto (`top: 6.4rem`): acima de ~881 px
   *     de altura os dois se cruzavam, e a barra — que está por cima —
   *     engolia o clique no "✕" de fechar. Num monitor 1440p a faixa
   *     comida chegava a quatro dezenas de pixels. Agora o topo dos
   *     painéis SAI da barra (`--barra-fim`), e não de um `rem`
   *     escolhido numa janela que já não é a de ninguém.
   *  2. OS NOMES DAS ESTRELAS eram escritos por cima dos painéis. O
   *     canvas dos rótulos cedia espaço a duas frações de tela fixas e
   *     a mais nada; os painéis nascem no meio da direita, fora delas.
   *     Em 2026-08-20 o item 56 mostrou a MESMA falta um degrau acima:
   *     o HUD fixo também não existia para o canvas. A lista de quem se
   *     contorna é `AREAS_RESERVADAS`, acima.
   *
   * MEDIR, e não declarar uma fração: a barra QUEBRA EM DUAS LINHAS
   * dentro do Atlas (`flex-wrap`, teto de 60vw), a paleta de busca
   * cresce a cada tecla e o rodapé do Atlas troca de arranjo a 761 px.
   * Nenhum número escrito à mão acompanha isso — e foi tentar acompanhar
   * à mão que criou os dois defeitos.
   *
   * MEDE-SE RARO, e nunca por quadro (M4): as peças de HUD mudam de
   * tamanho em resize, em troca de arranjo e em troca de texto, e são
   * esses três momentos que chamam `medir`. O canvas dos rótulos só lê a
   * lista já pronta.
   *
   * O ResizeObserver cobre o que muda de TAMANHO (a barra quebrando, a
   * lista da busca crescendo, o selo ganhando linha, o texto do HUD
   * mudando de escala); o `resize` da janela cobre o que muda de LUGAR
   * sem mudar de tamanho (o `8.5vh` da barra desce quando a janela
   * cresce). As dependências são só a presença das peças — quem entra e
   * quem sai da tela.
   */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const medir = () => {
      const barra = root.querySelector('.controls-bar');
      // sem barra na tela (título, intro), o painel volta ao topo de
      // sempre pelo valor de reserva do `var()` no CSS
      if (barra) {
        const fim = barra.getBoundingClientRect().bottom;
        root.style.setProperty('--barra-fim', `${Math.round(fim)}px`);
      } else root.style.removeProperty('--barra-fim');
      labelsRef.current?.reservar(
        [...root.querySelectorAll(AREAS_RESERVADAS)]
          .map((e) => e.getBoundingClientRect())
          // CAIXA VAZIA NÃO RESERVA NADA. Em `?shot=2` o HUD inteiro é
          // `display: none` e cada peça devolveria 0×0 na quina de cima
          // à esquerda — um punhado de retângulos degenerados apagando
          // os rótulos que nascessem ali.
          .filter((b) => b.width > 0 && b.height > 0)
          .map((b) => ({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }))
      );
    };
    medir();
    const observador = new ResizeObserver(medir);
    for (const e of root.querySelectorAll(AREAS_RESERVADAS)) observador.observe(e);
    // A BARRA ENTRA NA OBSERVAÇÃO POR FORA da lista, porque ela é a única
    // peça que se MEDE sem se RESERVAR: quem reserva são os controles
    // dentro dela, e um controle não muda de tamanho quando a barra
    // quebra em duas linhas — só de lugar, que o ResizeObserver não vê.
    // É a caixa que enxerga a quebra, e é dela que sai o `--barra-fim`.
    const barra = root.querySelector('.controls-bar');
    if (barra) observador.observe(barra);
    window.addEventListener('resize', medir);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [phase, gaveta]);

  // estado da camada de carregamento; `done` é o que dispara o merge.
  // O erro ganha do ?loader= fixo: uma captura de QA com asset quebrado
  // tem de MOSTRAR a falha, não a etapa congelada por cima dela.
  const loaderState: 'loading' | 'done' | 'error' = loadError
    ? 'error'
    : loaderFixo || phase === 'loading'
      ? 'loading'
      : 'done';

  useEffect(() => {
    if (loaderState !== 'done') return;
    const id = window.setTimeout(() => setLoadingMontada(false), MERGE_MS);
    return () => window.clearTimeout(id);
  }, [loaderState]);

  // O rótulo do botão de pausa é o SEGUNDO dono do estado de pausa (o
  // outro é o `freezeJourney` do Director, que desde 21/08 escreve o
  // `rig.paused` por dentro — a pausa lá é um campo só). Ele se
  // ressincroniza a cada entrada em 'journey' — é o que faz "Partir"
  // devolver a viagem PAUSADA como estava, sem o portal precisar
  // conhecer o React, e o que conserta o `?t=` congelado que mostrava
  // "⏸ Pausar" com a viagem parada.
  useEffect(() => {
    if (phase === 'journey') setPaused(directorRef.current?.pausado ?? false);
  }, [phase]);

  /**
   * O BOTÃO DA CAPTURA VOLTA A SE OFERECER COM O MODO: o backoff é do
   * MODO, não da sessão (`EstadoDaCaptura.desistiu`), e sem esta linha o
   * rótulo do rig e o do React discordariam — o rig esquecia as negativas
   * ao sair, o React continuava mostrando o botão morto.
   *
   * A TRAVESSIA TAMBÉM FECHA A BUSCA E AS CAMADAS, e esse efeito mora
   * INTEIRO em `useGavetas` desde 23/08 — a fase é um parâmetro dele.
   */
  useEffect(() => {
    setCapturaNegada(directorRef.current?.capturaDePonteiro.desistiu ?? false);
  }, [phase]);

  // ---- captura de ponteiro: o HUD só OFERECE (F5) ---------------------
  // As quatro defesas moram no rig (`cameraRig.ts`); daqui sai o pedido e
  // vem o estado que o rótulo do botão mostra. O `pointerlockchange` é o
  // mesmo evento que o rig escuta — ele se registra primeiro (o Director
  // nasce no efeito acima), então quando esta linha lê `desistiu` a conta
  // do backoff já subiu.
  useEffect(() => {
    const aoTrocar = () => setCapturado(document.pointerLockElement !== null);
    const aoErrar = () =>
      setCapturaNegada(directorRef.current?.capturaDePonteiro.desistiu ?? false);
    document.addEventListener('pointerlockchange', aoTrocar);
    document.addEventListener('pointerlockerror', aoErrar);
    return () => {
      document.removeEventListener('pointerlockchange', aoTrocar);
      document.removeEventListener('pointerlockerror', aoErrar);
    };
  }, []);

  // ---- o convite, na PRIMEIRA entrada no voo livre (F5) ---------------
  // `conviteVisto` é marca de primeira visita, não gosto: ele mora no
  // storage (que é onde a casa guarda alocação e onboarding) e não na
  // URL.
  useEffect(() => {
    if (phase !== 'free' && phase !== 'atlas') return;
    const onde = phase === 'free' ? 'voo' : 'atlas';
    const chave = onde === 'voo' ? 'conviteVisto' : 'conviteAtlasVisto';
    if (lerPreferencias()[chave]) return;
    // O GATE DE TELA DE TOQUE ESTREITA PARA O VOO LIVRE (item 62, etapa
    // 2). Ele valia para os dois, e a razão escrita no lado do Atlas era
    // "o gesto do meio é a RODA, que não existe em tela de toque" —
    // verdade até 2026-08-23, e falsa desde que a PINÇA existe. Agora o
    // Atlas em toque tem os quatro gestos, e ensiná-los é o contrário de
    // mentir. No VOO LIVRE o gate fica: lá dois dos três gestos são
    // WASD, e ensinar teclado a quem não tem teclado continua sendo
    // mentira.
    if (onde === 'voo' && telaDeToque()) return;
    setConvite({ onde, passo: 0 });
  }, [phase]);

  const fecharConvite = () => {
    if (convite) {
      gravarPreferencia(
        convite.onde === 'voo' ? 'conviteVisto' : 'conviteAtlasVisto',
        true
      );
    }
    setConvite(null);
  };

  // pausa via botão ou tecla Espaço — um filme de 4 min precisa disso
  const togglePause = () => {
    setPaused(directorRef.current?.togglePause() ?? false);
  };

  const play = () => {
    setPaused(false);
    setRate(1);
    directorRef.current?.play();
  };
  const scrub = (fraction: number) => directorRef.current?.seekFraction(fraction);
  const freeRoam = () => directorRef.current?.enterFreeRoam();
  const revealGalaxy = () => {
    setPaused(false);
    const d = directorRef.current;
    if (!d) return;
    d.play();
    d.seek(d.revealTime);
  };


  const entrarNoAtlas = () => directorRef.current?.entrarNoAtlas();
  const partirDoAtlas = () => directorRef.current?.partirDoAtlas();

  // depois do `alternarGaveta` porque passa a busca ao atalho de teclado
  // ("/" e Ctrl+K, item 8) — a ordem dos hooks não muda entre renders
  useAtalhos(directorRef, setPaused, () => alternarGaveta('busca'));

  /**
   * A ESCOLHA DA PALETA. O verbo é da FASE, não do botão: o Director
   * manda o mesmo alvo pelos dois caminhos que já existiam — no Atlas
   * ele ENQUADRA de onde está, no voo livre VOA até lá — e a paleta não
   * precisa saber qual dos dois aconteceu.
   *
   * O QUE A PALETA PRECISA SABER é o TIPO do alvo, e por isso ele vem
   * etiquetado do índice: enquadrar a órbita de um corpo do sistema e
   * visitar uma estrela são dois destinos com duas leis (`focarNoCorpo`
   * contra `visitarEstrela`), e adivinhar qual é pelo formato do objeto
   * seria a inferência que a etiqueta existe para não precisar.
   */






  /**
   * O ÍNDICE DA BUSCA — construído quando as nomeadas chegam e quando a
   * fase muda. O `useMemo` não é zelo: dentro do Atlas o mostrador da
   * máquina do tempo re-renderizava o App a 4 Hz, e sem ele as ~5 mil
   * chaves seriam reconstruídas quatro vezes por segundo enquanto o céu
   * anda. Trocar de fase é raro e acontece atrás do véu — os 9 ms de
   * reconstrução cabem lá.
   *
   * O 4 Hz MORREU em 24/08 (`mesmoMostrador`): o relógio ao vivo publica
   * quando a data vira de minuto, não quatro vezes por segundo. O
   * `useMemo` FICA — a viagem no tempo em degrau rápido ainda publica
   * depressa, e é dela que estas 5 mil chaves precisam de abrigo.
   *
   * OS CORPOS DO SISTEMA entram no Atlas E no voo livre (item 129: a
   * busca é uma só). No voo livre a escolha de um corpo não VOA — a lei
   * de aproximação de lá é de estrelas, e voar até a Terra pararia a
   * 0,8 pc dela —: ela ENTRA no Atlas e enquadra ao chegar
   * (`escolherAlvo`), o destino que o `?foco=` sempre deu. O filme não
   * tem paleta (`HUD_POR_FASE`), e a fase de carga não tem Director.
   */
  // `tempo?.aviso` entra nas dependências pela LUA (F2b): a nota dela
  // ("384 mil km") vem da efeméride, que chega TARDE — o aviso do
  // mostrador muda exatamente quando a fonte chega ('buscando…' → ''),
  // e é esse degrau que reconstrói o índice com o número medido. Ele
  // NÃO muda a 4 Hz durante a viagem no tempo (é string estável), então
  // o custo continua sendo o de trocar de fase.
  const indice = useMemo(
    () =>
      construirIndice(
        nomeadas,
        phase === 'atlas' || phase === 'free' ? (directorRef.current?.corpos ?? []) : [],
        // O CENTRO GALÁCTICO não depende de fase: ele está no céu em
        // todas elas, e o `?foco=` que a URL escreve precisa dele para
        // reconhecer o que está em quadro (`chaveDoFoco`)
        LUGARES_DA_BUSCA
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nomeadas, phase, tempo?.aviso]
  );

  /**
   * A ESTRELA EM FOCO, inteira — a LINHA do catálogo que o nome endereça
   * (item 74, parte B).
   *
   * Ela NÃO viaja em `EstadoDaEscada`, e a fronteira é a razão: a escada é a
   * única escritora do FOCO, e o foco é o NOME. O `NamedStar` é a linha de
   * uma tabela que este componente já tem na mão desde o `init` — mandá-la
   * pelo mesmo cano seria a mesma tabela indo ao React duas vezes.
   *
   * `null` para o centro galáctico (Sagittarius A✱), que é foco e não é
   * estrela do catálogo: a ficha dele fica com o cabeçalho e o "⌂ Sistema",
   * sem uma linha inventada.
   */
  const estrelaEmFoco = useMemo(
    () =>
      escada.degrau === 'estrela' && foco
        ? (nomeadas.find((s) => s.n === foco) ?? null)
        : null,
    [escada.degrau, foco, nomeadas]
  );

  // A URL COMO ESPELHO (corte 6): o gosto nasce dela e volta para ela
  // pelos handlers do hook — a semântica de sempre, noutro endereço.
  const {
    tom,
    exposicao,
    escondidas,
    escalaUi,
    urlComMomento,
    changeQuality,
    trocarTom,
    trocarExposicao,
    voltarAoBrilhoReal,
    trocarEscalaUi,
    rotulos3d,
    trocarRotulos3d,
    alternarCamada,
  } = useEspelhoDaUrl({ directorRef, phase, foco, indice, quality });

  const inJourney = phase === 'journey';
  /**
   * O CHROME DO FILME SOME SOZINHO (item 61, 22/08). Resposta do dono
   * aos mockups, em duas palavras: *"2) somem sozinhos"*. Com o filme
   * CORRENDO e nenhum gesto por 3 s, a barra de controles e a barra de
   * capítulos esmaecem; o primeiro movimento de ponteiro, toque, roda ou
   * tecla as traz de volta. Pausado, ficam: quem pausou parou para usar
   * alguma coisa.
   *
   * O QUE SOME É O CHROME, e só ele. A legenda do beat e a dica do
   * pausar-e-olhar (`.filme-rodape`) são CONTEÚDO — é o que o visitante
   * está lendo —, e a linha de rumo é o instrumento do destino. Um filme
   * que apagasse a própria legenda por inatividade estaria escondendo a
   * obra, não o controle remoto.
   */
  const chromeVisivel = useChromeDoFilme(inJourney && !paused);
  const chromeSumido = chromeVisivel ? '' : ' hud-sumido';
  // As peças que só decidem PRESENÇA por fase saem do mapa único
  // (`fases.ts`); as condições compostas continuam aqui, sobre ele.
  const hud = HUD_POR_FASE[phase];
  /**
   * A FICHA É A ÚNICA LEITORA DA CÂMERA, e o Director precisa saber
   * disso (ver `emitCamera`, em `director/rotulos.ts`). Com ela
   * fechada, a posição subia por `setState` 4
   * vezes por segundo durante todo arrasto no Atlas e re-renderizava o
   * HUD inteiro por um painel que ninguém abriu. O `useEffect` vem
   * DEPOIS do `useDirector` (que já pôs o Director no ref, síncrono),
   * então o pedido nunca cai no vazio — inclusive no boot com a ficha
   * já aberta por `?foco=`.
   */
  const fichaAberta = gaveta === 'ficha' && hud.ficha;
  useEffect(() => {
    directorRef.current?.lerCamera(fichaAberta);
  }, [fichaAberta]);

  /**
   * AS ALÇAS DO CELULAR (item 62) — a resposta do dono à terceira
   * pergunta dos mockups: *"3) vira alça"*.
   *
   * Elas existem no ATLAS e em telefone, e em mais lugar nenhum: no
   * filme e no voo livre a barra de controles já respondeu à mesma
   * pergunta de outro jeito ("2) somem sozinhos", item 61), e uma
   * segunda resposta seria ruído. A largura é `LARGURA_DO_CELULAR_PX`,
   * lida por `matchMedia` com ouvinte (`useCelular`).
   *
   * O QUE ELAS SÃO: as MESMAS peças da barra, com o mesmo
   * `data-abre-dialogo`, em outro lugar da tela. Por isso a decisão é de
   * TypeScript e não de CSS — desenhar as duas cópias e esconder uma
   * daria dois gatilhos com o mesmo nome no documento, que é o que o
   * contrato do `dialogFocus` proíbe e o que o juiz varre.
   */
  const alcas = celular && phase === 'atlas';

  /**
   * A FICHA SÓ SE OFERECE QUANDO HÁ SELEÇÃO — a mesma regra na barra e na
   * fileira, escrita uma vez: sem alvo em foco não há ficha para abrir, e
   * botão que não faz nada é pior que botão nenhum.
   */
  const ofereceFicha = Boolean(hud.ficha && foco && (escada.corpoId || escada.degrau === 'estrela'));

  // ?shot=1 — modo foto: sem transições, capturas determinísticas
  // ?shot=2 — só a cena: sem HUD, para medir o quadro contra a referência
  const shotParam = new URLSearchParams(window.location.search).get('shot');
  const shotMode = shotParam !== null;
  const bareMode = shotParam === '2';

  return (
    <div
      ref={rootRef}
      className={`hud-root${shotMode ? ' shot-mode' : ''}${
        bareMode ? ' bare-mode' : ''
      }`}
    >
      <canvas
        ref={canvasRef}
        // `.arrastavel` é SÓ o cursor (agarrar / agarrando, em hud.css):
        // a fase em que arrastar move a câmera passa a dizer isso ao
        // ponteiro, em vez de deixar a seta de sempre prometendo nada.
        // A classe `scene-canvas` continua a primeira e intacta — é ela
        // que o `.bare-mode > *:not(.scene-canvas)` poupa em ?shot=2 e a
        // que o `voo-smoke` procura.
        className={`scene-canvas${arrastoFazAlgo(phase, paused) ? ' arrastavel' : ''}`}
        aria-label={t('cena.aria')}
      />
      <canvas ref={labelCanvasRef} className="label-canvas" aria-hidden="true" />

      {/* vinheta de warp reativa */}
      <div className="warp-vignette" />

      {/* letterbox */}
      <div className={`letterbox top ${hud.letterbox ? 'on' : ''}`} />
      <div className={`letterbox bottom ${hud.letterbox ? 'on' : ''}`} />

      {/* O RODAPÉ DO FILME: a legenda do beat e a dica de gestos, numa
          COLUNA só — o mesmo conserto que o Atlas já tinha feito no seu
          próprio rodapé, pelo mesmo motivo. Eram duas peças
          `position: fixed` no MESMO ponto (`left: 6vw; bottom: 11vh`),
          e por isso a dica do pausar-e-olhar era escrita EM CIMA da
          legenda: pausar é justamente o que se faz durante a viagem,
          que é quando a legenda está no ar.
          Numa coluna ancorada embaixo quem empilha é o fluxo: a dica
          continua exatamente onde estava (ela é a última) e a legenda
          sobe o tanto que a dica ocupa — só quando há dica. Sozinha, a
          legenda fica no pixel de sempre. */}
      {(hud.legenda || hud.dicaDeVoo) && (
        <div className="filme-rodape">
          {hud.legenda && (
            <Caption caption={caption.text} sub={caption.sub} showKey={caption.idx} />
          )}

        {/* Dica do modo livre. Os `data-spot` são os alvos que o convite
            aponta (F5): os três gestos que ele ensina são os três pedaços
            desta linha, que fica na tela depois que o convite sai. */}
        {hud.dicaDeVoo && (
          <div className="free-hint">
            {telaDeToque() ? (
              <>
                <span data-spot="olhar">{t('dica.toque.olhar')}</span> ·{' '}
                <span data-spot="visitar">{t('dica.toque.visitar')}</span>
              </>
            ) : (
              <>
                <span data-spot="olhar">{t('dica.mouse.olhar')}</span> ·{' '}
                <span data-spot="voar">{t('dica.mouse.voar')}</span> ·{' '}
                {t('dica.mouse.rolarEVelocidade')}
                <br />
                <span data-spot="visitar">{t('dica.mouse.visitar')}</span>
                <br />
                {/* O OPT-IN DA CAPTURA: quem decide é o visitante, e a dica
                    é onde a decisão mora — é a linha que ele já está lendo
                    para saber como voar. O `onMouseDown` não deixa o botão
                    roubar o foco: com o foco nele, a guarda de alvo de
                    formulário do rig engoliria o WASD. */}
                <button
                  type="button"
                  className="free-hint-captura"
                  disabled={capturado || capturaNegada}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => directorRef.current?.capturaDePonteiro.pedir()}
                >
                  {t(
                    capturaNegada
                      ? 'dica.captura.negada'
                      : capturado
                        ? 'dica.captura.capturado'
                        : 'dica.captura.pedir'
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* dica do pausar-e-olhar */}
        {inJourney && paused && (
          <div className="free-hint">{t('dica.pausado')}</div>
        )}
        </div>
      )}

      {/* linha de rumo: para onde estamos indo, com distância viva */}
      {hud.rumo && dest && <div className="dest-line">{dest}</div>}

      {/* distância viva do Sol — a prova do afastamento (voo livre) */}
      {hud.sol && sol && <div className="sol-line">{sol}</div>}

      {/* o indicador de fotografia (item 100): a LENTE denuncia o zoom,
          a distância denuncia o dolly — juntos desfazem a dúvida das
          Três Marias. Só no filme; ocupa a vaga do sol-line, que lá
          nunca desenha */}
      {hud.lente && lente && <div className="lente-line">{lente}</div>}

      {/* progresso (arrastável — scrub). Fica de pé na tela final também:
          seekFraction já sabe retomar a partir da fase 'end', e sem a barra
          o único caminho de volta era "Reviver", que reinicia do zero */}
      {hud.progresso && (
        <ProgressBar
          progressRef={progressRef}
          ticks={ticks}
          onScrub={scrub}
          onSkipChapter={(dir) => directorRef.current?.skipChapter(dir)}
          capituloAtual={caption.idx}
          chromeVisivel={chromeVisivel}
        />
      )}

      {/* O RODAPÉ DO ATLAS: a máquina do tempo (F4), a dica do modo e o
          selo, numa COLUNA só. Eram duas peças `position: fixed`
          penduradas em dois `vh` escolhidos à mão, e a folga entre elas
          era de 6 px — o primeiro degrau de `?ui=` punha uma por cima da
          outra (F6). Numa coluna quem empilha é o fluxo, e a folga passa
          a ser a mesma em qualquer tamanho de texto.

          O SELO ENTROU NA COLUNA em 2026-08-20 (item 9), e a mudança é
          de PARENTESCO, não de lugar: em tela de mesa ele continua
          `position: fixed` no canto de baixo à direita, fora do fluxo,
          exatamente onde sempre esteve — pai nenhum move filho fixo. O
          que o parentesco compra é a tela estreita: lá o CSS o devolve
          ao fluxo (`position: static`) e os três blocos EMPILHAM, cada
          um com a largura inteira, em vez de disputarem duas colunas de
          ~45vw em que tudo quebra em três e quatro linhas.
          Empilhar sem parentesco exigiria que um dos dois soubesse a
          altura do outro — e altura de HUD não se escreve à mão (foi
          essa lição que criou o `--barra-fim`).
          Ele segue apagado no `?shot=2`: a regra do `.bare-mode` alcança
          filhos DIRETOS, e some com este rodapé inteiro. */}
      {phase === 'atlas' && (
        <div className="atlas-rodape">
          {/* NO TELEFONE ELA VIRA ALÇA (item 62) e é desenhada dentro da
              gaveta `tempo`, com a MESMA peça — quem a esconde AQUI é a
              fatia 9, pelo rodapé, e não este `if`: a caixa continua no
              fluxo enquanto a fase a hospeda, e é a fatia que decide a
              tela. */}
          {hud.tempo && tempo && (
            <BarraDoTempo
              tempo={tempo}
              onSentido={(s: SentidoDoTempo) => directorRef.current?.andarNoTempo(s)}
              onDegrau={() => directorRef.current?.ciclarDegrau()}
              onAoVivo={() => directorRef.current?.alternarAoVivo()}
              onEpoca={() => directorRef.current?.voltarAEpoca()}
            />
          )}
          {/* A DICA DESCREVE OS GESTOS REAIS (item 73). Prometer degrau
              na roda e enquadramento no clique era descrever a navegação
              que o dono chamou de monstro: a roda pulava de degrau em vez
              de dar zoom, e o clique reposicionava em vez de escolher. Os quatro
              verbos passam a ser os do padrão da indústria — girar, zoom,
              escolher, voltar —, e cada um é o que o gesto faz de verdade.

              O VERBO DO CLIQUE VIROU "ESCOLHER" quando o clique passou a
              escolher (22/08, o passo do duplo clique). "IR" não some do
              produto: quem ensina os dois cliques é o CONVITE DO ATLAS,
              que aponta justamente este pedaço da linha, e o botão "⊕
              Aproximar" da linha de contexto é o mesmo gesto com nome.
              Pôr os dois na dica custaria 80 caracteres, e o orçamento
              medido abaixo é 68.

              OS TRÊS `data-spot` são os alvos do convite do Atlas: o
              furo do Spotlight se abre sobre o pedaço REAL da dica que
              repete aquele gesto para sempre — quando o convite sai, o
              lembrete fica.

              O COMPRIMENTO É ORÇAMENTO, não gosto: a dica mora na mesma
              coluna da máquina do tempo, então cada linha que ela ganha
              empurra a barra para cima e come o retângulo útil (é o juiz
              de a11y quem cobra, `base declarada ≥ medida`). MEDIDO em
              `ui = 1,4` e 900 px de largura, na época o canto mais
              apertado da faixa declarada (desde o item 9 ela desce a
              768), a quebra da 2ª para a 3ª linha acontece entre 68 e 70
              caracteres, e a 3ª linha estoura a base declarada de então
              (0,328 contra 0,310). A linha tinha 67 caracteres antes
              desta obra, caiu para 58 e voltou a 64 com "escolher" —
              dentro do orçamento, com quatro de folga, e o `a11y.mjs`
              é quem cobra (base declarada ≥ medida).

              E ELA SOME DEPOIS DO PRIMEIRO ARRASTO (decisão do dono nos
              mockups), por OPACIDADE e com a caixa no lugar: ver
              `.free-hint.apagada`. Tirá-la do fluxo cresceria o retângulo
              útil e a câmera daria um pulo no meio da sessão. */}
          {/* E A DICA TROCA DE GESTOS NA TELA DE TOQUE (item 62, etapa
              2). Não é uma segunda dica: são as MESMAS quatro coisas
              ditas na língua do aparelho. Duas trocam de nome (a roda
              vira a PINÇA, que passou a existir; o clique vira o toque)
              e a quarta troca de conteúdo — no mouse "escolher" e "ir"
              são o mesmo botão e cabem numa palavra só, no dedo são
              gestos diferentes (um toque, dois toques) e o "esc — voltar"
              sai porque não há tecla para tocar.
              O ORÇAMENTO É O MESMO, e continua medido: 68 caracteres
              contra os 64 do mouse, dentro das duas linhas que o juiz de
              a11y mede a 320×568 — uma terceira linha comeria o céu que
              esta mesma etapa acabou de devolver. */}
          <div className={`free-hint ${girouNoAtlas ? 'apagada' : ''}`}>
            {telaDeToque() ? (
              <>
                <span data-spot="girar">{t('dica.atlas.girar')}</span> ·{' '}
                <span data-spot="zoom">{t('dica.atlas.pinca')}</span> ·{' '}
                <span data-spot="escolher">{t('dica.atlas.escolherToque')}</span> ·{' '}
                <span data-spot="ir">{t('dica.atlas.irToque')}</span>
              </>
            ) : (
              <>
                <span data-spot="girar">{t('dica.atlas.girar')}</span> ·{' '}
                <span data-spot="zoom">{t('dica.atlas.roda')}</span> ·{' '}
                <span data-spot="escolher">{t('dica.atlas.escolherEVoltar')}</span>
              </>
            )}
          </div>

          {/* O SELO. Lê o estado da vista do Director a cada render — e o
              render acontece quando o foco muda, que é quando a vista
              muda (dentro de um enquadramento a câmera não anda
              sozinha). É o ÚLTIMO da coluna porque é o que cede: na tela
              estreita ele fica no pé da coluna — onde a tarja de baixo
              estava antes de sair do telefone —, como no canto de mesa,
              e a leitura desce controle → gesto → selo. */}
          {hud.selo && directorRef.current && (
            <Selo
              vista={directorRef.current.selo}
              // os mapas da galáxia chegaram nesta sessão? sem isto a
              // legenda jurava "medido" sobre uma cena 100% procedural
              cartografiaMedida={cartografiaMedida()}
              // …e se não chegaram, foi escolha dele? A frase da falha
              // acusava a rede de uma decisão do visitante.
              cartografiaDesligada={cartografiaDesligada}
              onEscalaReal={() => directorRef.current?.focarNoSistema()}
              onBrilhoReal={voltarAoBrilhoReal}
            />
          )}
        </div>
      )}

      {/* A BÚSSOLA (item 102) — o botão de zerar a orientação, filha
          DIRETA de .hud-root como todo overlay da casa (a regra do
          `.bare-mode` só alcança filhos diretos, e é ela que a apaga no
          `?shot=2` junto com o resto do HUD).

          FORA DO RODAPÉ DE PROPÓSITO: o rodapé é altura de CÂMERA — o
          retângulo útil o desconta —, e uma peça que entra e sai do
          fluxo mudaria o enquadramento no meio da sessão. Presa na
          borda direita à meia altura ela não desconta nada.

          MONTADA SEMPRE QUE A FASE A HOSPEDA, acesa ou não: a transição
          de opacidade precisa dos dois estados no DOM, e é o mesmo
          padrão da dica dos gestos, que apaga sem sair do lugar. Quem a
          torna inerte para o teclado quando apagada é o componente. */}
      {phase === 'atlas' && (
        <Bussola
          acesa={bussolaAcesa}
          onEndireitar={() => directorRef.current?.endireitarOrientacao()}
        />
      )}

      {/* A BARRA DE CONTROLES OU A FILEIRA DE ALÇAS — as duas moram em
          `BarraOuAlcas` porque são o MESMO assunto: onde as portas do HUD
          nascem. As duas são filhas DIRETAS de .hud-root (o fragmento não
          cria nó), como todo overlay da casa — é a regra do `.bare-mode`
          (`> *:not(.scene-canvas)`) que as apaga no `?shot=2`, e ela só
          alcança filhos diretos. */}
      <BarraOuAlcas
        hud={hud}
        alcas={alcas}
        chromeSumido={chromeSumido}
        gaveta={gaveta}
        alternarGaveta={alternarGaveta}
        ofereceFicha={ofereceFicha}
        // o filme guardado é LIDO do director na hora, sem canal novo: ele
        // só muda quando a FASE muda (é o portal que o escreve), e a fase já
        // re-renderiza o HUD inteiro. É o mesmo padrão da ficha, que lê
        // `efemerideViva` daqui.
        temFilmeGuardado={
          phase === 'atlas' && (directorRef.current?.momentoGuardado ?? null) !== null
        }
        foco={foco}
        tempo={tempo}
        inJourney={inJourney}
        paused={paused}
        rate={rate}
        quality={quality}
        play={play}
        entrarNoAtlas={entrarNoAtlas}
        partirDoAtlas={partirDoAtlas}
        togglePause={togglePause}
        ciclarVelocidade={() => setRate(directorRef.current?.cyclePlaybackRate() ?? 1)}
        revealGalaxy={revealGalaxy}
        freeRoam={freeRoam}
        changeQuality={changeQuality}
      />

      {/* A GAVETA DE CAMADAS, e ela é a ÚNICA porta das camadas desde o
          item 61 (22/08) — em TODA fase que tem barra de controles
          (filme, voo livre e Atlas), com a mesma peça, o mesmo estado e a
          mesma URL. Filha DIRETA de .hud-root, como o
          painel de Ajustes e o véu: é assim que o ?shot=2 a esconde
          junto com o resto do HUD (a regra do .bare-mode só alcança
          filhos diretos). */}
      <GavetaDeCamadas
        aberta={montada === 'camadas' && hud.gaveta}
        onFechar={() => fecharGaveta('camadas')}
        escondidas={escondidas}
        onCamada={alternarCamada}
      />

      {/* A MÁQUINA DO TEMPO ATRÁS DA ALÇA (item 62) — a MESMA
          `BarraDoTempo` do rodapé, só que numa gaveta, e só no telefone.
          Filha DIRETA de .hud-root como as outras. */}
      {alcas && hud.tempo && tempo && (
        <GavetaDoTempo
          aberta={montada === 'tempo'}
          onFechar={() => fecharGaveta('tempo')}
          tempo={tempo}
          onSentido={(s: SentidoDoTempo) => directorRef.current?.andarNoTempo(s)}
          onDegrau={() => directorRef.current?.ciclarDegrau()}
          onAoVivo={() => directorRef.current?.alternarAoVivo()}
          onEpoca={() => directorRef.current?.voltarAEpoca()}
        />
      )}

      {/* A FICHA DO OBJETO (item 74) — a quarta gaveta, e a herdeira da
          antiga linha "em quadro". Filha DIRETA de .hud-root como as
          outras: é a regra do `.bare-mode` (`> *:not(.scene-canvas)`) que a
          apaga no `?shot=2`, e ela só alcança filhos diretos. */}
      <FichaDoObjeto
        aberta={montada === 'ficha' && hud.ficha}
        onFechar={() => fecharGaveta('ficha')}
        corpoId={escada.corpoId}
        estrelaEmFoco={escada.degrau === 'estrela' ? foco : null}
        estrela={estrelaEmFoco}
        jd={tempo?.jd ?? null}
        camaraUa={camera}
        fonte={directorRef.current?.efemerideViva ?? null}
        podeAproximar={escada.podeAproximar}
        noSistema={escada.degrau === 'sistema'}
        onAproximar={() => directorRef.current?.aproximarDoCorpo()}
        onSistema={() => directorRef.current?.focarNoSistema()}
      />

      {/* A PALETA DE BUSCA (F3) — filha DIRETA de .hud-root, como todo
          overlay da casa. Fechar DESMONTA (precedente do Convite): é o
          que faz a consulta anterior não sobrar para a próxima abertura.
          O verbo vem da fase para as ESTRELAS: no Atlas a escolha
          enquadra, no voo livre ela voa. Um corpo do sistema sempre
          enquadra — de fora do Atlas, entrando nele (item 129). */}
      {montada === 'busca' && hud.busca && (
        <PaletaDeBusca
          onFechar={() => fecharGaveta('busca')}
          indice={indice}
          verbo={phase === 'atlas' ? 'enquadrar' : 'visitar'}
          onEscolher={(entrada) => escolherAlvo(entrada, directorRef.current)}
        />
      )}

      <Ajustes
        aberto={montada === 'ajustes'}
        onFechar={() => fecharGaveta('ajustes')}
        qualidade={quality}
        onQualidade={changeQuality}
        tom={tom}
        onTom={trocarTom}
        exposicao={exposicao}
        onExposicao={trocarExposicao}
        escalaUi={escalaUi}
        onEscalaUi={trocarEscalaUi}
        rotulos3d={rotulos3d}
        onRotulos3d={trocarRotulos3d}
        urlParaCopiar={() => urlComMomento().toString()}
        onReverConvite={
          hud.dicaDeVoo || phase === 'atlas'
            ? () => {
                fecharGaveta('ajustes');
                setConvite({ onde: phase === 'atlas' ? 'atlas' : 'voo', passo: 0 });
              }
            : undefined
        }
      />

      {/* O CONVITE — filho DIRETO de .hud-root como todo overlay da casa
          (a regra do .bare-mode só alcança filhos diretos). Cada fase
          tem o SEU: os três gestos do voo livre apontam a dica de voo;
          os quatro do Atlas apontam a dica do rodapé do modo. Os dois só
          existem onde a dica que eles furam está na tela. */}
      {convite?.onde === 'voo' && hud.dicaDeVoo && (
        <Convite
          passo={convite.passo}
          onPasso={(n) => setConvite({ onde: 'voo', passo: n })}
          onFechar={fecharConvite}
        />
      )}
      {convite?.onde === 'atlas' && phase === 'atlas' && !girouNoAtlas && (
        <Convite
          passo={convite.passo}
          passos={
            telaDeToque() ? PASSOS_DO_CONVITE_DO_ATLAS_TOQUE : PASSOS_DO_CONVITE_DO_ATLAS
          }
          onPasso={(n) => setConvite({ onde: 'atlas', passo: n })}
          onFechar={fecharConvite}
        />
      )}

      {/* tela de título / fim — montada desde o primeiro frame, por baixo
          da loading: é o crossfade entre camadas persistentes que tira o
          flash da troca */}
      <TitleVeil
        visible={hud.veuDeTitulo}
        mode={phase === 'end' ? 'end' : 'intro'}
        onPlay={play}
        onExplore={freeRoam}
        onAtlas={entrarNoAtlas}
        runtime={runtime}
      />

      {/* VÉU DO ATLAS — a entrada e a saída não são travessia física: o
          véu fecha, a câmera é reposta e o véu abre. A opacidade vem por
          custom property do Director (`--veu-atlas`), que é quem sabe
          quando a troca aconteceu; sob reduced-motion ela nunca sai de 0
          e a troca é instantânea. Fade, não pulso. */}
      <div className="atlas-veu" aria-hidden="true" />

      {/* cartografia viva do carregamento (por cima: o núcleo dela expande
          sobre o Sol WebGL quando a viagem começa). Em ?shot=2 ela nem
          monta: esconder por CSS deixaria o laço do canvas disputando a
          thread com a captura que a medição depende */}
      {/* a camada volta A MONTAR quando a falha chega depois do boot: o
          merge a desmonta ~MERGE_MS após o `done`, e sem o segundo termo
          o contexto perdido e a exceção em quadro não tinham onde
          aparecer (medido em 21/08: tela congelada, HUD inteiro no ar,
          nada dito). `emVoo` é o que muda a copy — a viagem começou. */}
      {(loadingMontada || loaderState === 'error') && !bareMode && (
        <LoadingVeil
          stage={loaderFixo ?? loadStage}
          state={loaderState}
          still={movimentoReduzido || shotMode}
          error={loadError}
          emVoo={phase !== 'loading'}
          onRetry={() => window.location.reload()}
        />
      )}
    </div>
  );
}
