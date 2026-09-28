// ============================================================
// UM inicializador para `window.__poeira` (revisão independente v2,
// 27/09) — o painel de custo que `Nebula.bake` (bakesMs/bakeCpuMs/
// bakes) e `Director.tick` (quadroMaxMs/quadroP95Ms/
// quadroMaxDesdeMarcaMs/quadros) escrevem, e que `contadorDeFps.ts` lê
// para `?fps=1`.
//
// ACHADO (item 1, revisão independente v2): os dois escritores criavam
// o objeto cada um por conta própria, só com os campos que lhes
// interessavam (`if (!g.__poeira) g.__poeira = { bakesMs: [], ... }`
// em `Nebula.bake`; `if (!g.__poeira) g.__poeira = {}` em
// `Director.tick`). Com `gas=antigo` (nunca assa) o director corria
// primeiro e criava `{}` sem `bakesMs` — trocar para `fino` disparava o
// primeiro bake, que via `g.__poeira` já truthy (não recriava o objeto
// inteiro) e explodia em `g.__poeira.bakesMs.push`, ausente. A ORDEM
// entre os dois decidia se a sessão vivia ou morria. Esta função é a
// fonte única: os dois lados chamam SÓ ela, e ela garante os oito
// campos sempre, criando os que faltarem sem apagar os que já existem
// (o outro lado pode ter escrito primeiro).
//
// ITEM C (revisão independente v2, 27/09): `quadroMaxMs`/`quadroP95Ms`
// só olhavam os últimos 300 quadros — um pico raro sai da janela em
// segundos, e nada mais o lembra. `quadroMaxDesdeMarcaMs` é o mesmo
// máximo, mas ACUMULADO desde a última marca; `reiniciar()` (chamável
// do console via `window.__poeira.reiniciar()`) zera esse máximo e os
// dois contadores (`quadros`, `bakes`), para medir só o próximo trecho
// de voo sem recarregar a página. `estatisticasDeQuadro` é o
// máximo/p95 de uma janela, extraído de `Director.tick` para testar
// sem WebGL.
// ============================================================

/** O painel de custo publicado em `window.__poeira` — todos os campos
 *  sempre presentes (ver `diagnosticoDaPoeira` abaixo). */
export interface DiagnosticoDaPoeira {
  /** os últimos ≤20 custos de SUBMISSÃO (CPU) do bake — `Nebula.bake`. */
  bakesMs: number[];
  /** o mais recente dos custos acima — o que `contadorDeFps.ts` mostra. */
  bakeCpuMs: number;
  /** quantos bakes já rodaram nesta sessão — `Nebula.bake`. */
  bakes: number;
  /** o pior intervalo real entre quadros na janela recente (≤300
   *  quadros) — `Director.tick`. */
  quadroMaxMs: number;
  /** o percentil 95 do mesmo intervalo — `Director.tick`. */
  quadroP95Ms: number;
  /** o pior intervalo ACUMULADO desde a última marca (item C, revisão
   *  independente v2, 27/09) — sobrevive ao esquecimento da janela
   *  recente; `reiniciar()` zera. */
  quadroMaxDesdeMarcaMs: number;
  /** quantos quadros já foram desenhados nesta sessão — `Director.tick`. */
  quadros: number;
  /** zera `quadroMaxDesdeMarcaMs` e os contadores (`quadros`, `bakes`)
   *  a partir de agora — para o console medir só o próximo trecho de
   *  voo (`window.__poeira.reiniciar()`), sem recarregar a página. */
  reiniciar: () => void;
}

const CAMPOS_PADRAO: Omit<DiagnosticoDaPoeira, 'bakesMs' | 'reiniciar'> = {
  bakeCpuMs: 0,
  bakes: 0,
  quadroMaxMs: 0,
  quadroP95Ms: 0,
  quadroMaxDesdeMarcaMs: 0,
  quadros: 0,
};

/**
 * MÁXIMO e P95 de uma janela de intervalos de quadro em ms (item C,
 * revisão independente v2, 27/09) — extraído de `Director.tick` para
 * poder ser testado sem WebGL. `lista` vazia (antes do primeiro
 * intervalo medido) devolve os dois zerados.
 */
export function estatisticasDeQuadro(lista: readonly number[]): {
  maxMs: number;
  p95Ms: number;
} {
  if (lista.length === 0) return { maxMs: 0, p95Ms: 0 };
  const ordenado = [...lista].sort((a, b) => a - b);
  return {
    maxMs: ordenado[ordenado.length - 1],
    p95Ms: ordenado[Math.floor(0.95 * (ordenado.length - 1))],
  };
}

/** zera `quadroMaxDesdeMarcaMs` e os contadores num `DiagnosticoDaPoeira`
 *  já com os campos garantidos — a mesma função por trás de `reiniciar()`
 *  nos dois ramos de `diagnosticoDaPoeira` (com e sem `window`). */
function zerarDesdeAMarca(d: Omit<DiagnosticoDaPoeira, 'reiniciar'>) {
  d.quadroMaxDesdeMarcaMs = 0;
  d.quadros = 0;
  d.bakes = 0;
}

/**
 * `window.__poeira`, com os oito campos GARANTIDOS — cria os que
 * faltarem (objeto ausente OU parcial) sem apagar os que já existem, e
 * devolve sempre a MESMA referência que mora em `window` (os dois
 * escritores mutam o objeto devolvido, nunca o substituem). Sem
 * `window` (Node/`environment: node`, vitest.config.ts): devolve um
 * objeto local, descartável — nada a persistir entre quadros fora do
 * navegador, e os testes podem chamar `Nebula.bake`/`Director.tick` sem
 * lançar.
 */
export function diagnosticoDaPoeira(): DiagnosticoDaPoeira {
  if (typeof window === 'undefined') {
    const local = { bakesMs: [] as number[], ...CAMPOS_PADRAO } as DiagnosticoDaPoeira;
    local.reiniciar = () => zerarDesdeAMarca(local);
    return local;
  }
  const g = window as unknown as { __poeira?: Partial<DiagnosticoDaPoeira> };
  const d = (g.__poeira ??= {});
  if (!d.bakesMs) d.bakesMs = [];
  for (const campo of Object.keys(CAMPOS_PADRAO) as (keyof typeof CAMPOS_PADRAO)[]) {
    if (d[campo] === undefined) d[campo] = CAMPOS_PADRAO[campo];
  }
  if (!d.reiniciar) d.reiniciar = () => zerarDesdeAMarca(d as DiagnosticoDaPoeira);
  return d as DiagnosticoDaPoeira;
}
