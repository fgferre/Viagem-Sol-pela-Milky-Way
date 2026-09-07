// ============================================================
// O CABEÇALHO ÚNICO DOS PAINÉIS (Lote 2a/2b, PLAN-UI.md §3.2/§3.5/§11) —
// título serifado (`var(--fonte-display)`, a pele B), o "?" ao lado dele
// quando há um, as ações do painel e o botão fechar, PRESO no topo do
// contêiner rolável (`position: sticky`) para nunca sumir atrás do
// conteúdo — hoje o cabeçalho de cada painel rolava junto com o corpo,
// e um painel longo (a gaveta de Camadas com as três famílias abertas)
// escondia o "✕" atrás da rolagem.
//
// O EYEBROW (Lote 2b) é só da ficha por agora: a classe do corpo
// ("Planeta") acima do nome, caixa alta 11 px — e é NELE que o "?" mora
// quando existe (§3.5: "o ? fica na linha do eyebrow quando ele
// existe"), porque a linha de baixo é o NOME, sozinho, do tamanho de
// marca. Sem `eyebrow`, tudo continua numa linha só, como nos outros
// quatro painéis (Ajustes, Busca, Camadas, a gaveta do Tempo).
// ============================================================
import type { ReactNode } from 'react';
import { Icone } from './Icone';

export function CabecalhoDoPainel({
  titulo,
  eyebrow,
  ajuda,
  onFechar,
  rotuloFechar,
  acoes,
  celular = false,
}: {
  /** o título do painel, ou (com `eyebrow`) o NOME do alvo — a ficha
   *  precisa do `<span role="status" aria-live>` do nome DENTRO dele */
  titulo: ReactNode;
  /** a classe do corpo ("Planeta"), acima do título — só a ficha usa;
   *  os demais painéis não têm eyebrow e o "?" mora ao lado do título */
  eyebrow?: ReactNode;
  /** o "?" do painel (`components/Ajuda.tsx`) — ausente quando o
   *  cabeçalho não tem um (o caso da gaveta de Camadas: cada CAMADA tem
   *  o seu próprio "?", o título não) */
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
      <div className="hud-cabecalho-corpo">
        <div className="hud-cabecalho-linha">
          {eyebrow != null ? (
            <span className="hud-cabecalho-eyebrow">{eyebrow}</span>
          ) : (
            <h2 className="hud-cabecalho-titulo">{titulo}</h2>
          )}
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
        {eyebrow != null && (
          <h2 className="hud-cabecalho-titulo hud-cabecalho-titulo--nome">{titulo}</h2>
        )}
      </div>
    </header>
  );
}
