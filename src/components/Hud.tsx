// ============================================================
// Componentes do HUD — telas de título, legendas e progresso.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { LARGURA_DO_CELULAR_PX } from '../lib/uiScale';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { LOAD_STAGES } from '../three/director';
import type { LoadStage } from '../three/director';
import { CartografiaCanvas } from './CartografiaCanvas';
import {
  linhasDoEncerramento, ATRIBUICAO, FONTE_DA_CITACAO,
  ATRASO_DA_LINHA, ATRASO_DA_ATRIBUICAO, ATRASO_DO_RODAPE,
} from './encerramento';

/**
 * Telas curtas escondem só a telemetria dos cantos.
 *
 * A LARGURA É A FAIXA DECLARADA (`LARGURA_DO_CELULAR_PX`), e o `<=` é o
 * mesmo do `@media (max-width: 760px)`: aqui havia um terceiro leitor de
 * largura com o 760 cru e um `<`, então EM 760 px exatos o CSS já vestia
 * o telefone e esta linha ainda dizia mesa. A altura de 480 é outro
 * fenômeno (paisagem baixa) e continua sendo dela.
 */
const ehCompacto = () =>
  window.innerWidth <= LARGURA_DO_CELULAR_PX || window.innerHeight < 480;

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
  emVoo = false,
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
  /**
   * A FALHA CHEGOU COM A VIAGEM JÁ ANDANDO (contexto de vídeo perdido,
   * exceção em quadro). Muda só a copy: "não pôde começar" é mentira
   * quando ela começou, e a linha da etapa da cartografia é do boot —
   * repeti-la aqui apontaria para uma etapa que passou faz tempo. O véu
   * é o MESMO, porque a casa tem um lugar só para dizer que acabou.
   */
  emVoo?: boolean;
  onRetry: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cartografia = useRef<CartografiaCanvas | null>(null);
  const [compacto, setCompacto] = useState(ehCompacto);
  // a língua entra como DEPENDÊNCIA de render: sem ela o véu ficaria na
  // língua com que foi pintado quando o seletor troca (item 130)
  useIdioma();
  const falhou = state === 'error';
  const p = stage.index / stage.total;
  const anuncio = t('hud.etapaAnuncio', {
    i: stage.index,
    total: stage.total,
    rotulo: stage.label,
  });

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
    <div className={`cv-veil cv-${state}${emVoo ? ' cv-em-voo' : ''}`}>
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
              <div>{t('hud.telemetria.estrelas')}</div>
              <div>{t('hud.telemetria.poeira')}</div>
            </div>
            <div className="cv-telemetria direita">
              <div>{t('hud.telemetria.aglomerados')}</div>
              <div>RA 17h 45m · DEC −29° 00′</div>
            </div>
          </>
        )}
        <div className="cv-titulo">
          <div className="title-kicker">{t('hud.kicker')}</div>
          {/* O NOME do app segue a língua (ordem dele, 03/09: "o título não
              foi traduzido na página inicial"): MAR DE ESTRELAS / SEA OF STARS,
              o mesmo par do <title> da aba. */}
          <div className="title-big">{t('hud.nome')}</div>
          <div className="cv-etapa-rotulo">{stage.label}</div>
        </div>
        <div className="cv-trilho">
          <div className="cv-trilho-conta">
            {t('hud.etapaConta', {
              i: String(stage.index).padStart(2, '0'),
              total: String(stage.total).padStart(2, '0'),
            })}
          </div>
          {/* progressbar discreto: a régua é a ETAPA, e o rótulo dela já
              vai no aria-valuetext — sem porcentagem, que mentiria (a rede
              é a fatia pequena do carregamento) */}
          <div
            className="cv-trilho-marcos"
            role="progressbar"
            aria-label={t('hud.progressoCarregamento')}
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
          <div className="title-kicker">
            {t(emVoo ? 'hud.falhaEmVoo' : 'hud.falhaNoBoot')}
          </div>
          <div className="title-big error-title">
            {t(emVoo ? 'hud.falhaEmVooTitulo' : 'hud.falhaNoBootTitulo')}
          </div>
          <div className="title-sub">
            {emVoo
              ? t('hud.falhaEmVooNota')
              : t('hud.falhaNoBootNota', {
                  i: String(stage.index).padStart(2, '0'),
                  total: String(stage.total).padStart(2, '0'),
                  rotulo: stage.label,
                })}
          </div>
          {error && <div className="cv-falha-detalhe">{error}</div>}
          <div className="title-rule cv-falha-regua" />
          <button className="hud-btn" onClick={onRetry}>
            {t('hud.tentarNovamente')}
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
  onAtlas,
  runtime,
}: {
  visible: boolean;
  mode: 'intro' | 'end';
  onPlay: () => void;
  onExplore?: () => void;
  onAtlas?: () => void;
  runtime?: number;
}) {
  useIdioma();
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
          <div className="title-kicker">{t('hud.kicker')}</div>
          <div className="title-big">{t('hud.nome')}</div>
          <div className="title-rule" />
          <div className="title-sub">
            {t('hud.abertura.linha1')}
            <br />
            {t('hud.abertura.linha2')}
          </div>
          <div className="title-rule" />
          {/* AS TRÊS PORTAS DA ABERTURA. O "Explorar" já estava ligado
              aqui (App passa onExplore ao véu) e só era desenhado no
              fim — quem não quer 3 min de filme fechava a aba em vez de
              entrar na galáxia. O "Entrar no Atlas" é o item 60, e é o
              MESMO `entrarNoAtlas` do portal do pausar-e-olhar: dois
              caminhos até o mesmo modo, um só código.
              NENHUMA das três é destacada em cor: o nome de cada porta
              não diz o que ela é, então cada uma leva a sua linha — e
              ela é `aria-describedby`, não texto solto, para que quem
              ouve a tela receba a explicação junto com o botão.
              E NENHUMA é maior que as outras (dono, 22/08: "3 botoes
              iguais"). A palavra que sobrava saiu por pedido dele —
              *"botao explorar livremente está com tamanho diferente dos
              outros, sugiro tirar a palavra livremente"* —, mas o
              tamanho igual NÃO vem do texto: vem do CSS
              (`.abertura-porta`), senão o próximo nome que crescer
              desalinha a fileira de novo. Dos três lugares que diziam
              "Explorar livremente" não sobrou nenhum: a BARRA DO FILME
              encurtou em 24/08 e o VÉU DO FIM foi junto no mesmo dia,
              quando ele nomeou a sobra. Uma ação, uma palavra. */}
          <div className="abertura-portas">
            <div className="abertura-porta">
              <button className="hud-btn" onClick={onPlay} aria-describedby="porta-filme">
                {t('hud.porta.filme')}
              </button>
              <span className="abertura-porta-nota" id="porta-filme">
                {t('hud.porta.filmeNota')}
              </span>
            </div>
            {onExplore && (
              <div className="abertura-porta">
                <button className="hud-btn" onClick={onExplore} aria-describedby="porta-voo">
                  {t('hud.porta.explorar')}
                </button>
                <span className="abertura-porta-nota" id="porta-voo">
                  {t('hud.porta.explorarNota')}
                </span>
              </div>
            )}
            {onAtlas && (
              <div className="abertura-porta">
                <button className="hud-btn" onClick={onAtlas} aria-describedby="porta-atlas">
                  {t('hud.porta.atlas')}
                </button>
                <span className="abertura-porta-nota" id="porta-atlas">
                  {t('hud.porta.atlasNota')}
                </span>
              </div>
            )}
          </div>
          <div className="journey-runtime">
            {minutes > 0
              ? t('hud.duracaoCom', { min: minutes, seg: seconds })
              : t('hud.duracao')}
          </div>
        </>
      )}
      {mode === 'end' && (
        <>
          <div className="title-sub" style={{ letterSpacing: '0.42em' }}>
            {t('hud.fim.deVoltaACasa')}
          </div>
          <div className="title-rule" />
          {/* A FRASE DE ENCERRAMENTO É EMPRESTADA E ENCENADA (item 108,
              pedidos do dono em 31/08: "podemos trocar a frase de
              encerramento para aquela frase classica do carl sagan
              falando do pale blue dot" e "é um encerramento do filme com
              impacto e drama. cinema puro").
              O TEXTO NÃO MORA AQUI: mora no roteiro do fim
              (`three/cinematic/roteiros/encerramento.json`, montado por
              `encerramento.ts`), como LISTA de linhas com os tempos —
              é lá que se acrescenta linha, e o resto
              (aspas nas pontas, ordem, atraso de cada entrada, espera do
              crédito e do rodapé) sai do tamanho da lista sozinho.
              A ENCENAÇÃO É CSS, não relógio de JavaScript: cada linha
              tem o seu `animation-delay`, e a animação só existe
              enquanto o véu está visível (`.veil-end:not(.hidden-veil)`
              em 02-filme.css), então ela COMEÇA quando o véu sobe e não
              quando a página carrega. Em `?shot=` e em
              prefers-reduced-motion tudo aparece de uma vez — captura
              determinística e sem drama para quem pediu sem drama.
              A linha da procedência dos dados desceu para o rodapé, com
              os botões: ela continua no véu porque o que promete
              (posições reais) é a promessa que o app cumpre — mas não
              divide a tela com a citação. */}
          <div className="encerramento">
            {linhasDoEncerramento().map((linha, i, linhas) => (
              <div
                key={linha}
                className="encerramento-linha"
                style={{ animationDelay: `${ATRASO_DA_LINHA(i)}s` }}
              >
                {`${i === 0 ? '“' : ''}${linha}${i === linhas.length - 1 ? '”' : ''}`}
              </div>
            ))}
            <div
              className="encerramento-credito"
              style={{ animationDelay: `${ATRASO_DA_ATRIBUICAO}s` }}
            >
              {ATRIBUICAO}
              <span className="encerramento-fonte">{FONTE_DA_CITACAO}</span>
            </div>
          </div>
          <div
            className="title-sub encerramento-rodape"
            style={{ animationDelay: `${ATRASO_DO_RODAPE}s` }}
          >
            {t('hud.fim.rodape')}
          </div>
          <div className="title-rule encerramento-rodape"
            style={{ animationDelay: `${ATRASO_DO_RODAPE}s` }} />
          {/* A TERCEIRA SAÍDA DO FIM (item 61, 23/08): "Ficar aqui" entra
              no Atlas NA POSE DA CODA. É a frase do dono virada em botão —
              *"a viagem na verdade para mim é só uma ferramenta do modo
              atlas"*: o filme acabou onde acabou, e o visitante fica ali,
              com a Terra em quadro e a data do pouso, em vez de ser
              devolvido para uma vista a 224 UA de casa. Quem leva a
              câmera é o mesmo `entrarNoAtlas` do pausar-e-olhar, agora
              com o pouso (`Escada.pousarDoFilme`). */}
          <div
            className="encerramento-rodape"
            style={{ display: 'flex', gap: '0.8rem', animationDelay: `${ATRASO_DO_RODAPE}s` }}
          >
            <button className="hud-btn" onClick={onPlay}>
              {t('hud.fim.reviver')}
            </button>
            {onAtlas && (
              <button className="hud-btn" onClick={onAtlas}>
                {t('hud.fim.ficarAqui')}
              </button>
            )}
            {/* "EXPLORAR", e não "Explorar livremente" (24/08). Era a
                ÚLTIMA sobra da frase no app, e a folha do item 61 a
                deixou de fora porque ele tinha nomeado só a barra do
                filme — composição é gosto, e gosto é dele. Em 24/08 ele
                nomeou: *"não entendi esse explorar livremente novo, mas
                não precisa ser explorar, pode ser navegar"*. A resposta
                é UMA AÇÃO, UMA PALAVRA: a barra do Atlas diz "↗
                Explorar", a barra do filme diz "Explorar" e o véu do fim
                passa a dizer o mesmo. O "Navegar" que ele ofereceu fica
                REGISTRADO como alternativa aceita (PENDENCIAS, item 61):
                se ele preferir, é uma palavra em dois lugares. */}
            {onExplore && (
              <button className="hud-btn" onClick={onExplore}>
                {t('hud.porta.explorar')}
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
  chromeVisivel = true,
}: {
  progressRef: RefObject<HTMLDivElement | null>;
  ticks: { t: number; text: string }[];
  onScrub: (fraction: number) => void;
  onSkipChapter: (dir: 1 | -1) => void;
  /** índice da legenda no ar; -1 entre capítulos */
  capituloAtual: number;
  /**
   * O CHROME DO FILME ESTÁ NA TELA? (item 61, 22/08 — *"2) somem
   * sozinhos"*.) Esta barra é o scrubber, ou seja, chrome: com o filme
   * correndo e o ponteiro parado há 3 s ela esmaece junto com a barra de
   * controles. Some por OPACIDADE, com a caixa no lugar (`.hud-sumido`).
   * O padrão é `true` porque na tela FINAL ela continua de pé — lá não
   * há filme correndo, e é por ela que se volta a um momento preferido.
   */
  chromeVisivel?: boolean;
}) {
  useIdioma();
  const scrubDoEvento = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onScrub((event.clientX - rect.left) / rect.width);
  };
  return (
    <div
      className={`progress-wrap${chromeVisivel ? '' : ' hud-sumido'}`}
      role="slider"
      tabIndex={0}
      aria-label={t('hud.progressoDaViagem')}
      // a régua é o CAPÍTULO, não a fração: o progresso fino anda a 60 Hz
      // por custom property justamente para o React ficar fora do caminho
      // quente, e o índice da legenda já re-renderiza — de graça e no
      // ritmo certo para quem ouve a tela
      aria-valuemin={0}
      aria-valuemax={ticks.length}
      aria-valuenow={capituloAtual + 1}
      aria-valuetext={
        ticks[capituloAtual]
          ? t('hud.capituloDeTotal', {
              n: capituloAtual + 1,
              total: ticks.length,
              texto: ticks[capituloAtual].text,
            })
          : t('hud.capitulos', { total: ticks.length })
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
