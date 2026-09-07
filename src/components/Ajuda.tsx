// ============================================================
// O "?" DE AJUDA — átomo extraído do redesenho do painel de Ajustes
// (05/09) para servir também a gaveta de Camadas (06/09, pedido do
// dono: "aplica o mesmo padrão no painel de Camadas"). Um botão, uma
// dica que aparece no hover/foco (CSS) ou fixa no clique — e agora só
// há UM lugar que sabe desenhar isso, não dois.
//
// O ESTADO (qual dica está presa) continua morando em quem chama —
// `useDicaPresa` — porque fixar uma tem de apagar a de cima, e isso só
// se resolve com um dono só por painel.
//
// REDESENHO (Lote 2a, PLAN-UI.md §8): o botão cresce de ~17 para 24 px
// visuais SEM perder o alvo de toque de 44×44 — a área extra nasce de
// um `::before` (04-atlas.css/08-ajustes.css não tocam, é o próprio
// `.hud-ajuda` que a declara), sem empurrar o layout ao redor. Ao
// PRENDER, a dica que tenha nascido fora da vista (painel rolado) se
// traz para dentro com `scrollIntoView({ block: 'nearest' })` — item
// (c) do contrato: sem isso, prender a dica das últimas linhas de uma
// gaveta longa a deixava invisível, cortada pelo `overflow-y: auto` do
// diálogo.
// ============================================================
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { t } from '../lib/idioma';

export function Ajuda({
  id,
  rotulo,
  texto,
  presa,
  onAlternar,
}: {
  /** sufixo do `aria-controls`/`id` da dica — único dentro do painel */
  id: string;
  /** o que o botão anuncia no `aria-label` ("ajuda sobre {rotulo}") */
  rotulo: string;
  texto: ReactNode;
  presa: boolean;
  onAlternar: () => void;
}) {
  const dicaRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (presa) dicaRef.current?.scrollIntoView({ block: 'nearest' });
  }, [presa]);
  return (
    <span className="hud-ajuda-caixa">
      <button
        type="button"
        className="hud-ajuda"
        aria-label={t('ajustes.ajuda', { rotulo })}
        aria-expanded={presa}
        aria-controls={`hud-dica-${id}`}
        onClick={(evento) => {
          // o clique NÃO pode borbulhar até o "clique fora fecha" do
          // painel (e, na gaveta, evita o efeito colateral de um botão
          // dentro do `<label>` também alternar a caixa de seleção)
          evento.stopPropagation();
          onAlternar();
        }}
      >
        ?
      </button>
      <span
        ref={dicaRef}
        id={`hud-dica-${id}`}
        role="tooltip"
        className={'hud-dica' + (presa ? ' presa' : '')}
      >
        {texto}
      </span>
    </span>
  );
}
