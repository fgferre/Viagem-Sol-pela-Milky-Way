// ============================================================
// CONTADOR DE FPS NA TELA (E2, PLAN.md) — só existe com `?fps=1`
// (director.ts lê a porta, mesmo padrão de `?poeira=`). Um `<div>`
// fixo no canto, atualizado a cada meio segundo, com os quadros/s
// medidos e os dois custos publicados em `window.__poeira` (revisão
// independente, 27/09): `quadroMaxMs` (o relógio de quadro do
// Director, escrito no fim de todo `tick()`) e `bakeCpuMs` (a
// SUBMISSÃO na CPU do bake mais recente da poeira/nebulosa, escrito por
// `Nebula.bake`). Existe para medir custo no Mac e no iPhone sem abrir
// o DevTools.
//
// Módulo pequeno de propósito, ao lado de `glProbe.ts`: quem monta
// devolve `{ atualizar, descartar }` — `atualizar` é o que o laço de
// quadros do Director chama a cada quadro (a contagem e o relógio do
// intervalo vivem no closure, não em estado do Director); `descartar`
// remove o `<div>` — chamado pelo teardown do Director, para uma
// sessão sem `?fps=1` (Fast Refresh, um segundo Director) não herdar
// um mostrador órfão.
// ============================================================

const INTERVALO_MS = 500;

/** A leitura mais recente de `window.__poeira` — objeto vazio antes do
 *  primeiro quadro/bake medidos, ou sem `window` nenhum. `typeof window`
 *  cobre `contadorDeFps.test.ts` (`environment: node`, sem `window`;
 *  mesma guarda de `Nebula.bake`/`Director.tick`). */
function lerPoeira(): { bakeCpuMs?: number; quadroMaxMs?: number } {
  if (typeof window === 'undefined') return {};
  return (
    (window as unknown as { __poeira?: { bakeCpuMs?: number; quadroMaxMs?: number } }).__poeira ??
    {}
  );
}

/**
 * Cria o `<div>` do contador (ainda vazio: só o primeiro intervalo
 * completo escreve texto) e devolve `{ atualizar, descartar }`.
 * `agora` é qualquer relógio monotônico em ms (o chamador usa
 * `performance.now()`).
 */
export function montarContadorDeFps(): {
  atualizar: (agora: number) => void;
  descartar: () => void;
} {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.left = '8px';
  el.style.bottom = '8px';
  el.style.zIndex = '9999';
  el.style.font = '11px monospace';
  el.style.color = '#0f0';
  el.style.background = 'rgba(0, 0, 0, 0.6)';
  el.style.padding = '2px 6px';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);

  let quadros = 0;
  let inicioDoIntervalo = -1;

  return {
    atualizar: (agora: number) => {
      quadros++;
      if (inicioDoIntervalo < 0) inicioDoIntervalo = agora;
      const passado = agora - inicioDoIntervalo;
      if (passado < INTERVALO_MS) return;
      const fps = Math.round((quadros * 1000) / passado);
      const { bakeCpuMs, quadroMaxMs } = lerPoeira();
      el.textContent =
        `fps ${fps} · quadro máx ${Math.round(quadroMaxMs ?? 0)} ms` +
        ` · bake(CPU) ${Math.round(bakeCpuMs ?? 0)} ms`;
      quadros = 0;
      inicioDoIntervalo = agora;
    },
    descartar: () => {
      el.remove();
    },
  };
}
