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
 * QUANTO DURA A SAÍDA DA FOLHA — o mesmo 260 ms da entrada (o
 * `@keyframes folhaSobe`, fatia 9), porque é o mesmo movimento ao
 * contrário. Mora aqui e não no CSS porque quem segura o nó desmontando
 * é JavaScript: uma folha que fechou já não tem elemento para animar.
 *
 * PRIVADA: quem a lê é o `useLayoutEffect` daqui de baixo e mais ninguém.
 * Ela nasceu exportada por hábito, e um `export` sem consumidor é
 * superfície pública que envelhece calada.
 */
const SAIDA_DA_FOLHA_MS = 260;

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
    setSaindo(celular && anterior !== null && gaveta === null ? anterior : null);
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
    document
      .querySelector(`[${'data-dialogo'}="${saindo}"]`)
      ?.setAttribute('inert', '');
    const id = window.setTimeout(() => setSaindo(null), SAIDA_DA_FOLHA_MS);
    return () => window.clearTimeout(id);
  }, [saindo]);

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

  return {
    gaveta,
    montada: gaveta ?? saindo,
    alternarGaveta,
    fecharGaveta,
    fecharTodas,
  };
}
