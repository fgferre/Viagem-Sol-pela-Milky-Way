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
