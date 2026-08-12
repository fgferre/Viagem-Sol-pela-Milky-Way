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
  PROCEDENCIA,
  TESE_DO_SELO,
  estadoDoSelo,
} from '../three/selo';
import type { EstadoDaVista } from '../three/selo';

/**
 * A CONTEXTLINE: o que está EM QUADRO. Segue o padrão do `Caption` do
 * filme (`role="status"` + `aria-live="polite"`), e não o do
 * ProgressBar — ela informa, não controla.
 *
 * NUNCA CHUTA (D6): foco sem nome próprio lê o nome do sistema, que é
 * o que o enquadramento de abertura mostra de fato. Inventar um nome
 * para o que o Director não sabe nomear seria a única forma de esta
 * linha mentir.
 */
export function ContextLine({ foco }: { foco: string | null }) {
  return (
    <div className="atlas-contexto" role="status" aria-live="polite">
      <span className="atlas-contexto-olho">em quadro</span>
      <span className="atlas-contexto-nome">{foco ?? NOME_DO_SISTEMA}</span>
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
    <div className="atlas-gaveta" aria-label="Camadas do Atlas" {...dialogo}>
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
  onEscalaReal,
  onBrilhoReal,
}: {
  vista: EstadoDaVista;
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
        {PROCEDENCIA.medido.rotulo}: {PROCEDENCIA.medido.oQue} ·{' '}
        {PROCEDENCIA.derivado.rotulo}: {PROCEDENCIA.derivado.oQue} ·{' '}
        {PROCEDENCIA.artistico.rotulo}: {PROCEDENCIA.artistico.oQue}
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
