// ============================================================
// App — canvas WebGL + HUD cinematográfico sobre a simulação.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Director, LOAD_STAGES } from './three/director';
import type { LoadStage, Phase } from './three/director';
import { HUD_POR_FASE } from './three/fases';
import type { QualityLevel, ToneMapMode } from './three/core/engine';
import { TONE_MAPPINGS } from './three/core/engine';
import { LabelCanvas } from './components/LabelCanvas';
import { gatilhoDoDialogo } from './lib/dialogFocus';
import { sondarGl } from './lib/glProbe';
import { TitleVeil, LoadingVeil, Caption, ProgressBar } from './components/Hud';
import { ContextLine, GavetaDeCamadas, BotaoDaGaveta } from './components/HudDoAtlas';
import { Ajustes } from './components/Ajustes';
import { CAMADAS } from './three/atlasConfig';
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
  const [loadError, setLoadError] = useState(() =>
    sondarGl().suportado
      ? ''
      : 'Este navegador está sem WebGL utilizável — a Viagem precisa dele para desenhar a galáxia. Atualize o navegador ou ative a aceleração de hardware e tente de novo.'
  );
  const [loadStage, setLoadStage] = useState<LoadStage>(LOAD_STAGES[0]);
  // a loading é camada persistente: só desmonta DEPOIS do merge terminar
  const [loadingMontada, setLoadingMontada] = useState(true);
  // ?ajustes=1 abre o painel direto: uma configuração inteira cabe num link,
  // inclusive com o painel visível para conferência.
  const [ajustes, setAjustes] = useState(
    new URLSearchParams(window.location.search).has('ajustes')
  );
  const [gaveta, setGaveta] = useState(false);
  // O ESTADO DE GOSTO, com um dono só (F2). Ele nasce da URL — que segue
  // sendo a fonte de verdade — e é lido por três hospedeiros: o painel de
  // Ajustes, a gaveta do Atlas e o selo de honestidade. Enquanto morava
  // dentro do painel, o segundo hospedeiro nascia mentindo.
  const [tom, setTom] = useState<ToneMapMode>(
    () => (new URLSearchParams(window.location.search).get('tone') as ToneMapMode) || 'aces'
  );
  const [exposicao, setExposicao] = useState(
    () => Number(new URLSearchParams(window.location.search).get('exp') ?? EXPOSICAO_PADRAO)
  );
  const [escondidas, setEscondidas] = useState<Set<string>>(() => {
    const q = new URLSearchParams(window.location.search);
    return new Set(CAMADAS.filter((c) => q.has(c.flag)).map((c) => c.flag));
  });
  /** o que está EM QUADRO no Atlas; null = o enquadramento de abertura */
  const [foco, setFoco] = useState<string | null>(null);

  // ?loader=<id> fixa uma etapa da tela de carregamento e a mantém no ar
  // depois que o init termina — com &shot=1 (que congela transições e o
  // relógio visual) a captura de cada etapa é determinística.
  const [loaderFixo] = useState(
    () =>
      LOAD_STAGES.find(
        (s) => s.id === new URLSearchParams(window.location.search).get('loader')
      ) ?? null
  );
  // prefers-reduced-motion: composição estática, crossfade simples
  const [movimentoReduzido] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  useEffect(() => {
    if (!canvasRef.current || !labelCanvasRef.current) return;
    // sem GL utilizável (veredito da sonda, já no estado inicial): não há
    // Director a construir — o véu de erro com retry já está na tela
    if (!sondarGl().suportado) return;
    let cancelled = false;
    const labels = new LabelCanvas(labelCanvasRef.current);
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
        const query = new URLSearchParams(window.location.search);
        const qualityParam = query.get('q') as QualityLevel | null;
        if (qualityParam && ['cinema', 'alta', 'performance'].includes(qualityParam)) {
          d.setQuality(qualityParam);
        }

        // ?tone= e ?exp= — os ajustes de gosto também são URL, para que uma
        // configuração vire link e a captura headless veja o mesmo que a tela.
        const tone = query.get('tone') as ToneMapMode | null;
        if (tone && tone in TONE_MAPPINGS) d.engine.setToneMapping(tone);
        const exposure = Number(query.get('exp'));
        if (Number.isFinite(exposure) && exposure > 0) d.setExposure(exposure);

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

        // PRECEDÊNCIA DECLARADA: `?pos=` > `?atlas=1` > `?t=`/`?play=`.
        // `?pos=` é a régua das capturas e não cede a ninguém; `?atlas=1`
        // ganha do instante porque o Atlas é MODO, e o instante que
        // vier junto vira só o momento de volta do "Partir" (é assim que
        // o link copiado de dentro do Atlas fecha o círculo).
        const hasTime = query.has('t');
        const time = Number.parseFloat(query.get('t') ?? '0');
        const momento = Number.isFinite(time) && time > 0 ? time : undefined;
        if (!pos && query.has('atlas')) {
          d.entrarNoAtlas({ instantaneo: true, momento });
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
      d.dispose();
    };
  }, []);

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

  // pausa via botão ou tecla Espaço — um filme de mais de 5 min precisa disso
  const togglePause = () => {
    setPaused(directorRef.current?.togglePause() ?? false);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const d = directorRef.current;
      if (!d) return;
      // Os três atalhos são do FILME. Dentro do Atlas eles não têm
      // sujeito — e Espaço com `preventDefault` roubaria a tecla de
      // quem estiver navegando o modo (D3: "Espaço não vaza").
      if (d.fase === 'atlas') return;
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
   * Mesmo tratamento que o painel já dá às camadas não-vivas: grava na URL e
   * recarrega. Serve os dois controles (seletor do HUD e botões do painel).
   */
  const changeQuality = (q: QualityLevel) => {
    if (q === quality) return;
    const url = urlComMomento();
    if (q === 'cinema') url.searchParams.delete('q');
    else url.searchParams.set('q', q);
    window.location.assign(url.toString());
  };

  const entrarNoAtlas = () => directorRef.current?.entrarNoAtlas();
  const partirDoAtlas = () => directorRef.current?.partirDoAtlas();

  // Um diálogo de cada vez: os dois se ancoram no mesmo canto e os dois
  // se declaram `aria-modal` — dois modais abertos ao mesmo tempo seriam
  // uma mentira para quem ouve a tela, além de sobreposição na tela.
  const abrirGaveta = () => {
    setAjustes(false);
    setGaveta((v) => !v);
  };
  const abrirAjustes = () => {
    setGaveta(false);
    setAjustes((v) => !v);
  };

  // ---- o gosto, escrito num lugar só (estado + Director + URL) -------
  const trocarTom = (t: ToneMapMode) => {
    setTom(t);
    directorRef.current?.engine.setToneMapping(t);
    window.history.replaceState(null, '', comParam('tone', t === 'aces' ? null : t));
  };

  const trocarExposicao = (v: number) => {
    setExposicao(v);
    directorRef.current?.setExposure(v);
    window.history.replaceState(
      null,
      '',
      comParam('exp', v === EXPOSICAO_PADRAO ? null : String(v))
    );
  };

  const alternarCamada = (flag: string, ligar: boolean) => {
    const camada = CAMADAS.find((c) => c.flag === flag);
    if (!camada) return;
    if (!camada.viva) {
      // lidas no bake do mundo — reload de verdade
      window.location.assign(comParam(flag, ligar ? null : '1'));
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
        className="scene-canvas"
        aria-label="Simulação tridimensional da viagem pelo catálogo HYG e pela Via Láctea"
      />
      <canvas ref={labelCanvasRef} className="label-canvas" aria-hidden="true" />

      {/* vinheta de warp reativa */}
      <div className="warp-vignette" />

      {/* letterbox */}
      <div className={`letterbox top ${hud.letterbox ? 'on' : ''}`} />
      <div className={`letterbox bottom ${hud.letterbox ? 'on' : ''}`} />

      {/* legenda da fase */}
      {hud.legenda && <Caption caption={caption.text} sub={caption.sub} showKey={caption.idx} />}

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

      {/* dica do modo livre */}
      {hud.dicaDeVoo && (
        <div className="free-hint">
          {window.matchMedia?.('(pointer: coarse)').matches ? (
            <>toque e arraste — olhar · toque num nome — visitar</>
          ) : (
            <>
              arrastar — olhar · wasd/qe — voar · z/x — rolar · roda — velocidade
              <br />
              clique num nome — viajar até a estrela
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

      {/* o que está EM QUADRO no Atlas */}
      {hud.contexto && <ContextLine foco={foco} />}

      {/* dica do Atlas */}
      {phase === 'atlas' && (
        <div className="free-hint">
          arraste — girar em torno do alvo · clique num nome — enquadrar
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

      <Ajustes
        aberto={ajustes}
        onFechar={() => setAjustes(false)}
        qualidade={quality}
        onQualidade={changeQuality}
        tom={tom}
        onTom={trocarTom}
        exposicao={exposicao}
        onExposicao={trocarExposicao}
        escondidas={escondidas}
        onCamada={alternarCamada}
        urlParaCopiar={() => urlComMomento().toString()}
      />

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
