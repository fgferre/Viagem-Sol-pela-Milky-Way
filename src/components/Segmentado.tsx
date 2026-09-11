// ============================================================
// O SEGMENTADO — moldura única para toda fileira de botões de escolha
// (idioma, tom, qualidade, os cinco da gaveta Avançado, e — Lote 2b,
// PLAN-UI.md §11 — qualquer outro painel que precise da mesma
// semântica). Extraído de `Ajustes.tsx` (05/09) para não crescer uma
// segunda cópia: o único outro lugar que hoje desenha botões de escolha
// (a máquina do tempo, a ficha) mistura ação e alternância no mesmo
// grupo — nenhum dos dois é candidato limpo a este componente sem
// mudar comportamento, e por isso continuam com a marcação própria
// (`.ajustes-seg` cru), só reestilizada.
//
// Mesma semântica de sempre (`role="group"`, `aria-pressed`); o que
// muda pela pele B (Lote 2b) é só o CSS: seleção sem preenchimento
// (texto `--acento` + filete embaixo), moldura em `--borda`.
// ============================================================

import { useFileteDoSegmentado } from '../hooks/useFileteDoSegmentado';

/** Um segmento do `.ajustes-seg`. `efetivo` é o sublinhado pontilhado
 *  que mostra o que o PRESET resolve quando "Preset" é a escolha ativa. */
export interface Segmento<T> {
  valor: T;
  nome: string;
  lang?: string;
  efetivo?: boolean;
}

export function Segmentado<T>({
  aria,
  valor,
  opcoes,
  onEscolher,
}: {
  aria: string;
  valor: T;
  opcoes: Segmento<T>[];
  onEscolher: (v: T) => void;
}) {
  const moldura = useFileteDoSegmentado();
  return (
    <div className="ajustes-seg" role="group" aria-label={aria} ref={moldura}>
      {opcoes.map((o) => (
        <button
          type="button"
          key={String(o.valor)}
          lang={o.lang}
          className={
            (valor === o.valor ? 'on' : '') + (o.efetivo ? ' efetivo' : '')
          }
          aria-pressed={valor === o.valor}
          onClick={() => onEscolher(o.valor)}
        >
          {/* `<span>` (C2 do plano de motion): a pressão da casa afunda o
              filho (`> *`), e o filete do segmentado mede o BOTÃO, que
              precisa ficar do tamanho de sempre. */}
          <span>{o.nome}</span>
        </button>
      ))}
    </div>
  );
}
