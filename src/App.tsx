// ============================================================
// App — canvas WebGL + HUD cinematográfico sobre a simulação.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Director } from './three/director';
import type { Phase } from './three/director';
import type { QualityLevel, ToneMapMode } from './three/core/engine';
import { TONE_MAPPINGS } from './three/core/engine';
import { LabelCanvas } from './components/LabelCanvas';
import { TitleVeil, Caption, ProgressBar } from './components/Hud';
import { Ajustes } from './components/Ajustes';
import './hud.css';

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
  const [ticks, setTicks] = useState<number[]>([]);
  const [runtime, setRuntime] = useState(0);
  const [dest, setDest] = useState('');
  const [quality, setQuality] = useState<QualityLevel>('cinema');
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [loadError, setLoadError] = useState('');
  // ?ajustes=1 abre o painel direto: uma configuração inteira cabe num link,
  // inclusive com o painel visível para conferência.
  const [ajustes, setAjustes] = useState(
    new URLSearchParams(window.location.search).has('ajustes')
  );

  useEffect(() => {
    if (!canvasRef.current || !labelCanvasRef.current) return;
    let cancelled = false;
    const labels = new LabelCanvas(labelCanvasRef.current);
    const d = new Director(canvasRef.current, {
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
    });
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

        // Um único ?t= permite inspeção determinística sem URLs frágeis com "&".
        const hasTime = query.has('t');
        if (!pos && (hasTime || query.get('play'))) {
          const time = Number.parseFloat(query.get('t') ?? '0');
          d.play();
          if (Number.isFinite(time) && time > 0) d.seek(time);
          d.freezeJourney = hasTime || query.has('freeze');
        }
      })
      .catch((error: unknown) => {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
        console.error(error);
        setLoadError(error instanceof Error ? error.message : 'Não foi possível iniciar a simulação.');
      });
    return () => {
      cancelled = true;
      labels.clear();
      d.dispose();
    };
  }, []);

  // pausa via botão ou tecla Espaço — um filme de mais de 5 min precisa disso
  const togglePause = () => {
    setPaused(directorRef.current?.togglePause() ?? false);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const d = directorRef.current;
      if (!d) return;
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
  const changeQuality = (q: QualityLevel) => {
    directorRef.current?.setQuality(q);
  };

  const inJourney = phase === 'journey';
  const showVeil = phase === 'loading' || phase === 'intro' || phase === 'end';
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
      <div className={`letterbox top ${phase !== 'loading' ? 'on' : ''}`} />
      <div className={`letterbox bottom ${phase !== 'loading' ? 'on' : ''}`} />

      {/* legenda da fase */}
      {inJourney && <Caption caption={caption.text} sub={caption.sub} showKey={caption.idx} />}

      {/* linha de rumo: para onde estamos indo, com distância viva */}
      {inJourney && dest && <div className="dest-line">{dest}</div>}

      {/* progresso (clicável — scrub) */}
      {inJourney && <ProgressBar progressRef={progressRef} ticks={ticks} onScrub={scrub} />}

      {/* dica do modo livre */}
      {phase === 'free' && (
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

      {/* controles */}
      {(inJourney || phase === 'free') && (
        <div className="controls-bar">
          {phase === 'free' && (
            <button className="hud-btn small" onClick={play}>
                  ↻ Reviver
            </button>
          )}
          {inJourney && (
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
            onClick={() => setAjustes((v) => !v)}
            aria-label="Ajustes de renderização"
          >
            ⚙ Ajustes
          </button>
        </div>
      )}

      <Ajustes
        aberto={ajustes}
        onFechar={() => setAjustes(false)}
        qualidade={quality}
        onQualidade={changeQuality}
        onTom={(t) => directorRef.current?.engine.setToneMapping(t)}
        onExposicao={(v) => directorRef.current?.setExposure(v)}
        onCamada={(flag, escondida) =>
          directorRef.current?.setLayerHidden(flag, escondida)
        }
      />

      {/* tela de título / loading / fim */}
      <TitleVeil
        visible={showVeil || Boolean(loadError)}
        mode={
          loadError ? 'error' : phase === 'loading' ? 'loading' : phase === 'intro' ? 'intro' : 'end'
        }
        onPlay={play}
        onExplore={freeRoam}
        runtime={runtime}
        error={loadError}
      />
    </div>
  );
}
