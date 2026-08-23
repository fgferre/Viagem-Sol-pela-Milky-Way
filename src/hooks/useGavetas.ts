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
import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface Gavetas {
  /** qual está aberta AGORA, ou `null` */
  gaveta: Gaveta | null;
  /** o gatilho de uma gaveta: abre a dela e fecha a que estiver aberta */
  alternarGaveta: (qual: Gaveta) => void;
  /** o "✕" de uma gaveta: fecha se for ELA que está aberta */
  fecharGaveta: (qual: Gaveta) => void;
}

export function useGavetas(
  escada: EstadoDaEscada,
  foco: string | null,
  phase: Phase
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

  const corpoAnterior = useRef<string | null>(null);
  useEffect(() => {
    const alvo = escada.corpoId ?? (escada.degrau === 'estrela' ? foco : null);
    if (alvo !== corpoAnterior.current) {
      corpoAnterior.current = alvo;
      // O `set` DENTRO do efeito é o desenho, não descuido: o que dispara é
      // a chegada de um foco NOVO publicado pelo Director (evento de fora do
      // React), e o guarda acima faz o efeito ser inerte em todo render que
      // não seja esse. A alternativa que a regra recomenda — ajustar estado
      // durante o render — trocaria o `useRef` por um segundo `useState` e
      // reescreveria a regra; o item 76 pede mover, não reescrever.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGaveta((atual) => aoFocar(atual, alvo));
    }
  }, [escada.corpoId, escada.degrau, foco]);

  /**
   * A TRAVESSIA DE MODO fecha a busca e as camadas — o efeito inteiro, e
   * não só a função que ele chama. Ele morava no `App.tsx` como "o
   * gatilho, porque é a FASE que dispara"; a fase é um parâmetro, e a
   * regra de quem fecha o quê é deste arquivo (§11 do AGENTS: um
   * arquivo, um assunto).
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGaveta(aoTravessar);
  }, [phase]);

  const alternarGaveta = useCallback(
    (qual: Gaveta) => setGaveta((atual) => aoAlternar(atual, qual)),
    []
  );

  const fecharGaveta = useCallback(
    (qual: Gaveta) => setGaveta((atual) => aoFechar(atual, qual)),
    []
  );

  return { gaveta, alternarGaveta, fecharGaveta };
}
