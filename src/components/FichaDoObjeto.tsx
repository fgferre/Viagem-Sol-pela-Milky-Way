// ============================================================
// A FICHA DO OBJETO — o painel que o dono procurava (item 74).
//
// PALAVRAS DELE, 22/08: *"o 'em quadro' no projeto atlas orbital havia um
// elemento grande do HUD cheio de informacoes incriveis sobre os objetos
// selecionados. onde isso foi parar?"*. A resposta medida foi: nunca veio.
// O painel era o `Sidebar.tsx` do doador, 778 linhas, e a fusão trouxe a
// MECÂNICA do Atlas e deixou o CONTEÚDO para trás.
//
// ESTE ARQUIVO SÓ DESENHA. Toda a montagem — que linha existe, que unidade
// ela usa, de onde o número veio — mora em `lib/atlas/ficha.ts`, sem three e
// sem React. É a fronteira que o `docs/NORTE.md` nomeia como o
// anti-padrão do doador, onde vis-viva, parser de sobrescrito e layout
// dividiam o mesmo corpo.
//
// ELA É A QUARTA `.hud-dialogo`. Ajustes, Camadas e Busca já se penduram na
// barra medida, encostados à direita, com o mesmo teto; a ficha entra na
// mesma régua e só declara a largura dela. Nasce em `useDialogFocus`, o que
// faz o juiz de a11y julgar as quatro promessas do diálogo (o foco entra,
// fica preso, Esc fecha, volta ao gatilho) sem uma linha a mais.
//
// O CABEÇALHO É O "EM QUADRO": o nome do alvo, a CLASSE dele ao lado e os
// dois gestos da escada, no topo fixo da ficha. Sem seleção não há ficha, e
// sem ficha nada ocupa aquele canto.
//
// O DADO CHEGA NA PRIMEIRA ABERTURA, nunca no boot: são dois arquivos, o
// `corpos.json` (61 KB, o pt-BR e a órbita) e o `texturas.json` (110 KB, que o
// mundo já baixou ao entrar no Atlas e o navegador serve do cache). Quem
// nunca abre a ficha não paga um byte. A memoização é a mesma de
// `buscarManifestUmaVez` — uma promessa por URL, guardada no módulo.
//
// E O "AGORA" RELÊ NO `onTempo`, nunca no laço de quadro (anti-padrão 3 do
// `docs/NORTE.md`): o `jd` chega por prop, na cadência do mostrador da máquina
// do tempo. Desde 24/08 essa cadência é o MINUTO enquanto o relógio anda ao
// vivo (era 4 Hz — ver `mesmoMostrador`), que é a mesma resolução da data na
// tela: o "AGORA" da ficha e o relógio do rodapé deixaram de contar minutos
// diferentes. Na viagem em degrau rápido ela continua rápida, porque ali a
// data realmente muda.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogFocus, gatilhoDoDialogo } from '../lib/dialogFocus';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { useDicaPresa } from '../hooks/useDicaPresa';
import { Ajuda } from './Ajuda';
import { CabecalhoDoPainel } from './CabecalhoDoPainel';
import { Icone } from './Icone';
import type { CorpoNoJson, CorposDoAtlas, FonteDaFicha, IdDeSecao } from '../lib/atlas/ficha';
import { montarFicha, montarFichaDeEstrela } from '../lib/atlas/ficha';
import type { NamedStar } from '../three/config';
import type { ManifestDeTexturas } from '../three/world/corpos/texturas';
import { PROCEDENCIA } from '../three/selo';

/** Acima disso uma frase não cabe nos 60% da coluna de valor sem virar
 *  uma palavra por linha — a linha empilha inteira (`.larga`, 04-atlas.css)
 *  em vez de espremer. O número é medido, não gosto: "317,83× Terra" tem
 *  14 caracteres e cabe; "definição" ou uma frase de contexto passam
 *  fácil dos 24. */
const LIMIAR_DA_LINHA_LARGA = 24;

/**
 * OS DOIS ARQUIVOS DA FICHA, cada um com a sua promessa única. Módulo e não
 * estado: duas fichas abertas em sequência (ou o StrictMode montando duas
 * vezes em dev) pedem o mesmo arquivo, e o segundo pedido tem de encontrar o
 * primeiro em voo. Falha NÃO fica grudada: a promessa é limpa, e a próxima
 * abertura tenta de novo — o precedente é o `RECARGAS_ATE_DESISTIR` das
 * texturas, onde um 404 transitório matava o globo a sessão inteira.
 *
 * O SEGUNDO ARQUIVO É O MANIFESTO DE TEXTURAS (item 74, parte B), e ele é
 * quase de graça: o mundo já o baixou ao entrar no Atlas, pela mesma URL, e
 * o navegador o serve do cache. São 110 KB, e a alternativa — copiar a
 * `origem` de cada corpo para dentro do `corpos.json` — seria a mesma
 * procedência escrita em dois artefatos.
 */
const emVoo = new Map<string, Promise<unknown>>();

function buscarUmaVez<T>(caminho: string): Promise<T> {
  const url = `${import.meta.env.BASE_URL}${caminho}`;
  const anterior = emVoo.get(url) as Promise<T> | undefined;
  if (anterior) return anterior;
  const nova = fetch(url)
    .then((resposta) => {
      if (!resposta.ok) throw new Error(`${caminho} indisponível (${resposta.status})`);
      return resposta.json() as Promise<T>;
    })
    .catch((erro: Error) => {
      emVoo.delete(url);
      throw erro;
    });
  emVoo.set(url, nova);
  return nova;
}

export function FichaDoObjeto({
  aberta,
  onFechar,
  corpoId,
  estrelaEmFoco,
  estrela,
  jd,
  camaraUa,
  fonte,
  podeAproximar,
  noSistema,
  onAproximar,
  onSistema,
  relevoDaCor,
  onRelevoDaCor,
  celular = false,
  fichaExpandida = false,
  onAlternarFichaExpandida,
}: {
  aberta: boolean;
  onFechar: () => void;
  /** o corpo em FOCO — a escada é a única escritora dele */
  corpoId: string | null;
  /** o NOME da estrela em foco, quando o foco é estelar */
  estrelaEmFoco: string | null;
  /** a LINHA do catálogo daquele nome — `null` para o centro galáctico,
   *  que é foco e não é estrela nomeada (a ficha dele fica só no cabeçalho) */
  estrela: NamedStar | null;
  /** o instante MOSTRADO pela máquina do tempo */
  jd: number | null;
  /** onde a CÂMERA está, em eclíptica heliocêntrica UA — `null` fora do
   *  Atlas, e aí a linha do "daqui" some */
  camaraUa: readonly [number, number, number] | null;
  /** a efeméride viva; `null` até ela chegar pela rede */
  fonte: FonteDaFicha | null;
  /** o corpo em foco tem degrau abaixo (mesh resolvido)? */
  podeAproximar: boolean;
  /** já estamos no enquadramento de abertura? (o botão some) */
  noSistema: boolean;
  onAproximar: () => void;
  onSistema: () => void;
  /** o interruptor do relevo fingido da cor (rochoso com foto e sem mapa
   *  de relevo); `null` onde ele não existe — e o botão nem aparece */
  relevoDaCor: boolean | null;
  onRelevoDaCor: (ligado: boolean) => void;
  /** alça de arrasto no cabeçalho (`CabecalhoDoPainel`) — só na folha do celular */
  celular?: boolean;
  /** compacta (`false`) ou expandida (`true`) — só existe apresentação
   *  no celular; a mesa ignora as duas props (Lote 5, PLAN-UI.md §7) */
  fichaExpandida?: boolean;
  /** o toque em "Detalhes"/"Recolher" — `useGavetas().alternarFichaExpandida` */
  onAlternarFichaExpandida?: () => void;
}) {
  // NÃO MODAL PARA O TECLADO (dialogFocus.ts): a ficha é o painel da
  // SELEÇÃO, e o mouse já pode escolher outro corpo com ela aberta
  // (a exceção em `director/gestos.ts`) — sem `modal: false` o Tab
  // ficaria preso e o `aria-modal` mentiria um bloqueio que o clique
  // nunca respeitou.
  const dialogo = useDialogFocus('ficha', aberta, onFechar, { modal: false });
  const idioma = useIdioma();
  // A DICA PRESA (redesenho, 06/09) — o mesmo padrão de Ajustes e das
  // gavetas: fixar uma "?" apaga a de cima, clique fora do diálogo
  // desfixa, e Esc desfixa ANTES de fechar a ficha.
  const { presa: dicaPresa, alternar: alternarDica, limpar: limparDica, aoTeclarEsc } = useDicaPresa();
  const [corpos, setCorpos] = useState<Map<string, CorpoNoJson> | null>(null);
  const [texturas, setTexturas] = useState<ManifestDeTexturas | null>(null);
  // AS DUAS FALHAS VISÍVEIS (Lote 5, PLAN-UI.md §9) — um booleano por
  // arquivo, e não um só: `corpos.json` alimenta contexto/curiosidades/
  // parte da órbita, `texturas.json` alimenta a imagem, e podem falhar
  // em momentos diferentes (o segundo é quase de graça, o cache do
  // navegador; o primeiro é rede de verdade). "Tentar de novo" zera SÓ o
  // booleano dele: a condição do efeito abaixo (`!corpos && !erroCorpos`)
  // volta a valer, e `buscarUmaVez` já apaga a entrada de `emVoo` no
  // próprio catch — o fetch novo é automático, não precisa de contador.
  const [erroCorpos, setErroCorpos] = useState(false);
  const [erroTexturas, setErroTexturas] = useState(false);
  /**
   * QUE SEÇÕES ESTÃO ABERTAS — e de QUE corpo, no mesmo estado.
   *
   * Duas armadilhas moram aqui, e o formato as fecha as duas:
   *
   * 1. `null` é o estado de NASCENÇA (a primeira seção aberta, as outras
   *    fechadas). Guardar a lista explícita desde o começo faria quem FECHA
   *    a primeira seção vê-la reabrir sozinha, porque "lista vazia" e
   *    "ainda não mexi" seriam a mesma coisa.
   * 2. O `corpo` viaja JUNTO em vez de um efeito zerar a lista quando o
   *    foco troca. Efeito que chama `setState` no corpo dele é render em
   *    cascata (e o lint da casa o proíbe, com razão): trocar de alvo
   *    desenharia uma vez com as seções do alvo ANTERIOR e só então
   *    corrigiria. Comparando aqui, o primeiro desenho já é o certo.
   */
  const [abertas, setAbertas] = useState<{
    corpo: string | null;
    secoes: readonly IdDeSecao[];
  } | null>(null);
  const alvo = corpoId ?? estrelaEmFoco;
  const escolhidas = abertas && abertas.corpo === alvo ? abertas.secoes : null;

  // A CARGA COMEÇA NA PRIMEIRA ABERTURA. `aberta` na lista de dependências
  // e não `corpoId`: trocar de corpo com a ficha fechada não pede rede.
  useEffect(() => {
    if (!aberta) return;
    let vivo = true;
    // SEM OS JSONs A FICHA CONTINUA ÚTIL: raio, gravidade, escape, distância
    // e velocidade não dependem deles. O que falta é a órbita, a prosa e a
    // procedência da imagem — e cada uma some sozinha, sem linha a explicar.
    if (!corpos && !erroCorpos) {
      buscarUmaVez<CorposDoAtlas>('data/atlas/corpos.json')
        .then((doc) => {
          if (vivo) setCorpos(new Map(doc.corpos.map((c) => [c.id, c])));
        })
        .catch(() => {
          if (vivo) setErroCorpos(true);
        });
    }
    if (!texturas && !erroTexturas) {
      buscarUmaVez<ManifestDeTexturas>('data/atlas/texturas.json')
        .then((doc) => {
          if (vivo) setTexturas(doc);
        })
        .catch(() => {
          if (vivo) setErroTexturas(true);
        });
    }
    return () => {
      vivo = false;
    };
  }, [aberta, corpos, erroCorpos, texturas, erroTexturas]);

  const ficha = useMemo(
    () =>
      corpoId
        ? montarFicha({
            id: corpoId,
            jd,
            fonte,
            editorial: corpos?.get(corpoId) ?? null,
            texturas,
            camaraUa,
          })
        : estrelaEmFoco
          ? montarFichaDeEstrela(estrelaEmFoco, estrela)
          : null,
    // `idioma` entra na lista porque a ficha é TEXTO: rótulos, títulos
    // de seção e a palavra da classe saem do dicionário, e sem ele o
    // memo devolveria a ficha da língua anterior (item 130). O lint não
    // vê a dependência porque ela chega pelo dicionário, não pelo nome.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corpoId, estrelaEmFoco, estrela, jd, fonte, corpos, texturas, camaraUa, idioma]
  );

  /**
   * A INTRODUÇÃO (Lote 5, PLAN-UI.md §3.5) — as três primeiras linhas do
   * texto da seção Contexto ("o que é"), ou da primeira curiosidade
   * quando não há contexto; NUNCA as duas, e nunca inventada: sem
   * nenhuma das duas, sem introdução (o `null` abaixo). `useMemo` e não
   * cálculo direto no JSX porque `ficha` pode ser `null` até aqui — o
   * hook precisa correr em toda passada, antes do `return null` de baixo.
   */
  const introducao = useMemo(() => {
    const contexto = ficha?.secoes.find((s) => s.id === 'contexto');
    if (contexto && contexto.linhas.length > 0) {
      return { secaoId: 'contexto' as const, texto: contexto.linhas[0].valor };
    }
    const curiosidades = ficha?.secoes.find((s) => s.id === 'curiosidades');
    if (curiosidades && curiosidades.linhas.length > 0) {
      return { secaoId: 'curiosidades' as const, texto: curiosidades.linhas[0].valor };
    }
    return null;
  }, [ficha]);

  /**
   * A LINHA DA COMPACTA (fix, 09/09) — "rótulo · valor" sob o nome, a
   * única coisa que a compacta (§7, 8,5rem) mostra além do cabeçalho e
   * da escada. PREFERE a seção "agora" (`lib/atlas/ficha.ts`): quando
   * ela existe é sempre a PRIMEIRA seção montada, e a primeira linha
   * dela é sempre a distância ao pai (Sol, ou Terra para a Lua) — a
   * mesma pergunta que "prefira a distância" pede, sem procurar texto
   * por rótulo (que mudaria de língua). SEM "agora" (a ficha de
   * ESTRELA, que não tem essa seção, ou um corpo cuja efeméride ainda
   * não respondeu), cai na primeira linha da primeira seção que
   * houver. Sem seção nenhuma, `null` — a compacta não desenha
   * esqueleto, então sem dado não sai linha nenhuma.
   */
  const resumoCompacto = useMemo(() => {
    const secao = ficha?.secoes.find((s) => s.id === 'agora') ?? ficha?.secoes[0];
    return secao?.linhas[0] ?? null;
  }, [ficha]);

  /**
   * O FOCO SEGUE O TOQUE (Lote 5, PLAN-UI.md §7): ao expandir, para
   * "Recolher"; ao recolher, para "Detalhes". SÓ quando a troca acontece
   * com a ficha JÁ aberta — a guarda `prev.aberta` é o que distingue
   * "acabou de expandir" de "acabou de abrir compacta" (que também muda
   * `fichaExpandida` de `true`, se sobrou de uma sessão anterior, para
   * `false` — e aí quem manda é `useDialogFocus`, não este efeito).
   */
  const detalhesRef = useRef<HTMLButtonElement>(null);
  const recolherRef = useRef<HTMLButtonElement>(null);
  const transicaoAnterior = useRef({ aberta, fichaExpandida });
  useEffect(() => {
    const anterior = transicaoAnterior.current;
    transicaoAnterior.current = { aberta, fichaExpandida };
    if (!celular || !aberta || !anterior.aberta || anterior.fichaExpandida === fichaExpandida) {
      return;
    }
    (fichaExpandida ? recolherRef : detalhesRef).current?.focus();
  }, [celular, aberta, fichaExpandida]);

  /**
   * A LARGURA ESTREITA (PLAN-UI.md §3.3, "≤ 360 px"): lida por
   * `matchMedia` COM OUVINTE — o mesmo padrão de `useCelular.ts` para os
   * 760 —, e NÃO por um segundo `@media` em `09-celular.css`. A casa tem
   * uma regra testada (`uiScale.test.ts`, "TODA quebra de largura do HUD
   * é LARGURA_DO_CELULAR_PX"): nenhum `@media(max-width)` no CSS do HUD
   * pode declarar outro número além de 760, e o botão "Detalhes" só-
   * ícone é um ajuste ESTREITO DEMAIS da FICHA, não uma segunda fronteira
   * de layout. O atributo abaixo é a MESMA porta que `data-ficha-estado`
   * já abre para o CSS (seletor de atributo, não `@media`).
   */
  const [larguraEstreita, setLarguraEstreita] = useState(
    () => window.matchMedia?.('(max-width: 360px)').matches ?? false
  );
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 360px)');
    const ouvir = () => setLarguraEstreita(consulta.matches);
    ouvir();
    consulta.addEventListener('change', ouvir);
    return () => consulta.removeEventListener('change', ouvir);
  }, []);

  if (!aberta || !ficha) return null;
  const primeira = ficha.secoes[0]?.id;
  // A COMPACTA (Lote 5, §7): só existe apresentação no celular; a mesa
  // sempre mostra o conteúdo cheio (introdução, seções, esqueleto, erro).
  const compacta = celular && !fichaExpandida;

  return (
    <div
      className="hud-cartao hud-dialogo atlas-ficha"
      // O ESTADO NO PRÓPRIO NÓ (Lote 5, PLAN-UI.md §7) — só existe no
      // celular; a mesa não tem o atributo, e é ele que `09-celular.css`
      // lê para trocar altura fixa por teto rolável, e que os juízes
      // podem ler para saber qual dos dois está na tela.
      data-ficha-estado={celular ? (fichaExpandida ? 'expandida' : 'compacta') : undefined}
      // A LARGURA ESTREITA (comentário acima do `useState`) — só importa
      // junto da compacta; presente sempre que ela vale, inofensiva fora
      // do celular (o CSS só a lê dentro de `[data-ficha-estado]`).
      data-ficha-largura={celular && larguraEstreita ? 'estreita' : undefined}
      aria-label={t('ficha.aria', { nome: ficha.nome })}
      {...dialogo}
      onClick={() => {
        // CLIQUE EM QUALQUER LUGAR DA FICHA desfixa a dica presa — o "?"
        // que a fixou já parou o próprio clique (`stopPropagation`), então
        // só chega aqui quem clicou fora dela (doutrina de `Ajustes.tsx`).
        if (dicaPresa) limparDica();
      }}
      // ESC COM DICA PRESA desfixa e NÃO fecha o diálogo (`aoTeclarEsc`,
      // `hooks/useDicaPresa.ts`).
      onKeyDownCapture={aoTeclarEsc}
    >
      {/* O CABEÇALHO ÚNICO (Lote 2b, PLAN-UI.md §3.5): a classe ("Planeta")
          é o EYEBROW — 11 px caixa alta, acima do nome — e é ela que leva
          o "?" (o mesmo de sempre, explicando os selos de procedência e o
          "×Terra" das linhas). O nome vem no `titulo`, e o `role="status"`
          continua nele: trocar de alvo é notícia para quem ouve a tela, e
          os botões (fora do título) não são relidos a cada troca. As duas
          classes (`atlas-ficha-nome`/`atlas-ficha-classe`) SOBREVIVEM ao
          componente novo: `busca-smoke.mjs` e `a11y.mjs` leem o texto por
          elas. */}
      <CabecalhoDoPainel
        eyebrow={<span className="atlas-ficha-classe">{ficha.classe}</span>}
        titulo={
          <span className="atlas-ficha-nome" role="status" aria-live="polite">
            {ficha.nome}
          </span>
        }
        ajuda={
          <Ajuda
            id="ficha"
            rotulo={ficha.nome}
            texto={t('ficha.ajuda')}
            presa={dicaPresa === 'ficha'}
            onAlternar={() => alternarDica('ficha')}
          />
        }
        // "DETALHES"/"RECOLHER" (Lote 5, §7) — só existe no celular; a
        // prop `acoes` já é o lugar do `CabecalhoDoPainel` para botões
        // extras entre o "?" e o fechar, então nem esse componente
        // precisa mudar. O `ref` é o alvo do foco ao trocar de estado
        // (o efeito lá em cima); o texto encolhe a só-ícone abaixo de
        // 360 px (09-celular.css), o `aria-label` sobrevive sempre.
        acoes={
          celular ? (
            <button
              type="button"
              ref={fichaExpandida ? recolherRef : detalhesRef}
              className="atlas-ficha-detalhes"
              aria-label={t(fichaExpandida ? 'ficha.recolherAria' : 'ficha.detalhesAria')}
              onClick={() => onAlternarFichaExpandida?.()}
            >
              <span className="atlas-ficha-detalhes-texto">
                {t(fichaExpandida ? 'ficha.recolher' : 'ficha.detalhes')}
              </span>
              <Icone nome={fichaExpandida ? 'chevronBaixo' : 'chevronCima'} tamanho={16} />
            </button>
          ) : undefined
        }
        onFechar={onFechar}
        rotuloFechar={t('ficha.fechar')}
        celular={celular}
      />

      {/* A LINHA DA COMPACTA (fix, 09/09) — "rótulo · valor" sob o
          nome, só nela: a expandida e a mesa já mostram o mesmo dado
          dentro da seção "Agora". Sem esqueleto quando falta: `null`
          simplesmente não desenha nada (comentário do `useMemo`). */}
      {compacta && resumoCompacto && (
        <p className="atlas-ficha-resumo">
          {resumoCompacto.rotulo} · {resumoCompacto.valor}
        </p>
      )}

      {/* OS DOIS GESTOS DA ESCADA são AÇÕES, não alternância — nenhum
          dos dois fica "ligado" depois do clique. Até aqui vestiam a
          classe do segmentado (`.ajustes-seg`, redesenho de 06/09), a
          MESMA de um grupo de ESCOLHA como Ajustes — o par tinha a
          fantasia errada. Agora são `.hud-btn small`, o botão de ação
          de sempre (o mesmo de "⌕ Buscar"/"⧉ Camadas" na barra); o
          `Segmentado` (`components/Segmentado.tsx`) não muda. */}
      <div className="atlas-ficha-escada">
        {podeAproximar && (
          <button
            type="button"
            className="hud-btn small"
            onClick={onAproximar}
            aria-label={t('ficha.aproximarAria', { nome: ficha.nome })}
          >
            <Icone nome="aproximar" tamanho={16} />
            {t('ficha.aproximar')}
          </button>
        )}
        {!noSistema && (
          <button
            type="button"
            className="hud-btn small"
            onClick={onSistema}
            aria-label={t('ficha.sistemaAria')}
          >
            <Icone nome="sistema" tamanho={16} />
            {t('ficha.sistema')}
          </button>
        )}
      </div>

      {/* A COMPACTA PARA AQUI (Lote 5, §7): alça, nome, Detalhes/✕ (no
          cabeçalho acima) e a escada (acima) — nada de introdução,
          seções, esqueleto ou erro, que não têm onde caber em 8,5rem e
          não são o que a compacta promete mostrar. */}
      {!compacta && (
        <>
          {/* A INTRODUÇÃO (§3.5) — três linhas do texto de Contexto, ou
              da primeira curiosidade sem ele; "Ler mais" abre a seção de
              origem e rola até ela, sem duplicar o texto. O BOTÃO FICA
              FORA do `<p>` clampado de propósito: um filho inline dentro
              de `-webkit-line-clamp` mede a caixa errado (medido: o
              recorte parava numa altura maior que 3 linhas e "Ler mais"
              saía cortado sem elipse) — irmão depois do parágrafo, o
              clamp mede só o texto que existe para ser cortado. */}
          {introducao && (
            <div className="atlas-ficha-intro-bloco">
              <p className="atlas-ficha-intro">{introducao.texto}</p>
              <button
                type="button"
                className="atlas-ficha-lermais"
                onClick={() => {
                  const secaoId = introducao.secaoId;
                  const base = escolhidas ?? (primeira ? [primeira] : []);
                  if (!base.includes(secaoId)) {
                    setAbertas({ corpo: alvo, secoes: [...base, secaoId] });
                  }
                  document
                    .getElementById(`ficha-secao-${secaoId}`)
                    ?.scrollIntoView({ block: 'nearest' });
                }}
              >
                {t('ficha.lerMais')}
              </button>
            </div>
          )}

          {/* A FICHA VAZIA (Lote 0/5) — o centro galáctico é foco e não é
              estrela do catálogo (`ficha.ts`, `montarFichaDeEstrela`):
              zero seções, e a linha diz isso em vez de um esqueleto que
              nunca teria o que preencher. SÓ para foco estelar sem
              catálogo — um corpo real (`corpoId`) com zero seções é
              coisa da REDE ainda em voo (esqueleto abaixo), não vazio. */}
          {!corpoId && ficha.secoes.length === 0 && (
            <p className="atlas-ficha-vazia">{t('ficha.vazia')}</p>
          )}

          {/* O ESQUELETO (§9) — enquanto `corpos.json`/`texturas.json`
              ainda estão em voo (e não erraram): três linhas, sem
              nenhuma animação em loop (a régua do §2 item 6 proíbe). */}
          {corpoId && ((!corpos && !erroCorpos) || (!texturas && !erroTexturas)) && (
            <div className="atlas-ficha-esqueleto" aria-busy="true">
              <span className="atlas-ficha-esqueleto-linha" />
              <span className="atlas-ficha-esqueleto-linha" />
              <span className="atlas-ficha-esqueleto-linha" />
            </div>
          )}

          {/* AS DUAS FALHAS (§9) — "Tentar de novo" só zera o booleano
              dela; o efeito de carga (lá em cima) refaz o `fetch`
              sozinho. O que já carregou (o resto da ficha) fica. */}
          {corpoId && erroCorpos && (
            <p className="atlas-ficha-erro">
              {t('ficha.erroCarregar')}
              <button type="button" onClick={() => setErroCorpos(false)}>
                {t('ficha.tentarDeNovo')}
              </button>
            </p>
          )}
          {corpoId && corpoId !== 'sun' && erroTexturas && (
            <p className="atlas-ficha-erro">
              {t('ficha.erroCarregar')}
              <button type="button" onClick={() => setErroTexturas(false)}>
                {t('ficha.tentarDeNovo')}
              </button>
            </p>
          )}

          {ficha.secoes.map((secao) => {
            const estaAberta =
              escolhidas === null ? secao.id === primeira : escolhidas.includes(secao.id);
            return (
              <section key={secao.id} id={`ficha-secao-${secao.id}`} className="atlas-ficha-secao">
                <h3 className="atlas-ficha-titulo">
                  <button
                    type="button"
                    aria-expanded={estaAberta}
                    aria-controls={`ficha-${secao.id}`}
                    onClick={() => {
                      const base = escolhidas ?? (primeira ? [primeira] : []);
                      setAbertas({
                        corpo: alvo,
                        secoes: base.includes(secao.id)
                          ? base.filter((s) => s !== secao.id)
                          : [...base, secao.id],
                      });
                    }}
                  >
                    <span>{secao.titulo}</span>
                    <span className="atlas-ficha-seta" aria-hidden="true">
                      <Icone nome={estaAberta ? 'chevronBaixo' : 'chevronDireita'} tamanho={16} />
                    </span>
                  </button>
                </h3>
                {estaAberta && (
                  <dl className="atlas-ficha-linhas" id={`ficha-${secao.id}`}>
                    {secao.linhas.map((l, i) => {
                  // TEXTO LONGO (frase, lista de catálogo) empilha a linha
                  // inteira em vez de espremer em 60% da largura — ver o
                  // comentário do `.larga` em 04-atlas.css.
                  const larga = l.valor.length > LIMIAR_DA_LINHA_LARGA;
                  return (
                    <div
                      className={'atlas-ficha-linha' + (larga ? ' larga' : '')}
                      key={`${l.rotulo}-${i}`}
                    >
                      <dt>{l.rotulo}</dt>
                      <dd>
                        <span className="atlas-ficha-valor-linha">
                          <span className="atlas-ficha-valor">{l.valor}</span>
                          {l.badge && (
                            <span className="atlas-ficha-badge">{l.badge}</span>
                          )}
                        </span>
                      </dd>
                      {/* A PROCEDÊNCIA DE CADA NÚMERO, no vocabulário do
                          selo e em nenhum outro — o `rotulo` é o do tier, e
                          uma segunda redação aqui seria o quarto tier
                          fantasma. IRMÃ de `dd` (não filha, redesenho 06/09):
                          `grid-column: 1 / -1` só alcança a linha inteira
                          como item direto da grade de `.atlas-ficha-linha`.
                          O `title` é o da LINHA (`l.fonte`), não o do tier: o
                          `oQue` do selo fala das ESTRELAS ("cor e temperatura
                          por modelo"), e ele estava aparecendo ao passar o
                          mouse na gravidade, na massa e no escape de um
                          PLANETA, que saem de GM e do raio. Cada linha já
                          declara de onde veio; é essa frase que o ponteiro
                          tem de repetir. */}
                      <span
                        className={`atlas-ficha-proc ${l.procedencia}`}
                        title={l.fonte}
                      >
                        {PROCEDENCIA[l.procedencia].rotulo}
                        {l.fonte ? ` · ${l.fonte}` : ''}
                      </span>
                    </div>
                  );
                    })}
                    {/* O RELEVO INVENTADO mora AQUI (Lote 5, PLAN-UI.md §3.5:
                        "vai para a seção 'A imagem'") — é a MESMA linha de
                        sempre (rótulo + "?" à esquerda, `.hud-interruptor` à
                        direita, no molde de `.ajustes-item`), só que agora
                        dentro da seção que fala da foto, e não mais solta
                        acima de todas as seções. Fecha e reabre com ela. */}
                    {secao.id === 'imagem' && relevoDaCor !== null && (
                      <label className="ajustes-item">
                        <span className="ajustes-rotulo-caixa">
                          <span className="ajustes-rotulo">{t('ficha.relevoDaCor')}</span>
                          <Ajuda
                            id="relevo"
                            rotulo={t('ficha.relevoDaCor')}
                            texto={t('ficha.relevoDaCorAria', { nome: ficha.nome })}
                            presa={dicaPresa === 'relevo'}
                            onAlternar={() => alternarDica('relevo')}
                          />
                        </span>
                        <span className="ajustes-controle">
                          <input
                            type="checkbox"
                            className="hud-interruptor"
                            checked={relevoDaCor}
                            aria-label={t('ficha.relevoDaCorAria', { nome: ficha.nome })}
                            onChange={() => onRelevoDaCor(!relevoDaCor)}
                          />
                        </span>
                      </label>
                    )}
                  </dl>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

/**
 * O botão que abre a ficha — irmão do "⧉ Camadas" e do "⌕ Buscar", na
 * régua de abas (Atlas de mesa) ou na fileira de alças (celular). O
 * RÓTULO NÃO É MAIS O NOME DO ALVO (Lote 4½: a linha de contexto já diz
 * o nome; o botão dizia duas coisas de uma vez) — é sempre "Ficha", e o
 * nome vai só no `aria-label`.
 *
 * `nome: null` (só existe na régua) é a aba SEM seleção: continua no
 * documento, com o mesmo ícone e rótulo, mas desabilitada e SEM
 * `data-abre-dialogo`/`aria-haspopup`/`aria-expanded` — o juiz de a11y
 * varre `[data-abre-dialogo]` e não pode achar um gatilho morto.
 */
export function BotaoDaFicha({
  aberta,
  nome,
  onAlternar,
}: {
  aberta?: boolean;
  /** o nome do corpo em foco — vai no `aria-label`; `null` = sem seleção */
  nome: string | null;
  onAlternar?: () => void;
}) {
  useIdioma();
  if (nome === null) {
    return (
      <button
        className="hud-btn small"
        disabled
        aria-disabled="true"
        aria-label={t('ficha.abaSemAlvo')}
      >
        <Icone nome="info" tamanho={16} />
        <span className="atlas-alca-rotulo">{t('ficha.aba')}</span>
      </button>
    );
  }
  return (
    <button
      className="hud-btn small"
      onClick={onAlternar}
      aria-label={t('ficha.aria', { nome })}
      {...gatilhoDoDialogo('ficha', Boolean(aberta))}
    >
      <Icone nome="info" tamanho={16} />
      {/* O RÓTULO EM SEU PRÓPRIO `<span>` (Lote 4, item 7) — a quinta
          alça do celular trunca com `ellipsis` (o nome completo fica no
          `aria-label` acima); um nó de texto solto não tem caixa própria
          para o CSS recortar. Na mesa nada muda: `.hud-btn` não declara
          nada para este seletor. */}
      <span className="atlas-alca-rotulo">{t('ficha.aba')}</span>
    </button>
  );
}
