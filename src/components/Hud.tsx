// ============================================================
// Componentes do HUD — telas de título, legendas e progresso.
// ============================================================
import type { RefObject } from 'react';

export function TitleVeil({
  visible,
  mode,
  onPlay,
  onExplore,
  runtime,
  error,
}: {
  visible: boolean;
  mode: 'loading' | 'intro' | 'end' | 'error';
  onPlay: () => void;
  onExplore?: () => void;
  runtime?: number;
  error?: string;
}) {
  const minutes = runtime ? Math.floor(runtime / 60) : 0;
  const seconds = runtime ? Math.round(runtime % 60) : 0;
  return (
    <div
      className={`veil veil-${mode} ${visible ? '' : 'hidden-veil'}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      {mode === 'loading' && (
        <>
          {/* buraco negro em CSS puro: disco de acreção inclinado girando,
              anel de fótons e a sombra — o destino da viagem como loader */}
          <div className="bh-loader" aria-hidden="true">
            <div className="bh-tilt">
              <div className="bh-accretion" />
            </div>
            <div className="bh-arc" />
            <div className="bh-photon" />
            <div className="bh-core" />
          </div>
          <div className="title-kicker">HYG · VIA LÁCTEA · TEMPO REAL</div>
          <div className="title-big loading-pulse">MAR DE ESTRELAS</div>
          <div className="title-sub">cartografando 328.749 estrelas de catálogo…</div>
        </>
      )}
      {mode === 'intro' && (
        <>
          <div className="title-kicker">HYG · VIA LÁCTEA · TEMPO REAL</div>
          <div className="title-big">MAR DE ESTRELAS</div>
          <div className="title-rule" />
          <div className="title-sub">
            do Sol às supergigantes de Órion, ao coração da galáxia — e além
            <br />
            328.749 estrelas de catálogo · poeira APOGEE · nuvens de CO · regiões H II ·
            aglomerados e Cefeidas Gaia DR3 — cartografia real, gás volumétrico em tempo real
          </div>
          <div className="title-rule" />
          {/* o "Explorar livremente" já estava ligado aqui (App passa
              onExplore ao véu) e só era desenhado no fim — quem não quer
              5 min de filme fechava a aba em vez de entrar na galáxia */}
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="hud-btn" onClick={onPlay}>
              Iniciar a viagem
            </button>
            {onExplore && (
              <button className="hud-btn" onClick={onExplore}>
                Explorar livremente
              </button>
            )}
          </div>
          <div className="journey-runtime">
            experiência cinematográfica{minutes > 0 ? ` · ${minutes} min ${seconds} s` : ''}
          </div>
        </>
      )}
      {mode === 'end' && (
        <>
          <div className="title-sub" style={{ letterSpacing: '0.42em' }}>
            25 mil parsecs acima de casa
          </div>
          <div className="title-rule" />
          <div className="title-big" style={{ fontSize: 'clamp(1.2rem, 3vw, 2.2rem)' }}>
            O SOL É SÓ MAIS UM PONTO DE LUZ
          </div>
          <div className="title-sub">
            cada estrela nomeada — e o buraco negro — existem de verdade, nas posições reais
          </div>
          <div className="title-rule" />
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="hud-btn" onClick={onPlay}>
              Reviver a viagem
            </button>
            {onExplore && (
              <button className="hud-btn" onClick={onExplore}>
                Explorar livremente
              </button>
            )}
          </div>
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
  // cinema: a legenda entra, respira (~7 s) e SAI — não fica pendurada
  // até a próxima (animações puras em CSS; a key remonta e reinicia)
  if (!caption) return null;
  return (
    <div key={showKey} className="caption-wrap show" role="status" aria-live="polite">
      <div className="caption-rule" />
      <div className="caption-title">{caption}</div>
      {sub && <div className="caption-sub">{sub}</div>}
    </div>
  );
}

export function ProgressBar({
  progressRef,
  ticks,
  onScrub,
  onSkipChapter,
  capituloAtual,
}: {
  progressRef: RefObject<HTMLDivElement | null>;
  ticks: { t: number; text: string }[];
  onScrub: (fraction: number) => void;
  onSkipChapter: (dir: 1 | -1) => void;
  /** índice da legenda no ar; -1 entre capítulos */
  capituloAtual: number;
}) {
  const scrubDoEvento = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onScrub((event.clientX - rect.left) / rect.width);
  };
  return (
    <div
      className="progress-wrap"
      role="slider"
      tabIndex={0}
      aria-label="Progresso da viagem"
      // a régua é o CAPÍTULO, não a fração: o progresso fino anda a 60 Hz
      // por custom property justamente para o React ficar fora do caminho
      // quente, e o índice da legenda já re-renderiza — de graça e no
      // ritmo certo para quem ouve a tela
      aria-valuemin={0}
      aria-valuemax={ticks.length}
      aria-valuenow={capituloAtual + 1}
      aria-valuetext={
        ticks[capituloAtual]
          ? `${capituloAtual + 1} de ${ticks.length} — ${ticks[capituloAtual].text}`
          : `${ticks.length} capítulos`
      }
      onPointerDown={(event) => {
        // setPointerCapture: o arrasto continua valendo mesmo quando o
        // ponteiro sai da barra — sem ele o scrub era um clique só
        event.currentTarget.setPointerCapture(event.pointerId);
        scrubDoEvento(event);
      }}
      onPointerMove={(event) => {
        // buttons > 0 = ainda apertado. Vale para mouse e para toque, e
        // não depende do capture ter pegado — a captura acima serve para
        // o arrasto sobreviver a sair da barra (que tem 2 px de altura)
        if (event.buttons > 0) scrubDoEvento(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onSkipChapter(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onSkipChapter(-1);
        }
      }}
    >
      <div ref={progressRef} className="progress-fill" />
      {ticks.map((k, i) => (
        // o título do capítulo já existia (é a legenda daquele beat) e era
        // jogado fora; title= nativo basta — nada de componente de tooltip
        <div
          key={i}
          className="progress-tick"
          style={{ left: `${k.t * 100}%` }}
          title={k.text}
        />
      ))}
    </div>
  );
}
