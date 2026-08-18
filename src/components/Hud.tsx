// ============================================================
// Componentes do HUD — telas de título, legendas e progresso.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { LOAD_STAGES } from '../three/director';
import type { LoadStage } from '../three/director';
import { CartografiaCanvas } from './CartografiaCanvas';

/** telas curtas escondem só a telemetria dos cantos */
const ehCompacto = () => window.innerWidth < 760 || window.innerHeight < 480;

/**
 * A tela de carregamento: uma camada PERSISTENTE por baixo do véu de
 * título. A cartografia (canvas 2D) e o núcleo solar ficam montados do
 * primeiro frame ao fim da transição — quando a viagem começa, o núcleo
 * desliza ao centro e expande sobre o Sol WebGL enquanto o resto some.
 * Montar e desmontar isso no meio da troca é o que dava flash.
 */
export function LoadingVeil({
  stage,
  state,
  still,
  error,
  onRetry,
}: {
  /** etapa viva do director (ou a fixada por `?loader=`) */
  stage: LoadStage;
  /** `done` dispara a expansão do núcleo; `error` esfria a cena */
  state: 'loading' | 'done' | 'error';
  /** prefers-reduced-motion ou `?shot=`: sem rotação, varredura ou expansão */
  still: boolean;
  /** mensagem técnica da falha */
  error?: string;
  onRetry: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cartografia = useRef<CartografiaCanvas | null>(null);
  const [compacto, setCompacto] = useState(ehCompacto);
  const falhou = state === 'error';
  const p = stage.index / stage.total;
  const anuncio = `Etapa ${stage.index} de ${stage.total} — ${stage.label}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    const cv = new CartografiaCanvas(canvasRef.current);
    cartografia.current = cv;
    return () => {
      cv.dispose();
      cartografia.current = null;
    };
  }, []);

  useEffect(() => {
    cartografia.current?.setState({
      index: stage.index,
      total: stage.total,
      error: state === 'error',
      still,
      merging: state === 'done',
    });
  }, [stage, state, still]);

  useEffect(() => {
    const aoRedimensionar = () => setCompacto(ehCompacto());
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, []);

  return (
    <div className={`cv-veil cv-${state}`}>
      <div className="cv-scene">
        <canvas ref={canvasRef} className="cv-canvas" aria-hidden="true" />
      </div>

      {/* o núcleo galáctico quente: o único elemento que sobrevive à
          transição — vira o Sol da intro ao expandir */}
      <div className="cv-core" aria-hidden="true">
        <div className="cv-core-glow" style={{ opacity: falhou ? 0.06 : 0.05 + p * 0.24 }} />
        <div className="cv-core-scale" style={{ transform: `scale(${(0.4 + p * 0.6).toFixed(3)})` }}>
          <div
            className="cv-core-body"
            style={{
              boxShadow: falhou
                ? '0 0 26px rgba(140,160,200,.3)'
                : `0 0 ${Math.round(26 + p * 46)}px rgba(255,200,130,${(0.25 + p * 0.4).toFixed(2)})`,
            }}
          />
        </div>
      </div>

      <div className="cv-hud">
        {!compacto && (
          <>
            <div className="cv-telemetria esquerda">
              <div>HYG · 328.749 estrelas</div>
              <div>poeira APOGEE · CO · H II</div>
            </div>
            <div className="cv-telemetria direita">
              <div>aglomerados · Cefeidas Gaia DR3</div>
              <div>RA 17h 45m · DEC −29° 00′</div>
            </div>
          </>
        )}
        <div className="cv-titulo">
          <div className="title-kicker">HYG · VIA LÁCTEA · TEMPO REAL</div>
          <div className="title-big">MAR DE ESTRELAS</div>
          <div className="cv-etapa-rotulo">{stage.label}</div>
        </div>
        <div className="cv-trilho">
          <div className="cv-trilho-conta">
            etapa {String(stage.index).padStart(2, '0')} / {String(stage.total).padStart(2, '0')}
          </div>
          {/* progressbar discreto: a régua é a ETAPA, e o rótulo dela já
              vai no aria-valuetext — sem porcentagem, que mentiria (a rede
              é a fatia pequena do carregamento) */}
          <div
            className="cv-trilho-marcos"
            role="progressbar"
            aria-label="Progresso do carregamento"
            aria-valuemin={1}
            aria-valuemax={stage.total}
            aria-valuenow={stage.index}
            aria-valuetext={anuncio}
          >
            {LOAD_STAGES.map((s) => (
              <div
                key={s.id}
                className={`cv-marco${
                  s.index < stage.index ? ' feito' : s.index === stage.index ? ' agora' : ''
                }`}
                // os marcos concluídos são FATIAS de um único gradiente
                // âmbar→azul (o mesmo da barra da viagem): fundo 700% de
                // largura, deslocado i/(total−1) — juntos formam a barra
                style={
                  s.index < stage.index
                    ? { backgroundPosition: `${((s.index - 1) / (stage.total - 1)) * 100}% 0%` }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* só a MUDANÇA de etapa é anunciada — ler o véu inteiro a cada
          troca era o que fazia o leitor de tela repetir título e kicker */}
      <div className="cv-anuncio" aria-live="polite">
        {state === 'loading' ? anuncio : ''}
      </div>

      {falhou && (
        <div className="cv-falha" role="alert">
          <div className="title-kicker">FALHA DE INICIALIZAÇÃO</div>
          <div className="title-big error-title">A VIAGEM NÃO PÔDE COMEÇAR</div>
          <div className="title-sub">
            a cartografia parou na etapa {String(stage.index).padStart(2, '0')}/
            {String(stage.total).padStart(2, '0')} — {stage.label}
          </div>
          {error && <div className="cv-falha-detalhe">{error}</div>}
          <div className="title-rule cv-falha-regua" />
          <button className="hud-btn" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

export function TitleVeil({
  visible,
  mode,
  onPlay,
  onExplore,
  runtime,
}: {
  visible: boolean;
  mode: 'intro' | 'end';
  onPlay: () => void;
  onExplore?: () => void;
  runtime?: number;
}) {
  const minutes = runtime ? Math.floor(runtime / 60) : 0;
  const seconds = runtime ? Math.round(runtime % 60) : 0;
  return (
    <div
      className={`veil veil-${mode} ${visible ? '' : 'hidden-veil'}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      {mode === 'intro' && (
        <>
          <div className="title-kicker">HYG · VIA LÁCTEA · TEMPO REAL</div>
          <div className="title-big">MAR DE ESTRELAS</div>
          <div className="title-rule" />
          <div className="title-sub">
            do Sol às supergigantes de Órion, ao coração da galáxia — e além
            <br />
            328.749 estrelas de catálogo · Via Láctea volumétrica reconstruída em tempo real
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
            cerca de 80 mil anos-luz acima de casa
          </div>
          <div className="title-rule" />
          <div className="title-big" style={{ fontSize: 'clamp(1.2rem, 3vw, 2.2rem)' }}>
            O SOL É SÓ MAIS UM PONTO DE LUZ
          </div>
          <div className="title-sub">
            estrelas nomeadas em posições reais · Via Láctea reconstruída a partir de dados científicos
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
