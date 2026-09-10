// ============================================================
// AS QUATRO GAVETAS DO HUD — uma aberta por vez, um mecanismo só.
//
// Ajustes, Camadas, Busca e a Ficha do objeto ancoram-se na mesma régua
// (`.hud-dialogo`, fatia 1 do HUD) e as quatro se declaram `aria-modal`:
// duas abertas ao mesmo tempo seriam sobreposição e uma mentira para quem
// ouve a tela. A exclusividade é o TIPO — não há estado que represente duas
// abertas —, e as cinco portas que mexem nele moram aqui. Morava no
// `App.tsx` (§11 do AGENTS); a semântica é a mesma, linha a linha.
//
// AS QUATRO REGRAS SÃO FUNÇÕES PURAS, e é por isso que elas têm nome: o
// runner da casa é `node`, sem DOM, então um hook de React não se monta
// aqui. O que se pina em `useGavetas.test.ts` são as regras — que é onde
// a decisão mora; o `useState` em volta delas é encanamento.
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ArrastoDePonteiro } from '../three/arrastoDePonteiro';
import type { EstadoDaEscada, Phase } from '../three/director';

/**
 * A QUINTA É DO TELEFONE (item 62, 23/08): `tempo` é a MESMA
 * `BarraDoTempo` do rodapé, desenhada dentro de uma gaveta quando a
 * janela é de celular. O enum cresce em vez de ganhar um estado paralelo
 * — "uma aberta por vez" tem de valer entre as cinco, não entre quatro e
 * mais uma. Quem a gateia por largura é o App (`useCelular`); aqui ela é
 * uma gaveta como as outras.
 */
export type Gaveta = 'camadas' | 'busca' | 'ajustes' | 'ficha' | 'tempo';

/**
 * ABRIR É ESCOLHER: o gatilho de uma gaveta abre a dela e fecha a que
 * estiver aberta. Não há como duas ficarem abertas por um `set`
 * esquecido, porque o estado é um só.
 */
export const aoAlternar = (atual: Gaveta | null, qual: Gaveta): Gaveta | null =>
  atual === qual ? null : qual;

/**
 * FECHAR É "FECHE-ME", e não "feche o que estiver aberto". A diferença
 * apareceu no primeiro dia do enum: a paleta de busca fecha NO TIQUE
 * SEGUINTE ao Enter (`confirmar`, em `PaletaDeBusca` — sem o adiamento a
 * ação padrão do Enter caía no botão recém-focado e a paleta se reabria
 * sozinha), e nesse meio-tempo a escolha já abriu a FICHA do alvo. Um
 * `setGaveta(null)` cru fecharia a ficha que acabou de nascer.
 */
export const aoFechar = (atual: Gaveta | null, qual: Gaveta): Gaveta | null =>
  atual === qual ? null : atual;

/**
 * A TRAVESSIA FECHA AS DUAS QUE TINHAM O DEFEITO, e só elas: a busca e as
 * camadas renasciam sozinhas ao voltar (a presença delas é `gaveta && hud.*`
 * — o `hud.*` some com a fase, o estado de aberto não sumia), e
 * `useDialogFocus` punha o foco no primeiro focável, que na paleta é a
 * caixa de texto: o visitante entrava no voo livre e o WASD virava texto.
 *
 * A MÁQUINA DO TEMPO ENTRA pela mesma porta que as duas: ela existe só
 * onde a fase a hospeda (`hud.tempo`), e um estado de "aberta" que
 * sobrevivesse à travessia a faria renascer sozinha na volta.
 *
 * O ⚙ AJUSTES NÃO ENTRA, e é decisão escrita: ele é o painel da casa
 * (qualidade, tom, exposição, tamanho do texto), e o `?ajustes=1` o abre
 * DE PROPÓSITO sobre a tela de título, onde nenhuma fase o hospeda —
 * fechá-lo por fase mataria a porta. A FICHA também não: ela obedece à
 * SELEÇÃO, não à fase; se ainda há um corpo em foco quando o modo volta, a
 * ficha dele é a resposta certa, e se não há ela nem monta.
 */
export const aoTravessar = (atual: Gaveta | null): Gaveta | null =>
  atual === 'busca' || atual === 'camadas' || atual === 'tempo' ? null : atual;

/**
 * HÁ SELEÇÃO ⇒ HÁ FICHA (item 74). Escolher um corpo — na paleta, no
 * rótulo, pelo `?foco=` — abre a ficha dele; trocar de corpo troca o
 * conteúdo sem fechar; soltar a seleção (Esc até o sistema) fecha.
 *
 * FECHAR A FICHA NÃO DESFAZ A SELEÇÃO: fechar é leitura, não navegação.
 * Por isso quem chama olha o corpo ANTERIOR e não o estado da gaveta —
 * quem fechou a ficha de Marte não a vê renascer no quadro seguinte, e
 * quem escolhe Titã depois disso a vê abrir com Titã.
 *
 * O ⚙ AJUSTES RESISTE, pela terceira vez neste arquivo e pela mesma razão
 * das outras duas: ele é o painel da CASA, não o de uma fase nem o de um
 * alvo. Sem esta cláusula o link `?ajustes=1&foco=hd48915` — uma
 * configuração inteira num endereço, com o painel aberto para conferência
 * — perdia o painel no instante em que o foco chegava. O nome do alvo
 * continua na barra, no gatilho da ficha.
 */
export const aoFocar = (atual: Gaveta | null, alvo: string | null): Gaveta | null =>
  atual === 'ajustes' ? atual : alvo ? 'ficha' : atual === 'ficha' ? null : atual;

/**
 * A FICHA NO CELULAR — MÁQUINA DE ESTADOS (Lote 3, PLAN-UI.md §7, item
 * 225): `fichaExpandida` decide compacta/expandida, e esta é a ÚNICA
 * regra pura dela — a compacta/expandida em si (o toque em "Detalhes"
 * ou "Recolher", o arrasto na alça) é encanamento do Lote 5; aqui só o
 * que decide QUANDO ela VOLTA a compacta sozinha.
 *
 * A FICHA ABRE ⇒ COMPACTA, sempre — venha de outra gaveta ou de
 * nenhuma (`anterior !== 'ficha'`), nunca da troca de ALVO com a ficha
 * JÁ aberta (`anterior === atual === 'ficha'`, a mesma cláusula que
 * `aoFocar` já trata como "conteúdo troca sem fechar"): abrir de novo é
 * abrir de novo, e o dono decidiu que "expandir" não é estado que
 * sobreviva a uma seleção nova (§7, "Rotação do aparelho / mesa →
 * celular... estado zera quando `celular` muda" é a MESMA lei lida
 * pela porta do aparelho — esse gatilho mora no `useState` do hook, e
 * não aqui, porque `celular` não é `Gaveta`).
 */
export const aoAbrirFicha = (
  anterior: Gaveta | null,
  atual: Gaveta | null,
  expandida: boolean
): boolean => (atual === 'ficha' && anterior !== 'ficha' ? false : expandida);

/**
 * QUANTO DURA A SAÍDA DA FOLHA — o mesmo 260 ms da entrada (o
 * `@keyframes folhaSobe`, fatia 9), porque é o mesmo movimento ao
 * contrário. Mora aqui e não no CSS porque quem segura o nó desmontando
 * é JavaScript: uma folha que fechou já não tem elemento para animar.
 *
 * PRIVADA: os dois leitores são deste arquivo — o `useLayoutEffect` daqui
 * de baixo (o desmonte) e o `soltar` do arrasto que segue a folha (fix,
 * 09/09: a MESMA curva/duração de `folhaDesce` termina o arrasto fora da
 * tela) — e mais ninguém. Ela nasceu exportada por hábito, e um `export`
 * sem consumidor é superfície pública que envelhece calada.
 */
const SAIDA_DA_FOLHA_MS = 260;

/**
 * NÃO HÁ MOVIMENTO NENHUM PARA ESPERAR. Duas situações zeram a saída da
 * folha, e as duas já andam juntas em toda a casa (`App.tsx` na tela de
 * carga, `director.ts` na travessia): `prefers-reduced-motion`, onde a
 * fatia 9 já declara `animation: none` para `.hud-dialogo[inert]`, e o
 * `?shot=`, onde a fatia 7 zera TODA transição e animação do HUD.
 *
 * Nos dois casos o CSS já não desenha a descida — mas o JavaScript
 * continuava segurando o nó 260 ms. O resultado é o oposto do que cada
 * modo promete: uma folha PARADA no meio da tela, surda, esperando um
 * temporizador; e, na captura, um painel que devia ter fechado aparecendo
 * inteiro na foto.
 *
 * Lido UMA VEZ POR TROCA (quem chama só roda quando a gaveta muda), nunca
 * por quadro — e, por ser lido na hora, obedece à preferência do sistema
 * mesmo que ela mude com o app aberto.
 */
const semMovimento = () =>
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) ||
  new URLSearchParams(window.location.search).has('shot');

/**
 * QUEM GANHA UMA SAÍDA DESENHADA — a única gaveta que sai andando é a
 * folha do CELULAR ao fechar de verdade. Trocar de gaveta não é sair (o
 * conteúdo é substituído no lugar), abrir a primeira não é sair, e a mesa
 * nunca teve descida nenhuma para animar. Sem movimento a desenhar, o
 * valor é `null` e o nó desmonta no MESMO commit, sem fase intermediária.
 */
export const folhaQueSai = (
  celular: boolean,
  anterior: Gaveta | null,
  gaveta: Gaveta | null,
  imovel: boolean
): Gaveta | null =>
  celular && !imovel && anterior !== null && gaveta === null ? anterior : null;

/**
 * QUANTO O DEDO DESCE PARA A FOLHA FECHAR — a QUARTA saída (item 62,
 * decisão do dono em 23/08). A folha do telefone já fechava pela alça,
 * pelo Esc e pelo toque no céu; ele aprovou a quarta, *"arrastando para
 * baixo"*, e o plano do item 62 já dizia com o quê: o `ArrastoDePonteiro`
 * que a casa tem, sem mecânica nova.
 *
 * 48 px É O QUE `mover` DEVOLVE, e não o que o dedo anda: a janela do
 * toque (`aindaEhToque`, 16 px de dedo) é comida antes do primeiro passo
 * e DESCARTADA, então o gesto real são 64 px — 7,6% da altura num
 * aparelho de 844. Abaixo disso um polegar que apenas encosta na folha
 * para rolar a fecharia; muito acima, o gesto vira exercício.
 */
export const ARRASTO_QUE_FECHA_PX = 48;

/**
 * O ARRASTO QUE FECHA é PARA BAIXO e mais vertical que horizontal. A
 * segunda metade não é preciosismo: a folha de Ajustes tem controles
 * deslizantes e a fileira de alças rola em X — um gesto que desce 50 px
 * enquanto anda 200 para o lado é qualquer coisa menos "fecha".
 *
 * PURA, como as outras quatro regras deste arquivo, e pela mesma razão: o
 * runner da casa é `node`, sem DOM. O que se pina em `useGavetas.test.ts`
 * é esta função; o ouvinte em volta dela é encanamento.
 */
export const arrastoFecha = (dx: number, dy: number): boolean =>
  dy >= ARRASTO_QUE_FECHA_PX && dy > Math.abs(dx);

export interface Gavetas {
  /** qual está aberta AGORA, ou `null` */
  gaveta: Gaveta | null;
  /**
   * qual está DESENHADA — a aberta, ou a que está descendo. Enquanto ela
   * desce o nó fica `inert`: não recebe toque, não recebe foco e some da
   * árvore de quem ouve a tela, apesar de continuar na tela.
   */
  montada: Gaveta | null;
  /** o gatilho de uma gaveta: abre a dela e fecha a que estiver aberta */
  alternarGaveta: (qual: Gaveta) => void;
  /** o "✕" de uma gaveta: fecha se for ELA que está aberta */
  fecharGaveta: (qual: Gaveta) => void;
  /** o TOQUE NO CÉU: fecha a folha que estiver aberta, seja qual for */
  fecharTodas: () => void;
  /**
   * A FICHA NO CELULAR (Lote 3, PLAN-UI.md §7, item 225): compacta
   * (`false`) ou expandida (`true`). Não existe apresentação própria na
   * mesa — o Lote 5 desenha compacta/expandida; por agora é só o
   * ESTADO e a regra (`aoAbrirFicha`).
   */
  fichaExpandida: boolean;
  /** alterna compacta ⇄ expandida — o toque em "Detalhes"/"Recolher" */
  alternarFichaExpandida: () => void;
  /** força um dos dois — o arrasto na alça, que já sabe para ONDE vai */
  definirFichaExpandida: (v: boolean) => void;
}

export function useGavetas(
  escada: EstadoDaEscada,
  foco: string | null,
  phase: Phase,
  celular: boolean
): Gavetas {
  /**
   * A GAVETA ÚNICA (item 74, 22/08). Eram TRÊS booleanos — `gaveta`,
   * `busca`, `ajustes` — e cada função de abrir desligava as outras duas à
   * mão. Sempre foi "uma de cada vez"; o que faltava era a regra estar
   * escrita UMA vez em vez de três. A quarta porta (a ficha do objeto) seria
   * a quarta cópia da mesma linha, e é ela que obrigou a unificação.
   *
   * O ⚙ AJUSTES ENTRA NO ENUM e continua com a exceção dele: ele não é o
   * painel de uma fase, é o da casa, e o `?ajustes=1` o abre sobre a tela de
   * título, onde fase nenhuma o hospeda. O que muda com a fase
   * (`aoTravessar`) continua fechando só os que a fase hospeda.
   */
  const [gaveta, setGaveta] = useState<Gaveta | null>(() =>
    new URLSearchParams(window.location.search).has('ajustes') ? 'ajustes' : null
  );

  /**
   * AS DUAS REAÇÕES SÃO AJUSTE DURANTE O RENDER, e não efeitos — o mesmo
   * caminho que a folha que sai usa mais abaixo (`anterior`/`saindo`), e o
   * que a regra `set-state-in-effect` pede em vez da supressão que estava
   * aqui. Nenhuma das duas toca DOM, rede ou relógio: as duas só derivam
   * `gaveta` de uma entrada que MUDOU, que é literalmente o caso de uso
   * que o React documenta para isto.
   *
   * O "anterior" de cada uma é um SEGUNDO estado e não um `useRef`, pela
   * mesma razão escrita lá embaixo: ref lido durante o render não faz o
   * componente re-renderizar, e é do re-render ANTES do commit que o
   * ajuste depende. Os dois nascem no valor que o efeito via na montagem
   * (`null` e a fase de entrada), então a primeira passagem é inerte —
   * como era.
   */
  const [alvoAnterior, setAlvoAnterior] = useState<string | null>(null);
  const alvo = escada.corpoId ?? (escada.degrau === 'estrela' ? foco : null);
  if (alvo !== alvoAnterior) {
    setAlvoAnterior(alvo);
    setGaveta((atual) => aoFocar(atual, alvo));
  }

  /**
   * A FICHA NO CELULAR — COMPACTA POR PADRÃO (Lote 3, PLAN-UI.md §7,
   * item 225). MESMO PADRÃO das reações acima (ajuste durante o
   * render, um segundo estado como "anterior"): `aoAbrirFicha` decide
   * se ela ABRIU agora (zera para compacta) ou se já estava aberta
   * (mantém). O "anterior" AQUI é a `gaveta` de antes deste render, e
   * não o `gavetaAnterior` de cima — são a MESMA variável em espírito,
   * mas o React só garante o valor lido "durante o render" quando é o
   * PRÓPRIO efeito quem o guarda, e um terceiro estado colidiria com o
   * de `alvoAnterior`/`faseAnterior` se fosse o mesmo nome.
   */
  const [gavetaAnteriorParaFicha, setGavetaAnteriorParaFicha] = useState<Gaveta | null>(gaveta);
  const [fichaExpandida, setFichaExpandida] = useState(false);
  if (gavetaAnteriorParaFicha !== gaveta) {
    setGavetaAnteriorParaFicha(gaveta);
    setFichaExpandida((atual) => aoAbrirFicha(gavetaAnteriorParaFicha, gaveta, atual));
  }

  /**
   * MESA ⇄ CELULAR ZERA A FICHA (§7: "estado zera quando `celular`
   * muda") — e é uma reação SEPARADA da de cima porque `celular` não é
   * `Gaveta`: virar a mesa não muda `gaveta` nenhuma, então a reação
   * acima nunca dispararia sozinha. Sem isto, expandir no celular e
   * girar o aparelho para paisagem (que no fim é outra largura, e pode
   * cruzar a fronteira de `useCelular`) devolveria o visitante à mesa
   * com a ficha marcada expandida — apresentação que a mesa nem tem.
   */
  const [celularAnterior, setCelularAnterior] = useState(celular);
  if (celularAnterior !== celular) {
    setCelularAnterior(celular);
    setFichaExpandida(false);
  }

  /**
   * A TRAVESSIA DE MODO fecha a busca e as camadas — a reação inteira, e
   * não só a função que ela chama. Ela morava no `App.tsx` como "o
   * gatilho, porque é a FASE que dispara"; a fase é um parâmetro, e a
   * regra de quem fecha o quê é deste arquivo (§11 do AGENTS: um
   * arquivo, um assunto).
   */
  const [faseAnterior, setFaseAnterior] = useState<Phase>(phase);
  if (faseAnterior !== phase) {
    setFaseAnterior(phase);
    setGaveta(aoTravessar);
  }

  /**
   * A FOLHA DESCE ANTES DE SUMIR (item 62) — e este hook é o dono do
   * tempo porque não há outro possível: as cinco gavetas DESMONTAM ao
   * fechar, e CSS nenhum anima um nó que já não existe. É a máquina
   * `activePanel`/`queuedPanel` do doador, em português e com uma
   * simplificação medida.
   *
   * A SIMPLIFICAÇÃO: só desce quem fecha para NADA. Trocar de alça troca
   * o CONTEÚDO da mesma folha, no ato — o doador descia a folha inteira,
   * esperava a saída e só então subia a outra (500 ms de dança para uma
   * troca de painel), e uma folha de baixo que já está na tela não tem
   * por que sair da tela para voltar. De quebra, isto é o que mantém a
   * promessa de UMA gaveta por vez literal: nunca há dois
   * `[data-dialogo]` no documento, nem por 260 ms.
   *
   * E SÓ NO TELEFONE. Na mesa o diálogo não sobe de lugar nenhum, não há
   * o que descer, e segurar o nó por 260 ms mudaria o que os juízes da
   * casa medem — `julgarDialogo` cobra que o Esc feche o diálogo, e
   * "fechou" lá quer dizer "saiu do DOM".
   *
   * DERIVADO DURANTE O RENDER, e não num efeito: um efeito roda DEPOIS
   * do commit, e no commit em que `gaveta` vira `null` o nó já foi
   * removido — a folha piscaria fora da tela e voltaria para descer.
   * Ajustar estado durante o render é o caminho que o React documenta
   * para exatamente isto, e ele re-renderiza antes de tocar o DOM.
   */
  const [saindo, setSaindo] = useState<Gaveta | null>(null);
  // o "anterior" é um SEGUNDO estado e não um `useRef`, e é o que a
  // regra dos refs cobra com razão: ref lido durante o render não faz o
  // componente re-renderizar, e é justamente do re-render antes do
  // commit que este ajuste depende
  const [anterior, setAnterior] = useState<Gaveta | null>(gaveta);
  if (anterior !== gaveta) {
    setAnterior(gaveta);
    setSaindo(folhaQueSai(celular, anterior, gaveta, semMovimento()));
  }

  /**
   * `useLayoutEffect` e não `useEffect`: o `inert` tem de estar no nó
   * ANTES do primeiro paint em que ele já é a folha que sai. Um efeito
   * comum roda depois do paint, e nesse quadro a folha ainda receberia
   * toque — e, pior, o CSS da saída (`.hud-dialogo[inert]`, fatia 9) só
   * começaria um quadro atrasado, com a folha parada no lugar.
   */
  useLayoutEffect(() => {
    if (!saindo) return;
    /**
     * A JANELA VIROU MESA NO MEIO DA SAÍDA (girar o aparelho, arrastar a
     * borda): a folha que descia deixou de ser folha — o
     * `.hud-dialogo[inert]` que a desenha mora dentro do `@media
     * (max-width: 760px)` da fatia 9. `montada` já não a monta (lá
     * embaixo), então não há nó nenhum a marcar; sobra apagar o estado, e
     * disso o temporizador de sempre dá conta.
     */
    const no = celular
      ? document.querySelector(`[${'data-dialogo'}="${saindo}"]`)
      : null;
    no?.setAttribute('inert', '');
    const id = window.setTimeout(() => setSaindo(null), SAIDA_DA_FOLHA_MS);
    return () => {
      window.clearTimeout(id);
      /**
       * REABRIR ANTES DE A FOLHA TERMINAR DE DESCER. O `inert` foi posto
       * à mão, e o que é posto à mão tem de ser tirado à mão: o React não
       * sabe dele, e na reabertura `montada` continua sendo a MESMA
       * gaveta — o mesmo nó volta com o atributo grudado, sem toque, sem
       * foco, fora da árvore de quem ouve a tela e, pelo
       * `.hud-dialogo[inert]`, ainda descendo para fora do quadro. Uma
       * folha viva e invisível, que só voltava a si depois de fechar de
       * novo e esperar os 260 ms inteiros.
       *
       * Uma limpeza cobre as DUAS saídas deste estado: a que o
       * temporizador termina (o nó já foi, `isConnected` é falso, nada a
       * fazer) e a que a reabertura cancela.
       */
      if (no?.isConnected) no.removeAttribute('inert');
    };
  }, [saindo, celular]);

  /**
   * A ALÇA ABERTA VEM PARA A TELA. A fileira não quebra linha (quebrar
   * moveria a câmera), então ela ROLA — e num aparelho de 390 px a quinta
   * alça, a da ficha, nasce fora da tela. Como a ficha abre SOZINHA a
   * cada seleção, sem esta linha o visitante escolhia um corpo, a folha
   * subia, e o botão que a fecha estava fora do quadro.
   * `inline: 'nearest'` rola o mínimo necessário, e só no eixo que rola.
   */
  useEffect(() => {
    if (!celular || !gaveta) return;
    document
      .querySelector(`[${'data-abre-dialogo'}="${gaveta}"]`)
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [celular, gaveta]);

  /**
   * A QUARTA SAÍDA: ARRASTAR A FOLHA PARA BAIXO (item 62, decisão do dono
   * em 23/08). As três que já existiam — a alça, o Esc e o toque no céu —
   * continuam inteiras; esta é a que o telefone pede sem que ninguém
   * ensine.
   *
   * NENHUMA MECÂNICA NOVA: o gesto é o `ArrastoDePonteiro` da casa, o
   * mesmo que o canvas usa, com o mesmo dono de ponteiro, a mesma zona
   * morta do dedo e o mesmo `mover` que devolve o passo em pixels. O que
   * este bloco acrescenta é a REGRA (`arrastoFecha`) e onde escutar.
   *
   * A FOLHA ROLA POR DENTRO, e era essa a decisão de desenho que faltava:
   * um arrasto para baixo sobre o painel de Ajustes tanto pode dizer
   * "fecha" quanto "rola". Quem desempata é `scrollTop`: só arma quando a
   * rolagem JÁ ESTÁ NO TOPO, que é a regra que todo telefone usa e a que
   * o item 62 listou como uma das duas saídas possíveis. A outra era uma
   * barra de pegar, e ela custaria um nó novo em cinco componentes.
   *
   * O GESTO CHEGA POR `touch`, E NÃO POR `pointer` — e isto foi MEDIDO,
   * não escolhido. A folha é rolável (`overflow-y: auto`), e num elemento
   * rolável o Chrome decide, ~30 px depois do primeiro toque, que o gesto
   * é dele: manda um `pointercancel` e assume a rolagem. Medido a 390×844
   * com dedo sintético: chegavam DOIS `pointermove` e o fluxo morria — o
   * arrasto nunca alcançava o limiar. Os `touchmove`, no MESMO gesto,
   * continuavam chegando até o fim. Ou seja, o fluxo de ponteiro não
   * sobrevive à decisão do navegador e o de toque sobrevive.
   *
   * NÃO É MECÂNICA NOVA: o `ArrastoDePonteiro` é DOM-nenhum de propósito —
   * ele pede cinco campos, não um `PointerEvent` —, e um `Touch` os tem
   * todos (o `identifier` é o dono, como o `pointerId`). O adaptador
   * abaixo (`comoPonteiro`, sete linhas) é a tradução, e a máquina de
   * estado, a zona morta do dedo e o passo em pixels continuam sendo os
   * da casa.
   *
   * E SÓ DEDO, de graça: `touchstart` não existe para mouse. Na mesma
   * largura, com mouse, arrastar sobre a folha é selecionar texto — fechar
   * o painel no meio da seleção seria um defeito.
   *
   * A ROLAGEM CANCELA O GESTO, e não só o desarma na largada: se o dedo
   * subir primeiro (rolando o conteúdo) e voltar a descer, `scrollTop` já
   * não é zero e o arrasto é esquecido. Sem isso, voltar ao topo rolando
   * fecharia a folha na cara de quem só queria ler o começo.
   *
   * FECHA "A MIM", nunca "o que estiver aberto": `aoFechar` com o nome da
   * folha que recebeu o dedo, pela razão escrita lá em cima — entre o
   * gesto e o `set` a escolha de um corpo pode ter aberto a ficha.
   */
  useEffect(() => {
    if (!celular || !gaveta) return;
    const folha = document.querySelector<HTMLElement>(`[${'data-dialogo'}="${gaveta}"]`);
    if (!folha) return;
    const arrasto = new ArrastoDePonteiro();
    let dx = 0;
    let dy = 0;
    // A FOLHA SEGUE O DEDO (fix, 09/09): só vira `true` quando o gesto já
    // passou da zona morta do toque (o primeiro `passo` não nulo de
    // `mover`, abaixo) — um toque que nunca chega a arrastar não deixa
    // rastro nenhum para `soltar` limpar.
    let arrastando = false;
    const comoPonteiro = (t: Touch) => ({
      pointerId: t.identifier,
      button: 0,
      clientX: t.clientX,
      clientY: t.clientY,
      pointerType: 'touch',
    });
    const comecar = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      // um segundo dedo é PINÇA, e a pinça não fecha nada — a mesma
      // resposta que `director/gestos.ts` dá ao segundo dedo
      if (!dedo || e.touches.length > 1) {
        arrasto.esquecer();
        // A PINÇA ABANDONA um arrasto que já tinha começado — sem isto
        // a folha ficava presa a meio caminho, sem `soltar` nenhum para
        // limpá-la (o segundo dedo nunca gera `touchend` do PRIMEIRO).
        if (arrastando) {
          arrastando = false;
          folha.style.transform = '';
          folha.style.transition = '';
        }
        return;
      }
      if (folha.scrollTop > 0) return;
      dx = 0;
      dy = 0;
      arrasto.comecar(comoPonteiro(dedo), performance.now());
    };
    const mover = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      if (!dedo) return;
      if (folha.scrollTop > 0) {
        arrasto.esquecer();
        return;
      }
      const passo = arrasto.mover(comoPonteiro(dedo), performance.now());
      if (!passo) return;
      dx += passo.dx;
      dy += passo.dy;
      if (!arrastando) {
        arrastando = true;
        // A ENTRADA (`@keyframes folhaSobe`, 09-celular.css) já rodou e
        // continua "preenchendo" `transform` (`fill: both`) — sem
        // desligá-la, o `transform` que este arrasto escreve abaixo
        // seria IGNORADO: animação de CSS vence estilo em linha
        // enquanto preenche. Ela já cumpriu o papel (a folha parada,
        // aberta); desligar agora não move nada na tela.
        folha.style.animation = 'none';
        folha.style.transition = 'none';
      }
      // SÓ PARA BAIXO — o sentido que fecha (`dy` negativo é clampado a
      // zero: a mão voltando não "abre mais" a folha para cima). A
      // DECISÃO de fechar continua a mesma (`arrastoFecha`, mesmo
      // limiar), só que agora corre em `soltar`, e não aqui: fechar no
      // MEIO do arrasto faria a folha sumir debaixo do dedo, ainda
      // encostado.
      folha.style.transform = `translateY(${Math.max(0, dy)}px)`;
    };
    const soltar = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      if (dedo) arrasto.cancelar(comoPonteiro(dedo));
      if (!arrastando) return;
      arrastando = false;
      const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const transicao = reduzido
        ? 'none'
        : `transform ${SAIDA_DA_FOLHA_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      // A FOLHA QUE FICA (não fechou, ou a ficha só vai RECOLHER — as
      // duas continuam montadas) tem de voltar a zero e SER LIMPA
      // depois: um `transform`/`transition` esquecidos atrapalhariam o
      // próximo arrasto, ou a transição de altura da compacta.
      const voltarAoLugar = () => {
        folha.style.transition = transicao;
        folha.style.transform = 'translateY(0)';
        window.setTimeout(
          () => {
            folha.style.transform = '';
            folha.style.transition = '';
            folha.style.animation = '';
          },
          reduzido ? 0 : SAIDA_DA_FOLHA_MS
        );
      };
      if (!arrastoFecha(dx, dy)) {
        voltarAoLugar();
        return;
      }
      // A FICHA EXPANDIDA RECOLHE em vez de fechar (Lote 5, PLAN-UI.md
      // §7: "'Recolher', arrasto para baixo no topo da rolagem →
      // compacta"). NENHUMA MECÂNICA NOVA: o mesmo gesto que fecha as
      // outras quatro gavetas (e a ficha COMPACTA) só arma com
      // `folha.scrollTop === 0` — na folha expandida isso já É "o topo
      // da rolagem" do enunciado. Só o que o gesto FAZ muda com o estado.
      if (gaveta === 'ficha' && fichaExpandida) {
        setFichaExpandida(false);
        // RECOLHE NÃO DESMONTA — a ficha só encolhe (a transição de
        // altura já existe, 09-celular.css), então o transform volta a
        // ZERO, não para fora da tela.
        voltarAoLugar();
        return;
      }
      // FECHA DE VERDADE: a folha vai desmontar (`saindo`, mais abaixo)
      // — o gesto termina fora da tela, no mesmo lugar de `folhaDesce`,
      // e o desmonte que já vem a caminho não deixa resto para limpar.
      folha.style.transition = transicao;
      folha.style.transform = 'translateY(110%)';
      setGaveta((atual) => aoFechar(atual, gaveta));
    };
    // PASSIVO, e de graça: `comecar` não chama `preventDefault` em
    // caminho nenhum — declarar isso deixa o navegador começar a rolagem
    // sem esperar o ouvinte responder.
    folha.addEventListener('touchstart', comecar, { passive: true });
    window.addEventListener('touchmove', mover);
    window.addEventListener('touchend', soltar);
    window.addEventListener('touchcancel', soltar);
    return () => {
      folha.removeEventListener('touchstart', comecar);
      window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', soltar);
      window.removeEventListener('touchcancel', soltar);
    };
  }, [celular, gaveta, fichaExpandida]);

  const alternarGaveta = useCallback(
    (qual: Gaveta) => setGaveta((atual) => aoAlternar(atual, qual)),
    []
  );

  const fecharGaveta = useCallback(
    (qual: Gaveta) => setGaveta((atual) => aoFechar(atual, qual)),
    []
  );

  /**
   * O TOQUE NO CÉU (item 62). Quem o chama é `director/gestos.ts`, que é
   * onde mora a regra de qual toque fecha o quê — aqui é só a porta.
   * `useCallback` com lista vazia porque o consumidor é o Director, que
   * nasce UMA vez: identidade nova a cada render seria um fio pendurado
   * na primeira.
   */
  const fecharTodas = useCallback(() => setGaveta(null), []);

  /** o toque em "Detalhes"/"Recolher" (Lote 5) — compacta ⇄ expandida */
  const alternarFichaExpandida = useCallback(() => setFichaExpandida((atual) => !atual), []);
  /** o arrasto na alça (Lote 5), que já sabe para ONDE vai */
  const definirFichaExpandida = useCallback((v: boolean) => setFichaExpandida(v), []);

  return {
    gaveta,
    // o `celular &&` é a rotação no meio da saída: sem ele, a folha que
    // descia reapareceria por 260 ms como painel de MESA, no canto, já
    // fechada — um fantasma que ninguém pediu
    montada: gaveta ?? (celular ? saindo : null),
    alternarGaveta,
    fecharGaveta,
    fecharTodas,
    fichaExpandida,
    alternarFichaExpandida,
    definirFichaExpandida,
  };
}
