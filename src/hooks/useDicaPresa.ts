// ============================================================
// A DICA FIXA POR CLIQUE (Ajustes, 05/09) — só uma por vez. Extraído do
// painel de Ajustes para servir também a gaveta de Camadas (06/09): as
// duas telas usam o mesmo "?" (`components/Ajuda.tsx`) e precisam do
// mesmo estado — fixar a de baixo apaga a de cima.
// ============================================================
import { useState } from 'react';

export function useDicaPresa() {
  const [presa, setPresa] = useState<string | null>(null);
  const alternar = (id: string) => setPresa((atual) => (atual === id ? null : id));
  const limpar = () => setPresa(null);
  return { presa, alternar, limpar };
}
