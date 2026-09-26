// ============================================================
// CONTADOR DE FPS NA TELA (E2, PLAN.md) — só existe com `?fps=1`
// (director.ts lê a porta, mesmo padrão de `?poeira=`). Um `<div>`
// fixo no canto, atualizado a cada meio segundo, com os quadros/s
// medidos e o custo do bake mais recente da poeira/nebulosa
// (`window.__poeira.ultimoMs`, escrito por `Nebula.bake`). Existe para
// medir custo no Mac e no iPhone sem abrir o DevTools.
//
// Módulo pequeno de propósito, ao lado de `glProbe.ts`: quem monta
// devolve a função que o laço de quadros do Director chama a cada
// quadro — a contagem e o relógio do intervalo vivem no closure, não
// em estado do Director.
// ============================================================

const INTERVALO_MS = 500;

/**
 * Cria o `<div>` do contador (ainda vazio: só o primeiro intervalo
 * completo escreve texto) e devolve a função de quadro. `agora` é
 * qualquer relógio monotônico em ms (o chamador usa `performance.now()`);
 * `ultimoBakeMs`, quando presente, é o custo em ms do bake mais recente.
 */
export function montarContadorDeFps(): (agora: number, ultimoBakeMs?: number) => void {
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

  return (agora: number, ultimoBakeMs?: number) => {
    quadros++;
    if (inicioDoIntervalo < 0) inicioDoIntervalo = agora;
    const passado = agora - inicioDoIntervalo;
    if (passado < INTERVALO_MS) return;
    const fps = Math.round((quadros * 1000) / passado);
    const bake = ultimoBakeMs === undefined ? '' : ` · bake ${Math.round(ultimoBakeMs)} ms`;
    el.textContent = `fps ${fps}${bake}`;
    quadros = 0;
    inicioDoIntervalo = agora;
  };
}
