// ============================================================
// App — canvas WebGL + HUD cinematográfico sobre a simulação.
// ============================================================
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Director, LOAD_STAGES } from './three/director';
import type { EstadoDaEscada, LoadStage, Phase } from './three/director';
import type { NamedStar } from './three/config';
import { HUD_POR_FASE, arrastoFazAlgo } from './three/fases';
import type { QualityLevel, ToneMapMode } from './three/core/engine';
import { lerPortaExposicao, lerPortaTom } from './three/core/engine';
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
import { chaveDoFoco, construirIndice, resolverFoco } from './lib/buscaEstrelas';
import type { EntradaDaBusca } from './lib/buscaEstrelas';
import { lerPortaVer } from './three/selo';
import type { VerDaEscada } from './three/selo';
import { Convite } from './components/Spotlight';
import { Ajustes } from './components/Ajustes';
import { CAMADAS } from './three/atlasConfig';
import { estadoDoSelo } from './three/selo';
import { gravarPreferencia, lerPreferencias } from './lib/preferencias';
import { ESCALA_PADRAO, aplicarEscalaDaUi, lerEscalaDaUi } from './lib/uiScale';
import './hud.css';

/** tempo do merge (núcleo 1,8 s) + folga antes de desmontar a loading */
const MERGE_MS = 2200;

/** a exposição de referência da casa — o 1,02 da vista interna */
const EXPOSICAO_PADRAO = 1.02;

/**
 * Reescreve a query preservando tudo que não é o parâmetro tocado.
 * Estava dentro do painel de Ajustes enquanto ele era o único a escrever
 * na URL; com a gaveta do Atlas e o selo mexendo nos mesmos parâmetros,
 * subiu para o dono do estado.
 */
function comParam(chave: string, valor: string | null) {
  const q = new URLSearchParams(window.location.search);
  if (valor === null) q.delete(chave);
  else q.set(chave, valor);
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ''}`;
}

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
  const [quality, setQuality] = useState<QualityLevel>('cinema');
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
  // O ESTADO DE GOSTO, com um dono só (F2). Ele nasce da URL — que segue
  // sendo a fonte de verdade — e é lido por três hospedeiros: o painel de
  // Ajustes, a gaveta do Atlas e o selo de honestidade. Enquanto morava
  // dentro do painel, o segundo hospedeiro nascia mentindo.
  // ...pela MESMA lei que o engine aplica (`lerPortaTom`/`lerPortaExposicao`
  // em core/engine): antes o inicializador lia cru e só o caminho do
  // Director validava, então `?tone=foo` deixava os quatro rádios
  // desmarcados e `?exp=abc` pintava "Exposição · NaN" num slider com
  // `value={NaN}` — o HUD mentindo sobre o que o instrumento faz.
  const [tom, setTom] = useState<ToneMapMode>(
    () => lerPortaTom(new URLSearchParams(window.location.search).get('tone')) ?? 'aces'
  );
  const [exposicao, setExposicao] = useState(
    () =>
      lerPortaExposicao(new URLSearchParams(window.location.search).get('exp')) ??
      EXPOSICAO_PADRAO
  );
  const [escondidas, setEscondidas] = useState<Set<string>>(() => {
    const q = new URLSearchParams(window.location.search);
    return new Set(CAMADAS.filter((c) => q.has(c.flag)).map((c) => c.flag));
  });
  /** o que está EM QUADRO no Atlas; null = o enquadramento de abertura */
  const [foco, setFoco] = useState<string | null>(null);
  /** o DEGRAU da escada (F2b/D7) — decide os botões da ContextLine e o
   *  `?ver=corpo` do link; publicado pelo Director junto com o foco */
  const [escada, setEscada] = useState<EstadoDaEscada>({
    degrau: 'sistema',
    podeAproximar: false,
  });
  /**
   * O TAMANHO DO TEXTO DO HUD (`?ui=`, F6). Nasce da URL como todo
   * gosto da casa e NUNCA vai ao storage — quem quiser o texto maior
   * leva o tamanho no link, junto do instante da viagem.
   */
  const [escalaUi, setEscalaUi] = useState(() =>
    lerEscalaDaUi(new URLSearchParams(window.location.search).get('ui'))
  );
  /**
   * O MOSTRADOR DA MÁQUINA DO TEMPO (F4). Estado e não leitura direta
   * como a do selo: o relógio do céu anda sozinho, e é a chegada deste
   * evento — a 4 Hz, nunca por quadro — que faz o HUD redesenhar.
   */
  const [tempo, setTempo] = useState<EstadoDoTempo | null>(null);

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

  // ANTES DE PINTAR, e antes do Director existir: o `--ui` da raiz é o
  // que move os `rem` do HUD e o termo `vw` dos `clamp`, e o número
  // vivo é o que o retângulo útil do Atlas lê a cada quadro. Efeito de
  // layout (não `useEffect`) para não haver um quadro com o tamanho
  // errado quando o link já chega com `?ui=`.
  useLayoutEffect(() => {
    aplicarEscalaDaUi(escalaUi);
  }, [escalaUi]);

  useEffect(() => {
    if (!canvasRef.current || !labelCanvasRef.current) return;
    // sem WebGL2 (veredito da sonda, já no estado inicial): não há
    // Director a construir — o véu de erro com retry já está na tela
    if (!sondarGl().webgl2) return;
    let cancelled = false;
    const labels = new LabelCanvas(labelCanvasRef.current);
    labelsRef.current = labels;
    let d: Director;
    try {
      d = new Director(canvasRef.current, {
      onPhase: setPhase,
      onCaption: (idx, text, sub) => setCaption({ idx, text, sub }),
      onProgress: (progress) => {
        progressRef.current?.style.setProperty('--journey-progress', `${progress}`);
      },
      onLabels: (nextLabels) => labels.draw(nextLabels),
      onWarp: (warp) => {
        rootRef.current?.style.setProperty('--warp', `${warp}`);
      },
      onQuality: setQuality,
      onDest: setDest,
      onStage: setLoadStage,
      // custom property, como o warp: o véu do Atlas anda a 60 Hz e um
      // setState por quadro re-renderizaria o HUD inteiro à toa
      onVeu: (k) => {
        rootRef.current?.style.setProperty('--veu-atlas', `${k}`);
      },
      onFoco: setFoco,
      onTempo: setTempo,
      onEscada: setEscada,
      });
    } catch (error) {
      // a sonda passou mas a criação real falhou (contexto despejado,
      // driver caindo): mesmo véu de erro, mesmo retry. O microtask tira
      // o setState do corpo síncrono do effect (regra do lint).
      console.error(error);
      queueMicrotask(() =>
        setLoadError(
          error instanceof Error ? error.message : 'Não foi possível criar o renderizador.'
        )
      );
      return () => labels.clear();
    }
    directorRef.current = d;
    // gancho de inspeção (só dev): estado da câmera/fase no console
    if (import.meta.env.DEV) {
      (window as unknown as { __director?: Director }).__director = d;
    }
    void d
      .init()
      .then(() => {
        if (cancelled) return;
        setTicks(d.progressTicks);
        setRuntime(d.journeyDuration);
        setNomeadas(d.nomeadas);
        const query = new URLSearchParams(window.location.search);
        const qualityParam = query.get('q') as QualityLevel | null;
        if (qualityParam && ['cinema', 'alta', 'performance'].includes(qualityParam)) {
          d.setQuality(qualityParam);
        }

        // ?tone= e ?exp= — os ajustes de gosto também são URL, para que uma
        // configuração vire link e a captura headless veja o mesmo que a tela.
        const tone = lerPortaTom(query.get('tone'));
        if (tone) d.engine.setToneMapping(tone);
        const exposure = lerPortaExposicao(query.get('exp'));
        if (exposure !== null) d.setExposure(exposure);

        // ?pos=x,y,z[&look=x,y,z][&fov=graus] — câmera livre determinística
        // em qualquer ponto da galáxia (screenshots/inspeção; o fov só faz
        // sentido aqui — na viagem o roteiro comanda a lente).
        const parse = (s: string | null) => {
          const v = (s ?? '').split(',').map(Number);
          return v.length === 3 && v.every(Number.isFinite)
            ? (v as [number, number, number])
            : null;
        };
        const pos = parse(query.get('pos'));
        if (pos) {
          d.placeCamera(pos, parse(query.get('look')) ?? undefined);
          const fov = Number(query.get('fov'));
          if (Number.isFinite(fov) && fov >= 15 && fov <= 140) {
            d.engine.camera.fov = fov;
            d.engine.camera.updateProjectionMatrix();
          }
        } else if (query.get('pos')) console.warn('?pos= inválido:', query.get('pos'));

        // PRECEDÊNCIA DECLARADA: `?pos=` > `?atlas=1`/`?foco=` > `?t=`/`?play=`.
        // `?pos=` é a régua das capturas e não cede a ninguém; `?atlas=1`
        // ganha do instante porque o Atlas é MODO, e o instante que
        // vier junto vira só o momento de volta do "Partir" (é assim que
        // o link copiado de dentro do Atlas fecha o círculo).
        //
        // `?foco=` ENTRA NO ATLAS SOZINHA (F3), e é decisão: focar é
        // coisa que só existe no Atlas — um link de foco que caísse no
        // meio do filme não teria onde pousar. Ela vem depois da entrada
        // porque enquadra a partir da vista de abertura, pelo mesmo
        // caminho do clique num nome.
        const hasTime = query.has('t');
        const time = Number.parseFloat(query.get('t') ?? '0');
        const momento = Number.isFinite(time) && time > 0 ? time : undefined;
        const foco = query.get('foco');
        if (!pos && (query.has('atlas') || foco)) {
          d.entrarNoAtlas({ instantaneo: true, momento });
          if (foco) {
            // o índice local não duplica o da paleta: aquele nasce num
            // `useMemo` que ainda não rodou (o estado das nomeadas está
            // sendo publicado neste mesmo tick), e este morre na linha
            // seguinte. A conta é uma passada nas 1.726.
            const achado = resolverFoco(foco, construirIndice(d.nomeadas, d.corpos));
            // `?ver=corpo` (F2b/D7) desce ao degrau do corpo — a lei
            // única da porta (`lerPortaVer`); inválido cai no default
            // `orbita`, a semântica de sempre do `?foco=`
            if (achado) {
              escolherAlvo(achado.entrada, d, lerPortaVer(query.get('ver')) ?? 'orbita');
            }
            // sem palpite: a linha de contexto vai mostrar o sistema, que
            // é o que ficou de fato em quadro (precedente do `?pos=`)
            else console.warn('?foco= não encontrou alvo:', foco);
          }
        } else if (!pos && (hasTime || query.get('play'))) {
          d.play();
          if (momento !== undefined) d.seek(momento);
          // ?t= sozinho continua CONGELANDO (contrato das capturas: o
          // harness usa ?t=…&shot=2, sem play). Com &play=1 o mesmo ?t= vira
          // retomada viva — é assim que a troca de qualidade e o link
          // compartilhado devolvem o espectador ao momento em que estava.
          d.freezeJourney = (hasTime && !query.has('play')) || query.has('freeze');
        }
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
        console.error(error);
        // a tela de erro fica; o contexto WebGL e os render targets já
        // criados no construtor, não — a sessão morta não renderiza mais
        d.dispose();
        setLoadError(error instanceof Error ? error.message : 'Não foi possível iniciar a simulação.');
      });
    return () => {
      cancelled = true;
      labels.clear();
      labelsRef.current = null;
      d.dispose();
    };
  }, []);

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

  // pausa via botão ou tecla Espaço — um filme de mais de 5 min precisa disso
  const togglePause = () => {
    setPaused(directorRef.current?.togglePause() ?? false);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const d = directorRef.current;
      if (!d) return;
      // Os três atalhos do FILME não têm sujeito dentro do Atlas — e
      // Espaço com `preventDefault` roubaria a tecla de quem estiver
      // navegando o modo (D3: "Espaço não vaza"). O que o Atlas TEM é o
      // Esc da ESCADA (F2b/D7): sobe um degrau. A interação com os
      // diálogos, por escrito: DIÁLOGO ABERTO COME O Esc PRIMEIRO — o
      // `dialogFocus` o trata no contêiner com `preventDefault` (e o
      // contêiner dispara antes desta janela, na fase de bubbling), e a
      // guarda dupla (`defaultPrevented` + presença de `[data-dialogo]`
      // no DOM) cobre o caso do foco fora do diálogo. Só o Esc que
      // NINGUÉM reivindicou sobe a escada.
      if (d.fase === 'atlas') {
        if (
          event.code === 'Escape' &&
          !event.defaultPrevented &&
          !document.querySelector('[data-dialogo]')
        ) {
          if (d.subirDegrau()) event.preventDefault();
        }
        return;
      }
      // Espaço e ←/→ são atalhos da JANELA, com preventDefault. Sem esta
      // guarda eles roubam as teclas de quem está num controle: no painel
      // de Ajustes, o slider de exposição não andava com as setas e as
      // caixas não marcavam com Espaço — as teclas iam para o filme.
      if (
        (event.target as HTMLElement | null)?.closest(
          'input, select, textarea, button, [contenteditable]'
        )
      ) {
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        setPaused(d.togglePause());
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        d.skipChapter(1);
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        d.skipChapter(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  /**
   * A URL de agora, com o MOMENTO da viagem dentro. Era o buraco comum de
   * três incômodos: trocar a qualidade recarregava e devolvia o espectador à
   * tela de título, "copiar link" copiava a configuração sem o instante, e
   * quem recarregava perdia onde estava. `play=1` acompanha o `t=` para a
   * viagem voltar ANDANDO — `?t=` sozinho congela, e assim continua, porque
   * é o contrato das capturas headless.
   */
  const urlComMomento = () => {
    const url = new URL(window.location.href);
    // ferramenta de captura NÃO viaja no link copiado (auditoria item
    // 4): `?loader=` numa URL compartilhada prenderia o véu na tela de
    // quem a abrisse com ?shot= — e sem ?shot= seria porta morta.
    url.searchParams.delete('loader');
    const d = directorRef.current;
    if (!d) return url;
    // de dentro do Atlas o link volta PARA o Atlas, com o momento que o
    // portal guardou pendurado — quem abrir o link e clicar em "Partir"
    // cai no mesmo instante de quem o copiou
    const instante =
      phase === 'atlas'
        ? d.momentoGuardado
        : phase === 'journey' || phase === 'end'
          ? d.currentTime
          : null;
    if (phase === 'atlas') url.searchParams.set('atlas', '1');
    else url.searchParams.delete('atlas');
    // O ALVO EM QUADRO (F3) viaja junto, e só de dentro do Atlas: é lá
    // que "foco" quer dizer alguma coisa. A chave é a canônica da lib
    // (hd/hip quando existem), e ela some da URL quando o que está em
    // quadro é o sistema — que é o enquadramento de abertura, o padrão.
    //
    // O QUE ESTA LINHA NÃO PROMETE, declarado: o foco que NÃO está no
    // índice (o Sagittarius A✱, alcançável pelo clique no rótulo) não tem
    // chave — o link volta ao modo sem o alvo em vez de inventar uma
    // porta que a busca não saberia resolver. É o mesmo alcance da D4,
    // dos dois lados. Os dez corpos do sistema ENTRAM: a chave deles é o
    // nome normalizado (`?foco=terra`).
    const emQuadro = foco === null ? null : chaveDoFoco(foco, indice);
    if (phase === 'atlas' && emQuadro) url.searchParams.set('foco', emQuadro);
    else url.searchParams.delete('foco');
    // O DEGRAU (F2b/D7) viaja com o foco — espelho, precedente `?jd=`:
    // `?ver=corpo` só entra quando o enquadramento está de fato no
    // degrau do corpo (a Lua inclusive: `?foco=lua&ver=corpo` reproduz
    // o degrau dela); na órbita a porta sai, porque órbita é o default.
    const ver = directorRef.current?.verDaEscada;
    if (phase === 'atlas' && emQuadro && ver === 'corpo') {
      url.searchParams.set('ver', 'corpo');
    } else url.searchParams.delete('ver');
    // O INSTANTE DO CÉU (F4) viaja junto — pelo mesmo motivo do `t=`: a
    // troca de qualidade e o "voltar ao brilho real" RECARREGAM a página
    // por esta URL, e sem esta linha o visitante que viajou no tempo
    // voltaria à época sem ter pedido. Na época a porta sai da URL em
    // vez de gravar o valor padrão.
    if (tempo && !tempo.naEpoca) url.searchParams.set('jd', String(tempo.jd));
    else url.searchParams.delete('jd');
    if (instante !== null && instante > 0.5) {
      url.searchParams.set('t', instante.toFixed(1));
      url.searchParams.set('play', '1');
    }
    return url;
  };

  /**
   * Metade da qualidade é VIVA (pixelRatio, passos do raymarch) e metade é
   * ASSADA na construção: o tier do Sol congela no construtor do Director e a
   * população da galáxia é decidida no init (regerar 2,6 M partículas no meio
   * da viagem seria pior que a diferença). Trocar só ao vivo entregava um
   * "performance" pela METADE — engine em performance, Sol ainda em high e
   * 2,7 M vértices — e ainda deixava o link copiado sem a qualidade.
   * Grava na URL e recarrega — e serve os dois controles (seletor do HUD e
   * botões do painel).
   *
   * O `?q=` É SEMPRE ESCRITO, cinema inclusive. Tom e exposição podem
   * omitir o valor padrão porque o padrão deles é CONSTANTE; o de
   * qualidade não é — sem `?q=` quem decide é o storage (`tierQueRodou`,
   * alocação medida) ou a detecção, e um `alta` medido na visita passada
   * sobrepunha o clique em Cinema na recarga seguinte. URL sem `?q=` não
   * diz o que a tela mostra, e escolha manual tem de sobreviver ao link.
   */
  const changeQuality = (q: QualityLevel) => {
    if (q === quality) return;
    const url = urlComMomento();
    url.searchParams.set('q', q);
    window.location.assign(url.toString());
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
  const escolherAlvo = (
    entrada: EntradaDaBusca,
    alvo = directorRef.current,
    ver: VerDaEscada = 'orbita'
  ) => {
    if (!alvo) return;
    if (entrada.tipo === 'corpo') alvo.focarNoCorpo(entrada.corpo.id, ver);
    else alvo.visitarEstrela(entrada.estrela);
  };

  // ---- o gosto, escrito num lugar só (estado + Director + URL) -------
  const trocarTom = (t: ToneMapMode) => {
    setTom(t);
    directorRef.current?.engine.setToneMapping(t);
    window.history.replaceState(null, '', comParam('tone', t === 'aces' ? null : t));
  };

  /**
   * O SLIDER DE VOLTA AO PADRÃO DESARMA O LATCH. `setExposure` LIGA o
   * `expOverride` do Director (é o que faz o valor escolhido sobreviver
   * ao quadro seguinte), e o slider o armava até no 1,02 — a tela ficava
   * em 1,02 fixo enquanto a URL, já sem `?exp=`, recarregava na
   * auto-exposição 1,02+0,03·galaxyFade (1,05 na vista externa). Duas
   * telas para a mesma URL. No padrão o caminho é o de volta, o mesmo que
   * a linha BRILHO do selo usa.
   */
  const trocarExposicao = (v: number) => {
    setExposicao(v);
    const d = directorRef.current;
    if (v === EXPOSICAO_PADRAO) d?.limparExposicaoManual();
    else d?.setExposure(v);
    window.history.replaceState(
      null,
      '',
      comParam('exp', v === EXPOSICAO_PADRAO ? null : String(v))
    );
  };

  /**
   * VOLTAR AO BRILHO REAL — a ação da linha BRILHO do selo (D1). Ela não
   * tem lista própria de coisas a desfazer: pergunta ao registro quais
   * caminhos estão ativos AGORA e desfaz os que têm volta.
   *
   * Os de volta 'vivo' são desfeitos no lugar; se houver algum que só o
   * boot lê (`?nobloom=`, `?knee=`, as camadas do bake), o caminho é o
   * mesmo que a troca de qualidade já usa: reescrever a URL sem eles e
   * recarregar — e a URL sai do `urlComMomento`, que carrega o `atlas=1`
   * e o instante guardado, para o visitante voltar exatamente para onde
   * estava. O que não tem volta (o tier) fica, e o selo segue dizendo.
   */
  const voltarAoBrilhoReal = () => {
    const d = directorRef.current;
    if (!d) return;
    const desvios = estadoDoSelo(d.selo).desvios.filter((c) => c.volta !== 'nenhuma');
    if (desvios.length === 0) return;
    const url = urlComMomento();
    for (const c of desvios) url.searchParams.delete(c.chave);
    // A LUZ (Onda 6, D2): o padrão é `assistida`,
    // então apagar a chave da URL a ressuscitaria na recarga. A volta
    // escreve `?luz=real` — a URL vira espelho do estado escolhido.
    if (desvios.some((c) => c.chave === 'luz')) url.searchParams.set('luz', 'real');
    if (desvios.some((c) => c.volta === 'recarregar')) {
      window.location.assign(url.toString());
      return;
    }
    for (const c of desvios) {
      if (c.chave === 'exp') {
        d.limparExposicaoManual();
        setExposicao(EXPOSICAO_PADRAO);
      } else if (c.chave === 'tone') {
        d.engine.setToneMapping('aces');
        setTom('aces');
      } else if (c.chave === 'luz') {
        // volta ao 1/d² cru no próximo quadro (D2 — volta 'vivo')
        d.definirLuz('real');
      } else {
        d.setLayerHidden(c.chave, false);
        setEscondidas((prev) => {
          const s = new Set(prev);
          s.delete(c.chave);
          return s;
        });
      }
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  /**
   * O tamanho do texto do HUD. Muda ao vivo (o `--ui` é lido pelo CSS a
   * cada pintura) e conta como troca de ENQUADRAMENTO para o Atlas: o
   * HUD cresceu, o retângulo útil encolheu, a câmera recua.
   */
  const trocarEscalaUi = (v: number) => {
    setEscalaUi(v);
    directorRef.current?.escalaDaUiMudou();
    window.history.replaceState(
      null,
      '',
      comParam('ui', v === ESCALA_PADRAO ? null : String(v))
    );
  };

  const alternarCamada = (flag: string, ligar: boolean) => {
    const camada = CAMADAS.find((c) => c.flag === flag);
    if (!camada) return;
    if (!camada.viva) {
      // O RAMO DE RECARGA, hoje sem nenhuma camada: as três que passavam
      // por aqui (nodisc/nogdust/noglow) viraram vivas em 2026-08-12. Ele
      // fica como o outro lado do contrato `viva` — uma camada nova que
      // realmente precise reconstruir o mundo cai aqui, com o ↻ do painel
      // junto —, e é a mesma rota que a troca de qualidade usa.
      //
      // Reconstruir o mundo — reload de verdade. E pelo `urlComMomento`,
      // que é o que a troca de qualidade e o "voltar ao brilho real" já
      // fazem: sem ele, desmarcar uma camada ↻ de DENTRO do Atlas (onde a
      // URL costuma estar limpa) recarregava em `/?nodisc=1` e devolvia o
      // visitante à tela de título — modo, foco, instante do céu e alvo em
      // quadro, todos perdidos.
      const url = urlComMomento();
      if (ligar) url.searchParams.delete(flag);
      else url.searchParams.set(flag, '1');
      window.location.assign(url.toString());
      return;
    }
    directorRef.current?.setLayerHidden(flag, !ligar);
    setEscondidas((prev) => {
      const s = new Set(prev);
      if (ligar) s.delete(flag);
      else s.add(flag);
      return s;
    });
    window.history.replaceState(null, '', comParam(flag, ligar ? null : '1'));
  };

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

      {/* O SELO. Lê o estado da vista do Director a cada render — e o
          render acontece quando o foco muda, que é quando a vista muda
          (dentro de um enquadramento a câmera não anda sozinha). */}
      {hud.selo && directorRef.current && (
        <Selo
          vista={directorRef.current.selo}
          onEscalaReal={() => directorRef.current?.focarNoSistema()}
          onBrilhoReal={voltarAoBrilhoReal}
        />
      )}

      {/* O RODAPÉ DO ATLAS: a máquina do tempo (F4) e a dica do modo,
          numa COLUNA só. Eram duas peças `position: fixed` penduradas em
          dois `vh` escolhidos à mão, e a folga entre elas era de 6 px —
          o primeiro degrau de `?ui=` punha uma por cima da outra (F6).
          Numa coluna quem empilha é o fluxo, e a folga passa a ser a
          mesma em qualquer tamanho de texto. */}
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
              não "clique num nome — enquadrar": 68 é o que cabe. */}
          <div className="free-hint">
            arraste — girar e subir/descer · roda — degraus · clique — enquadrar
          </div>
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
          <select
            className="hud-btn small"
            aria-label="Qualidade gráfica"
            value={quality}
            onChange={(e) => changeQuality(e.target.value as QualityLevel)}
          >
            <option value="cinema">◆ Cinema</option>
            <option value="alta">◇ Alta</option>
            <option value="performance">◦ Performance</option>
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
          onEscolher={escolherAlvo}
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
