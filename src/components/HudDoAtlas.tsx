// ============================================================
// O HUD DO MODO ATLAS — as peças que só existem na fase 'atlas'.
//
// Moram fora do `Hud.tsx` porque aquele é o HUD do FILME (título,
// legenda, barra de capítulos) e a fronteira entre os dois é decisão da
// onda, não arrumação: o ProgressBar de lá, por exemplo, é o slider de
// capítulos do filme e NÃO atravessa para cá (D6) — dentro do Atlas ele
// daria scrub do filme.
//
// Todas as peças daqui são montadas como filhas DIRETAS de `.hud-root`
// no App. Não é detalhe de estilo: o `?shot=2` esconde o HUD com
// `.bare-mode > *:not(.scene-canvas)`, que só alcança filhos diretos —
// uma peça portalizada para o `body` (ou aninhada numa outra) apareceria
// nas 18 vistas oficiais e o filme perderia pixel.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useDialogFocus, gatilhoDoDialogo } from '../lib/dialogFocus';
import { CAMADAS_POR_FAMILIA, NOME_DO_SISTEMA } from '../three/atlasConfig';
import {
  BRILHO_ASSISTIDO,
  BRILHO_REAL,
  ESCALA_REAL,
  FORA_DE_ESCALA,
  TESE_DO_SELO,
  estadoDoSelo,
  legendaDaProcedencia,
} from '../three/selo';
import type { EstadoDaVista } from '../three/selo';
import type { EstadoDoTempo, SentidoDoTempo } from '../three/tempoDoAtlas';

/**
 * A CONTEXTLINE: o que está EM QUADRO. Segue o padrão do `Caption` do
 * filme (`role="status"` + `aria-live="polite"`) na LEITURA — e, desde
 * a F2b, carrega os DOIS gestos da escada de navegação (D7) ao lado
 * dela: "aproximar" (desce ao degrau corpo — só quando o corpo em foco
 * tem mesh resolvido) e "sistema" (volta à abertura — some quando já se
 * está nela). Os botões ficam FORA do span `role="status"`: controle
 * dentro de região viva seria anunciado como texto a cada troca.
 *
 * NUNCA CHUTA (D6): foco sem nome próprio lê o nome do sistema, que é
 * o que o enquadramento de abertura mostra de fato. Inventar um nome
 * para o que o Director não sabe nomear seria a única forma de esta
 * linha mentir.
 */
export function ContextLine({
  foco,
  podeAproximar,
  noSistema,
  onAproximar,
  onSistema,
}: {
  foco: string | null;
  /** o corpo em foco tem degrau abaixo (mesh resolvido)? */
  podeAproximar: boolean;
  /** já estamos no enquadramento de abertura? (o botão some) */
  noSistema: boolean;
  onAproximar: () => void;
  onSistema: () => void;
}) {
  return (
    <div className="atlas-contexto">
      <span className="atlas-contexto-olho">em quadro</span>
      <div className="atlas-contexto-linha">
        <span className="atlas-contexto-nome" role="status" aria-live="polite">
          {foco ?? NOME_DO_SISTEMA}
        </span>
        {podeAproximar && (
          <button
            type="button"
            className="hud-btn small"
            onClick={onAproximar}
            aria-label={`Aproximar: enquadrar ${foco ?? 'o corpo'} de perto`}
          >
            ⊕ Aproximar
          </button>
        )}
        {!noSistema && (
          <button
            type="button"
            className="hud-btn small"
            onClick={onSistema}
            aria-label="Voltar ao enquadramento do sistema solar"
          >
            ⌂ Sistema
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A GAVETA DE CAMADAS — a ÚNICA porta das camadas desde 22/08 (item 61).
 *
 * A QUEIXA DO DONO, palavra por palavra: *"atlas - camadas e ajustes
 * concorrem. vc nao acha que varios elementos que hj estao em ajustes na
 * verdade deveriam ser camadas?"*. E o fato que ela media: as 17 camadas
 * da casa eram 17 dos 32 controles do painel de Ajustes E seis linhas
 * desta gaveta — duas superfícies desenhando da MESMA tabela, uma com 17
 * e outra com 6. Agora a tabela tem UM leitor: esta gaveta mostra as 17,
 * e a seção "Camadas" saiu do painel.
 *
 * EM TRÊS FAMÍLIAS, COM CONTAGEM, e não numa fileira de dezessete: 17
 * caixas seguidas são um inventário, três grupos com "quantas estão
 * ligadas" são um mapa. O agrupamento é campo da tabela (`familia`),
 * derivado em `CAMADAS_POR_FAMILIA` — nunca uma segunda lista aqui.
 *
 * A CONTAGEM É O RESUMO DO GRUPO, e é o que se lê sem abrir nada: "3 de
 * 4" diz que alguma coisa do sistema solar está desligada sem obrigar a
 * varrer as caixas. Para quem ouve a tela ela vai no `aria-label` do
 * grupo; na tela é o par de números ao lado do título.
 *
 * ELA EXISTE NOS DOIS MODOS — e, por consequência, em toda fase que tem
 * barra de controles: filme, voo livre e Atlas. É a MESMA peça nas três
 * (o botão "⧉ Camadas" é o mesmo), o estado é o mesmo (o dono é o App) e
 * a URL espelha as mesmas `?no…`. Um segundo painel de camadas do lado
 * do filme seria exatamente a concorrência que esta obra desfaz.
 *
 * É um diálogo de verdade — nasce no `dialogFocus` como todo diálogo da
 * casa (D7), e por isso o juiz de a11y a julga sem uma linha a mais.
 */
export function GavetaDeCamadas({
  aberta,
  onFechar,
  escondidas,
  onCamada,
}: {
  aberta: boolean;
  onFechar: () => void;
  escondidas: ReadonlySet<string>;
  onCamada: (flag: string, ligar: boolean) => void;
}) {
  const dialogo = useDialogFocus('camadas', aberta, onFechar);
  if (!aberta) return null;
  return (
    <div className="hud-cartao hud-dialogo atlas-gaveta" aria-label="Camadas da cena" {...dialogo}>
      <div className="atlas-gaveta-topo">
        <span>Camadas</span>
        <button type="button" onClick={onFechar} aria-label="Fechar camadas">
          ✕
        </button>
      </div>
      {CAMADAS_POR_FAMILIA.map(({ familia, camadas }) => {
        const ligadas = camadas.filter((c) => !escondidas.has(c.flag)).length;
        return (
          <div
            key={familia}
            className="atlas-gaveta-familia"
            role="group"
            aria-label={`${familia}: ${ligadas} de ${camadas.length} camadas ligadas`}
          >
            <h3 className="atlas-gaveta-titulo">
              <span>{familia}</span>
              {/* a contagem já foi dita no `aria-label` do grupo, e ouvi-la
                  duas vezes a cada caixa seria ruído */}
              <span className="atlas-gaveta-conta" aria-hidden="true">
                {ligadas}/{camadas.length}
              </span>
            </h3>
            {camadas.map((c) => {
              const ligada = !escondidas.has(c.flag);
              return (
                <label key={c.flag} className="atlas-gaveta-linha">
                  <input
                    type="checkbox"
                    checked={ligada}
                    onChange={() => onCamada(c.flag, !ligada)}
                  />
                  {/* o ícone é ornamento do rótulo que vem logo ao lado: quem
                      ouve a tela já recebe o nome, e ouvir "asterisco" antes
                      dele seria ruído. A coluna fica mesmo sem glifo — é ela
                      que alinha os nomes da família uns com os outros. */}
                  <span className="atlas-gaveta-icone" aria-hidden="true">
                    {c.icone ?? ''}
                  </span>
                  <span>{c.nome}</span>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * O SELO DE HONESTIDADE (D1), DOBRADO EM UMA LINHA — item 61, 22/08.
 *
 * A QUEIXA DO DONO, palavra por palavra: *"o selo de honestidade é
 * complexo e nao funciona direito, no proejto atlas ele era muito mais
 * simples e menos invasivo, porque virou isso aqui?"*. E o fato que ela
 * media: o selo daqui NÃO FECHAVA. Quatro blocos sempre abertos (a tese,
 * a linha ESCALA, a linha BRILHO com a lista de desvios colada por "·" e
 * o rodapé de procedência) ocupavam 3,2% da tela de mesa e 10,1% de um
 * celular — permanentes, sobre a cena, sem ninguém ter pedido.
 *
 * O QUE MUDOU É A APRESENTAÇÃO, E SÓ ELA. A LEI do selo não se toca: as
 * frases, o `REGISTRO` de caminhos e os dois eixos são os mesmos, e
 * `selo.ts` continua sendo o único lugar que decide o que o selo DIZ.
 * Aqui só se decide o que a tela mostra de uma vez.
 *
 * FECHADO é UMA LINHA, no molde do doador: ● ESCALA REAL · BRILHO
 * ASSISTIDO ▸. A bolinha é a cor do PIOR EIXO (âmbar se qualquer um
 * desvia, verde só quando os dois estão em real) — o resumo agregado que
 * deixa o visitante saber, sem ler, se há algo a saber.
 *
 * ABERTO é o conteúdo de sempre, organizado: a tese, a linha ESCALA, a
 * linha BRILHO com os desvios ativos, OS CULPADOS (quem está inflado e
 * quanto — o campo que `estadoDoSelo` devolve desde 4e8bedb e que a tela
 * nunca mostrou: era promessa cobrada só pelo teste) e o rodapé de
 * procedência. Cada linha continua sendo o PRÓPRIO controle: clicar em
 * ESCALA enquadra o sistema, clicar em BRILHO desfaz o que é desfazível,
 * e a linha que já está em real fica desabilitada em vez de mentir uma
 * ação.
 *
 * A GAVETA É `position: absolute` (fatia 4 do HUD): ela cresce PARA CIMA
 * sem mover a caixa fechada. Não é estilo — é o que mantém a área do HUD
 * permanente igual aberta e fechada, e o retângulo útil do enquadramento
 * (`retanguloDoAtlas.ts`) desconta área permanente, não painel que o
 * visitante abriu por um instante. Um selo que empurrasse ao abrir moveria
 * a câmera no clique.
 *
 * O ESTADO ABERTO/FECHADO NÃO VAI PARA A URL NEM PARA O STORAGE: é
 * chrome, não domínio. Link copiado com o selo aberto reproduziria uma
 * decisão de leitura de outra pessoa, e a URL desta casa é espelho da
 * VISTA.
 */
export function Selo({
  vista,
  cartografiaMedida,
  cartografiaDesligada,
  onEscalaReal,
  onBrilhoReal,
}: {
  vista: EstadoDaVista;
  /**
   * Os mapas da galáxia chegaram? A legenda da procedência mentia
   * enquanto isto era constante: com o manifesto bloqueado a cena vira
   * procedural em silêncio e o rodapé seguia dizendo "medido".
   */
  cartografiaMedida: boolean;
  /** …e quando não chegaram, foi porque o visitante pediu (`?cart=off`)? */
  cartografiaDesligada: boolean;
  onEscalaReal: () => void;
  onBrilhoReal: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const { escala, brilho, desvios, culpados } = estadoDoSelo(vista);
  const lista = desvios.map((d) => d.rotulo).join(' · ');
  const daParaVoltar = desvios.some((d) => d.volta !== 'nenhuma');
  const escalaReal = escala === 'real';
  const brilhoReal = brilho === 'real';
  /** o PIOR EIXO decide a bolinha do resumo: um desvio já tinge os dois */
  const algumDesvia = !escalaReal || !brilhoReal;

  /**
   * AS DUAS SAÍDAS que não são o clique na própria linha: Esc e clique
   * fora. Ambas em CAPTURA, e a razão é a ordem de quem reivindica o Esc
   * dentro do Atlas (`useAtalhos.ts`): DIÁLOGO ABERTO COME O Esc
   * PRIMEIRO — por isso a guarda `[data-dialogo]`, a mesma do atalho —,
   * depois este selo, e só o Esc que ninguém reivindicou sobe a escada.
   * Sem a captura, o `subirDegrau()` da janela levaria a câmera junto com
   * o fechamento, que são duas coisas num gesto só.
   *
   * O clique fora NÃO cancela o evento: quem clica na cena está girando a
   * câmera, e fechar o selo não pode custar o arrasto.
   */
  useEffect(() => {
    if (!aberto) return;
    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-dialogo]')) return;
      e.preventDefault();
      setAberto(false);
    };
    const onFora = (e: Event) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener('keydown', onTecla, true);
    window.addEventListener('pointerdown', onFora, true);
    return () => {
      window.removeEventListener('keydown', onTecla, true);
      window.removeEventListener('pointerdown', onFora, true);
    };
  }, [aberto]);

  return (
    <div
      className="atlas-selo"
      ref={caixa}
      role="group"
      aria-label="Selo de honestidade desta vista"
    >
      {aberto && (
        <div id="atlas-selo-detalhe" className="atlas-selo-detalhe hud-cartao">
          <p className="atlas-selo-tese">{TESE_DO_SELO}</p>

          <button
            type="button"
            className={`atlas-selo-linha ${escalaReal ? 'real' : 'desvio'}`}
            onClick={onEscalaReal}
            disabled={escalaReal}
            aria-label={
              escalaReal
                ? `${ESCALA_REAL}: o que domina o quadro está em 1:1`
                : `${FORA_DE_ESCALA}: o disco do Sol nesta vista é ator. Clique para enquadrar o sistema em escala real`
            }
          >
            <span className="atlas-selo-eixo">escala</span>
            <strong>{escalaReal ? ESCALA_REAL : FORA_DE_ESCALA}</strong>
            <em>{escalaReal ? 'o quadro está em 1:1' : 'clique: enquadrar em escala real'}</em>
          </button>

          {/* OS CULPADOS, e eles só saem quando há acusação: `estadoDoSelo`
              devolve a lista vazia com a escala em real. Um selo que
              acusasse numa vista honesta seria o erro simétrico ao de calar
              numa vista mentirosa. Ficam SOB a linha ESCALA porque é dela
              que a acusação sai (a dívida de tamanho do cadastro). */}
          {culpados.length > 0 && (
            <ul className="atlas-selo-culpados">
              {culpados.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className={`atlas-selo-linha ${brilhoReal ? 'real' : 'desvio'}`}
            onClick={onBrilhoReal}
            disabled={brilhoReal || !daParaVoltar}
            aria-label={
              brilhoReal
                ? `${BRILHO_REAL}: nada foi ajustado nesta vista`
                : `${BRILHO_ASSISTIDO}. Ajustado: ${lista}.`
                + (daParaVoltar ? ' Clique para voltar ao brilho real.' : '')
            }
          >
            <span className="atlas-selo-eixo">brilho</span>
            <strong>{brilhoReal ? BRILHO_REAL : BRILHO_ASSISTIDO}</strong>
            <em>
              {brilhoReal
                ? 'a fotometria da casa, sem ajuste'
                : daParaVoltar
                  ? `clique: voltar ao real — ${lista}`
                  : lista}
            </em>
          </button>

          <p className="atlas-selo-legenda">
            {legendaDaProcedencia(cartografiaMedida, cartografiaDesligada)}
          </p>
        </div>
      )}

      {/* A LINHA FECHADA, e ela é a última no DOM de propósito: a gaveta
          sobe por cima da cena e esta linha fica encostada na tarja de
          baixo, onde o selo sempre morou. */}
      <button
        type="button"
        className={`atlas-selo-resumo ${algumDesvia ? 'desvio' : 'real'}`}
        aria-expanded={aberto}
        aria-controls="atlas-selo-detalhe"
        title={TESE_DO_SELO}
        onClick={() => setAberto((v) => !v)}
      >
        <span className="atlas-selo-bolinha" aria-hidden="true" />
        <span>{escalaReal ? ESCALA_REAL : FORA_DE_ESCALA}</span>
        <span className="atlas-selo-meio" aria-hidden="true">
          ·
        </span>
        <span>{brilhoReal ? BRILHO_REAL : BRILHO_ASSISTIDO}</span>
        <span className="atlas-selo-seta" aria-hidden="true">
          {aberto ? '▾' : '▸'}
        </span>
      </button>
    </div>
  );
}

/**
 * A MÁQUINA DO TEMPO (F4/D2). Uma linha de leitura — o instante do céu
 * em pt-BR — e seis controles: o sentido em três botões, a velocidade
 * num que cicla a escada, o AO VIVO e a volta à época do retrato.
 *
 * O QUE ELA NÃO É: o slider de capítulos do filme. Aquele é o tempo da
 * VIAGEM e não entra no Atlas (D6); este é o tempo do CÉU, e os dois
 * andam em réguas que não se encontram — um mede minutos de narrativa,
 * o outro, séculos de efeméride.
 *
 * ALTURA FIXA, pela mesma razão do selo: o retângulo útil do
 * enquadramento (`atlasRig.ts`) desconta esta faixa, e um bloco que
 * cresce quando aparece um aviso moveria a câmera. Por isso a linha do
 * aviso está SEMPRE montada — vazia quando não há o que avisar — e é
 * ela, e não uma que aparece e some, que carrega o `aria-live`: região
 * viva que nasce junto com a mensagem costuma não ser anunciada.
 *
 * A velocidade CICLA num botão só, no precedente do `1×/2×/4×` do
 * filme: o rótulo diz sempre em que degrau se está, e oito botões de
 * taxa seriam um painel, não um HUD.
 */
export function BarraDoTempo({
  tempo,
  onSentido,
  onDegrau,
  onAoVivo,
  onEpoca,
}: {
  tempo: EstadoDoTempo;
  onSentido: (sentido: SentidoDoTempo) => void;
  onDegrau: () => void;
  onAoVivo: () => void;
  onEpoca: () => void;
}) {
  const { data, taxa, sentido, aoVivo, naEpoca, aviso } = tempo;
  const parado = sentido === 0 && !aoVivo;
  return (
    <div className="atlas-tempo">
      <div className="atlas-tempo-linha">
        <span className="atlas-tempo-olho">instante do céu</span>
        <span className="atlas-tempo-data">{data}</span>
      </div>
      <div className="atlas-tempo-botoes" role="group" aria-label="Máquina do tempo">
        <button
          type="button"
          className="hud-btn small"
          aria-pressed={sentido === -1}
          aria-label="Voltar no tempo"
          onClick={() => onSentido(sentido === -1 ? 0 : -1)}
        >
          ⏴
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-label="Parar o tempo"
          disabled={parado}
          onClick={() => onSentido(0)}
        >
          ⏸
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-pressed={sentido === 1}
          aria-label="Avançar no tempo"
          onClick={() => onSentido(sentido === 1 ? 0 : 1)}
        >
          ⏵
        </button>
        <button
          type="button"
          className="hud-btn small atlas-tempo-taxa"
          aria-label={`Velocidade do tempo: ${taxa}. Clique para o próximo degrau.`}
          onClick={onDegrau}
        >
          {taxa}
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-pressed={aoVivo}
          aria-label="Seguir o tempo real"
          onClick={onAoVivo}
        >
          Ao vivo
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-label="Voltar ao instante do retrato de 2026"
          disabled={naEpoca && parado}
          onClick={onEpoca}
        >
          Época
        </button>
      </div>
      <p className="atlas-tempo-aviso" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  );
}

/**
 * O botão que abre a gaveta, na barra de controles — e ele está na barra
 * dos DOIS modos desde o item 61 (`HUD_POR_FASE`): mesma peça, mesma
 * gaveta, mesmo estado. Mora neste arquivo por herança do modo em que
 * nasceu; o que ele abre não é mais só do Atlas.
 */
export function BotaoDaGaveta({
  aberta,
  onAlternar,
}: {
  aberta: boolean;
  onAlternar: () => void;
}) {
  return (
    <button
      className="hud-btn small"
      onClick={onAlternar}
      aria-label="Camadas da cena"
      {...gatilhoDoDialogo('camadas', aberta)}
    >
      ⧉ Camadas
    </button>
  );
}
