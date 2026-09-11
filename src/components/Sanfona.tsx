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
// a grade colapsar de verdade (`01-base.css`). O corte (`overflow:
// hidden`) só existe ENQUANTO a animação corre, nunca em repouso, para
// não cortar o contorno de foco de nada lá dentro.
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
  const { montada, abrindo, saindo, ref } = usePresenca<HTMLDivElement>(aberta);
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
