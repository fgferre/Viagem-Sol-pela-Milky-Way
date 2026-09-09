// ============================================================
// O "?" DE AJUDA — átomo extraído do redesenho do painel de Ajustes
// (05/09) para servir também a gaveta de Camadas (06/09, pedido do
// dono: "aplica o mesmo padrão no painel de Camadas"). Um botão, uma
// dica que aparece no hover/foco ou fixa no clique — e agora só há UM
// lugar que sabe desenhar isso, não dois.
//
// O ESTADO (qual dica está presa) continua morando em quem chama —
// `useDicaPresa` — porque fixar uma tem de apagar a de cima, e isso só
// se resolve com um dono só por painel.
//
// A DICA FLUTUA (primeira leva do relatório de UI (09/09), pedido do
// dono: "flutuar por cima, nunca
// empurrar o layout") — antes ela media espaço na LINHA (um bloco que
// abria embaixo do rótulo, `flex-wrap`); agora é `createPortal` direto
// em `document.body`, `position: fixed`, sempre por cima de tudo. Fica
// SEMPRE MONTADA, com o atributo `hidden` quando fechada — não some do
// DOM — porque o `aria-controls` do botão tem de continuar apontando
// para um id que existe (regra do axe); quem esconde e mostra é o
// `hidden`, nunca `display` (ver o comentário de `.hud-dica`,
// 08-ajustes.css).
//
// ABERTA = hover (só mouse — toque não deixa hover preso) OU foco OU
// presa. Um clique alterna `presa` e SEMPRE solta o `foco` local: sem
// isso, o segundo clique/Enter de quem chegou pelo teclado não fechava
// de verdade — o foco continuava no botão e reabria a caixa sozinha. O
// Esc (via `aoTeclarEsc`, em quem chama) solta a dica pelo `presa`; o
// ajuste de estado logo no corpo do componente, amarrado a `presa`,
// solta hover/foco junto sempre que `presa` cai — por Esc, por outro
// "?" tomar o lugar, ou pelo clique fora que o painel já trata — para a
// caixa sumir de vez mesmo com o mouse ainda em cima do botão (só
// reaparece ao sair e voltar).
//
// A POSIÇÃO é `posicionarDica` (`hooks/useDicaPresa.ts`), a conta pura
// por trás disto; aqui só mora a leitura do DOM (o retângulo do botão,
// do painel mais próximo e da janela) que ela precisa.
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { posicionarDica } from '../hooks/useDicaPresa';
import { t } from '../lib/idioma';
import { escalaDaUi } from '../lib/uiScale';

export function Ajuda({
  id,
  rotulo,
  texto,
  presa,
  onAlternar,
}: {
  /** sufixo do `aria-controls`/`id` da dica — único dentro do painel */
  id: string;
  /** o que o botão anuncia no `aria-label` ("ajuda sobre {rotulo}") */
  rotulo: string;
  texto: ReactNode;
  presa: boolean;
  onAlternar: () => void;
}) {
  const botaoRef = useRef<HTMLButtonElement>(null);
  const dicaRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [foco, setFoco] = useState(false);
  // `presa` CAINDO solta hover/foco JUNTO (Esc, outro "?" tomando o
  // pino, ou o clique fora que o painel já trata) — senão a caixa
  // reapareceria sozinha por hover velho. É o ajuste de estado a partir
  // de uma PROP que o próprio React recomenda fazer DURANTE A
  // renderização, não num `useEffect` (evita o "cascading render" de um
  // `setState` dentro de efeito, e o `eslint-plugin-react-hooks` cobra
  // isso): compara com a `presa` do passe anterior e, se ela caiu,
  // zera as duas no mesmo passe — nunca um quadro com a caixa aberta à
  // toa.
  const [presaAnterior, setPresaAnterior] = useState(presa);
  if (presa !== presaAnterior) {
    setPresaAnterior(presa);
    if (!presa) {
      setHover(false);
      setFoco(false);
    }
  }
  const aberta = hover || foco || presa;

  // Ao PRENDER, a dica que tenha nascido fora da vista (painel rolado)
  // se traz para dentro — mira no BOTÃO, não mais na caixa (que agora
  // paira fixa na janela, e nunca está fora da vista do jeito que uma
  // caixa dentro do painel podia estar).
  useEffect(() => {
    if (presa) botaoRef.current?.scrollIntoView({ block: 'nearest' });
  }, [presa]);

  // A POSIÇÃO — layout effect: corre ANTES da pintura, senão a caixa
  // pisca um quadro no canto errado (`top`/`left` de nascença são 0/0).
  useLayoutEffect(() => {
    if (!aberta) return;
    const botao = botaoRef.current;
    const caixa = dicaRef.current;
    if (!botao || !caixa) return;
    const posicionar = () => {
      const ancora = botao.getBoundingClientRect();
      const painel = botao.closest('.hud-dialogo');
      const limite = painel
        ? painel.getBoundingClientRect()
        : {
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            width: window.innerWidth,
            height: window.innerHeight,
          };
      const janela = { largura: window.innerWidth, altura: window.innerHeight };
      const pxPorRem = 16 * escalaDaUi();
      // 1ª passada: só a LARGURA (não depende da altura) — aplicada
      // ANTES de medir, senão a caixa "larga demais" mediria uma altura
      // que a quebra de linha de verdade, na largura final, nunca tem.
      caixa.style.width =
        `${posicionarDica({ ancora, limite, caixa: { largura: 0, altura: 0 }, janela, pxPorRem }).largura}px`;
      // 2ª passada: agora a altura medida é a de verdade.
      const { top, left, largura } = posicionarDica({
        ancora,
        limite,
        caixa: { largura: caixa.offsetWidth, altura: caixa.offsetHeight },
        janela,
        pxPorRem,
      });
      caixa.style.top = `${top}px`;
      caixa.style.left = `${left}px`;
      caixa.style.width = `${largura}px`;
    };
    posicionar();
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => {
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
    };
  }, [aberta]);

  return (
    <span className="hud-ajuda-caixa">
      <button
        ref={botaoRef}
        type="button"
        className="hud-ajuda"
        aria-label={t('ajustes.ajuda', { rotulo })}
        aria-expanded={aberta}
        aria-controls={`hud-dica-${id}`}
        onPointerEnter={(evento) => {
          if (evento.pointerType === 'mouse') setHover(true);
        }}
        onPointerLeave={(evento) => {
          if (evento.pointerType === 'mouse') setHover(false);
        }}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        onClick={(evento) => {
          // o clique NÃO pode borbulhar até o "clique fora fecha" do
          // painel (e, na gaveta, evita o efeito colateral de um botão
          // dentro do `<label>` também alternar a caixa de seleção)
          evento.stopPropagation();
          onAlternar();
          // sem isto, um segundo clique/Enter vindo do teclado não
          // fechava de verdade: o foco continuava no botão e reabria a
          // caixa sozinha por `aberta = hover || foco || presa`
          setFoco(false);
        }}
      >
        ?
      </button>
      {createPortal(
        <div
          ref={dicaRef}
          id={`hud-dica-${id}`}
          role="tooltip"
          hidden={!aberta}
          className={'hud-dica' + (presa ? ' presa' : '')}
        >
          {texto}
        </div>,
        document.body
      )}
    </span>
  );
}
