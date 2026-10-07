// ============================================================
// A TELA DE CARREGAMENTO — uma cena do rodízio por visita, animando
// fora da thread principal (`hospedeiro.ts`), com o título, a frase da
// etapa e a porcentagem em HTML por cima. Quando a carga acaba a cena
// toca o desfecho; no fim dele a tela de abertura entra POR CIMA do
// quadro final (o App libera o véu de título em `aoSair('saindo')`), o
// motor do app volta a desenhar por baixo dela (`'revelando'`), e só
// então a cena apaga e a camada desmonta (`'fora'`).
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { t } from '../../lib/idioma';
import { useIdioma } from '../../hooks/useIdioma';
import { LOAD_STAGES } from '../../three/director';
import type { LoadStage, LoadStageId } from '../../three/director';
import type { EstadoDaCena, IdDaTela } from './cena';
import type { FatiaDaCarga } from './andamento';
import { montarTela, type Hospedeiro } from './hospedeiro';
import { escolherTela } from './rodizio';

/**
 * QUANTO CADA ETAPA COSTUMA LEVAR NA MESA (s) — medido em 07/10 num M1
 * (`capturas/carregamento/medicao/` da cópia do ramo): a galáxia é quase
 * metade da carga, e `stars` passa no mesmo quadro que `catalogs`. É o
 * que faz a porcentagem andar no ritmo do tempo, e não aos saltos de
 * 1/7 por etapa; no celular tudo é mais lento, e a proporção é parecida.
 */
const SEGUNDOS_DA_ETAPA: Record<LoadStageId, number> = {
  catalogs: 0.6,
  stars: 0.05,
  dust: 0.65,
  structure: 0.7,
  galaxy: 2.6,
  layers: 0.35,
  shaders: 0.6,
};
const SEGUNDOS_DA_CARGA = LOAD_STAGES.reduce((s, e) => s + SEGUNDOS_DA_ETAPA[e.id], 0);

function fatiaDa(etapa: LoadStage): FatiaDaCarga {
  let antes = 0;
  for (const s of LOAD_STAGES) {
    if (s.id === etapa.id) break;
    antes += SEGUNDOS_DA_ETAPA[s.id];
  }
  const segundos = SEGUNDOS_DA_ETAPA[etapa.id];
  return {
    piso: antes / SEGUNDOS_DA_CARGA,
    teto: (antes + segundos) / SEGUNDOS_DA_CARGA,
    segundos,
  };
}

/**
 * A CENA SÓ APAGA COM O MOTOR DO APP JÁ PINTANDO. Ele volta a desenhar
 * quando a abertura termina de entrar (App.tsx): o 1º quadro leva
 * 0,4–1 s na GPU (compila e sobe tudo) sem a thread principal perceber e
 * sai PRETO, e por ~1 s os quadros do retrato do Sol pesam (medido em
 * 07/10). Daí, em ordem: a GPU terminou os primeiros quadros
 * (`motorPronto`, do App) e depois uma sequência de quadros lisos da
 * página (os mesmos rAF do motor), com um teto para não prender a camada
 * num aparelho que nunca chegue lá.
 */
const QUADROS_LISOS_PARA_REVELAR = 10;
const QUADRO_LISO_MS = 50;
const TETO_DO_MOTOR_MS = 3000;
/** o teto do desmonte, se o `transitionend` não vier (aba de fundo, transição zerada) */
const TETO_DA_SAIDA_MS = 2500;

const dprAtual = () => Math.min(window.devicePixelRatio || 1, 2);

export function TelaDeCarga({
  etapa,
  estado,
  emVoo,
  erro,
  foto,
  reduzido,
  onRetry,
  aoSair,
  motorPronto,
}: {
  /** etapa viva do director (ou a fixada por `?loader=`) */
  etapa: LoadStage;
  /** `done`: a carga acabou e o desfecho toca; `error`: a cena para */
  estado: 'loading' | 'done' | 'error';
  /**
   * A FALHA CHEGOU COM A VIAGEM JÁ ANDANDO (contexto de vídeo perdido,
   * exceção em quadro): a copy muda, e sem cena nem worker — o painel
   * fica sobre fundo escuro.
   */
  emVoo: boolean;
  /** mensagem técnica da falha */
  erro?: string;
  /** `?shot=`: um quadro parado por etapa e nenhum desfecho */
  foto: boolean;
  /** prefers-reduced-motion, ao vivo */
  reduzido: boolean;
  onRetry: () => void;
  /**
   * `saindo`: a abertura pode entrar por cima; `revelando`: ela entrou, e
   * o motor do app pode voltar a desenhar; `fora`: pode desmontar
   */
  aoSair: (fase: 'saindo' | 'revelando' | 'fora') => void;
  /** a GPU do motor do app já terminou os primeiros quadros dele */
  motorPronto: () => boolean;
}) {
  // a língua entra como DEPENDÊNCIA de render (item 130)
  useIdioma();
  const falhou = estado === 'error';
  const semCena = falhou && emVoo;
  // o rodízio anda quando a tela monta para mostrar uma cena — a camada
  // que volta só para a falha em voo não gasta a vez de ninguém
  const [tela] = useState<IdDaTela | null>(() =>
    semCena ? null : escolherTela(window.location.search)
  );
  const comCena = tela !== null && !semCena;
  const raizRef = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<Hospedeiro | null>(null);
  const reduzidoRef = useRef(reduzido);
  const [pronta, setPronta] = useState(false);
  const [acabou, setAcabou] = useState(false);
  const [revelando, setRevelando] = useState(false);
  const saindo = acabou && estado === 'done';

  // A FRASE DA ETAPA TROCA EM CRUZ: duas vagas no mesmo lugar, a nova
  // entra enquanto a velha sai (o CSS faz o fade pela classe)
  const [frases, setFrases] = useState({ a: etapa.label, b: '', ativa: 'a' as 'a' | 'b' });
  const fraseAtual = frases.ativa === 'a' ? frases.a : frases.b;
  if (fraseAtual !== etapa.label) {
    setFrases(
      frases.ativa === 'a'
        ? { a: frases.a, b: etapa.label, ativa: 'b' }
        : { a: etapa.label, b: frases.b, ativa: 'a' }
    );
  }

  // OS RECADOS À CENA SAEM NO COMMIT (layout), não depois da pintura: o
  // fim da carga chega junto com o primeiro quadro do motor do app, que
  // segura a thread por ~0,3 s — um efeito comum só avisaria a cena
  // depois dele, e o desfecho começaria atrasado.
  useLayoutEffect(() => {
    const palco = palcoRef.current;
    if (!comCena || !tela || !palco) return undefined;
    let pct = -1;
    let fim = '';
    const aoQuadro = (e: EstadoDaCena) => {
      const p = Math.round(e.suave * 100);
      if (p !== pct && pctRef.current) {
        pct = p;
        pctRef.current.textContent = `${p}%`;
      }
      const f = e.fim.toFixed(3);
      if (f !== fim) {
        fim = f;
        raizRef.current?.style.setProperty('--tc-fim', f);
      }
    };
    const host = montarTela(palco, {
      id: tela,
      foto,
      reduzido: reduzidoRef.current,
      largura: window.innerWidth,
      altura: window.innerHeight,
      dpr: dprAtual(),
      aoQuadro,
      aoPronto: () => setPronta(true),
      aoAcabar: () => setAcabou(true),
    });
    hostRef.current = host;
    return () => {
      host.soltar();
      hostRef.current = null;
    };
  }, [comCena, tela, foto]);

  useLayoutEffect(() => {
    hostRef.current?.etapa(fatiaDa(etapa));
  }, [etapa, comCena]);

  useLayoutEffect(() => {
    reduzidoRef.current = reduzido;
    hostRef.current?.reduzir(reduzido);
  }, [reduzido]);

  useLayoutEffect(() => {
    if (estado === 'error') hostRef.current?.congelar();
    if (estado !== 'done') return;
    // a foto não toca desfecho: a abertura entra no mesmo quadro
    if (foto) {
      aoSair('fora');
      return;
    }
    hostRef.current?.terminou();
  }, [estado, comCena, foto, aoSair]);

  // A SAÍDA, em tempos. A abertura entra por cima do quadro final
  // (`--tc-abertura`, 05-loading.css) com a thread livre; inteira, ela
  // libera o motor do app, que volta a desenhar por baixo — e a cena
  // para no quadro dourado (sob a abertura ele já quase não se move) para
  // deixar a GPU ao motor; com o motor pintando, a camada apaga, e o fim
  // dessa transição é o sinal de desmontar.
  useEffect(() => {
    const raiz = raizRef.current;
    if (!saindo || !raiz) return undefined;
    aoSair('saindo');
    const abertura = (parseFloat(getComputedStyle(raiz).getPropertyValue('--tc-abertura')) || 0) * 1000;
    let raf = 0;
    let gpu = false;
    let lisos = 0;
    let inicio = 0;
    let anterior = 0;
    const contar = (agora: number) => {
      gpu ||= motorPronto();
      lisos = gpu && agora - anterior < QUADRO_LISO_MS ? lisos + 1 : 0;
      anterior = agora;
      if (lisos >= QUADROS_LISOS_PARA_REVELAR || agora - inicio > TETO_DO_MOTOR_MS) setRevelando(true);
      else raf = requestAnimationFrame(contar);
    };
    const relogio = window.setTimeout(() => {
      hostRef.current?.congelar();
      aoSair('revelando');
      inicio = anterior = performance.now();
      raf = requestAnimationFrame(contar);
    }, abertura);
    return () => {
      window.clearTimeout(relogio);
      cancelAnimationFrame(raf);
    };
  }, [saindo, aoSair, motorPronto]);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!revelando || !raiz) return undefined;
    let saiu = false;
    const sair = () => {
      if (saiu) return;
      saiu = true;
      aoSair('fora');
    };
    const aoFimDaTransicao = (ev: TransitionEvent) => {
      if (ev.target === raiz && ev.propertyName === 'opacity') sair();
    };
    raiz.addEventListener('transitionend', aoFimDaTransicao);
    const teto = window.setTimeout(sair, TETO_DA_SAIDA_MS);
    return () => {
      raiz.removeEventListener('transitionend', aoFimDaTransicao);
      window.clearTimeout(teto);
    };
  }, [revelando, aoSair]);

  // a proporção da janela vai ao CSS (onde cada tela põe o texto) antes
  // da primeira pintura; o tamanho, à cena
  useLayoutEffect(() => {
    const medir = () => {
      const largura = window.innerWidth;
      const altura = window.innerHeight;
      raizRef.current?.style.setProperty('--tc-proporcao', (largura / altura).toFixed(4));
      hostRef.current?.tamanho(largura, altura, dprAtual());
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const anuncio = t('hud.etapaAnuncio', {
    i: etapa.index,
    total: etapa.total,
    rotulo: etapa.label,
  });
  const classes = [
    'tc-tela',
    falhou ? 'tc-falhou' : estado === 'done' ? 'tc-desfecho' : 'tc-carregando',
    emVoo ? 'tc-em-voo' : '',
    pronta ? 'tc-pronta' : '',
    saindo ? 'tc-saindo' : '',
    saindo && revelando ? 'tc-revelando' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={raizRef} className={classes} data-tela={tela ?? undefined}>
      <div ref={palcoRef} className="tc-palco" aria-hidden="true" />

      {comCena && !falhou && (
        <div className="tc-texto">
          {/* O NOME do app segue a língua (Mar de Estrelas / Sea of Stars) */}
          <div className="tc-titulo">{t('hud.nome')}</div>
          {/* a régua do progressbar é a ETAPA, como sempre foi: a
              porcentagem é desenho, e o rótulo vai no aria-valuetext */}
          <div
            className="tc-baixo"
            role="progressbar"
            aria-label={t('hud.progressoCarregamento')}
            aria-valuemin={1}
            aria-valuemax={etapa.total}
            aria-valuenow={etapa.index}
            aria-valuetext={anuncio}
          >
            <div className="tc-etapa">
              <span className={frases.ativa === 'a' ? 'tc-atual' : undefined}>{frases.a}</span>
              <span className={frases.ativa === 'b' ? 'tc-atual' : undefined}>{frases.b}</span>
            </div>
            <div ref={pctRef} className="tc-pct">
              0%
            </div>
          </div>
        </div>
      )}

      {/* só a MUDANÇA de etapa é anunciada — ler a tela inteira a cada
          troca fazia o leitor de tela repetir o título */}
      <div className="tc-anuncio" aria-live="polite">
        {estado === 'loading' ? anuncio : ''}
      </div>

      {falhou && (
        <div className="tc-falha" role="alert">
          <div className="title-kicker">{t(emVoo ? 'hud.falhaEmVoo' : 'hud.falhaNoBoot')}</div>
          <div className="title-big error-title">
            {t(emVoo ? 'hud.falhaEmVooTitulo' : 'hud.falhaNoBootTitulo')}
          </div>
          <div className="tc-falha-detalhe">
            {emVoo
              ? t('hud.falhaEmVooNota')
              : t('hud.falhaNoBootNota', {
                  i: String(etapa.index).padStart(2, '0'),
                  total: String(etapa.total).padStart(2, '0'),
                  rotulo: etapa.label,
                })}
          </div>
          {erro && (
            <details className="tc-falha-tecnico">
              <summary>{t('hud.falhaDetalhes')}</summary>
              {erro}
            </details>
          )}
          <div className="title-rule tc-falha-regua" />
          <button className="hud-btn" onClick={onRetry}>
            {/* rótulo em `<span>` (C2 do plano de motion): a pressão da
                casa afunda o filho (`> *`) */}
            <span>{t('hud.tentarNovamente')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
