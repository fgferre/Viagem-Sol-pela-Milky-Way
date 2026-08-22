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
import { useDialogFocus, gatilhoDoDialogo } from '../lib/dialogFocus';
import { CAMADAS_DO_ATLAS, NOME_DO_SISTEMA } from '../three/atlasConfig';
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
 * A GAVETA DE CAMADAS. Lê o config único (`atlasConfig.ts`): a lista, os
 * rótulos e os ícones vêm de lá, e é impossível ela oferecer uma camada
 * que o Director não conheça.
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
    <div className="hud-cartao hud-dialogo atlas-gaveta" aria-label="Camadas do Atlas" {...dialogo}>
      <div className="atlas-gaveta-topo">
        <span>Camadas</span>
        <button type="button" onClick={onFechar} aria-label="Fechar camadas">
          ✕
        </button>
      </div>
      {CAMADAS_DO_ATLAS.map((c) => {
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
                dele seria ruído */}
            <span className="atlas-gaveta-icone" aria-hidden="true">
              {c.icone}
            </span>
            <span>{c.nome}</span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * O SELO DE HONESTIDADE (D1). Dois eixos, duas linhas — e as linhas SÃO
 * os controles: cada uma diz o estado de agora e, quando há o que
 * desfazer, o que o clique vai produzir.
 *
 * ESCALA não tem porta de URL: ela sai da geometria (`escalaDaVista`), e
 * o caminho de volta é enquadrar o sistema — o único enquadramento em
 * que o que domina o quadro é 1:1. BRILHO sai do registro único de
 * caminhos, e o clique desfaz tudo que é desfazível; o que não for, o
 * selo continua declarando em vez de fingir que resolveu.
 *
 * A lista de desvios é UMA linha de altura fixa, truncada com reticências
 * — o retângulo útil do enquadramento desconta a altura deste bloco, e um
 * bloco que cresce com o número de desvios moveria a câmera. A lista
 * inteira vai no nome acessível do botão, que não tem limite de largura.
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
  const { escala, brilho, desvios } = estadoDoSelo(vista);
  const lista = desvios.map((d) => d.rotulo).join(' · ');
  const daParaVoltar = desvios.some((d) => d.volta !== 'nenhuma');
  return (
    <div className="atlas-selo" aria-label="Selo de honestidade desta vista">
      <p className="atlas-selo-tese">{TESE_DO_SELO}</p>

      <button
        type="button"
        className={`atlas-selo-linha ${escala === 'real' ? 'real' : 'desvio'}`}
        onClick={onEscalaReal}
        disabled={escala === 'real'}
        aria-label={
          escala === 'real'
            ? `${ESCALA_REAL}: o que domina o quadro está em 1:1`
            : `${FORA_DE_ESCALA}: o disco do Sol nesta vista é ator. Clique para enquadrar o sistema em escala real`
        }
      >
        <strong>{escala === 'real' ? ESCALA_REAL : FORA_DE_ESCALA}</strong>
        <em>{escala === 'real' ? 'o quadro está em 1:1' : 'clique: enquadrar em escala real'}</em>
      </button>

      <button
        type="button"
        className={`atlas-selo-linha ${brilho === 'real' ? 'real' : 'desvio'}`}
        onClick={onBrilhoReal}
        disabled={brilho === 'real' || !daParaVoltar}
        aria-label={
          brilho === 'real'
            ? `${BRILHO_REAL}: nada foi ajustado nesta vista`
            : `${BRILHO_ASSISTIDO}. Ajustado: ${lista}.`
            + (daParaVoltar ? ' Clique para voltar ao brilho real.' : '')
        }
      >
        <strong>{brilho === 'real' ? BRILHO_REAL : BRILHO_ASSISTIDO}</strong>
        <em title={lista}>
          {brilho === 'real'
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

/** O botão que abre a gaveta, na barra de controles. */
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
      aria-label="Camadas do Atlas"
      {...gatilhoDoDialogo('camadas', aberta)}
    >
      ⧉ Camadas
    </button>
  );
}
