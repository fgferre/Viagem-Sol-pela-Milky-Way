// ============================================================
// AS QUATRO GAVETAS DO HUD — uma aberta por vez, um mecanismo só.
//
// Ajustes, Camadas, Busca e a Ficha do objeto ancoram-se na mesma régua
// (`.hud-dialogo`, fatia 1 do HUD) e as quatro se declaram `aria-modal`:
// duas abertas ao mesmo tempo seriam sobreposição e uma mentira para quem
// ouve a tela. A exclusividade é o TIPO — não há estado que represente duas
// abertas —, e as cinco portas que mexem nele moram aqui. Morava no
// `App.tsx` (§11 do AGENTS); a semântica é a mesma, linha a linha.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EstadoDaEscada } from '../three/director';

export type Gaveta = 'camadas' | 'busca' | 'ajustes' | 'ficha';

export interface Gavetas {
  /** qual está aberta AGORA, ou `null` */
  gaveta: Gaveta | null;
  /** o gatilho de uma gaveta: abre a dela e fecha a que estiver aberta */
  alternarGaveta: (qual: Gaveta) => void;
  /** o "✕" de uma gaveta: fecha se for ELA que está aberta */
  fecharGaveta: (qual: Gaveta) => void;
  /** a travessia de modo fecha a busca e as camadas (ver abaixo) */
  fecharNaTravessia: () => void;
}

export function useGavetas(
  escada: EstadoDaEscada,
  foco: string | null
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
   * (`fecharNaTravessia`) continua fechando só os que a fase hospeda.
   */
  const [gaveta, setGaveta] = useState<Gaveta | null>(() =>
    new URLSearchParams(window.location.search).has('ajustes') ? 'ajustes' : null
  );

  /**
   * HÁ SELEÇÃO ⇒ HÁ FICHA (item 74). Escolher um corpo — na paleta, no
   * rótulo, pelo `?foco=` — abre a ficha dele; trocar de corpo troca o
   * conteúdo sem fechar; soltar a seleção (Esc até o sistema) fecha.
   *
   * FECHAR A FICHA NÃO DESFAZ A SELEÇÃO: fechar é leitura, não navegação.
   * Por isso o efeito olha o corpoId ANTERIOR e não o estado da gaveta —
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
      setGaveta((atual) =>
        atual === 'ajustes' ? atual : alvo ? 'ficha' : atual === 'ficha' ? null : atual
      );
    }
  }, [escada.corpoId, escada.degrau, foco]);

  // Abrir é ESCOLHER: não há como duas ficarem abertas por um `set`
  // esquecido, porque o estado é um só.
  const alternarGaveta = (qual: Gaveta) =>
    setGaveta((atual) => (atual === qual ? null : qual));

  /**
   * FECHAR É "FECHE-ME", e não "feche o que estiver aberto". A diferença
   * apareceu no primeiro dia do enum: a paleta de busca fecha NO TIQUE
   * SEGUINTE ao Enter (`confirmar`, em `PaletaDeBusca` — sem o adiamento a
   * ação padrão do Enter caía no botão recém-focado e a paleta se reabria
   * sozinha), e nesse meio-tempo a escolha já abriu a FICHA do alvo. Um
   * `setGaveta(null)` cru fecharia a ficha que acabou de nascer.
   */
  const fecharGaveta = (qual: Gaveta) =>
    setGaveta((atual) => (atual === qual ? null : atual));

  /**
   * A TRAVESSIA FECHA AS DUAS QUE TINHAM O DEFEITO, e só elas: a busca e as
   * camadas renasciam sozinhas ao voltar (a presença delas é `gaveta && hud.*`
   * — o `hud.*` some com a fase, o estado de aberto não sumia), e
   * `useDialogFocus` punha o foco no primeiro focável, que na paleta é a
   * caixa de texto: o visitante entrava no voo livre e o WASD virava texto.
   *
   * O ⚙ AJUSTES NÃO ENTRA, e é decisão escrita: ele é o painel da casa
   * (qualidade, tom, exposição, tamanho do texto), e o `?ajustes=1` o abre
   * DE PROPÓSITO sobre a tela de título, onde nenhuma fase o hospeda —
   * fechá-lo por fase mataria a porta. A FICHA também não: ela obedece à
   * SELEÇÃO, não à fase; se ainda há um corpo em foco quando o modo volta, a
   * ficha dele é a resposta certa, e se não há ela nem monta.
   */
  // `useCallback` com lista vazia porque quem a consome é um EFEITO da fase,
  // no App: identidade nova a cada render faria o efeito de travessia rodar
  // em todo render em vez de na troca de modo.
  const fecharNaTravessia = useCallback(
    () => setGaveta((atual) => (atual === 'busca' || atual === 'camadas' ? null : atual)),
    []
  );

  return { gaveta, alternarGaveta, fecharGaveta, fecharNaTravessia };
}
