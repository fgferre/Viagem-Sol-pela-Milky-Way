// ============================================================
// A SANFONA — um conteúdo dobrável com presença de verdade
// (PLAN-MOTION-UI.md §5, "Acordeões"): a ficha e o "Avançado" dos
// Ajustes usam a MESMA caixa, então o movimento mora aqui uma vez, não
// repetido em cada seção. `usePresenca` é o ESTADO
// (montada/abrindo/saindo, e o foco saindo de dentro antes de sumir);
// esta função só o desenha.
//
// GRID DE `0fr` A `1fr`, e não `max-height`: a régua do plano pede
// exatamente isso — o `.sanfona-miolo` com `min-height: 0` é o que deixa
// a grade colapsar de verdade (`01-base.css`). Quem MOVE a linha da grade
// é `dobrar` (`movimentoDaGaveta.ts`, o dono único do movimento das
// gavetas), pedido por `usePresenca(aberta, true)`: é assim que reabrir
// no meio da saída continua da altura de agora. O corte (`overflow:
// hidden`) vive na MESMA animação: existe enquanto a dobra corre e
// nenhum instante além, para não cortar o contorno de foco de nada lá
// dentro em repouso. As classes `abrindo`/`saindo` continuam: `saindo`
// é o `inert` da saída, e as duas são o que a sonda do movimento lê.
// ============================================================
import type { ReactNode } from 'react';
import { usePresenca } from '../hooks/usePresenca';

export function Sanfona({
  id,
  aberta,
  className,
  children,
}: {
  id: string;
  aberta: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { montada, abrindo, saindo, ref } = usePresenca<HTMLDivElement>(aberta, true);
  if (!montada) return null;
  return (
    <div
      id={id}
      ref={ref}
      className={
        'sanfona' +
        (abrindo ? ' abrindo' : '') +
        (saindo ? ' saindo' : '') +
        (className ? ` ${className}` : '')
      }
      // A SAÍDA JÁ NÃO RECEBE TOQUE, FOCO NEM LEITOR DE TELA — o mesmo
      // contrato do `[inert]` que as gavetas usam (`useGavetas.ts`).
      inert={saindo}
    >
      <div className="sanfona-miolo">{children}</div>
    </div>
  );
}
