// ============================================================
// O CABEÇALHO ÚNICO DOS PAINÉIS (Lote 2a, PLAN-UI.md §3.2/§11) — título
// serifado (`var(--fonte-display)`, a pele B), o "?" ao lado dele
// quando há um, as ações do painel e o botão fechar, PRESO no topo do
// contêiner rolável (`position: sticky`) para nunca sumir atrás do
// conteúdo — hoje o cabeçalho de cada painel rolava junto com o corpo,
// e um painel longo (a gaveta de Camadas com as três famílias abertas)
// escondia o "✕" atrás da rolagem.
//
// PILOTO: só a gaveta de Camadas usa este componente por agora
// (`HudDoAtlas.tsx`); os outros quatro painéis (Ajustes, Busca, Ficha,
// a gaveta do Tempo) trocam no Lote 2b — o cabeçalho deles continua
// como está até lá.
// ============================================================
import type { ReactNode } from 'react';
import { Icone } from './Icone';

export function CabecalhoDoPainel({
  titulo,
  ajuda,
  onFechar,
  rotuloFechar,
  acoes,
  celular = false,
}: {
  titulo: string;
  /** o "?" do painel (`components/Ajuda.tsx`) — ausente quando o
   *  cabeçalho não tem um (o caso de hoje na gaveta de Camadas: cada
   *  CAMADA tem o seu próprio "?", o título não) */
  ajuda?: ReactNode;
  onFechar: () => void;
  /** o `aria-label` do botão fechar ("Fechar Camadas", já traduzido) */
  rotuloFechar: string;
  /** botões extras entre o "?" e o fechar (nenhum painel usa ainda) */
  acoes?: ReactNode;
  /** alça de arrasto (36×4 px) acima do título — só na folha do celular */
  celular?: boolean;
}) {
  return (
    <header className="hud-cabecalho">
      {celular && <span className="hud-alca" aria-hidden="true" />}
      <div className="hud-cabecalho-linha">
        <h2 className="hud-cabecalho-titulo">{titulo}</h2>
        {ajuda}
        {acoes}
        <button
          type="button"
          className="hud-fechar hud-cabecalho-fechar"
          onClick={onFechar}
          aria-label={rotuloFechar}
        >
          <Icone nome="fechar" tamanho={16} />
        </button>
      </div>
    </header>
  );
}
