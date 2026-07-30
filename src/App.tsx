// ============================================================
// App — canvas WebGL + HUD cinematográfico sobre a simulação.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Director } from './three/director';
import type { Phase } from './three/director';
import type { QualityLevel } from './three/core/engine';
import { LabelCanvas } from './components/LabelCanvas';
import { TitleVeil, Caption, ProgressBar } from './components/Hud';
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
  const [quality, setQuality] = useState<QualityLevel>('cinema');
  const [loadError, setLoadError] = useState('');

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
    });
    directorRef.current = d;
    void d
      .init()
      .then(() => {
        if (cancelled) return;
        setTicks(d.progressTicks);
        const query = new URLSearchParams(window.location.search);
        const qualityParam = query.get('q') as QualityLevel | null;
        if (qualityParam && ['cinema', 'alta', 'performance'].includes(qualityParam)) {
          d.setQuality(qualityParam);
        }

        // Um único ?t= permite inspeção determinística sem URLs frágeis com "&".
        const hasTime = query.has('t');
        if (hasTime || query.get('play')) {
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

  const play = () => directorRef.current?.play();
  const freeRoam = () => directorRef.current?.enterFreeRoam();
  const revealGalaxy = () => {
    directorRef.current?.play();
    directorRef.current?.seek(156);
  };
  const changeQuality = (q: QualityLevel) => {
    directorRef.current?.setQuality(q);
  };

  const inJourney = phase === 'journey';
  const showVeil = phase === 'loading' || phase === 'intro' || phase === 'end';

  return (
    <div ref={rootRef} className="hud-root">
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

      {/* progresso */}
      {inJourney && <ProgressBar progressRef={progressRef} ticks={ticks} />}

      {/* dica do modo livre */}
      {phase === 'free' && (
        <div className="free-hint">
          arrastar — olhar · wasd/qe — voar
          <br />
          roda do mouse — velocidade
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
        </div>
      )}

      {/* tela de título / loading / fim */}
      <TitleVeil
        visible={showVeil || Boolean(loadError)}
        mode={
          loadError ? 'error' : phase === 'loading' ? 'loading' : phase === 'intro' ? 'intro' : 'end'
        }
        onPlay={play}
        error={loadError}
      />
    </div>
  );
}
