// ============================================================
// Componentes do HUD — telas de título, legendas e progresso.
// ============================================================
import type { RefObject } from 'react';

export function TitleVeil({
  visible,
  mode,
  onPlay,
  error,
}: {
  visible: boolean;
  mode: 'loading' | 'intro' | 'end' | 'error';
  onPlay: () => void;
  error?: string;
}) {
  return (
    <div
      className={`veil ${visible ? '' : 'hidden-veil'}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      {mode === 'loading' && (
        <>
          <div className="title-kicker">HYG · VIA LÁCTEA · TEMPO REAL</div>
          <div className="title-big loading-pulse">MAR DE ESTRELAS</div>
          <div className="title-sub">cartografando 18.543 estrelas do catálogo HYG…</div>
        </>
      )}
      {mode === 'intro' && (
        <>
          <div className="title-kicker">HYG · VIA LÁCTEA · TEMPO REAL</div>
          <div className="title-big">MAR DE ESTRELAS</div>
          <div className="title-rule" />
          <div className="title-sub">
            uma viagem do Sol às supergigantes de Órion — e à própria Via Láctea
            <br />
            18.543 estrelas HYG · poeira APOGEE · nuvens de CO · regiões H II ·
            aglomerados e Cefeidas Gaia DR3 — cartografia real, gás volumétrico em tempo real
          </div>
          <div className="title-rule" />
          <button className="hud-btn" onClick={onPlay}>
            Iniciar a viagem
          </button>
          <div className="journey-runtime">experiência cinematográfica · 3 min 14 s</div>
        </>
      )}
      {mode === 'end' && (
        <>
          <div className="title-sub" style={{ letterSpacing: '0.42em' }}>
            20 mil parsecs acima de casa
          </div>
          <div className="title-rule" />
          <div className="title-big" style={{ fontSize: 'clamp(1.2rem, 3vw, 2.2rem)' }}>
            O SOL É SÓ MAIS UM PONTO DE LUZ
          </div>
          <div className="title-sub">
            cada estrela que você viu existe de verdade no catálogo HYG
          </div>
          <div className="title-rule" />
          <button className="hud-btn" onClick={onPlay}>
            Reviver a viagem
          </button>
        </>
      )}
      {mode === 'error' && (
        <>
          <div className="title-kicker">FALHA DE INICIALIZAÇÃO</div>
          <div className="title-big error-title">A VIAGEM NÃO PÔDE COMEÇAR</div>
          <div className="title-sub">{error}</div>
          <button className="hud-btn" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </>
      )}
    </div>
  );
}

export function Caption({
  caption,
  sub,
  showKey,
}: {
  caption: string;
  sub?: string;
  showKey: number;
}) {
  if (!caption) return null;
  return (
    <div key={showKey} className="caption-wrap show">
      <div className="caption-rule" />
      <div className="caption-title">{caption}</div>
      {sub && <div className="caption-sub">{sub}</div>}
    </div>
  );
}

export function ProgressBar({
  progressRef,
  ticks,
}: {
  progressRef: RefObject<HTMLDivElement | null>;
  ticks: number[];
}) {
  return (
    <div className="progress-wrap">
      <div ref={progressRef} className="progress-fill" />
      {ticks.map((t, i) => (
        <div key={i} className="progress-tick" style={{ left: `${t * 100}%` }} />
      ))}
    </div>
  );
}
