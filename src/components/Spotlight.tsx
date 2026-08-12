// ============================================================
// O SPOTLIGHT e o CONVITE (Onda 5, F5).
//
// MECANISMO (Spotlight): escurece o quadro e abre UM furo sobre um
// elemento REAL do HUD — o que ele aponta existe, tem retângulo e
// continua funcionando por baixo. O alvo se declara com `data-spot` e o
// furo sai de `getBoundingClientRect`; quem mantém o furo em dia é um
// `ResizeObserver` (no alvo e na raiz do documento), NUNCA um
// `setInterval`: um relógio a 60 Hz medindo layout é trabalho por
// quadro para uma coisa que muda uma vez por redimensionamento.
//
// CONTEÚDO (Convite): os TRÊS gestos do voo livre, um por vez, cada um
// apontando o pedaço da dica de voo que os repete para sempre — quando
// o convite sai, o lembrete fica. A cópia é a da legenda: minúscula,
// sem exclamação, sem "clique aqui".
//
// O convite MORA NO VOO LIVRE e não no Atlas, e isso é decisão de
// conteúdo, não de arquivo: no Atlas o WASD não voa e clicar num nome
// ENQUADRA em vez de visitar — os três passos ali seriam falsos.
//
// NÃO É DIÁLOGO, de propósito. Ele não prende o foco nem bloqueia nada:
// o visitante deve poder arrastar o céu ENQUANTO lê "arraste para olhar
// em volta". Por isso o véu é `pointer-events: none` e só o cartão
// recebe clique — e por isso ele não nasce no `dialogFocus` (um
// `aria-modal` aqui seria mentira para quem ouve a tela).
//
// Como todo overlay do HUD, é filho DIRETO de `.hud-root`: a regra do
// `.bare-mode` (`> *:not(.scene-canvas)`) só alcança filhos diretos, e
// um convite portalizado para o `body` entraria nas 18 vistas oficiais.
// ============================================================
import { useEffect, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

/** No elemento que pode ser apontado. O valor é o nome do alvo. */
export const ATRIBUTO_ALVO = 'data-spot';

/** Folga entre a borda do alvo e a borda do furo, em px. */
const FOLGA = 8;

interface Caixa {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

function medir(alvo: string | null): Caixa | null {
  if (!alvo) return null;
  const el = document.querySelector(`[${ATRIBUTO_ALVO}="${alvo}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { x: r.left, y: r.top, largura: r.width, altura: r.height };
}

/**
 * O retângulo do alvo, vivo. O `ResizeObserver` na RAIZ do documento é
 * quem cobre o redimensionamento da janela: o alvo do convite é a dica
 * de voo, ancorada em `vw`/`vh` — ela MUDA DE LUGAR sem mudar de
 * tamanho, e um observador só sobre ela nunca acordaria.
 */
function useCaixaDoAlvo(alvo: string | null): Caixa | null {
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  useEffect(() => {
    const remedir = () => setCaixa(medir(alvo));
    remedir();
    const el = alvo ? document.querySelector(`[${ATRIBUTO_ALVO}="${alvo}"]`) : null;
    const olho = new ResizeObserver(remedir);
    if (el) olho.observe(el);
    olho.observe(document.documentElement);
    return () => olho.disconnect();
  }, [alvo]);
  return caixa;
}

export function Spotlight({ alvo, children }: { alvo: string | null; children: ReactNode }) {
  const caixa = useCaixaDoAlvo(alvo);
  // a entrada é um fade de opacidade e mais nada — e sob
  // `prefers-reduced-motion` o CSS tira a transição, então a mesma
  // classe entra INSTANTÂNEA. Nada pisca, nada pulsa.
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPronto(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const furo = caixa && {
    x: caixa.x - FOLGA,
    y: caixa.y - FOLGA,
    largura: caixa.largura + FOLGA * 2,
    altura: caixa.altura + FOLGA * 2,
  };
  // o cartão se põe do lado de DENTRO do quadro: acima do alvo quando
  // ele está na metade de baixo (a dica de voo está), abaixo quando não
  const cartao = furo
    ? furo.y > window.innerHeight / 2
      ? { left: `${furo.x}px`, bottom: `${window.innerHeight - furo.y + 12}px` }
      : { left: `${furo.x}px`, top: `${furo.y + furo.altura + 12}px` }
    : undefined;

  return (
    <div className={`spotlight${pronto ? ' pronto' : ''}`}>
      <svg className="spotlight-mascara" aria-hidden="true">
        <defs>
          <mask id="spotlight-furo">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {furo && (
              <rect
                x={furo.x}
                y={furo.y}
                width={furo.largura}
                height={furo.altura}
                rx="4"
                fill="#000"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 4, 10, 0.72)"
          mask="url(#spotlight-furo)"
        />
        {furo && (
          <rect
            x={furo.x}
            y={furo.y}
            width={furo.largura}
            height={furo.altura}
            rx="4"
            fill="none"
            stroke="rgba(255, 214, 150, 0.45)"
          />
        )}
      </svg>
      <div className={`spotlight-cartao${cartao ? '' : ' solto'}`} style={cartao}>
        {children}
      </div>
    </div>
  );
}

/**
 * OS TRÊS GESTOS. Os `alvo` são os pedaços da dica de voo (`data-spot`
 * no `App`), e a cópia é a mesma coisa dita por extenso — a dica é
 * telegrama porque fica na tela o tempo todo; o convite passa uma vez.
 */
export const PASSOS_DO_CONVITE = [
  { alvo: 'olhar', texto: 'arraste para olhar em volta' },
  { alvo: 'voar', texto: 'w a s d para voar · q e para subir e descer' },
  { alvo: 'visitar', texto: 'clique num nome para visitar a estrela' },
] as const;

export function Convite({
  passo,
  onPasso,
  onFechar,
}: {
  passo: number;
  onPasso: (n: number) => void;
  onFechar: () => void;
}) {
  const atual = PASSOS_DO_CONVITE[passo];
  if (!atual) return null;
  const ultimo = passo === PASSOS_DO_CONVITE.length - 1;
  // `onMouseDown` com `preventDefault` no lugar de um `blur()` depois do
  // clique: sem ele o botão FICA COM O FOCO, e a guarda de alvo de
  // formulário do rig engoliria justamente o WASD que o passo 2 acabou
  // de ensinar. Quem chega pelo teclado não perde nada — o foco só
  // deixa de ser roubado pelo mouse.
  const semRoubarFoco = (e: MouseEvent) => e.preventDefault();
  return (
    <Spotlight alvo={atual.alvo}>
      <p className="convite-texto" role="status" aria-live="polite">
        {atual.texto}
      </p>
      <div className="convite-linha">
        <span className="convite-conta">
          {passo + 1} de {PASSOS_DO_CONVITE.length}
        </span>
        {!ultimo && (
          <button type="button" onMouseDown={semRoubarFoco} onClick={onFechar}>
            pular
          </button>
        )}
        <button
          type="button"
          className="convite-adiante"
          onMouseDown={semRoubarFoco}
          onClick={() => (ultimo ? onFechar() : onPasso(passo + 1))}
        >
          {ultimo ? 'entendi' : 'continuar'}
        </button>
      </div>
    </Spotlight>
  );
}
