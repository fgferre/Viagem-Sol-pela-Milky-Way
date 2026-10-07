// ============================================================
// Componentes do HUD — telas de título, legendas e progresso. (A tela
// de carregamento mora em `telaDeCarga/`.)
// ============================================================
import { useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { FILMES_EM_CARTAZ, filmeDe } from '../three/cinematic/filme';
import { Icone } from './Icone';
import {
  textoDoEncerramento,
  ATRASO_DA_LINHA, ATRASO_DA_ATRIBUICAO, ATRASO_DO_RODAPE,
} from './encerramento';

/** "3 min 13 s" — ou "6 min", quando o filme fecha o minuto redondo */
function duracaoPorExtenso(duracao: number) {
  const total = Math.round(duracao);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return seg > 0 ? t('hud.duracaoCom', { min, seg }) : t('hud.duracaoMin', { min });
}

export function TitleVeil({
  visible,
  mode,
  onPlay,
  onExplore,
  onAtlas,
  filmeEmCartaz,
}: {
  visible: boolean;
  mode: 'intro' | 'end';
  /** com id toca esse filme; sem id (o "Reviver" do fim), o que está em cartaz */
  onPlay: (id?: string) => void;
  onExplore?: () => void;
  onAtlas?: () => void;
  /** o id do filme em cartaz — o fim diz o texto DELE (`Filme.encerramento`) */
  filmeEmCartaz: string;
}) {
  useIdioma();
  const fim = mode === 'end' ? textoDoEncerramento(filmeDe(filmeEmCartaz).encerramento) : null;
  // os atrasos do crédito e do rodapé saem do tamanho da lista de linhas do filme
  const atrasoDoCredito = fim ? ATRASO_DA_ATRIBUICAO(fim.linhas.length) : 0;
  const atrasoDoRodape = fim ? ATRASO_DO_RODAPE(fim.linhas.length) : 0;
  return (
    <div
      className={`veil veil-${mode} ${visible ? '' : 'hidden-veil'}`}
      aria-live="polite"
      aria-hidden={!visible}
    >
      {mode === 'intro' && (
        <div className="abertura-coluna">
          <div className="title-kicker">{t('hud.kicker')}</div>
          <div className="title-big">{t('hud.nome')}</div>
          <div className="title-rule" />
          <div className="title-sub">{t('hud.abertura.linha1')}</div>
          <div className="title-sub title-sub--linha2">{t('hud.abertura.linha2')}</div>
          {/* AS PORTAS DA ABERTURA (Lote 8, PLAN-UI.md §3.1). O "Explorar"
              já estava ligado aqui (App passa onExplore ao véu) e só era
              desenhado no fim — quem não quer 3 min de filme fechava a
              aba em vez de entrar na galáxia. O "Entrar no Atlas" é o
              item 60, agora rotulado "Explorar o Atlas" e promovido a
              PRIMÁRIO: é o MESMO `entrarNoAtlas` do portal do
              pausar-e-olhar, dois caminhos até o mesmo modo, um só
              código. As notas de cada porta continuam por
              `aria-describedby`, não texto solto, para que quem ouve a
              tela receba a explicação junto com o botão. */}
          {onAtlas && (
            <div className="abertura-porta">
              <button
                className="veil-btn veil-btn--primario"
                onClick={onAtlas}
                aria-describedby="porta-atlas"
              >
                <Icone nome="bussola" tamanho={16} />
                {/* rótulo em `<span>` (C2): texto solto ao lado do ícone
                    não tem caixa própria para a pressão comprimir. */}
                <span>{t('hud.porta.atlas')}</span>
              </button>
              <span className="abertura-porta-nota" id="porta-atlas">
                {t('hud.porta.atlasNota')}
              </span>
            </div>
          )}
          {/* OS FILMES, LADO A LADO (escolha visível, item 210/F1; maquete
              B de 05/10, aprovada por ele): um botão por filme do cartaz
              (`FILMES_EM_CARTAZ`, nunca os ids escritos aqui), com o nome,
              a duração DO FILME e a nota dele embaixo. O "Voo livre" desce
              para uma segunda fileira, sozinho e na largura inteira — a
              mesma `.abertura-portas`, sem regra nova: um botão só estica,
              e no celular tudo empilha como antes. Em `<span>` (C2): a
              pressão afunda o filho, não um nó de texto solto. */}
          <div className="abertura-portas">
            {FILMES_EM_CARTAZ.map((id) => {
              const filme = filmeDe(id);
              return (
                <div className="abertura-porta" key={id}>
                  <button
                    className="veil-btn veil-btn--secundario"
                    onClick={() => onPlay(id)}
                    aria-describedby={`porta-filme-${id}`}
                  >
                    <Icone nome="play" tamanho={16} />
                    <span>{`${t(filme.titulo)} · ${duracaoPorExtenso(filme.journey.duration)}`}</span>
                  </button>
                  <span
                    className="abertura-porta-nota abertura-porta-nota--secundaria"
                    id={`porta-filme-${id}`}
                  >
                    {t(filme.nota)}
                  </span>
                </div>
              );
            })}
          </div>
          {onExplore && (
            <div className="abertura-portas">
              <div className="abertura-porta">
                <button
                  className="veil-btn veil-btn--secundario"
                  onClick={onExplore}
                  aria-describedby="porta-voo"
                >
                  <Icone nome="explorar" tamanho={16} />
                  <span>{t('hud.porta.voo')}</span>
                </button>
                <span className="abertura-porta-nota abertura-porta-nota--secundaria" id="porta-voo">
                  {t('hud.porta.explorarNota')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {fim && (
        <>
          <div className="title-kicker">{t('hud.fim.deVoltaACasa')}</div>
          <div className="title-rule" />
          {/* O TEXTO É DO FILME EM CARTAZ (`Filme.encerramento`, lido por
              `textoDoEncerramento`): o solar diz uma linha e um crédito
              próprios, sem aspas, das tabelas de idioma; o galáctico diz a
              citação abaixo.
              A FRASE DE ENCERRAMENTO DO GALÁCTICO É EMPRESTADA E ENCENADA
              (item 108, pedidos do dono em 31/08: "podemos trocar a frase de
              encerramento para aquela frase classica do carl sagan
              falando do pale blue dot" e "é um encerramento do filme com
              impacto e drama. cinema puro").
              O TEXTO DELA NÃO MORA AQUI: mora no roteiro do fim
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
            {fim.linhas.map((linha, i) => (
              <div
                key={linha}
                className="encerramento-linha"
                style={{ animationDelay: `${ATRASO_DA_LINHA(i)}s` }}
              >
                {linha}
              </div>
            ))}
            <div
              className="encerramento-credito"
              style={{ animationDelay: `${atrasoDoCredito}s` }}
            >
              {fim.credito}
              {fim.fonte && <span className="encerramento-fonte">{fim.fonte}</span>}
            </div>
          </div>
          {fim.rodape && (
            <div
              className="title-sub encerramento-rodape"
              style={{ animationDelay: `${atrasoDoRodape}s` }}
            >
              {fim.rodape}
            </div>
          )}
          <div className="title-rule encerramento-rodape"
            style={{ animationDelay: `${atrasoDoRodape}s` }} />
          {/* A TERCEIRA SAÍDA DO FIM (item 61, 23/08): "Ficar neste céu"
              entra no Atlas NA POSE DA CODA. É a frase do dono virada em botão —
              *"a viagem na verdade para mim é só uma ferramenta do modo
              atlas"*: o filme acabou onde acabou, e o visitante fica ali,
              com a Terra em quadro e a data do pouso, em vez de ser
              devolvido para uma vista a 224 UA de casa. Quem leva a
              câmera é o mesmo `entrarNoAtlas` do pausar-e-olhar, agora
              com o pouso (`Escada.pousarDoFilme`). */}
          <div
            className="encerramento-rodape"
            style={{ display: 'flex', gap: '0.75rem', animationDelay: `${atrasoDoRodape}s` }}
          >
            <button className="veil-btn veil-btn--secundario" onClick={() => onPlay()}>
              {/* `<span>` (C2): a pressão afunda o filho, nunca o botão. */}
              <span>{t('hud.fim.reviver')}</span>
            </button>
            {/* "Ficar aqui" virou o botão PRIMÁRIO do fim (D1) — o mesmo
                âmbar da abertura: a coda é o pouso, e as outras duas
                saídas (reviver, voo livre) continuam secundárias. */}
            {onAtlas && (
              <button
                className="veil-btn veil-btn--primario"
                onClick={onAtlas}
                // U04 (C5): o mesmo atraso da linha/crédito/rodapé — o CTA
                // só pisca quando ele de fato aparece na tela, sem repetir
                // o número do roteiro numa conta nova aqui.
                style={{ '--cta-atraso': `${atrasoDoRodape}s` } as CSSProperties}
              >
                <span>{t('hud.fim.ficarAqui')}</span>
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
              <button className="veil-btn veil-btn--secundario" onClick={onExplore}>
                <span>{t('hud.porta.voo')}</span>
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
  // U10 (C5) — O ARRASTO EM CURSO, para o CSS engrossar a camada visual
  // e mostrar o thumb (abaixo) enquanto o ponteiro está preso: a mesma
  // captura de sempre, só com um sinal a mais. Hit-test, valor-segue-o-
  // dedo e teclado continuam exatamente os de hoje.
  const [arrastando, setArrastando] = useState(false);
  const scrubDoEvento = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onScrub((event.clientX - rect.left) / rect.width);
  };
  return (
    <div
      // a FRAÇÃO (`--journey-progress`, escrita a 60 Hz por `useDirector`)
      // mora no alvo, e não no preenchimento: assim o preenchimento e o
      // ponto do arrasto (abaixo), irmãos, leem a mesma variável
      ref={progressRef}
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
      data-arrastando={arrastando ? '' : undefined}
      onPointerDown={(event) => {
        // setPointerCapture: o arrasto continua valendo mesmo quando o
        // ponteiro sai da barra — sem ele o scrub era um clique só
        event.currentTarget.setPointerCapture(event.pointerId);
        setArrastando(true);
        scrubDoEvento(event);
      }}
      onPointerMove={(event) => {
        // buttons > 0 = ainda apertado. Vale para mouse e para toque, e
        // não depende do capture ter pegado — a captura acima serve para
        // o arrasto sobreviver a sair da barra (que tem 2 px de altura)
        if (event.buttons > 0) scrubDoEvento(event);
      }}
      onPointerUp={() => setArrastando(false)}
      onPointerCancel={() => setArrastando(false)}
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
      {/* A CAMADA VISUAL (U10), separada do alvo de clique/arrasto acima:
          ela engrossa em hover/foco/arrasto (02-filme.css) — o alvo em si
          nunca ganha transform, ou o hit-test mudaria de tamanho junto. */}
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" />
      </div>
      {/* O PONTO DO ARRASTO (U10) — fora da camada que engrossa e fora do
          preenchimento que escala: dentro de qualquer um dos dois ele
          esticaria junto (um ponto de 8 px virava uma pílula de 20 px
          em pé, e perto do início da viagem um fio achatado). */}
      <div className="progress-ponto" aria-hidden="true" />
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
