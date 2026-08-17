// ============================================================
// O VÉU do Atlas — fecha, reposiciona, abre. Morava no director.ts
// (onda da arquitetura, Parte 1, corte 2); a semântica é a mesma,
// linha a linha. Os fios (onVeu, perturbar) chegam no construtor —
// módulo de director/ nunca importa o director.
// ============================================================

/**
 * Duração de CADA metade do véu de entrada/saída do Atlas, em
 * segundos: fecha, reposiciona, abre. Entrar no Atlas não é travessia
 * física (D3) — não há nave voando de um lugar ao outro, e fingir isso
 * numa escala que vai de 1 UA a 25 kpc seria mentira de câmera. Sob
 * `prefers-reduced-motion` a troca é INSTANTÂNEA: o véu não anima.
 */
export const VEU_ATLAS_S = 0.45;

export class VeuDoAtlas {
  /** véu do Atlas: 0 = aberto, 1 = fechado */
  private k = 0;
  private alvo = 0;
  /** o que fazer quando o véu terminar de FECHAR */
  private pendente: (() => void) | null = null;

  private readonly fios: {
    onVeu: (k: number) => void;
    /** a captura tem de esperar o véu — quem perturba é o dono */
    perturbar: () => void;
  };

  constructor(fios: { onVeu: (k: number) => void; perturbar: () => void }) {
    this.fios = fios;
  }

  /** o véu em curso (ou já pedido e ainda não fechado) é movimento na
   *  tela como qualquer outro — o termo dos juízes de prontidão */
  get emCurso(): boolean {
    return this.k > 0 || this.pendente !== null;
  }

  /**
   * Fecha o véu, faz a troca, abre o véu. Instantâneo (véu nenhum)
   * quando quem chama pede — o director combina o pedido explícito com
   * `prefers-reduced-motion` e `?shot=`, que são dele; é o que mantém a
   * captura headless determinística.
   */
  atravessar(instantaneo: boolean, aoFechar: () => void) {
    if (instantaneo) {
      this.k = 0;
      this.alvo = 0;
      this.pendente = null;
      this.fios.onVeu(0);
      aoFechar();
      return;
    }
    this.pendente = aoFechar;
    this.alvo = 1;
    this.fios.perturbar();
  }

  /**
   * O passo do véu, no topo do tick: se ele terminar de fechar neste
   * quadro, a troca de fase acontece AQUI e o resto do tick já roda na
   * fase nova. Fora da travessia o ramo inteiro é um teste falso — o
   * filme não paga um ciclo por ele.
   */
  tique(dt: number) {
    if (this.k !== this.alvo || this.pendente) {
      const passo = dt / VEU_ATLAS_S;
      this.k = this.alvo > this.k ? Math.min(1, this.k + passo) : Math.max(0, this.k - passo);
      if (this.k >= 1 && this.pendente) {
        const acao = this.pendente;
        this.pendente = null;
        this.alvo = 0;
        acao();
      }
      this.fios.onVeu(this.k);
    }
  }
}
