// ============================================================
// A PALETA DE BUSCA (Onda 5, F3) — a caixa por onde se acha uma das
// 1.726 nomeadas e se vai até ela.
//
// A CONTA MORA NA LIB (`lib/buscaEstrelas.ts`), que é pura e testada
// contra o dado vivo; aqui só existem as três coisas que a lib não pode
// ter: o estado da digitação, o teclado da lista e a copy.
//
// DIÁLOGO, e por isso nasce no `dialogFocus` (D7): foco preso, devolução
// ao gatilho e Esc vêm do módulo único, e o juiz `a11y.mjs` a julga sem
// uma linha a mais — foi a razão de o contrato de DOM ser genérico.
//
// A LISTA NÃO RECEBE O FOCO, de propósito. É o padrão combobox:
// o cursor fica na caixa de texto (senão cada tecla digitada exigiria
// devolver o foco à caixa) e a opção corrente é apontada por
// `aria-activedescendant`. As setas escolhem, o Enter confirma. O efeito
// colateral bom: o Tab tem só dois destinos aqui dentro (a caixa e o
// fechar), então o foco preso não vira uma volta de oito passos por uma
// lista que muda a cada tecla.
//
// FILHA DIRETA de `.hud-root` (montada no App): a regra do `.bare-mode`
// que apaga o HUD no `?shot=2` só alcança filhos diretos, e uma paleta
// portalizada para o `body` entraria nas 18 vistas oficiais.
//
// NADA AQUI PISCA: o que muda de estado muda de borda e de rótulo.
// ============================================================
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { buscar } from '../lib/buscaEstrelas';
import type { IndiceEstrelas } from '../lib/buscaEstrelas';
import { gatilhoDoDialogo, useDialogFocus } from '../lib/dialogFocus';
import type { NamedStar } from '../three/config';
import { numeroPtBr } from '../three/tempoDoAtlas';

/**
 * QUANTOS RESULTADOS, por dispositivo. No teclado são 8 (o mesmo
 * default da lib): a lista cabe sob a caixa sem alcançar o selo e a
 * varredura com os olhos é de uma passada. No toque são 5, e não é
 * enfeite — o teclado virtual come metade da tela, cada linha tem de
 * ser alvo de dedo (mais alta), e uma lista que exige rolagem dentro de
 * um diálogo é onde o gesto de rolar a página começa a brigar com o de
 * rolar a lista.
 */
export const LIMITE_TECLADO = 8;
export const LIMITE_TOQUE = 5;

/**
 * ANOS-LUZ, que é a régua desta casa para o que está longe — o parsec é
 * régua interna e não aparece na tela. A vírgula decimal vem do
 * formatador da casa (`numeroPtBr`), não de um `toFixed` local: é o que
 * impede um "8,6" e um "8.6" na mesma tela.
 *
 * Acima de 100 al a décima é ruído (a incerteza da paralaxe já é maior
 * que ela); acima de 10 mil, a conta passa a milhares.
 */
function distanciaEmAnosLuz(parsecs: number): string {
  const al = parsecs * 3.262;
  const unidade = al < 2 ? 'ano-luz' : 'anos-luz';
  if (al < 100) return `${numeroPtBr(al)} ${unidade}`;
  if (al < 10_000) return `${numeroPtBr(Math.round(al))} ${unidade}`;
  return `${numeroPtBr(al / 1000)} mil ${unidade}`;
}

/**
 * O ESTADO VAZIO É HONESTO, e este comentário é o porquê. A busca corre
 * sobre os nomes que o catálogo REALMENTE guarda — um por estrela, o
 * próprio da IAU quando existe. Consequência medida: "alfa cen" não
 * acha nada, porque a designação de Bayer da α Centauri não está no
 * dado (o nome próprio a expulsou); quem procura por ela digita "rigil".
 *
 * Diante disso há dois caminhos, e um deles é mentira: chutar o que o
 * visitante "quis dizer" (e enquadrar uma estrela que ele não pediu) ou
 * dizer o que não achou e MOSTRAR o que funciona. Os exemplos abaixo
 * são as quatro portas de entrada que existem de fato — nome próprio,
 * designação grega no jeito que se digita, catálogo numérico e Gliese —
 * e todos são testados em `buscaEstrelas.test.ts`.
 */
const EXEMPLOS = ['sirius', 'rigil', 'gama vel', 'hd 48915'];

export function PaletaDeBusca({
  onFechar,
  indice,
  verbo,
  onEscolher,
}: {
  onFechar: () => void;
  indice: IndiceEstrelas;
  /** o que a escolha FAZ nesta fase — o botão não pode prometer outra coisa */
  verbo: 'enquadrar' | 'visitar';
  onEscolher: (estrela: NamedStar) => void;
}) {
  // MONTADA É ABERTA: quem decide a presença é o App (precedente do
  // Convite), e fechar DESMONTA. Não é detalhe de estilo — é o que faz a
  // consulta anterior morrer sozinha, sem um efeito que a limpe e sem a
  // cascata de renders que ele custaria.
  const dialogo = useDialogFocus('busca', true, onFechar);
  const [consulta, setConsulta] = useState('');
  const [ativo, setAtivo] = useState(0);
  // a digitação é urgente, a lista é que pode esperar: o `useDeferredValue`
  // deixa o cursor andar no ritmo do teclado mesmo quando a varredura das
  // ~5 mil chaves de texto cai numa tecla mais cara
  const consultaLenta = useDeferredValue(consulta);
  const [limite] = useState(() =>
    window.matchMedia?.('(pointer: coarse)').matches ? LIMITE_TOQUE : LIMITE_TECLADO
  );
  const listaRef = useRef<HTMLUListElement>(null);

  const resultados = useMemo(
    () => buscar(consultaLenta, indice, limite),
    [consultaLenta, indice, limite]
  );
  // a lista encolhe entre um render e outro (a consulta cresceu): sem
  // isto o `aria-activedescendant` apontaria para uma opção que saiu
  const escolhido = Math.min(ativo, Math.max(resultados.length - 1, 0));

  // a opção escolhida pelas setas entra em vista sozinha; sem isto, uma
  // lista com rolagem escolheria em silêncio o que ninguém está vendo
  useEffect(() => {
    listaRef.current?.children[escolhido]?.scrollIntoView({ block: 'nearest' });
  }, [escolhido]);

  const confirmar = (i: number) => {
    const alvo = resultados[i];
    if (!alvo) return;
    onEscolher(alvo.estrela);
    // FECHA NO PRÓXIMO TIQUE, e o motivo é o Enter. Fechar aqui desmonta
    // a paleta e devolve o foco ao botão que a abriu — tudo isso AINDA
    // DENTRO do evento da tecla; e aí a ação padrão do Enter cai no
    // botão recém-focado e a paleta se REABRE sozinha, no instante exato
    // em que o visitante escolheu (medido pelo juiz de a11y: o foco
    // acabava dentro da caixa de texto de novo, em vez de voltar ao
    // gatilho). O `preventDefault` da tecla não alcança isso: quem
    // recebe a ação padrão é o elemento que está com o foco quando ela é
    // aplicada, e a essa altura já é outro.
    // Um tique é o bastante — e serve os dois caminhos, mouse e teclado,
    // porque dois caminhos de fechamento seriam dois comportamentos.
    setTimeout(onFechar);
  };

  // Esc e Tab NÃO aparecem aqui: são do módulo de diálogo, que escuta no
  // contêiner. Interceptá-los na caixa seria um segundo dono da mesma tecla.
  const aoTeclar = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (resultados.length === 0) return;
      const passo = event.key === 'ArrowDown' ? 1 : -1;
      // dá a volta: numa lista de 8 é mais curto subir do primeiro para o
      // último do que descer sete vezes
      setAtivo((atual) => {
        const base = Math.min(atual, resultados.length - 1);
        return (base + passo + resultados.length) % resultados.length;
      });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      confirmar(escolhido);
    }
  };

  const vazio = consultaLenta.trim().length > 0 && resultados.length === 0;
  // o alcance vem CONTADO do índice, não digitado na copy: o dia em que o
  // catálogo ganhar uma estrela, a frase que diz quantas são continua
  // verdadeira sozinha
  const quantas = indice.nomeadas.length.toLocaleString('pt-BR');
  const aviso = vazio
    ? `nada com esse nome entre as ${quantas} nomeadas — o catálogo guarda UM nome por `
      + `estrela, o próprio quando existe. tente ${EXEMPLOS.join(' · ')}`
    : resultados.length > 0
      ? `${resultados.length} ${resultados.length === 1 ? 'estrela' : 'estrelas'} · `
        + `setas escolhem · Enter ${verbo === 'enquadrar' ? 'enquadra' : 'voa até lá'}`
      : `nome, designação (gama vel) ou catálogo (hd 48915) · ${EXEMPLOS.join(' · ')}`;

  return (
    <div className="atlas-busca" aria-label="Buscar estrela" {...dialogo}>
      <div className="atlas-busca-topo">
        <input
          type="text"
          className="atlas-busca-campo"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAtivo(0);
          }}
          onKeyDown={aoTeclar}
          placeholder="buscar uma estrela"
          aria-label="Nome, designação ou catálogo da estrela"
          role="combobox"
          aria-expanded={resultados.length > 0}
          aria-controls="atlas-busca-lista"
          aria-autocomplete="list"
          aria-activedescendant={
            resultados.length > 0 ? `atlas-busca-op-${escolhido}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="atlas-busca-fechar"
          onClick={onFechar}
          aria-label="Fechar a busca"
        >
          ✕
        </button>
      </div>

      <ul
        ref={listaRef}
        className="atlas-busca-lista"
        id="atlas-busca-lista"
        role="listbox"
        aria-label="Estrelas encontradas"
      >
        {resultados.map((r, i) => (
          <li
            key={r.indice}
            id={`atlas-busca-op-${i}`}
            role="option"
            aria-selected={i === escolhido}
            className={`atlas-busca-item${i === escolhido ? ' ativo' : ''}`}
            // o ponteiro só MOVE a escolha; quem confirma é o clique.
            // Assim o mouse passando por cima nunca enquadra sozinho.
            onMouseMove={() => setAtivo(i)}
            onClick={() => confirmar(i)}
          >
            <span className="atlas-busca-nome">{r.estrela.n}</span>
            <span className="atlas-busca-nota">
              {distanciaEmAnosLuz(r.estrela.d)} · {r.estrela.s}
            </span>
          </li>
        ))}
      </ul>

      {/* SEMPRE montada, como o aviso da máquina do tempo: região viva
          que nasce junto com a mensagem costuma não ser anunciada. */}
      <p className="atlas-busca-aviso" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  );
}

/** O botão que abre a paleta, na barra de controles (como o da gaveta). */
export function BotaoDaBusca({
  aberta,
  onAlternar,
}: {
  aberta: boolean;
  onAlternar: () => void;
}) {
  return (
    <button
      className="hud-btn small"
      onClick={onAlternar}
      aria-label="Buscar estrela"
      {...gatilhoDoDialogo('busca', aberta)}
    >
      ⌕ Buscar
    </button>
  );
}
