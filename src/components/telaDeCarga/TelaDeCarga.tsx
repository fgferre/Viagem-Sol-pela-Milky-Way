// ============================================================
// A TELA DE CARREGAMENTO — uma cena do rodízio por visita, animando
// fora da thread principal (`hospedeiro.ts`), com o título, a frase da
// etapa e o andamento (porcentagem, ou o contador de estrelas do céu) em
// HTML por cima, cada tela no seu lugar (05-loading.css). Os rótulos que
// a cena desenha no quadro saem daqui, rasterizados (`rotulos.ts`).
// Quando a carga acaba a cena toca o desfecho, e o quadro final dela se
// dissolve direto no Sol do app com a abertura chegando na mesma fusão
// (a passagem, abaixo).
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { assinarIdioma, idiomaAtual, t } from '../../lib/idioma';
import { useIdioma } from '../../hooks/useIdioma';
import { LOAD_STAGES } from '../../three/director';
import type { LoadStage, LoadStageId } from '../../three/director';
import { RETRATO_ABAIXO_DE, type EstadoDaCena, type IdDaTela } from './cena';
import type { FatiaDaCarga } from './andamento';
import { montarTela, type Hospedeiro } from './hospedeiro';
import { chaveDosRotulos, rasterizarRotulos } from './rotulos';
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
 * A PASSAGEM PARA A ABERTURA (pedido dele: o quadro final da cena se
 * dissolve DIRETO no Sol de verdade, com a abertura chegando na mesma
 * fusão — sem fundo morto entre os dois, sem o Sol pipocando depois).
 * Em ordem:
 *  1. a carga acaba e o desfecho toca com o motor do app PARADO (App.tsx,
 *     `motorEspera`): os dois disputando a GPU derrubavam a cena a ~42
 *     quadros/s;
 *  2. a `AQUECER_ANTES_DO_FIM_S` do fim do desfecho o motor volta a
 *     desenhar, escondido POR BAIXO da cena (`aoSair('aquecendo')`): o 1º
 *     quadro dele leva 0,4–1 s na GPU e sai preto (medido em 07/10), e
 *     isso acontece onde ninguém vê;
 *  3. nos últimos `--tc-titulo-sai` do desfecho o texto da carga sai: o
 *     título da abertura fica noutra altura, e os dois juntos liam como um
 *     título escrito duas vezes;
 *  4. no fim do desfecho a cena para no quadro final (`.tc-parada`, a 99 %
 *     de opacidade — ver 05-loading.css) e espera o motor pintar DE
 *     VERDADE: a cerca da GPU (`motorPronto`, do App) e uma sequência de
 *     quadros sem tranco da página, alguns deles já com a cena parada, com
 *     um teto para não prender a camada num aparelho que nunca chegue lá;
 *  5. UMA fusão de `--tc-cruzar` (05-loading.css): a cena apaga enquanto a
 *     abertura entra por cima (`aoSair('saindo')`), e no fim dela a camada
 *     desmonta (`aoSair('fora')`).
 * Do fim da carga à abertura inteira: 2,8 s de desfecho + a espera do
 * motor (quase sempre nenhuma) + a fusão.
 */
const AQUECER_ANTES_DO_FIM_S = 1;
const QUADROS_LISOS_PARA_REVELAR = 6;
/** dos quadros lisos, quantos com a cena já parada (o compositor desenhando o motor) */
const QUADROS_LISOS_COM_A_CENA_PARADA = 4;
/**
 * um quadro "sem tranco": os do aquecimento travam a página por 0,3–0,9 s;
 * o retrato do Sol com a GPU disputada anda a 20–30 quadros/s (até 50 ms),
 * e isso não é tranco (medido em 07/10, `capturas/carregamento/app2/`)
 */
const QUADRO_LISO_MS = 70;
const TETO_DO_MOTOR_MS = 3000;
/** o teto do desmonte, se o `transitionend` não vier (aba de fundo, transição zerada) */
const TETO_DA_SAIDA_MS = 2500;

const dprAtual = () => Math.min(window.devicePixelRatio || 1, 2);

/** as estrelas do catálogo HYG, que o contador do céu conta (`cenas/ceu.ts`, item 2) */
const ESTRELAS_DO_CATALOGO = 328_749;
const milhar = (n: number) => n.toLocaleString(idiomaAtual() === 'en' ? 'en-US' : 'pt-BR');

/**
 * O ANDAMENTO EM TEXTO, como o protótipo de cada tela o escrevia (o
 * cabeçalho de cada cena): a porcentagem, ou no céu o contador de estrelas.
 */
function textoDoAndamento(tela: IdDaTela | null, suave: number): string {
  const s = Math.min(1, Math.max(0, suave));
  switch (tela) {
    case 'ceu':
      return t('hud.carga.contador', {
        n: milhar(Math.round(ESTRELAS_DO_CATALOGO * Math.pow(s, 1.3))),
        total: milhar(ESTRELAS_DO_CATALOGO),
      });
    case 'bercario':
      return `${Math.floor(s * 100)} %`;
    case 'galaxia':
      return `${Math.min(100, Math.floor(s * 100 + 1e-6))}%`;
    default:
      return `${Math.round(s * 100)}%`;
  }
}

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
   * `aquecendo`: o motor do app pode voltar a desenhar, por baixo da cena;
   * `saindo`: a abertura entra por cima enquanto a cena apaga; `fora`:
   * pode desmontar
   */
  aoSair: (fase: 'aquecendo' | 'saindo' | 'fora') => void;
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
  const [aquecendo, setAquecendo] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [acabou, setAcabou] = useState(false);
  const acabouRef = useRef(false);
  const [saindo, setSaindo] = useState(false);

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
    const raiz = raizRef.current;
    // a saída do texto, em s antes do fim do desfecho (o mesmo número do CSS)
    const tituloSai = raiz ? parseFloat(getComputedStyle(raiz).getPropertyValue('--tc-titulo-sai')) || 0 : 0;
    let andamento = '';
    let fim = '';
    let aqueceu = false;
    let fechou = false;
    const aoQuadro = (e: EstadoDaCena, restante: number) => {
      const texto = textoDoAndamento(tela, e.suave);
      if (texto !== andamento && pctRef.current) {
        andamento = texto;
        pctRef.current.textContent = texto;
      }
      const f = e.fim.toFixed(3);
      if (f !== fim) {
        fim = f;
        raizRef.current?.style.setProperty('--tc-fim', f);
      }
      if (!aqueceu && restante <= AQUECER_ANTES_DO_FIM_S) {
        aqueceu = true;
        setAquecendo(true);
        aoSair('aquecendo');
      }
      if (!fechou && restante <= tituloSai) {
        fechou = true;
        setFechando(true);
      }
    };

    // OS RÓTULOS DA CENA: rasterizados aqui, e de novo quando a língua, o
    // `dpr` ou (no céu) o degrau do retrato mudam. A cena não espera por
    // eles: eles só aparecem perto do meio da carga, e chegam antes.
    let chave: string | null = null;
    let pedido = 0;
    const atualizarRotulos = (refazer = false) => {
      const largura = window.innerWidth;
      const altura = window.innerHeight;
      const dpr = dprAtual();
      const nova = chaveDosRotulos(tela, largura, altura, dpr);
      if (nova === null || (nova === chave && !refazer)) return;
      chave = nova;
      const meu = ++pedido;
      rasterizarRotulos(tela, largura, altura, dpr).then(
        (feitos) => {
          if (meu === pedido) host.rotulos(feitos);
          else for (const r of feitos.values()) r.bitmap.close();
        },
        (err: unknown) => console.error(err)
      );
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
      aoAcabar: () => {
        acabouRef.current = true;
        setAcabou(true);
      },
      refazerRotulos: () => atualizarRotulos(true),
    });
    hostRef.current = host;
    atualizarRotulos();
    const aoRedimensionar = () => atualizarRotulos();
    window.addEventListener('resize', aoRedimensionar);
    const largarIdioma = assinarIdioma(() => atualizarRotulos());
    return () => {
      pedido++;
      window.removeEventListener('resize', aoRedimensionar);
      largarIdioma();
      host.soltar();
      hostRef.current = null;
    };
  }, [comCena, tela, foto, aoSair]);

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

  // A PASSAGEM, passo 4: no fim do desfecho a cena para no quadro final
  // (e deixa a GPU ao motor, que já desenha por baixo)
  useLayoutEffect(() => {
    if (acabou && estado === 'done') hostRef.current?.congelar();
  }, [acabou, estado]);

  // passos 4 e 5: com o desfecho no fim e o motor pintando de verdade, a
  // fusão. A contagem nasce no efeito do `aquecendo`, que roda DEPOIS do
  // `motor.start()` do App no mesmo commit: o 1º rAF dela vem depois do
  // 1º quadro do motor, e a cerca posta ali cobre esse quadro.
  useEffect(() => {
    if (!aquecendo || estado !== 'done') return undefined;
    const desde = performance.now();
    let raf = 0;
    let gpu = false;
    let lisos = 0;
    let lisosParada = 0;
    let anterior = desde;
    const contar = (agora: number) => {
      gpu ||= motorPronto();
      const liso = gpu && agora - anterior < QUADRO_LISO_MS;
      lisos = liso ? lisos + 1 : 0;
      lisosParada = liso && acabouRef.current ? lisosParada + 1 : 0;
      anterior = agora;
      const pintando =
        (lisos >= QUADROS_LISOS_PARA_REVELAR && lisosParada >= QUADROS_LISOS_COM_A_CENA_PARADA) ||
        agora - desde > TETO_DO_MOTOR_MS;
      if (pintando && acabouRef.current) {
        setSaindo(true);
        aoSair('saindo');
      } else raf = requestAnimationFrame(contar);
    };
    raf = requestAnimationFrame(contar);
    return () => cancelAnimationFrame(raf);
  }, [aquecendo, estado, aoSair, motorPronto]);

  useEffect(() => {
    const raiz = raizRef.current;
    if (!saindo || !raiz) return undefined;
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
  }, [saindo, aoSair]);

  // a proporção da janela vai ao CSS (onde cada tela põe o texto) antes
  // da primeira pintura, com o degrau do retrato da cena; o tamanho, à cena
  useLayoutEffect(() => {
    const medir = () => {
      const largura = window.innerWidth;
      const altura = window.innerHeight;
      const raiz = raizRef.current;
      raiz?.style.setProperty('--tc-proporcao', (largura / altura).toFixed(4));
      raiz?.toggleAttribute('data-retrato', tela !== null && largura / altura < RETRATO_ABAIXO_DE[tela]);
      hostRef.current?.tamanho(largura, altura, dprAtual());
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [tela]);

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
    fechando && !falhou ? 'tc-fechando' : '',
    acabou && estado === 'done' ? 'tc-parada' : '',
    saindo && !falhou ? 'tc-saindo' : '',
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
            {tela === 'galaxia' && (
              <span className="tc-sep" aria-hidden="true">
                ·
              </span>
            )}
            {/* o céu conta estrelas no lugar da porcentagem */}
            <div ref={pctRef} className={tela === 'ceu' ? 'tc-contador' : 'tc-pct'}>
              {textoDoAndamento(tela, 0)}
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
