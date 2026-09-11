// ============================================================
// O MOVIMENTO DA SUPERFÍCIE DAS GAVETAS — dono único (C1 do plano de
// motion, docs/PLANO-MOTION-UI.md). Antes eram QUATRO mecanismos
// disputando o MESMO `transform`: dois `@keyframes` (`entraPainel`/
// `saiPainel` na mesa, `folhaSobe`/`folhaDesce` no telefone), uma
// `transition` inline escrita à mão no arrasto, e um temporizador fixo
// (`SAIDA_DA_FOLHA_MS`) cronometrando o desmonte por fora. Cada um só
// sabia partir do PRÓPRIO repouso — por isso um arrasto que fechava
// via CSS `animation: none` podia zerar `animationDuration` (E1,
// medido), uma troca de gaveta reiniciava o percurso inteiro (E3) e
// girar o aparelho no meio de uma saída deixava a trajetória antiga
// presa no eixo novo (E6): nenhum dos quatro perguntava "de onde a
// superfície está partindo AGORA".
//
// A WAAPI (`Element.animate`) resolve isso porque devolve um objeto
// vivo: `getComputedStyle(no).transform`, lido ANTES de cancelar,
// sempre conta o quadro em que a animação (ou o arrasto) parou —
// entrada, saída, arrasto e reabertura viram a MESMA chamada (`ir`),
// só o "de"/"para" muda. Só este arquivo escreve `transform` nas
// gavetas; `useGavetas.ts` decide QUANDO chamar, nunca COMO.
//
// A ÚLTIMA INTENÇÃO VENCE: cada nó tem um contador. Quem chama `ir`
// de novo cancela a animação anterior E soma o contador; o `finished`
// da chamada velha só age (`aoAssentar`) se ninguém chamou de novo
// nesse meio-tempo. Sem isso, uma saída que estava terminando quando o
// dono reabriu desmontaria o painel que acabou de nascer de novo — o
// mesmo defeito, só que por promessa em vez de temporizador.
//
// A GEOMETRIA fica em NÚMEROS (px), transcrita dos `@keyframes` antes
// de apagá-los — `entraPainel`/`saiPainel` (01-base.css) e
// `folhaSobe`/`folhaDesce` (09-celular.css) — e lida do LAYOUT sem
// transform (`offsetWidth`/`offsetHeight`, o `right` computado): um
// nó que já está a meio caminho não pode medir a si mesmo torto.
//
// TESTADO SEM DOM (o runner da casa é `node`): a matemática da
// geometria e do token são funções puras — `distanciaMesaPx`,
// `distanciaCelularPx`, `emMilissegundos`, `resolverTokens`. O
// controlador (`ir`) é testável dando-lhe um nó FALSO — só precisa de
// `animate`/`style`, como qualquer objeto — porque "a última intenção
// vence" é uma regra sobre CONTADORES, não sobre elementos de verdade.
// ============================================================

/** o que toda transição da folha/painel pede — os dois tokens efetivos
 *  (`--t-folha`/`--curva-folha` ou `--t-rapido`/`--curva`, conforme o
 *  chamador) e se o repouso final deve FICAR gravado (`segurar: true`,
 *  a saída — o nó vai desmontar e precisa continuar fora da tela até
 *  lá) ou devolvido ao CSS (`segurar: false`, a entrada e a volta do
 *  arrasto — nada mais precisa segurar o valor depois do repouso). */
export interface OpcoesDoMovimento {
  duracao: number;
  curva: string;
  segurar: boolean;
}

/** o repouso das cinco gavetas — nenhuma translação, nos dois eixos.
 *  Serve de "para" na entrada e de "de" explícito quando quem chama já
 *  sabe o número (o arrasto, que teria de o ler de volta do próprio
 *  `getComputedStyle` para nada). */
export const REPOUSO = 'translate(0px, 0px)';

/** DISTÂNCIA (px) que o painel da MESA percorre para ficar inteiro
 *  fora da tela — a própria largura MAIS a folga até a borda da
 *  janela (a régua, `--regua-largura`, ou o 1rem de sempre onde ela
 *  não existe). Transcrita de `@keyframes entraPainel`/`saiPainel`
 *  (01-base.css) antes de os apagar: a translação empurra a borda
 *  ESQUERDA do painel para a borda da janela — só a largura não
 *  bastava (sobrava uma tira do painel, mais alto que a régua). */
export const distanciaMesaPx = (larguraDoPainelPx: number, folgaDaReguaPx: number): number =>
  larguraDoPainelPx + folgaDaReguaPx;

/** DISTÂNCIA (px) que a folha do TELEFONE percorre — 110% da própria
 *  altura, transcrita de `@keyframes folhaSobe`/`folhaDesce`
 *  (09-celular.css) antes de os apagar. */
export const distanciaCelularPx = (alturaDaFolhaPx: number): number => alturaDaFolhaPx * 1.1;

/** ONDE O PAINEL DA MESA PARTE/CHEGA fora da tela — `distanciaMesaPx`
 *  lida do próprio nó: `offsetWidth` é a largura de LAYOUT (o
 *  transform em curso não entra nela, ao contrário de
 *  `getBoundingClientRect`), e o `right` computado já resolve
 *  `var(--regua-largura, 1rem)` com a MESMA regra de fallback do CSS —
 *  perguntar ao navegador em vez de repetir "3,5rem ou 1rem" aqui. */
export const foraDaTelaMesa = (no: HTMLElement): string => {
  const folga = Number.parseFloat(getComputedStyle(no).right) || 0;
  return `translateX(${distanciaMesaPx(no.offsetWidth, folga)}px)`;
};

/** ONDE A FOLHA DO TELEFONE PARTE/CHEGA fora da tela — `offsetHeight`
 *  pela mesma razão do painel da mesa: layout, não visual. */
export const foraDaTelaCelular = (no: HTMLElement): string =>
  `translateY(${distanciaCelularPx(no.offsetHeight)}px)`;

/** um token de tempo em MILISSEGUNDOS, aceitando "260ms" e "0.26s" — a
 *  MESMA leitura que `duracaoDaSaida` (useGavetas.ts) já fazia para o
 *  `animationDuration` do navegador; um token de CSS devolve o mesmo
 *  formato (`getPropertyValue`), então a conta é uma só. */
export const emMilissegundos = (bruto: string): number => {
  const termo = bruto.trim();
  const n = Number.parseFloat(termo);
  if (!Number.isFinite(n)) return 0;
  return termo.endsWith('ms') ? n : n * 1000;
};

/** duração + curva já resolvidas, dado o texto CRU dos dois tokens —
 *  separada de `lerTokens` (abaixo) só para poder ser testada sem
 *  `getComputedStyle` (o runner da casa é `node`, sem DOM). Uma curva
 *  vazia (token que não existe) cai em `ease`, o padrão do navegador,
 *  em vez de travar a animação. */
export const resolverTokens = (
  duracaoBruta: string,
  curvaBruta: string
): { duracao: number; curva: string } => ({
  duracao: emMilissegundos(duracaoBruta),
  curva: curvaBruta.trim() || 'ease',
});

/** lê os dois tokens de UMA transição na raiz do HUD — UMA VEZ por
 *  chamada, nunca por quadro (§C1.3 do plano). Perguntar à raiz, e não
 *  ao próprio nó (que pode estar `inert`, no meio do arrasto ou ainda
 *  fora da árvore): os tokens são os MESMOS em qualquer descendente,
 *  porque `--t-folha`/`--curva-folha` (ou `--t-rapido`/`--curva`) só
 *  se declaram uma vez, na base, e herdam para baixo. */
export const lerTokens = (
  raiz: Element,
  nomeDuracao: string,
  nomeCurva: string
): { duracao: number; curva: string } => {
  const estilo = getComputedStyle(raiz);
  return resolverTokens(estilo.getPropertyValue(nomeDuracao), estilo.getPropertyValue(nomeCurva));
};

interface EstadoDoNo {
  anim: Animation | null;
  intencao: number;
}

/**
 * AS ANIMAÇÕES VIVAS DESTE CONTROLADOR — as que `ir` e `desvanecer`
 * começaram e ainda não terminaram nem foram canceladas. Existem por uma
 * razão só: uma mudança que invalida o movimento EM CURSO tem de assentar
 * tudo agora, e não 260 ms depois (§4/§5 do plano de motion: "a
 * preferência vale também se mudar com o app aberto"; "redimensionado:
 * cancelar trajetória desatualizada e assentar no estado válido"). Ler a
 * preferência só ao COMEÇAR (`semMovimento`, em quem chama) cobria as
 * próximas animações, nunca a que já corria — reproduzido na reauditoria
 * de 11/09: ligar "reduzir movimento" no meio de uma saída deixava o
 * painel `inert` deslizando os 260 ms inteiros.
 */
const vivas = new Set<Animation>();

/**
 * TERMINA TODA ANIMAÇÃO VIVA NO FIM DA PRÓPRIA INTENÇÃO — `finish()`, e
 * não `cancel()`: cancelar devolveria cada nó ao ponto de PARTIDA (uma
 * saída voltaria para dentro da tela), enquanto terminar entrega o que
 * a intenção de agora pediu — a entrada no repouso, a saída fora da
 * tela, o conteúdo da troca aceso — e resolve `finished`, que é o que
 * roda o `aoAssentar` de quem a pediu: a saída desmonta o painel na
 * hora, sem `inert` preso na tela. O contador de `ir` não muda aqui,
 * então a última intenção continua sendo a que assenta.
 */
export function assentarTudo(): void {
  for (const anim of Array.from(vivas)) anim.finish();
}

const MOVIMENTO_REDUZIDO = '(prefers-reduced-motion: reduce)';
let preferencia: MediaQueryList | null = null;
const aoMudarPreferencia = (e: MediaQueryListEvent) => {
  if (e.matches) assentarTudo();
};

/**
 * OUVE SÓ ENQUANTO ALGO SE MOVE: os dois ouvintes (a preferência de
 * movimento e o `resize` da janela, que também chega ao girar o
 * aparelho) entram com a primeira animação viva e saem com a última —
 * nenhum ouvinte fica pendurado num app parado. Uma janela redimensionada
 * no meio do movimento assenta mesmo sem cruzar a fronteira mesa/celular:
 * a largura ou a altura do painel mudou, e a trajetória calculada no
 * começo já não leva ao lugar certo.
 */
function vigiar(anim: Animation): void {
  if (vivas.size === 0 && typeof window !== 'undefined') {
    preferencia = window.matchMedia?.(MOVIMENTO_REDUZIDO) ?? null;
    preferencia?.addEventListener('change', aoMudarPreferencia);
    window.addEventListener('resize', assentarTudo);
  }
  vivas.add(anim);
  const largar = () => {
    if (!vivas.delete(anim) || vivas.size > 0 || typeof window === 'undefined') return;
    preferencia?.removeEventListener('change', aoMudarPreferencia);
    preferencia = null;
    window.removeEventListener('resize', assentarTudo);
  };
  anim.finished.then(largar, largar);
}

/** um estado por nó, e não por gaveta: o `useGavetas` já garante que só
 *  existe UM `[data-dialogo]` de cada vez, mas o `WeakMap` não precisa
 *  saber disso — e não vaza nó nenhum quando o React o remove. */
const estados = new WeakMap<HTMLElement, EstadoDoNo>();

const estadoDe = (no: HTMLElement): EstadoDoNo => {
  let estado = estados.get(no);
  if (!estado) {
    estado = { anim: null, intencao: 0 };
    estados.set(no, estado);
  }
  return estado;
};

/**
 * MOVE UM NÓ de `de` para `para` — a ÚNICA função que escreve
 * `transform` nas cinco gavetas (§C1.3). `de === 'atual'` lê o
 * transform VISUAL do nó (`getComputedStyle`) ANTES de cancelar
 * qualquer animação em curso: é dali — entrada a meio caminho, saída a
 * meio caminho, ou o deslocamento que o arrasto escreveu à mão — que a
 * nova intenção parte, nunca do repouso.
 *
 * `segurar: true` (a saída) pede `fill: 'forwards'`: o nó vai
 * desmontar e precisa continuar na posição final até lá, porque quem
 * o desmonta é o `aoAssentar`, e ele só roda no PRÓXIMO commit.
 * `segurar: false` (entrada, volta do arrasto) usa `fill: 'none'` — o
 * repouso já é o que o CSS mostraria sozinho.
 *
 * DURAÇÃO ≤ 1 ms (preferência reduzida, `?shot=`, ou um token que um
 * dia vire zero por outro motivo) não anima: escreve o "para" direto
 * (ou limpa, se `segurar` for falso) e chama `aoAssentar` na hora, sem
 * depender de evento nenhum.
 *
 * A ÚLTIMA INTENÇÃO VENCE: o contador deste nó sobe a CADA chamada;
 * `aoAssentar` só roda se, quando `finished` resolver, o contador
 * ainda for o desta chamada. A rejeição de `finished` por cancelamento
 * (o `.cancel()` da própria linha de baixo, ou de uma chamada mais
 * nova) é ignorada — cancelar não é erro, é a intenção anterior
 * perdendo para a de agora.
 */
export function ir(
  no: HTMLElement,
  de: string,
  para: string,
  { duracao, curva, segurar }: OpcoesDoMovimento,
  aoAssentar?: () => void
): void {
  const estado = estadoDe(no);
  const partida = de === 'atual' ? getComputedStyle(no).transform : de;
  estado.anim?.cancel();
  estado.anim = null;
  estado.intencao += 1;
  const minhaIntencao = estado.intencao;

  if (duracao <= 1) {
    no.style.transform = segurar ? para : '';
    aoAssentar?.();
    return;
  }

  const anim = no.animate([{ transform: partida }, { transform: para }], {
    duration: duracao,
    easing: curva,
    fill: segurar ? 'forwards' : 'none',
  });
  estado.anim = anim;
  vigiar(anim);
  anim.finished
    .then(() => {
      if (estado.intencao === minhaIntencao) aoAssentar?.();
    })
    .catch(() => {
      // cancelado: a intenção de agora já assumiu, ou o nó já foi.
    });
}

/** PARA a animação em curso deste nó SEM começar outra — o "primeiro
 *  toque real" do arrasto (a folha segue o dedo, não a régua da
 *  animação) e a mudança de viewport/fase com um painel saindo
 *  (cancela e assenta no estado válido, sem esperar). Cancelar remove
 *  o efeito da animação (também o `fill: 'forwards'` de uma saída):
 *  quem chama escreve o estilo em linha que precisar NA MESMA função
 *  síncrona, porque não há paint entre as duas linhas. */
export function cancelar(no: HTMLElement): void {
  const estado = estados.get(no);
  if (!estado?.anim) return;
  estado.anim.cancel();
  estado.anim = null;
  estado.intencao += 1;
}

/**
 * A TROCA NÃO DESLOCA A MOLDURA (§C1.1) — só o CONTEÚDO do painel novo
 * pisca de 0 a 1 de opacidade. É uma chamada por FILHO direto do
 * `[data-dialogo]`, e não um wrapper único: os painéis podem ter mais
 * de uma raiz (cabeçalho + corpo), e um wrapper novo quebraria a regra
 * já escrita em `01-base.css` ("raiz `[data-dialogo]` filha direta de
 * `.hud-root`, sem wrapper que atrapalhe reserva ou captura").
 * SEM `fill`: o repouso (opacidade 1) já é o que o CSS mostra sozinho
 * quando a animação termina.
 */
export function desvanecer(filhos: ArrayLike<Element>, duracao: number, curva: string): void {
  if (duracao <= 1) return;
  for (const no of Array.from(filhos)) {
    vigiar(no.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duracao, easing: curva }));
  }
}
