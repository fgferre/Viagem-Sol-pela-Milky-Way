// ============================================================
// A BARRA DE CONTROLES × A FILEIRA DE ALÇAS — onde as portas do HUD
// nascem, decidido UMA vez.
//
// AS DUAS SÃO O MESMO ASSUNTO, e é por isso que moram juntas: o Atlas em
// telefone (item 62) tira as portas da barra e as põe numa fileira no pé,
// com as MESMAS peças e o mesmo `data-abre-dialogo`. Desenhar as duas
// cópias e esconder uma daria dois gatilhos com o mesmo nome no
// documento, que é o que o contrato do `dialogFocus` proíbe e o que o
// juiz de a11y varre — então a escolha é de TypeScript, e é `alcas`.
//
// MORAVA NO `App.tsx` (§11 do AGENTS: um arquivo, um assunto), onde a
// guarda `&& !alcas` estava escrita quatro vezes no meio do JSX e a
// decisão não tinha nome. A semântica é a mesma, linha a linha: o que
// mudou de lugar não mudou de conteúdo.
// ============================================================
import { useEffect, useState } from 'react';
import { QUALIDADES, nomeDoCorpo, rotuloDaQualidade } from '../three/atlasConfig';
import type { EscolhaDeQualidade } from '../three/core/engine';
import type { EstadoDaEscada, EstadoDaQualidade } from '../three/director';
import type { HudDaFase } from '../three/fases';
import type { EstadoDoTempo } from '../three/tempoDoAtlas';
import type { Gaveta } from '../hooks/useGavetas';
import { gatilhoDoDialogo } from '../lib/dialogFocus';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { REGISTRO_ORBITAL } from '../lib/atlas/registroOrbital';
import { BotaoDaGaveta, BotaoDoTempo } from './HudDoAtlas';
import { BotaoDaBusca } from './PaletaDeBusca';
import { BotaoDaFicha } from './FichaDoObjeto';
import { Icone } from './Icone';

export interface BarraOuAlcasProps {
  /** as peças que a FASE hospeda */
  hud: HudDaFase;
  /**
   * O ATLAS EM TELEFONE: as portas descem para a fileira do pé. A largura
   * é `LARGURA_DO_CELULAR_PX`, lida por `matchMedia` (`useCelular`); a
   * fase é o Atlas porque no filme e no voo livre a barra já respondeu à
   * mesma pergunta de outro jeito ("somem sozinhos", item 61).
   */
  alcas: boolean;
  /** o esmaecimento do chrome do filme (item 61) — classe, não estado */
  chromeSumido: string;
  gaveta: Gaveta | null;
  alternarGaveta: (qual: Gaveta) => void;
  /** há alvo em foco? sem ele não há ficha para abrir */
  ofereceFicha: boolean;
  /**
   * HÁ FILME GUARDADO ATRÁS DO PORTAL? (item 61, 23/08) É o que decide
   * se o Atlas oferece "↩ Voltar ao filme". Sem filme atrás o botão
   * devolvia a TELA DE TÍTULO — o Atlas confessando ser o modo
   * secundário —, e quem entrou pela porta da abertura via uma saída que
   * não voltava para lugar nenhum.
   */
  temFilmeGuardado: boolean;
  foco: string | null;
  /**
   * A ESCADA (Lote 4, item 2) — de onde a LINHA DE CONTEXTO deriva:
   * "Via Láctea › Sistema Solar › Terra › Lua". Só existe de verdade no
   * Atlas (`hud.saidasDoAtlas`), mas o tipo vem sempre — o mesmo padrão
   * de `foco`, que também é `null` fora dele.
   */
  escada: EstadoDaEscada;
  tempo: EstadoDoTempo | null;
  inJourney: boolean;
  paused: boolean;
  rate: number;
  quality: EstadoDaQualidade;
  play: () => void;
  entrarNoAtlas: () => void;
  partirDoAtlas: () => void;
  togglePause: () => void;
  ciclarVelocidade: () => void;
  revealGalaxy: () => void;
  freeRoam: () => void;
  changeQuality: (escolha: EscolhaDeQualidade) => void;
  /** "Sistema Solar" da linha de contexto — o MESMO `focarNoSistema` do
   *  botão Sistema da ficha (item 2). */
  focarNoSistema: () => void;
  /** o corpo-pai da linha de contexto — a MESMA seleção que a busca usa
   *  para um corpo (`escolherAlvo`, dentro do Atlas: `focarNoCorpo`). */
  focarNoCorpo: (id: string) => void;
}

/**
 * A LINHA DE CONTEXTO (Lote 4, item 2/§3.2) — "Via Láctea › Sistema Solar
 * › Terra › Lua", derivada da escada, NUNCA digitada à mão: o degrau, o
 * `corpoId` e o corpo-PAI (`REGISTRO_ORBITAL[id].centro`, o mesmo dado que
 * `ficha.ts` já lê para a linha "Distância — {pai}") decidem os
 * trechos. Só "Sistema Solar" e o corpo-pai são BOTÕES — os únicos dois
 * trechos com ação existente; "Via Láctea" e o alvo atual são texto, como
 * o plano manda: um breadcrumb não é um menu, é uma leitura de onde se
 * está, com dois atalhos para voltar.
 */
/** um trecho do breadcrumb — texto puro, ou botão quando há ação real */
interface TrechoDoContexto {
  chave: string;
  texto: string;
  aoClicar?: () => void;
  atual?: boolean;
}

/**
 * OS TRECHOS, na ordem da leitura — nunca o JSX direto, porque o modo
 * ESTREITO (abaixo de 360 px, item 6: "só o último trecho") precisa do
 * ÚLTIMO sem desenhar os outros, e recortar um array pronto é mais
 * simples e mais seguro que esconder nós por CSS (que ainda os deixaria
 * no DOM, tabuláveis).
 */
function trechosDoContexto(
  escada: EstadoDaEscada,
  foco: string | null,
  focarNoSistema: () => void,
  focarNoCorpo: (id: string) => void,
  comViaLactea: boolean
): TrechoDoContexto[] {
  const viaLactea: TrechoDoContexto[] = comViaLactea
    ? [{ chave: 'via-lactea', texto: t('contexto.viaLactea') }]
    : [];
  // A ESTRELA FICA FORA DA ESCADA DE CORPOS (escada.ts, `EstadoDaEscada`):
  // "Via Láctea › Sirius", sem o degrau "Sistema Solar" no meio — o alvo
  // não é do sistema.
  if (escada.degrau === 'estrela') {
    return foco ? [...viaLactea, { chave: 'alvo', texto: foco, atual: true }] : viaLactea;
  }
  const sistemaSolar: TrechoDoContexto = {
    chave: 'sistema-solar',
    texto: t('contexto.sistemaSolar'),
    aoClicar: focarNoSistema,
  };
  // O CORPO-PAI só entra quando o centro da órbita NÃO é o Sol (uma lua):
  // um planeta é "Sistema Solar › Marte", nunca "Sistema Solar › Sol ›
  // Marte" — repetir o Sol no meio não ajudaria ninguém a se achar.
  const pai = escada.corpoId ? REGISTRO_ORBITAL[escada.corpoId]?.centro : null;
  const nomeDoPai = pai && pai !== 'sun' ? nomeDoCorpo(pai) : null;
  const trechos = [...viaLactea, sistemaSolar];
  if (nomeDoPai && pai) {
    trechos.push({ chave: 'pai', texto: nomeDoPai, aoClicar: () => focarNoCorpo(pai) });
  }
  if (foco) trechos.push({ chave: 'alvo', texto: foco, atual: true });
  return trechos;
}

function ContextoDoAlvo({
  escada,
  foco,
  focarNoSistema,
  focarNoCorpo,
  estreito = false,
  comViaLactea = true,
  abrirFicha,
}: {
  escada: EstadoDaEscada;
  foco: string | null;
  focarNoSistema: () => void;
  focarNoCorpo: (id: string) => void;
  /** ≤ 360 px (item 6/§3.3): só o último trecho, nunca os outros no DOM */
  estreito?: boolean;
  /**
   * ≤ 760 px (achado das capturas do Lote 4, 07/09): "Via Láctea" some
   * da linha DE PROPÓSITO no telefone, antes de qualquer corte por
   * largura — era ela quem cortava "Via Láctea › Sistema Solar › ..." no
   * MEIO DA PALAVRA ("Via Láctea › S") na barra de uma linha do celular.
   * Falso só no Atlas de mesa, onde a linha tem duas linhas de sobra.
   */
  comViaLactea?: boolean;
  /**
   * O ÚLTIMO TRECHO TAMBÉM ABRE A FICHA (Lote 4½, palavra do dono no
   * portão: "clicar no último trecho da linha de contexto... também
   * abre a ficha"). Só existe quando a régua existe — é o segundo
   * caminho até a mesma gaveta, nunca um terceiro estado; `undefined`
   * mantém o trecho como texto puro, o comportamento de sempre.
   */
  abrirFicha?: () => void;
}) {
  const todos = trechosDoContexto(escada, foco, focarNoSistema, focarNoCorpo, comViaLactea);
  const trechos = estreito ? todos.slice(-1) : todos;
  return (
    <p className="atlas-contexto">
      {trechos.map((trecho, i) => (
        <span key={trecho.chave} style={{ display: 'contents' }}>
          {i > 0 && (
            <span className="atlas-contexto-sep" aria-hidden="true">
              ›
            </span>
          )}
          {trecho.aoClicar ? (
            <button type="button" className="atlas-contexto-botao" onClick={trecho.aoClicar}>
              {trecho.texto}
            </button>
          ) : trecho.atual && abrirFicha ? (
            <button
              type="button"
              className="atlas-contexto-alvo"
              aria-current="location"
              aria-label={t('ficha.aria', { nome: trecho.texto })}
              onClick={abrirFicha}
            >
              {trecho.texto}
            </button>
          ) : (
            <span aria-current={trecho.atual ? 'location' : undefined}>{trecho.texto}</span>
          )}
        </span>
      ))}
    </p>
  );
}

export function BarraOuAlcas({
  hud,
  alcas,
  chromeSumido,
  gaveta,
  alternarGaveta,
  ofereceFicha,
  temFilmeGuardado,
  foco,
  escada,
  tempo,
  inJourney,
  paused,
  rate,
  quality,
  play,
  entrarNoAtlas,
  partirDoAtlas,
  togglePause,
  ciclarVelocidade,
  revealGalaxy,
  freeRoam,
  changeQuality,
  focarNoSistema,
  focarNoCorpo,
}: BarraOuAlcasProps) {
  useIdioma();
  /**
   * A RÉGUA (Lote 4½, PLAN-UI.md) — o Atlas de mesa: as quatro
   * ferramentas saem da barra e viram abas verticais na borda direita.
   * É o MESMO sinal que já decidia `marcaEContexto` (linhas abaixo),
   * agora com nome, porque passa a decidir também onde as portas
   * (Buscar, Camadas, Ficha, Ajustes) desenham.
   */
  const regua = hud.saidasDoAtlas && !alcas;
  /**
   * A LARGURA ESTREITA (item 6/§3.3, "≤ 360 px: só o último trecho"),
   * lida por `matchMedia` COM OUVINTE — o mesmo padrão de `useCelular.ts`
   * e de `FichaDoObjeto.tsx` (`data-ficha-largura`), e NÃO um segundo
   * `@media` em `09-celular.css`: a casa tem uma regra testada
   * (`uiScale.test.ts`, "TODA quebra de largura do HUD é
   * LARGURA_DO_CELULAR_PX") que reprovaria um segundo número de largura
   * escrito em CSS.
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
  /**
   * O "MAIS" DO FILME (E1) — Camadas, qualidade e ⚙ Ajustes se recolhem
   * atrás de UM gatilho, e a régua nasce FECHADA a cada carga: `useState`
   * puro, sem ler storage nem URL — é chrome, não gosto salvo. Fecha de
   * novo quando o chrome do filme some sozinho (item 61): o mesmo
   * `chromeSumido` que esmaece a barra também fecha a régua, para o
   * visitante nunca reencontrar Camadas/Ajustes abertos atrás de uma
   * barra invisível.
   *
   * AJUSTE DURANTE O RENDER, e não efeito — o mesmo caminho de
   * `useGavetas.ts` (`alvoAnterior`) e o que a regra `set-state-in-effect`
   * pede: fechar não toca DOM, rede nem relógio, só deriva `maisAberto`
   * de uma entrada (`chromeSumido`) que MUDOU. O "anterior" é um SEGUNDO
   * estado, não um `useRef` — ref lido durante o render não re-renderiza,
   * e é do re-render ANTES do commit que o ajuste depende.
   */
  const [maisAberto, setMaisAberto] = useState(false);
  const [chromeSumidoAnterior, setChromeSumidoAnterior] = useState(chromeSumido);
  if (chromeSumido !== chromeSumidoAnterior) {
    setChromeSumidoAnterior(chromeSumido);
    if (chromeSumido) setMaisAberto(false);
  }
  /**
   * O ⚙ AJUSTES é o único gatilho que não tem componente próprio, e ele
   * nasce aqui para caber nos DOIS lugares sem ser escrito duas vezes: na
   * barra (mesa, filme e voo livre) ou na fileira de alças (Atlas em
   * telefone). Ícone + rótulo (Lote 4, item 2), no mesmo molde que as
   * outras portas (Busca, Camadas, Ficha) já ganharam no Lote 2b.
   */
  const botaoDeAjustes = (
    <button
      className="hud-btn small"
      onClick={() => alternarGaveta('ajustes')}
      aria-label={t('barra.ajustesAria')}
      {...gatilhoDoDialogo('ajustes', gaveta === 'ajustes')}
    >
      <Icone nome="ajustes" tamanho={16} />
      {t('barra.ajustes')}
    </button>
  );

  /**
   * O SELETOR DE QUALIDADE, ESTILIZADO COMO CHIP (item 2), escrito UMA vez
   * — desde o E1 ele mora em DOIS lugares (o grupo "sistema" do Atlas de
   * mesa/voo livre, e atrás do "Mais" do filme), daí a extração. Quatro
   * estados desde os Ajustes D (o Auto é o quarto). Os rótulos saem da
   * tabela única (`QUALIDADES`, atlasConfig), NUNCA digitados aqui: o
   * painel oferece a mesma lista e as duas discordariam no primeiro
   * estado novo. O CHEVRON já é o mesmo `<select>` nativo de sempre —
   * `.controls-bar select.hud-btn` (03-controles.css) já o desenha por
   * `background-image`; o chip é a MESMA peça, só o resto da barra
   * cresceu ao redor dela.
   *
   * O RÓTULO DO AUTO NÃO CARREGA O TIER VIVO, e é orçamento de largura,
   * não descuido: um `<select>` nativo se dimensiona pela opção MAIS
   * LARGA, então "⟳ Auto · performance" alargaria a barra de controles em
   * toda tela — inclusive nas estreitas que o juiz de a11y mede com o
   * texto em 140%. O tier em que o Auto pousou é dito onde há espaço para
   * dizê-lo: no `title` (abaixo) e na nota do painel.
   *
   * O `aria-label` FICA PARADO enquanto o `title` anda: nome acessível
   * que muda a cada janela de medida desorienta quem ouve a tela — o que
   * muda é ESTADO, e estado se anuncia pela região `aria-live` do painel,
   * não renomeando o controle.
   */
  const seletorDeQualidade = (
    <select
      className="hud-btn small"
      aria-label={t('barra.qualidadeAria')}
      title={rotuloDaQualidade(quality)}
      value={quality.escolha}
      onChange={(e) => changeQuality(e.target.value as EscolhaDeQualidade)}
    >
      {QUALIDADES.map((q) => (
        <option key={q.id} value={q.id}>
          {q.simbolo} {q.nome}
        </option>
      ))}
    </select>
  );

  /**
   * AS PORTAS COMPARTILHADAS, escritas UMA vez. A busca, as camadas, a
   * ficha e o ⚙ Ajustes são as MESMAS peças nos dois arranjos — antes as
   * três primeiras estavam escritas duas vezes, e a guarda `!alcas`
   * repetida quatro vezes no meio do JSX era o que segurava a promessa de
   * "num lugar só". Agora quem escolhe o lugar é a estrutura: ou elas
   * entram na barra, ou entram na fileira.
   *
   * A ⏱ TEMPO é a única que não tem os dois lugares: na mesa a máquina do
   * tempo é permanente no rodapé, e só no telefone ela vira alça.
   */
  const portaDaBusca = hud.busca && (
    <BotaoDaBusca
      aberta={gaveta === 'busca'}
      onAlternar={() => alternarGaveta('busca')}
    />
  );
  const portaDasCamadas = hud.gaveta && (
    <BotaoDaGaveta
      aberta={gaveta === 'camadas'}
      onAlternar={() => alternarGaveta('camadas')}
    />
  );
  const portaDaFicha = ofereceFicha && foco ? (
    <BotaoDaFicha
      aberta={gaveta === 'ficha'}
      nome={foco}
      onAlternar={() => alternarGaveta('ficha')}
    />
  ) : (
    // SEM ALVO a ficha ainda tem lugar fixo: a aba apagada da régua
    // (Lote 4½) e, desde o Lote 9 (pedido do dono: "no celular, a alça
    // Ficha fica esmaecida sem alvo, como na mesa"), a quinta alça do
    // telefone, apagada — a fileira deixa de mudar de tamanho ao
    // escolher um alvo. Na barra do filme/voo livre `regua` e `alcas`
    // são falsos e o resultado é o de sempre — nada (não há seleção lá).
    (regua || alcas) && <BotaoDaFicha nome={null} />
  );

  // A MARCA + A LINHA DE CONTEXTO (Lote 4, item 2/§3.2) — só no Atlas de
  // mesa (`hud.saidasDoAtlas` é o mesmo sinal que já distingue o modo na
  // barra, duas linhas acima) e nunca nas alças, que têm o próprio topo
  // de uma linha (item 6). É FILHA DIRETA de `.hud-root`, como todo
  // overlay da casa — `.bare-mode` a apaga no `?shot=2` do mesmo jeito.
  const marcaEContexto = hud.saidasDoAtlas && !alcas && (
    <div className={`atlas-topo-esquerda${chromeSumido}`}>
      <span className="atlas-marca" aria-hidden="true">
        {t('marca.nome')}
      </span>
      <ContextoDoAlvo
        escada={escada}
        foco={foco}
        focarNoSistema={focarNoSistema}
        focarNoCorpo={focarNoCorpo}
        // O ÚLTIMO TRECHO (o alvo) também abre a ficha (Lote 4½) — só
        // quando a régua existe (`regua`, abaixo) e há alvo elegível;
        // NUNCA fecha, só abre — clicar de novo no nome não esconde a
        // ficha, é a aba quem faz isso.
        abrirFicha={
          regua && ofereceFicha && foco
            ? () => {
                if (gaveta !== 'ficha') alternarGaveta('ficha');
              }
            : undefined
        }
      />
    </div>
  );

  return (
    <>
  {marcaEContexto}
  {/* A BARRA — e é ELA que some sozinha no filme correndo (item 61):
      `hud-sumido` esmaece por opacidade e desliga o ponteiro dela e
      dos filhos, sem tirar a caixa do fluxo. A altura desta barra é
      o `--barra-fim` que o efeito acima MEDE e o retângulo que os
      rótulos contornam; tirá-la do fluxo daria um pulo na geometria
      do HUD no meio da viagem. */}
  {hud.controles && (
    <div className={`controls-bar${chromeSumido}`}>
      {/* NO CELULAR (item 6) o contexto mora NA PRÓPRIA barra, sem marca
          — a linha inteira é a única do topo, 44 px. Nunca mostra "Via
          Láctea" (`comViaLactea={false}`, achado do Lote 4: era ela quem
          cortava a linha no meio da palavra a 390 px). `≤ 360 px` mostra
          só o último trecho (`larguraEstreita`, acima). */}
      {alcas && hud.saidasDoAtlas && (
        <ContextoDoAlvo
          escada={escada}
          foco={foco}
          focarNoSistema={focarNoSistema}
          focarNoCorpo={focarNoCorpo}
          estreito={larguraEstreita}
          comViaLactea={false}
        />
      )}
      {/* O VOO LIVRE TEM VOLTA (item 2) — ↻ Reviver e ↗ Atlas juntos no
          MESMO grupo: `hud.botaoReviver` só é verdadeiro na fase 'free'
          (fases.ts), o mesmo sinal que já isolava o Reviver sozinho aqui,
          então os dois nascem e somem juntos sem flag nova. O Atlas
          chama o MESMO `entrarNoAtlas` da porta da abertura e do "Entrar
          no Atlas" do pausar-e-olhar — um só código para os três. */}
      {hud.botaoReviver && (
        <div className="atlas-barra-grupo">
          <button className="hud-btn small" onClick={play}>
            {t('barra.reviver')}
          </button>
          <button
            className="hud-btn small"
            onClick={entrarNoAtlas}
            aria-label={t('barra.atlasAria')}
          >
            <Icone nome="bussola" tamanho={16} />
            {t('barra.atlas')}
          </button>
        </div>
      )}
      {/* GRUPO "MODOS" (Lote 4, item 2) — ▶ Ver o filme · ⇗ Voo livre ·
          ↩ Retomar (quando há filme guardado). AS DUAS FERRAMENTAS DO
          ATLAS (item 61, 23/08). Palavras do dono: *"a viagem na verdade
          para mim é só uma ferramenta do modo atlas"*. Elas ficam na
          BARRA e não na fileira de alças do telefone, e a escolha é de
          significado: a fileira é feita de PORTAS — cada alça sobe uma
          folha e volta a fechar —, e estas duas TROCAM DE MODO. Pôr uma
          troca de modo entre gavetas seria prometer que ela também "abre
          e fecha". No telefone elas entram na mesma BARRA de cima que já
          hospeda a saída, que é exatamente o lugar onde as trocas de
          modo moram. (Era "tarja" até 24/08, quando ela saiu do
          telefone; a barra ficou.) */}
      {(hud.saidasDoAtlas || (hud.botaoPartir && temFilmeGuardado)) && (
        <div className="atlas-barra-grupo">
          {hud.saidasDoAtlas && (
            <>
              <button
                className="hud-btn small"
                onClick={play}
                aria-label={t('barra.verOFilmeAria')}
              >
                <Icone nome="play" tamanho={16} />
                {alcas ? t('barra.verOFilmeCurto') : t('barra.verOFilme')}
              </button>
              <button
                className="hud-btn small"
                onClick={freeRoam}
                aria-label={t('barra.explorarAria')}
              >
                <Icone nome="explorar" tamanho={16} />
                {alcas ? t('barra.explorarCurto') : t('barra.explorarAtlas')}
              </button>
            </>
          )}
          {/* ...e a SAÍDA só existe quando há para onde voltar */}
          {hud.botaoPartir && temFilmeGuardado && (
            <button
              className="hud-btn small"
              onClick={partirDoAtlas}
              aria-label={t('barra.voltarAoFilme')}
            >
              <Icone nome="retomar" tamanho={16} />
              {alcas ? t('barra.voltarAoFilmeCurto') : t('barra.voltarAoFilme')}
            </button>
          )}
        </div>
      )}
      {/* GRUPO "FERRAMENTAS" (item 2) — ⌕ Buscar · ⧉ Camadas · Ficha. AS
          PORTAS ESTÃO AQUI, NA RÉGUA (Lote 4½, Atlas de mesa) OU NA
          FILEIRA DE ALÇAS (celular), nunca em duas ao mesmo tempo (item
          62): elas carregam o `data-abre-dialogo`, e duas cópias seriam
          dois gatilhos com o mesmo nome no documento. Este grupo só
          sobra para o voo livre de mesa — no Atlas de mesa `regua` é
          verdadeiro e as portas moram na régua; no filme (Lote 8) as
          Camadas mudaram de grupo (veja `hud.botoesDaViagem` abaixo). */}
      {!alcas && !regua && !hud.botoesDaViagem && (
        <div className="atlas-barra-grupo">
          {portaDaBusca}
          {portaDasCamadas}
          {portaDaFicha}
        </div>
      )}
      {/* E1 — o topo do filme vira UM grupo só, à direita: as duas saídas
          (Portal + Voo livre) ficam discretas ao lado de "Mais", que
          recolhe Camadas, qualidade e ⚙ Ajustes (fechado a cada carga).
          Antes eram DOIS grupos (modos à esquerda, sistema à direita,
          Lote 8/M7) — o `margin-left: auto` que empurra este grupo único
          até a borda direita mora em 02-filme.css, escopado à fase
          'journey', para não mexer na regra de dois grupos que outra
          fase ainda usa. Pausar/Retomar, velocidade e Ver a galáxia
          continuam no cartão preso à barra de capítulos
          (`.filme-transporte`, 03-controles.css) — essa parte não mudou. */}
      {hud.botoesDaViagem && (
        <>
          <div className="atlas-barra-grupo">
            {/* O PORTAL. Só no pausar-e-olhar: é o único momento do filme
                em que o visitante já parou por conta própria e a
                pergunta "onde é isso?" tem lugar (D3). AGORA DISCRETO
                (E1): texto sem moldura, para não competir com "Mais". */}
            {inJourney && paused && (
              <button
                className="hud-btn small hud-btn--discreto"
                onClick={entrarNoAtlas}
              >
                <Icone nome="setaEsquerda" tamanho={16} />
                {t('barra.entrarNoAtlas')}
              </button>
            )}
            {/* "EXPLORAR", e não "Explorar livremente" (item 61, decisão do
                dono em 23/08). É a segunda vez que ele corta a mesma
                palavra: na abertura ela saiu em 22/08 — *"sugiro tirar a
                palavra livremente"* —, e aqui ela era a sobra da mesma
                frase, no botão mais largo da barra do filme. Com o corte a
                barra fala como o resto da casa: a porta da abertura, a
                ferramenta do Atlas (↗ Voo livre) e esta dizem o MESMO nome
                para o MESMO destino. */}
            <button className="hud-btn small hud-btn--discreto" onClick={freeRoam}>
              <Icone nome="explorar" tamanho={16} />
              {t('barra.explorar')}
            </button>
            {/* "MAIS" (E1) — um botão comum, sem o contrato de diálogo
                (`gatilhoDoDialogo`/`data-abre-dialogo`): não sobe uma
                folha por cima da cena, só revela os três controles a
                seguir NA MESMA barra. Nasce CEDO no documento, logo
                depois das saídas — quem tabula alcança "Mais" antes de
                Camadas/qualidade/Ajustes, que vêm DEPOIS dele no DOM
                (Tab natural, do jeito que se espera de uma revelação).
                A ORDEM VISUAL é outra: o `order` inline empurra "Mais"
                para o fim da fileira, então os três aparecem à ESQUERDA
                dele quando abertos — quem enxerga lê da esquerda para a
                direita e vê o conteúdo antes do botão que o abriu. */}
            <button
              className="hud-btn small"
              style={{ order: 1 }}
              onClick={() => setMaisAberto((v) => !v)}
              aria-expanded={maisAberto}
              aria-label={t('barra.maisAria')}
            >
              {t('barra.mais')}
            </button>
            {maisAberto && (
              <>
                {portaDasCamadas}
                {seletorDeQualidade}
                {botaoDeAjustes}
              </>
            )}
          </div>
          <div className="filme-transporte">
            <button
              className="hud-btn small"
              onClick={togglePause}
              aria-label={t(paused ? 'barra.retomarAria' : 'barra.pausarAria')}
            >
              <Icone nome={paused ? 'play' : 'pausa'} tamanho={16} />
              {t(paused ? 'barra.retomar' : 'barra.pausar')}
            </button>
            <button
              className="hud-btn small"
              onClick={ciclarVelocidade}
              aria-label={t('barra.velocidadeAria')}
              title={t('barra.velocidadeDica')}
            >
              <Icone nome="velocidade" tamanho={16} />
              {rate}×
            </button>
            <button className="hud-btn small reveal-btn" onClick={revealGalaxy}>
              <Icone nome="galaxia" tamanho={16} />
              {t('barra.verAGalaxia')}
            </button>
          </div>
        </>
      )}
      {/* GRUPO "SISTEMA" (item 2) — o chip de qualidade e ⚙ Ajustes; NO
          FILME os dois moram atrás de "Mais" (E1, grupo acima), então
          este grupo passa a ser só do Atlas de mesa e do voo livre. */}
      {!hud.botoesDaViagem && (
        <div className="atlas-barra-grupo">
          {seletorDeQualidade}
          {!alcas && !regua && botaoDeAjustes}
        </div>
      )}
    </div>
  )}

  {/* A RÉGUA DE ABAS (Lote 4½, PLAN-UI.md) — as MESMAS portas do grupo
      "ferramentas" de cima, presas na borda direita abaixo da barra,
      filha DIRETA de .hud-root como todo overlay da casa (`.bare-mode`
      a apaga em ?shot=2 do mesmo jeito). Só existe no Atlas de mesa
      (`regua`); a aba Ficha nunca mostra o nome do alvo — a linha de
      contexto acima já mostra — e fica desabilitada sem seleção
      (`portaDaFicha` decide isso sozinho). `com-painel` veste a régua
      quando alguma gaveta está aberta, para o painel encostar nela sem
      costura (04-atlas.css). */}
  {regua && (
    <div
      className={`atlas-regua${gaveta ? ' com-painel' : ''}`}
      role="group"
      aria-label={t('barra.reguaAria')}
    >
      {portaDaBusca}
      {portaDasCamadas}
      {portaDaFicha}
      <span className="atlas-regua-filete" aria-hidden="true" />
      {botaoDeAjustes}
    </div>
  )}

  {/* A FILEIRA DE ALÇAS (item 62) — filha DIRETA de .hud-root, como
      todo overlay da casa: é a regra do `.bare-mode`
      (`> *:not(.scene-canvas)`) que a apaga no `?shot=2`, e ela só
      alcança filhos diretos.
      A ORDEM é a do mockup: buscar, camadas, tempo, ajustes — e a
      ficha como QUINTA, sempre presente e apagada sem seleção (Lote 9,
      pedido do dono). Uma linha que nunca quebra
      (fatia 9): quebrar em duas mudaria a base declarada e moveria a
      câmera no meio da sessão. */}
  {alcas && (
    <div className="atlas-alcas" role="group" aria-label={t('barra.alcasAria')}>
      {portaDaBusca}
      {portaDasCamadas}
      {hud.tempo && tempo && (
        <BotaoDoTempo
          aberta={gaveta === 'tempo'}
          onAlternar={() => alternarGaveta('tempo')}
        />
      )}
      {botaoDeAjustes}
      {portaDaFicha}
    </div>
  )}
    </>
  );
}
