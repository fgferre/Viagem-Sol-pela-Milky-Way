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
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrastoDePonteiro } from '../three/arrastoDePonteiro';
import type { EstadoDaEscada, Phase } from '../three/director';
import {
  REPOUSO,
  cancelar,
  desvanecer,
  emMilissegundos,
  foraDaTelaCelular,
  foraDaTelaMesa,
  ir,
  lerTokens,
} from './movimentoDaGaveta';

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
 * QUANTO ESPERAR ANTES DE DESMONTAR UM CONTEÚDO DOBRÁVEL — PERGUNTADO
 * AO PRÓPRIO NÓ, e não escrito aqui. Hoje serve só `usePresenca.ts`
 * (§5 do plano de motion, os acordeões: as seções da ficha, o
 * "Avançado" dos Ajustes) — as CINCO GAVETAS pararam de precisar disto
 * no C1: a saída delas virou uma animação WAAPI (`ir`, em
 * `movimentoDaGaveta.ts`), que já SABE quando termina pelo próprio
 * `finished`, em vez de perguntar ao CSS qual `@keyframes` venceu.
 *
 * Os acordeões continuam em `@keyframes` (`abreSanfona`/`fechaSanfona`,
 * `01-base.css`): `animationDuration` do nó JÁ marcado com a classe de
 * saída devolve a duração EFETIVA da regra que o navegador escolheu,
 * `0s` onde a preferência reduzida ou a captura zeram os tokens. Uma
 * leitura por fechamento, nunca por quadro — uma cópia em JavaScript
 * dessa duração seria um segundo relógio para discordar do CSS, que é
 * exatamente o que o plano de motion proíbe.
 */
export const duracaoDaSaida = (no: Element | null): number => {
  if (!no) return 0;
  return Math.max(
    0,
    ...getComputedStyle(no)
      .animationDuration.split(',')
      .map(emMilissegundos)
  );
};

/**
 * NÃO HÁ MOVIMENTO NENHUM PARA ESPERAR. Duas situações zeram a saída, e
 * as duas já andam juntas em toda a casa (`App.tsx` na tela de carga,
 * `director.ts` na travessia): `prefers-reduced-motion`, onde os tokens
 * de deslocamento zeram na raiz (fatia 1) e a fatia 9 declara
 * `animation: none` para a folha, e o `?shot=`, onde a fatia 7 zera TODA
 * transição e animação do HUD.
 *
 * Nos dois casos o CSS já não desenha a saída — mas o JavaScript
 * continuava segurando o nó o tempo inteiro. O resultado é o oposto do
 * que cada modo promete: um painel PARADO na tela, surdo, esperando um
 * temporizador; e, na captura, uma gaveta que devia ter fechado
 * aparecendo inteira na foto.
 *
 * Lido UMA VEZ POR TROCA (quem chama só roda quando a gaveta muda), nunca
 * por quadro — e, por ser lido na hora, obedece à preferência do sistema
 * mesmo que ela mude com o app aberto.
 */
export const semMovimento = () =>
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) ||
  new URLSearchParams(window.location.search).has('shot');

/**
 * QUEM GANHA UMA SAÍDA DESENHADA — a gaveta que FECHA DE VERDADE, nos
 * dois arranjos: a folha do telefone descendo e, desde o M2 do plano de
 * motion, o painel da mesa recuando para debaixo da régua.
 *
 * Trocar de gaveta NÃO é sair (o conteúdo é substituído no mesmo lugar, e
 * abrir uma segunda superfície viva só para ter travessia duplicaria
 * diálogo, ids e anúncio), e abrir a primeira também não. Sem movimento a
 * desenhar (`imovel`), o valor é `null` e o nó desmonta no MESMO commit,
 * sem fase intermediária.
 */
export const gavetaQueSai = (
  anterior: Gaveta | null,
  gaveta: Gaveta | null,
  imovel: boolean
): Gaveta | null => (!imovel && anterior !== null && gaveta === null ? anterior : null);

/** as três formas de uma gaveta CHEGAR (o plano de motion, C1) — ver
 *  `tipoDeEntrada`, abaixo, para o que cada uma significa. */
export type TipoDeEntrada = 'abre' | 'troca' | 'reabre' | null;

/**
 * COMO UMA GAVETA CHEGOU — a MESMA pergunta de `gavetaQueSai`, virada
 * para quem ENTRA: sem isto o movimento de entrada não sabe se desliza
 * de fora da tela (`'abre'`, a primeira vez), retoma de onde a SAÍDA
 * parou (`'reabre'`, o MESMO nó, ainda animando) ou não se move NADA
 * (`'troca'`, o conteúdo troca no lugar — E3 do reaudito, medido: cada
 * troca recomeçava o percurso inteiro porque nada media essa
 * diferença, e o pedido de entrada lateral nunca pediu fechar/reabrir
 * a ferramenta a cada troca).
 *
 * `saindoAntes` é o `saindo` de ANTES desta transição, não o atual —
 * quem chama lê os dois no MESMO "ajuste durante o render" que já
 * decide `saindo` (abaixo), antes de `setSaindo` sobrescrever o valor.
 * Se a gaveta que está abrindo é a MESMA que estava saindo, o nó nunca
 * desmontou: é reabertura, não abertura — e é por isso que o efeito de
 * saída, mais abaixo, não cancela a própria animação ao limpar o
 * `inert`: é `ir` quem lê o transform em curso antes de a suceder.
 */
export const tipoDeEntrada = (
  anterior: Gaveta | null,
  gaveta: Gaveta | null,
  saindoAntes: Gaveta | null
): TipoDeEntrada => {
  if (gaveta === null) return null;
  if (saindoAntes === gaveta) return 'reabre';
  return anterior === null ? 'abre' : 'troca';
};

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
  /**
   * A MESMA PORTA DE `fecharGaveta`, mas sem a saída desenhada (reaudito
   * C3d) — hoje só "Rever convite" (Ajustes.tsx) usa: o tour aparece na
   * hora, e esperar o painel recuar debaixo da régua o deixaria visível
   * por baixo do tour. Mesma exclusividade de sempre; só o "como" muda.
   */
  fecharGavetaImovel: (qual: Gaveta) => void;
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
   * DESDE O M2 DO PLANO DE MOTION isto vale nos DOIS arranjos, não só
   * no telefone: a mesa também segura o nó por uma saída desenhada — o
   * painel recuando para debaixo da régua, o mesmo mecanismo, só o
   * eixo muda.
   *
   * DERIVADO DURANTE O RENDER, e não num efeito: um efeito roda DEPOIS
   * do commit, e no commit em que `gaveta` vira `null` o nó já foi
   * removido — a folha piscaria fora da tela e voltaria para descer.
   * Ajustar estado durante o render é o caminho que o React documenta
   * para exatamente isto, e ele re-renderiza antes de tocar o DOM.
   */
  const [saindo, setSaindo] = useState<Gaveta | null>(null);
  /** como esta abertura chegou (`tipoDeEntrada`, acima) — calculado no
   *  MESMO ajuste que decide `saindo` logo abaixo, porque as duas
   *  perguntas leem o MESMO par de valores "de antes desta transição". */
  const [tipoDeAbertura, setTipoDeAbertura] = useState<TipoDeEntrada>(null);
  /**
   * QUEM PEDIU PARA FECHAR SEM A SAÍDA DESENHADA (`fecharGavetaImovel`,
   * abaixo) — sinal de UMA vez para o ajuste logo abaixo, não uma
   * segunda presença: só decide se `imovel` (terceiro argumento de
   * `gavetaQueSai`) vale para ESTA transição, e é consumido (zerado) no
   * mesmo ajuste que o lê.
   */
  const [fecharImovelAlvo, setFecharImovelAlvo] = useState<Gaveta | null>(null);
  // o "anterior" é um SEGUNDO estado e não um `useRef`, e é o que a
  // regra dos refs cobra com razão: ref lido durante o render não faz o
  // componente re-renderizar, e é justamente do re-render antes do
  // commit que este ajuste depende
  const [anterior, setAnterior] = useState<Gaveta | null>(gaveta);
  if (anterior !== gaveta) {
    setTipoDeAbertura(tipoDeEntrada(anterior, gaveta, saindo));
    setAnterior(gaveta);
    const imovel = fecharImovelAlvo === anterior || semMovimento();
    if (fecharImovelAlvo !== null) setFecharImovelAlvo(null);
    setSaindo(gavetaQueSai(anterior, gaveta, imovel));
  }

  /**
   * GIRAR O APARELHO (ou cruzar a fronteira mesa/celular, ou mudar de
   * fase) NO MEIO DE UMA SAÍDA não pode deixar a trajetória antiga
   * presa no eixo novo (E6 do reaudito, medido: fechar a 390×844 e
   * girar para 844×390 deixava o painel `inert` correndo a saída
   * LATERAL antiga numa tela agora vertical). `celular` mudar é cruzar
   * a fronteira mesa/telefone — o EIXO da saída em curso
   * (`foraDaTelaMesa`/`foraDaTelaCelular`, nos efeitos abaixo) fica
   * errado para a tela nova. `phase` entra pela mesma porta por
   * simetria (uma travessia é o outro jeito de a geometria mudar de
   * baixo do painel) — e não colide com `aoTravessar` (que fecha
   * busca/camadas/tempo pela FASE): `saindo` só é verdadeiro quando
   * `gaveta` já é `null`, e `aoTravessar(null)` não faz nada.
   *
   * AJUSTE DURANTE O RENDER, e não um efeito: `saindo` vira `null` no
   * MESMO commit desta mudança — `montada` também, porque `gaveta` já
   * é `null` enquanto uma saída corre — e o nó desmonta ANTES de
   * qualquer quadro pintar a trajetória velha no eixo novo. Não há
   * animação para cancelar à mão aqui: um nó que sai da árvore não
   * pinta o que ainda "corre" nele, e o cleanup do efeito de saída,
   * abaixo, já sabe ficar quieto quando `isConnected` é falso.
   *
   * Um painel ABERTO (`!saindo`) não passa por aqui: ele só PARA na
   * geometria nova, que o CSS resolve sozinho, sem transform nenhum
   * por meio — por isso o `if` interno, e não uma condição na guarda de
   * fora: os dois rastreadores têm de se atualizar de qualquer jeito,
   * saindo ou não.
   */
  const [celularAnteriorParaSaida, setCelularAnteriorParaSaida] = useState(celular);
  const [faseAnteriorParaSaida, setFaseAnteriorParaSaida] = useState(phase);
  if (celularAnteriorParaSaida !== celular || faseAnteriorParaSaida !== phase) {
    setCelularAnteriorParaSaida(celular);
    setFaseAnteriorParaSaida(phase);
    if (saindo) setSaindo(null);
  }

  /**
   * `celular` TAMBÉM POR REF, para os dois efeitos abaixo que precisam
   * do valor mais recente sem REAGIR a ele: reler `celular` de um
   * painel já aberto reiniciaria o deslizar a cada rotação do aparelho
   * — só a saída (ajuste acima) e a entrada (efeito abaixo) olham o
   * eixo, nunca um painel apenas assentado.
   *
   * ESCRITO NUM EFEITO, nunca durante o render (a regra `react-hooks/
   * refs` cobra isso, e com razão: um ref é encanamento de efeito, não
   * de render). SEM lista de dependências — roda a CADA commit, antes
   * dos efeitos de baixo (a mesma ordem de declaração, useLayoutEffect
   * atrás de useLayoutEffect) — para nunca ficar um commit atrasado.
   */
  const celularRef = useRef(celular);
  useLayoutEffect(() => {
    celularRef.current = celular;
  });

  /**
   * `useLayoutEffect` e não `useEffect`: o `inert` tem de estar no nó
   * ANTES do primeiro paint em que ele já é a gaveta que sai. Um efeito
   * comum roda depois do paint, e nesse quadro ela ainda receberia
   * toque — e, pior, a saída (WAAPI, `ir` abaixo) só começaria um
   * quadro atrasado, com o painel parado no lugar.
   */
  useLayoutEffect(() => {
    if (!saindo) return;
    const no = document.querySelector<HTMLElement>(`[${'data-dialogo'}="${saindo}"]`);
    no?.setAttribute('inert', '');
    if (no) {
      const raiz = no.closest('.hud-root') ?? no;
      const { duracao, curva } = lerTokens(raiz, '--t-folha', '--curva-folha');
      const paraFora = celularRef.current ? foraDaTelaCelular(no) : foraDaTelaMesa(no);
      ir(
        no,
        'atual',
        paraFora,
        { duracao: semMovimento() ? 0 : duracao, curva, segurar: true },
        () => setSaindo(null)
      );
      // O INLINE DO ARRASTO NÃO FICA PRA TRÁS: `ir` já leu o "atual" (a
      // linha de cima, síncrona) antes desta limpeza, então ela não
      // apaga nada que a animação precisasse — só o resto de um
      // `folha.style.transform` que o gesto tivesse escrito à mão.
      no.style.transform = '';
    }
    return () => {
      /**
       * REABRIR ANTES DE A FOLHA TERMINAR DE SAIR. O `inert` foi posto
       * à mão, e o que é posto à mão tem de ser tirado à mão: o React
       * não sabe dele, e na reabertura `montada` continua sendo a
       * MESMA gaveta — o mesmo nó volta com o atributo grudado, sem
       * toque, sem foco, fora da árvore de quem ouve a tela.
       *
       * A ANIMAÇÃO EM SI NÃO É CANCELADA AQUI, e é essa omissão que faz
       * a reabertura reverter SEM PULAR (aceite do C1: "reabrir aos
       * 80 ms de saída deixa só a última intenção ativa"): o efeito de
       * entrada, logo abaixo, chama `ir(no, 'atual', ...)` quando
       * `tipoDeAbertura` é `'reabre'`, e é o PRÓPRIO `ir` quem lê o
       * transform em curso antes de cancelar esta animação — cancelar
       * cedo demais, aqui, apagaria a posição que a reabertura precisa
       * herdar.
       *
       * Uma limpeza cobre as DUAS saídas deste estado: a que `ir`
       * termina (o nó já foi, `isConnected` é falso, nada a fazer) e a
       * que a reabertura cancela.
       */
      if (no?.isConnected) no.removeAttribute('inert');
    };
  }, [saindo]);

  /**
   * A ENTRADA VEM DEPOIS DA SAÍDA, e não por acaso: a REABERTURA, logo
   * abaixo, depende de a animação da saída AINDA existir quando `ir` a
   * lê — é por isso que o cleanup da saída, acima, não cancela nada.
   *
   * TRÊS CHEGADAS, UMA SÓ CHAMADA (C1, E3 do reaudito): `tipoDeAbertura`
   * diz qual das três é esta.
   * - `'abre'` — a primeira, de fora da tela para o repouso;
   * - `'reabre'` — o MESMO nó, ainda saindo: parte de onde a saída
   *   estava, não de fora da tela — sem isso reabrir no meio do
   *   caminho fazia o painel PULAR antes de voltar;
   * - `'troca'` — outra ferramenta no MESMO lugar: a moldura não anda
   *   NADA (o pedido de entrada lateral nunca pediu fechar/reabrir a
   *   cada troca — E3, medido: cada troca recomeçava o percurso
   *   inteiro), só o CONTEÚDO novo pisca de opacidade.
   */
  useLayoutEffect(() => {
    if (!gaveta) return;
    const no = document.querySelector<HTMLElement>(`[${'data-dialogo'}="${gaveta}"]`);
    if (!no) return;
    const raiz = no.closest('.hud-root') ?? no;
    if (tipoDeAbertura === 'troca') {
      const { duracao, curva } = lerTokens(raiz, '--t-rapido', '--curva');
      desvanecer(no.children, semMovimento() ? 0 : duracao, curva);
      return;
    }
    const de =
      tipoDeAbertura === 'reabre'
        ? 'atual'
        : celularRef.current
          ? foraDaTelaCelular(no)
          : foraDaTelaMesa(no);
    const { duracao, curva } = lerTokens(raiz, '--t-folha', '--curva-folha');
    ir(no, de, REPOUSO, { duracao: semMovimento() ? 0 : duracao, curva, segurar: false });
  }, [gaveta, tipoDeAbertura]);

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
    /** VOLTAR AO REPOUSO sem fechar — o "de" é o PRÓPRIO `dy` acumulado,
     *  não `'atual'`: quem escreveu o transform foi este arrasto, à
     *  mão, então o número já está na mão, sem precisar perguntar ao
     *  navegador. Limpa o inline ANTES de chamar `ir`: as duas linhas
     *  são síncronas (não há paint entre elas), e é essa limpeza que
     *  evita a folha "grudar" na posição arrastada quando a animação
     *  termina e devolve o `transform` ao CSS (`fill: 'none'`). */
    const voltar = () => {
      const raiz = folha.closest('.hud-root') ?? folha;
      const { duracao, curva } = lerTokens(raiz, '--t-folha', '--curva-folha');
      const de = `translateY(${Math.max(0, dy)}px)`;
      folha.style.transform = '';
      ir(folha, de, REPOUSO, { duracao: semMovimento() ? 0 : duracao, curva, segurar: false });
    };
    const comecar = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      // um segundo dedo é PINÇA, e a pinça não fecha nada — a mesma
      // resposta que `director/gestos.ts` dá ao segundo dedo
      if (!dedo || e.touches.length > 1) {
        arrasto.esquecer();
        // A PINÇA ABORTA um arrasto que já tinha começado e DEVOLVE a
        // folha ao lugar — nunca fecha (a mesma regra do `touchcancel`,
        // `abortar` abaixo). Sem isto a folha ficava presa a meio
        // caminho, sem `soltar` nenhum para limpá-la (o segundo dedo
        // nunca gera `touchend` do PRIMEIRO).
        if (arrastando) {
          arrastando = false;
          voltar();
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
        // A ENTRADA (`ir`, mais acima neste arquivo) pode ainda estar
        // correndo — parar SEM voltar ao repouso primeiro, senão o
        // `cancel()` desfaria a posição visual antes de este bloco
        // escrever a sua: uma animação WAAPI ativa vence estilo em
        // linha, o mesmo motivo que a versão em CSS tinha para desligar
        // `animation` antes de escrever `transform` aqui.
        cancelar(folha);
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
      if (!arrastoFecha(dx, dy)) {
        voltar();
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
        // altura já existe, 09-celular.css), então o transform volta ao
        // REPOUSO, não para fora da tela.
        voltar();
        return;
      }
      // FECHA DE VERDADE: quem desliza a folha para fora agora é o
      // efeito de saída (`saindo`, mais acima) — ele chama `ir` a
      // partir do transform ATUAL, que é exatamente este `translateY`
      // que o arrasto acabou de escrever. Nada a animar por aqui, só a
      // intenção.
      setGaveta((atual) => aoFechar(atual, gaveta));
    };
    // `touchcancel` NUNCA FECHA, só RETORNA — a mesma regra do segundo
    // dedo, acima, e pela mesma razão: o sistema pode cancelar um toque
    // por trás (notificação, gesto do SO), e um gesto interrompido não
    // é "solte e confirme".
    const abortar = (e: TouchEvent) => {
      const dedo = e.changedTouches[0];
      if (dedo) arrasto.cancelar(comoPonteiro(dedo));
      if (!arrastando) return;
      arrastando = false;
      voltar();
    };
    // PASSIVO, e de graça: `comecar` não chama `preventDefault` em
    // caminho nenhum — declarar isso deixa o navegador começar a rolagem
    // sem esperar o ouvinte responder.
    folha.addEventListener('touchstart', comecar, { passive: true });
    window.addEventListener('touchmove', mover);
    window.addEventListener('touchend', soltar);
    window.addEventListener('touchcancel', abortar);
    return () => {
      folha.removeEventListener('touchstart', comecar);
      window.removeEventListener('touchmove', mover);
      window.removeEventListener('touchend', soltar);
      window.removeEventListener('touchcancel', abortar);
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
   * A MESMA PORTA, avisando `fecharImovelAlvo` (acima) antes: o ajuste
   * que decide `saindo` lê o aviso na MESMA transição e pula a saída
   * desenhada. Hoje só "Rever convite" chama — o tour não espera o
   * painel recuar debaixo da régua.
   */
  const fecharGavetaImovel = useCallback((qual: Gaveta) => {
    setFecharImovelAlvo(qual);
    setGaveta((atual) => aoFechar(atual, qual));
  }, []);

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
    montada: gaveta ?? saindo,
    alternarGaveta,
    fecharGaveta,
    fecharGavetaImovel,
    fecharTodas,
    fichaExpandida,
    alternarFichaExpandida,
    definirFichaExpandida,
  };
}
