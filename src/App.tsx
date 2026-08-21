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
import { HUD_POR_FASE, arrastoFazAlgo } from './three/fases';
import { TIER_DE_PRODUTO } from './three/core/engine';
import type { EscolhaDeQualidade } from './three/core/engine';
import { QUALIDADES, rotuloDaQualidade } from './three/atlasConfig';
import { LabelCanvas } from './components/LabelCanvas';
import { gatilhoDoDialogo } from './lib/dialogFocus';
import { sondarGl } from './lib/glProbe';
import { TitleVeil, LoadingVeil, Caption, ProgressBar } from './components/Hud';
import {
  ContextLine,
  GavetaDeCamadas,
  BotaoDaGaveta,
  Selo,
  BarraDoTempo,
} from './components/HudDoAtlas';
import type { EstadoDoTempo, SentidoDoTempo } from './three/tempoDoAtlas';
import { PaletaDeBusca, BotaoDaBusca } from './components/PaletaDeBusca';
import { construirIndice } from './lib/buscaEstrelas';
import { Convite } from './components/Spotlight';
import { Ajustes } from './components/Ajustes';
import { gravarPreferencia, lerPreferencias } from './lib/preferencias';
import { useDirector, escolherAlvo } from './hooks/useDirector';
import { useAtalhos } from './hooks/useAtalhos';
import { useEspelhoDaUrl } from './hooks/useEspelhoDaUrl';
// O HUD em 8 fatias contíguas — a ORDEM destes imports é a cascata do
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

/** tempo do merge (núcleo 1,8 s) + folga antes de desmontar a loading */
const MERGE_MS = 2200;



export default function App() {
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
    return gl.suportado
      ? 'Este navegador só tem WebGL 1, e a Viagem precisa de WebGL 2 para desenhar a galáxia. Atualize o navegador (ou ative a aceleração de hardware) e tente de novo.'
      : 'Este navegador está sem WebGL utilizável — a Viagem precisa dele para desenhar a galáxia. Atualize o navegador ou ative a aceleração de hardware e tente de novo.';
  });
  const [loadStage, setLoadStage] = useState<LoadStage>(LOAD_STAGES[0]);
  // a loading é camada persistente: só desmonta DEPOIS do merge terminar
  const [loadingMontada, setLoadingMontada] = useState(true);
  // ?ajustes=1 abre o painel direto: uma configuração inteira cabe num link,
  // inclusive com o painel visível para conferência.
  const [ajustes, setAjustes] = useState(
    new URLSearchParams(window.location.search).has('ajustes')
  );
  const [gaveta, setGaveta] = useState(false);
  const [busca, setBusca] = useState(false);
  /**
   * AS 1.726 NOMEADAS, publicadas pelo Director quando o `init` termina
   * — a paleta da busca monta o índice sobre elas (F3). Estado e não
   * leitura direta: o índice é `useMemo` e precisa de um render para
   * nascer, e este é o render.
   */
  const [nomeadas, setNomeadas] = useState<readonly NamedStar[]>([]);
  /** passo do convite de boas-vindas ao voo livre; null = fora do ar */
  const [convite, setConvite] = useState<number | null>(null);
  /** o ponteiro está capturado AGORA? (F5 — o opt-in do voo livre) */
  const [capturado, setCapturado] = useState(false);
  /** o navegador negou a captura vezes demais e ela parou de se oferecer */
  const [capturaNegada, setCapturaNegada] = useState(false);
  /** o que está EM QUADRO no Atlas; null = o enquadramento de abertura */
  const [foco, setFoco] = useState<string | null>(null);
  /** o DEGRAU da escada (F2b/D7) — decide os botões da ContextLine e o
   *  `?ver=corpo` do link; publicado pelo Director junto com o foco */
  const [escada, setEscada] = useState<EstadoDaEscada>({
    degrau: 'sistema',
    podeAproximar: false,
  });
  /**
   * O MOSTRADOR DA MÁQUINA DO TEMPO (F4). Estado e não leitura direta
   * como a do selo: o relógio do céu anda sozinho, e é a chegada deste
   * evento — a 4 Hz, nunca por quadro — que faz o HUD redesenhar.
   */
  const [tempo, setTempo] = useState<EstadoDoTempo | null>(null);

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
    setQuality,
    setLoadStage,
    setLoadError,
    setNomeadas,
    setFoco,
    setTempo,
    setEscada,
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
   *
   * MEDIR, e não declarar uma fração: a barra QUEBRA EM DUAS LINHAS
   * dentro do Atlas (`flex-wrap`, teto de 60vw) e a paleta de busca
   * cresce a cada tecla. Nenhum número escrito à mão acompanha isso —
   * e foi tentar acompanhar à mão que criou o defeito.
   *
   * O ResizeObserver cobre o que muda de TAMANHO (a barra quebrando, a
   * lista da busca crescendo, o texto do HUD mudando de escala); o
   * `resize` da janela cobre o que muda de LUGAR sem mudar de tamanho
   * (o `8.5vh` da barra desce quando a janela cresce). As dependências
   * são só a presença das peças — quem entra e quem sai da tela.
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
      // O CONTRATO É O DO `dialogFocus` (D7), o mesmo que o juiz de
      // a11y varre: todo diálogo da casa se declara com `data-dialogo`,
      // então um diálogo novo passa a afastar os rótulos no dia em que
      // nascer, sem uma linha a mais aqui.
      labelsRef.current?.reservar(
        [...root.querySelectorAll(':scope > [data-dialogo]')].map((e) => {
          const b = e.getBoundingClientRect();
          return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
        })
      );
    };
    medir();
    const observador = new ResizeObserver(medir);
    for (const e of root.querySelectorAll('.controls-bar, [data-dialogo]')) {
      observador.observe(e);
    }
    window.addEventListener('resize', medir);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [phase, ajustes, gaveta, busca]);

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

  // O rótulo do botão de pausa é o TERCEIRO dono do estado de pausa (os
  // outros dois são `freezeJourney` e `rig.paused`, no Director). Ele se
  // ressincroniza a cada entrada em 'journey' — é o que faz "Partir"
  // devolver a viagem PAUSADA como estava, sem o portal precisar
  // conhecer o React, e o que conserta o `?t=` congelado que mostrava
  // "⏸ Pausar" com a viagem parada.
  useEffect(() => {
    if (phase === 'journey') setPaused(directorRef.current?.pausado ?? false);
  }, [phase]);

  /**
   * OS OVERLAYS SÃO DA FASE QUE OS HOSPEDA. A presença deles é
   * `busca && hud.busca` / `gaveta && hud.gaveta` — o `hud.*` some com a
   * fase, mas o estado de aberto NÃO sumia, e eles RENASCIAM sozinhos ao
   * voltar. Pior que reaparecer: `useDialogFocus` põe o foco no primeiro
   * focável, que na paleta é a caixa de texto, e a guarda de alvo de
   * formulário do `FreeRoam` engole o WASD — o visitante entrava no voo
   * livre e as teclas de voar viravam texto na busca.
   *
   * O ⚙ AJUSTES NÃO ENTRA AQUI, e é decisão escrita: ele não é o painel
   * de uma fase, é o da casa (qualidade, tom, exposição, tamanho do
   * texto, camadas), e o `?ajustes=1` o abre DE PROPÓSITO sobre a tela de
   * título, onde nenhuma fase o hospeda — fechá-lo por fase mataria a
   * porta. Ele também não sofre o defeito: fica montado sempre, então
   * trocar de fase não o remonta nem lhe entrega o foco.
   */
  useEffect(() => {
    const hospeda = HUD_POR_FASE[phase];
    if (!hospeda.busca) setBusca(false);
    if (!hospeda.gaveta) setGaveta(false);
    // e o botão da captura volta a se oferecer com o modo: o backoff é
    // do MODO, não da sessão (`EstadoDaCaptura.desistiu`), e sem esta
    // linha o rótulo do rig e o do React discordariam — o rig esquecia
    // as negativas ao sair, o React continuava mostrando o botão morto.
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
  // URL. Em tela de toque o convite não abre — dois dos três gestos são
  // de teclado e mouse, e ensinar WASD a quem não tem teclado é mentir.
  useEffect(() => {
    if (phase !== 'free') return;
    if (lerPreferencias().conviteVisto) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    setConvite(0);
  }, [phase]);

  const fecharConvite = () => {
    setConvite(null);
    gravarPreferencia('conviteVisto', true);
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

  // Um diálogo de cada vez: os três se ancoram no mesmo canto e os três
  // se declaram `aria-modal` — dois modais abertos ao mesmo tempo seriam
  // uma mentira para quem ouve a tela, além de sobreposição na tela.
  const abrirGaveta = () => {
    setAjustes(false);
    setBusca(false);
    setGaveta((v) => !v);
  };
  const abrirAjustes = () => {
    setGaveta(false);
    setBusca(false);
    setAjustes((v) => !v);
  };
  const abrirBusca = () => {
    setGaveta(false);
    setAjustes(false);
    setBusca((v) => !v);
  };
  // depois do `abrirBusca` porque o passa ao atalho de teclado ("/" e
  // Ctrl+K, item 8) — a ordem dos hooks não muda entre renders
  useAtalhos(directorRef, setPaused, abrirBusca);

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
   * máquina do tempo re-renderiza o App a 4 Hz, e sem ele as ~5 mil
   * chaves seriam reconstruídas quatro vezes por segundo enquanto o céu
   * anda. Trocar de fase é raro e acontece atrás do véu — os 9 ms de
   * reconstrução cabem lá.
   *
   * OS DEZ CORPOS DO SISTEMA só entram na fase que sabe enquadrar
   * órbitas. No voo livre a escolha VOA, e a lei de aproximação de lá é
   * de estrelas: voar até a Terra pararia a 0,8 pc dela, ou seja,
   * prometeria um destino que a fase não entrega.
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
        phase === 'atlas' ? (directorRef.current?.corpos ?? []) : []
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nomeadas, phase, tempo?.aviso]
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
    alternarCamada,
  } = useEspelhoDaUrl({ directorRef, phase, foco, tempo, indice, quality });

  const inJourney = phase === 'journey';
  // As peças que só decidem PRESENÇA por fase saem do mapa único
  // (`fases.ts`); as condições compostas continuam aqui, sobre ele.
  const hud = HUD_POR_FASE[phase];
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
        aria-label="Simulação tridimensional da viagem pelo catálogo HYG e pela Via Láctea"
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
            {window.matchMedia?.('(pointer: coarse)').matches ? (
              <>
                <span data-spot="olhar">toque e arraste — olhar</span> ·{' '}
                <span data-spot="visitar">toque num nome — visitar</span>
              </>
            ) : (
              <>
                <span data-spot="olhar">arrastar — olhar</span> ·{' '}
                <span data-spot="voar">wasd/qe — voar</span> · z/x — rolar · roda —
                velocidade
                <br />
                <span data-spot="visitar">clique num nome — viajar até a estrela</span>
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
                  {capturaNegada
                    ? 'este navegador não devolveu a captura do ponteiro'
                    : capturado
                      ? 'ponteiro capturado — esc devolve'
                      : 'capturar o ponteiro'}
                </button>
              </>
            )}
          </div>
        )}

        {/* dica do pausar-e-olhar */}
        {inJourney && paused && (
          <div className="free-hint">
            arraste — olhar ao redor · espaço — retomar a viagem
          </div>
        )}
        </div>
      )}

      {/* linha de rumo: para onde estamos indo, com distância viva */}
      {hud.rumo && dest && <div className="dest-line">{dest}</div>}

      {/* distância viva do Sol — a prova do afastamento (voo livre) */}
      {hud.sol && sol && <div className="sol-line">{sol}</div>}

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
        />
      )}

      {/* o que está EM QUADRO no Atlas — e os dois gestos da escada */}
      {hud.contexto && (
        <ContextLine
          foco={foco}
          podeAproximar={escada.podeAproximar}
          noSistema={escada.degrau === 'sistema'}
          onAproximar={() => directorRef.current?.aproximarDoCorpo()}
          onSistema={() => directorRef.current?.focarNoSistema()}
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
          {hud.tempo && tempo && (
            <BarraDoTempo
              tempo={tempo}
              onSentido={(s: SentidoDoTempo) => directorRef.current?.andarNoTempo(s)}
              onDegrau={() => directorRef.current?.ciclarDegrau()}
              onAoVivo={() => directorRef.current?.alternarAoVivo()}
              onEpoca={() => directorRef.current?.voltarAEpoca()}
            />
          )}
          {/* A DICA DESCREVE OS GESTOS REAIS (Onda 7). "girar em torno
              do alvo" era promessa de um eixo que não existia: o arrasto
              tinha um eixo só e ele subia em LATITUDE. Agora são dois —
              a horizontal gira em torno do alvo, a vertical sobe e desce
              — e a roda move a escada em degraus.

              O COMPRIMENTO É ORÇAMENTO, não gosto: a dica mora na mesma
              coluna da máquina do tempo, então cada linha que ela ganha
              empurra a barra para cima e come o retângulo útil (é o juiz
              de a11y quem cobra, `base declarada ≥ medida`). MEDIDO em
              `ui = 1,4` e 900 px de largura — o canto mais apertado da
              faixa declarada —, a quebra da 2ª para a 3ª linha acontece
              entre 68 e 70 caracteres, e a 3ª linha estoura a base
              declarada (0,328 contra 0,310). Daí "clique — enquadrar" e
              não "clique num nome — enquadrar". O item 8 pôs o Esc na
              tela DENTRO do mesmo orçamento: "girar e subir/descer"
              virou "girar" para "esc — subir" caber — 67 de 68. */}
          <div className="free-hint">
            arraste — girar · roda — degraus · clique — enquadrar · esc — subir
          </div>

          {/* O SELO. Lê o estado da vista do Director a cada render — e o
              render acontece quando o foco muda, que é quando a vista
              muda (dentro de um enquadramento a câmera não anda
              sozinha). É o ÚLTIMO da coluna porque é o que cede: na tela
              estreita ele fica encostado na tarja de baixo, como no
              canto de mesa, e a leitura desce controle → gesto → selo. */}
          {hud.selo && directorRef.current && (
            <Selo
              vista={directorRef.current.selo}
              onEscalaReal={() => directorRef.current?.focarNoSistema()}
              onBrilhoReal={voltarAoBrilhoReal}
            />
          )}
        </div>
      )}

      {/* controles */}
      {hud.controles && (
        <div className="controls-bar">
          {hud.botaoReviver && (
            <button className="hud-btn small" onClick={play}>
                  ↻ Reviver
            </button>
          )}
          {/* O PORTAL. Só no pausar-e-olhar: é o único momento do filme
              em que o visitante já parou por conta própria e a pergunta
              "onde é isso?" tem lugar (D3). */}
          {inJourney && paused && (
            <button className="hud-btn small" onClick={entrarNoAtlas}>
              Entrar no Atlas
            </button>
          )}
          {hud.busca && <BotaoDaBusca aberta={busca} onAlternar={abrirBusca} />}
          {hud.gaveta && (
            <BotaoDaGaveta aberta={gaveta} onAlternar={abrirGaveta} />
          )}
          {hud.botaoPartir && (
            <button className="hud-btn small" onClick={partirDoAtlas}>
              Partir
            </button>
          )}
          {hud.botoesDaViagem && (
            <>
              <button
                className="hud-btn small"
                onClick={togglePause}
                aria-label={paused ? 'Retomar a viagem' : 'Pausar a viagem'}
              >
                {paused ? '⏵ Retomar' : '⏸ Pausar'}
              </button>
              <button
                className="hud-btn small"
                onClick={() =>
                  setRate(directorRef.current?.cyclePlaybackRate() ?? 1)
                }
                aria-label="Velocidade de reprodução"
                title="← → pulam de capítulo"
              >
                {rate}×
              </button>
              <button className="hud-btn small reveal-btn" onClick={revealGalaxy}>
                Ver a galáxia
              </button>
              <button className="hud-btn small" onClick={freeRoam}>
                Explorar livremente
              </button>
            </>
          )}
          {/* O SELETOR DE QUALIDADE — quatro estados desde os Ajustes D
              (o Auto é o quarto). Os rótulos saem da tabela única
              (`QUALIDADES`, atlasConfig), NUNCA digitados aqui: o painel
              oferece a mesma lista e as duas discordariam no primeiro
              estado novo.

              O RÓTULO DO AUTO NÃO CARREGA O TIER VIVO, e é orçamento de
              largura, não descuido: um `<select>` nativo se dimensiona
              pela opção MAIS LARGA, então "⟳ Auto · performance" alargaria
              a barra de controles em toda tela — inclusive nas estreitas
              que o juiz de a11y mede com o texto em 140%. O tier em que o
              Auto pousou é dito onde há espaço para dizê-lo: no `title`
              (abaixo) e na nota do painel.

              O `aria-label` FICA PARADO enquanto o `title` anda: nome
              acessível que muda a cada janela de medida desorienta quem
              ouve a tela — o que muda é ESTADO, e estado se anuncia pela
              região `aria-live` do painel, não renomeando o controle. */}
          <select
            className="hud-btn small"
            aria-label="Qualidade gráfica"
            title={rotuloDaQualidade(quality)}
            value={quality.escolha}
            onChange={(e) => changeQuality(e.target.value as EscolhaDeQualidade)}
          >
            {QUALIDADES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.simbolo} {q.nome}
              </option>
            ))}
          </select>
          <button
            className="hud-btn small"
            onClick={abrirAjustes}
            aria-label="Ajustes de renderização"
            {...gatilhoDoDialogo('ajustes', ajustes)}
          >
            ⚙ Ajustes
          </button>
        </div>
      )}

      {/* A GAVETA DE CAMADAS do Atlas — filha DIRETA de .hud-root, como o
          painel de Ajustes e o véu: é assim que o ?shot=2 a esconde
          junto com o resto do HUD (a regra do .bare-mode só alcança
          filhos diretos). */}
      <GavetaDeCamadas
        aberta={gaveta && hud.gaveta}
        onFechar={() => setGaveta(false)}
        escondidas={escondidas}
        onCamada={alternarCamada}
      />

      {/* A PALETA DE BUSCA (F3) — filha DIRETA de .hud-root, como todo
          overlay da casa. Fechar DESMONTA (precedente do Convite): é o
          que faz a consulta anterior não sobrar para a próxima abertura.
          O verbo vem da fase: no Atlas a escolha enquadra, no voo livre
          ela voa. */}
      {busca && hud.busca && (
        <PaletaDeBusca
          onFechar={() => setBusca(false)}
          indice={indice}
          verbo={phase === 'atlas' ? 'enquadrar' : 'visitar'}
          onEscolher={(entrada) => escolherAlvo(entrada, directorRef.current)}
        />
      )}

      <Ajustes
        aberto={ajustes}
        onFechar={() => setAjustes(false)}
        qualidade={quality}
        onQualidade={changeQuality}
        tom={tom}
        onTom={trocarTom}
        exposicao={exposicao}
        onExposicao={trocarExposicao}
        escalaUi={escalaUi}
        onEscalaUi={trocarEscalaUi}
        escondidas={escondidas}
        onCamada={alternarCamada}
        urlParaCopiar={() => urlComMomento().toString()}
        onReverConvite={
          hud.dicaDeVoo
            ? () => {
                setAjustes(false);
                setConvite(0);
              }
            : undefined
        }
      />

      {/* O CONVITE — filho DIRETO de .hud-root como todo overlay da casa
          (a regra do .bare-mode só alcança filhos diretos). Ele só existe
          onde os três gestos são verdade: no voo livre, onde a dica que
          ele aponta está na tela. */}
      {convite !== null && hud.dicaDeVoo && (
        <Convite passo={convite} onPasso={setConvite} onFechar={fecharConvite} />
      )}

      {/* tela de título / fim — montada desde o primeiro frame, por baixo
          da loading: é o crossfade entre camadas persistentes que tira o
          flash da troca */}
      <TitleVeil
        visible={hud.veuDeTitulo}
        mode={phase === 'end' ? 'end' : 'intro'}
        onPlay={play}
        onExplore={freeRoam}
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
      {loadingMontada && !bareMode && (
        <LoadingVeil
          stage={loaderFixo ?? loadStage}
          state={loaderState}
          still={movimentoReduzido || shotMode}
          error={loadError}
          onRetry={() => window.location.reload()}
        />
      )}
    </div>
  );
}
