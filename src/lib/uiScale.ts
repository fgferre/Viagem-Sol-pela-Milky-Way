// ============================================================
// A ESCALA DA UI — o tamanho do texto do HUD, num número só.
//
// O CONTRATO (Onda 5/F6, PLANO-ATLAS §2.3 "UI Scale"): `?ui=<fator>`
// na URL e `font-size` na RAIZ. Não é slider de gosto guardado num
// canto: é a porta pela qual quem não enxerga texto pequeno lê o HUD
// inteiro — legenda, selo, máquina do tempo, rótulos das estrelas.
//
// TRÊS DECISÕES, escritas porque nenhuma é óbvia:
//
//  1. A URL, NUNCA o storage. É a precedência da casa (URL > storage >
//     detecção) e a regra dura dos gates: gosto no storage faria a
//     captura headless ver uma tela e a próxima ver outra. Quem quiser
//     o texto maior sempre leva o tamanho no link, como leva o instante
//     da viagem.
//  2. O fator vive no `--ui` do documento, e ESTE módulo guarda uma
//     cópia viva do número. Não são duas verdades: quem escreve é uma
//     função só (`aplicarEscalaDaUi`), que move o CSS e o cache no mesmo
//     gesto. O cache existe porque os dois leitores de runtime — o
//     retângulo útil do Atlas (a cada quadro) e os rótulos do canvas
//     (a 10 Hz) — pagariam um `getComputedStyle` por leitura, que
//     força recálculo de estilo. Ler número é de graça.
//  3. O CLAMP é a FAIXA QUE O GATE PROVA. `?ui=9` não é liberdade: é
//     um HUD que sai da tela sem ninguém ter medido. O juiz de a11y
//     mede os extremos desta faixa (`scripts/visual/a11y.mjs`), e é
//     por isso que ela existe.
//
// Módulo de duas linhas de estado e nenhuma dependência: sem React,
// sem three.
// ============================================================

/** Tamanho de sempre — `?ui=` ausente, e o que o `--ui` do CSS declara. */
export const ESCALA_PADRAO = 1;

/**
 * A faixa que o gate percorre. Fora dela o valor é grampeado (e não
 * ignorado): quem escreveu `?ui=3` quer o maior que existe, e devolver
 * o padrão calado seria a UI dizendo "não entendi" sem dizer.
 */
export const ESCALA_MIN = 0.85;
export const ESCALA_MAX = 1.4;

/**
 * Os degraus que o painel oferece. Quatro e não um slider contínuo: o
 * tamanho do texto não é ajuste fino de fotografia, é uma escolha de
 * legibilidade — e quatro botões são operáveis por teclado sem arrastar
 * nada. A URL continua aceitando qualquer valor da faixa.
 */
export const DEGRAUS_DA_UI = [0.85, 1, 1.2, 1.4] as const;

/** O rótulo do degrau, em pt-BR — porcentagem, que é o que se lê. */
export const rotuloDaEscala = (f: number) => `${Math.round(f * 100)}%`;

/**
 * Lê o `?ui=` cru. Lixo (ausente, vazio, `abc`, `NaN`) devolve o
 * padrão; número fora da faixa é grampeado nela.
 */
export function lerEscalaDaUi(bruto: string | null): number {
  const v = Number(bruto);
  if (bruto === null || bruto.trim() === '' || !Number.isFinite(v)) return ESCALA_PADRAO;
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v));
}

let viva = ESCALA_PADRAO;

/**
 * ESCREVE a escala: o `--ui` do documento (que move os `rem` da raiz e
 * o termo `vw` dos `clamp` do `hud.css`) e o cache que o runtime lê.
 * Único escritor.
 */
export function aplicarEscalaDaUi(fator: number): void {
  viva = fator;
  document.documentElement.style.setProperty('--ui', String(fator));
}

/**
 * O fator VIVO, para quem desenha fora do CSS: o retângulo útil do
 * Atlas (o HUD cresceu, a câmera recua) e os rótulos do canvas (que
 * são texto do HUD como qualquer outro, só que pintados à mão).
 */
export const escalaDaUi = () => viva;

/**
 * A LARGURA DE CSS DA JANELA — a outra entrada de DOM do retângulo útil
 * do Atlas, ao lado de `escalaDaUi()`. `window.innerWidth` e não a do
 * canvas de propósito: quem faz a barra de controles quebrar é o
 * `max-width: 60vw` do `hud.css`, e o `vw` é o VIEWPORT.
 *
 * Mora AQUI desde 22/08 (AGENTS §11: um arquivo, um assunto) — vinha
 * de `director/escada.ts`, que é a escada de navegação e não tinha por
 * que ser o endereço de um leitor de `window`. As duas leituras de DOM
 * que o enquadramento precisa passam a ter o mesmo endereço, e o rig
 * continua sem saber que existe DOM.
 */
export function larguraDeCss(): number {
  return window.innerWidth;
}
