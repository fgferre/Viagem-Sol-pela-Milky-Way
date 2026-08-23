// ============================================================
// Os atalhos de TECLADO da janela — o filme e a escada do Atlas.
// Morava no App.tsx (onda da arquitetura, corte 6); a semântica é a
// mesma, linha a linha.
// ============================================================
import { useEffect } from 'react';
import type { Director } from '../three/director';
import { HUD_POR_FASE } from '../three/fases';

export function useAtalhos(
  directorRef: React.RefObject<Director | null>,
  setPaused: (v: boolean) => void,
  abrirBusca: () => void
) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const d = directorRef.current;
      if (!d) return;
      // O ATALHO DA BUSCA (item 8): `/` — e Ctrl/Cmd+K, o costume das
      // paletas — nas fases que HOSPEDAM a busca (quem decide é o mapa
      // das fases, não uma lista daqui). As guardas: quem está DIGITANDO
      // não atalha (alvo de texto), e a PRÓPRIA paleta fica com o teclado
      // dela — "/" dentro dela é digitação. Botão focado NÃO bloqueia:
      // "/" sobre um botão não escreve nada.
      //
      // A GUARDA ERA "QUALQUER DIÁLOGO ABERTO" ATÉ 22/08, e o item 74 a
      // estreitou para a paleta. O motivo é medido: a ficha do objeto abre
      // sozinha a cada seleção, então com a guarda antiga o "/" morria em
      // quase todo instante do Atlas — um atalho que só funciona quando
      // nada está selecionado não é um atalho. As gavetas são exclusivas
      // entre si, e trocar a que está aberta pela busca é justamente o que
      // o gesto pede.
      const pedeBusca =
        (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) ||
        ((event.ctrlKey || event.metaKey) &&
          !event.altKey &&
          event.key.toLowerCase() === 'k');
      if (
        pedeBusca &&
        HUD_POR_FASE[d.fase].busca &&
        !event.defaultPrevented &&
        !document.querySelector('[data-dialogo="busca"]') &&
        !(event.target as HTMLElement | null)?.closest(
          'input, select, textarea, [contenteditable]'
        )
      ) {
        event.preventDefault();
        abrirBusca();
        return;
      }
      // Os três atalhos do FILME não têm sujeito dentro do Atlas — e
      // Espaço com `preventDefault` roubaria a tecla de quem estiver
      // navegando o modo (D3: "Espaço não vaza"). O que o Atlas TEM é o
      // Esc da ESCADA (F2b/D7): sobe um degrau. A interação com os
      // diálogos, por escrito: DIÁLOGO ABERTO COME O Esc PRIMEIRO — o
      // `dialogFocus` o trata no contêiner com `preventDefault` (e o
      // contêiner dispara antes desta janela, na fase de bubbling), e a
      // guarda dupla (`defaultPrevented` + presença de `[data-dialogo]`
      // no DOM) cobre o caso do foco fora do diálogo. Só o Esc que
      // NINGUÉM reivindicou sobe a escada.
      if (d.fase === 'atlas') {
        if (
          event.code === 'Escape' &&
          !event.defaultPrevented &&
          !document.querySelector('[data-dialogo]')
        ) {
          if (d.subirDegrau()) event.preventDefault();
        }
        return;
      }
      // Espaço e ←/→ são atalhos da JANELA, com preventDefault. Sem esta
      // guarda eles roubam as teclas de quem está num controle: no painel
      // de Ajustes, o slider de exposição não andava com as setas e as
      // caixas não marcavam com Espaço — as teclas iam para o filme.
      if (
        (event.target as HTMLElement | null)?.closest(
          'input, select, textarea, button, [contenteditable]'
        )
      ) {
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        setPaused(d.togglePause());
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        d.skipChapter(1);
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        d.skipChapter(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // directorRef é ref (estável); setPaused é setState (estável);
    // abrirBusca só fecha sobre setStates — a captura do 1º render vale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
