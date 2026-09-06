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
// colateral bom: o Tab tem só três destinos aqui dentro (a caixa, o "?"
// e o fechar), então o foco preso não vira uma volta de oito passos por
// uma lista que muda a cada tecla.
//
// FILHA DIRETA de `.hud-root` (montada no App): a regra do `.bare-mode`
// que apaga o HUD no `?shot=2` só alcança filhos diretos, e uma paleta
// portalizada para o `body` entraria nas 18 vistas oficiais.
//
// NADA AQUI PISCA: o que muda de estado muda de borda e de rótulo.
// ============================================================
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { buscar, nomeDaEntrada } from '../lib/buscaEstrelas';
import { classeEmTexto } from '../three/atlasConfig';
import type { EntradaDaBusca, IndiceEstrelas } from '../lib/buscaEstrelas';
import { gatilhoDoDialogo, useDialogFocus } from '../lib/dialogFocus';
import { UA_POR_PC, notaDeDistancia } from '../lib/unidades';
import { numeroDoIdioma } from '../three/tempoDoAtlas';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { useDicaPresa } from '../hooks/useDicaPresa';
import { Ajuda } from './Ajuda';

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
 * A NOTA à direita, e ela troca de RÉGUA com o alvo: anos-luz para as
 * estrelas, UA para os corpos do sistema — e QUILÔMETROS para uma lua
 * medida do pai (F2b: "Lua · 384 mil km", nunca "0,0026 UA"). É a regra
 * de unidades da casa — perto de casa se fala em UA, longe em anos-luz,
 * e o parsec é régua interna e não aparece.
 *
 * A ESCADA INTEIRA é a mesma função (`lib/unidades`), e por isso a
 * estrela entra convertida em UA em vez de ter uma conta própria: até
 * 2026-08-14 a paleta tinha o degrau dos anos-luz escrito à mão, e o
 * rótulo desenhado sobre a cena tinha OUTRO — "8,6 anos-luz" aqui e
 * "8.6 AL" a um palmo dali, na mesma tela.
 */
function notaDaEntrada(entrada: EntradaDaBusca): string {
  if (entrada.tipo === 'estrela') {
    const distancia = notaDeDistancia(entrada.estrela.d * UA_POR_PC, numeroDoIdioma);
    return distancia ? `${distancia} · ${entrada.estrela.s}` : entrada.estrela.s;
  }
  // UM LUGAR mostra só a distância (item 129/F5): o centro galáctico não
  // tem tipo espectral nem órbita, e a nota não inventa uma palavra de
  // classe para preencher a linha — a mesma lei da lua sem efeméride
  if (entrada.tipo === 'lugar') {
    return notaDeDistancia(entrada.lugar.d * UA_POR_PC, numeroDoIdioma) ?? '';
  }
  // A CLASSE SAIU DAQUI (redesenho, pedido do dono: "aplica o mesmo
  // padrão no painel de Busca") — ela virou o selo `.atlas-busca-tipo`
  // (ver `tipoDaEntrada`), e repeti-la na nota seria a mesma coisa duas
  // vezes na mesma linha. O Sol e uma lua sem efeméride ficam sem nota
  // (nome honesto, número só medido), não com a classe sozinha.
  return notaDeDistancia(entrada.corpo.rUA, numeroDoIdioma) ?? '';
}

/**
 * O SELO DE TIPO (`.atlas-busca-tipo`) — planeta, lua, estrela, anão…
 * Vem de dado que já existe: a `classe` do corpo (a mesma que a nota
 * mostrava antes) ou, para uma estrela nomeada, a própria classe
 * "estrela" (`classe.estrela`, a mesma chave que o Sol usa). UM LUGAR
 * não tem `classe` na `LugarBuscavel` — inventar uma aqui seria a
 * mesma mentira que a nota já recusa (comentário acima), e por isso o
 * selo simplesmente não aparece nessa linha.
 */
function tipoDaEntrada(entrada: EntradaDaBusca): string | null {
  if (entrada.tipo === 'estrela') return classeEmTexto('estrela');
  if (entrada.tipo === 'corpo') return classeEmTexto(entrada.corpo.classe);
  return null;
}

/**
 * O ESTADO VAZIO É HONESTO, e este comentário é o porquê. Diante de uma
 * consulta que não casa há dois caminhos, e um deles é mentira: chutar
 * o que o visitante "quis dizer" (e enquadrar uma estrela que ele não
 * pediu) ou dizer o que não achou e MOSTRAR o que funciona. Os exemplos
 * abaixo são portas de entrada que existem de fato, e todas são
 * testadas em `buscaEstrelas.test.ts`.
 *
 * O ALCANCE CRESCEU no item 129/F5 e a copy do vazio continua valendo:
 * o catálogo segue guardando UM nome por estrela, mas agora a busca
 * fala também apelido, designação de Bayer completa, constelação e
 * lugar — nas duas línguas. "alfa cen", que este comentário citava
 * como o caso do vazio, hoje acha Rigil Kentaurus.
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
  /** o que a escolha de uma ESTRELA faz nesta fase — o aviso não pode
   *  prometer outra coisa; um corpo do sistema sempre enquadra, e de
   *  fora do Atlas a escolha o abre nele (item 129) */
  verbo: 'enquadrar' | 'visitar';
  onEscolher: (entrada: EntradaDaBusca) => void;
}) {
  // MONTADA É ABERTA: quem decide a presença é o App (precedente do
  // Convite), e fechar DESMONTA. Não é detalhe de estilo — é o que faz a
  // consulta anterior morrer sozinha, sem um efeito que a limpe e sem a
  // cascata de renders que ele custaria.
  const dialogo = useDialogFocus('busca', true, onFechar);
  const idioma = useIdioma();
  // A DICA FIXA (redesenho, mesmo padrão de Ajustes e da gaveta de
  // Camadas) — só a peça "?" do cabeçalho usa, mas o estado é o mesmo
  // hook pelo mesmo motivo: fixar-e-desfixar por Esc antes de fechar.
  const { presa: dicaPresa, alternar: alternarDica, limpar: limparDica } = useDicaPresa();
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
    onEscolher(alvo.entrada);
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
  // verdadeira sozinha. `Intl` aqui é seguro, ao contrário do que o
  // formatador da casa evita: esta linha só existe no navegador, onde o
  // ICU é completo — a ressalva do `numeroPtBr` é sobre o Node dos testes.
  const quantas = indice.nomeadas.length.toLocaleString(
    idioma === 'en' ? 'en-US' : 'pt-BR'
  );
  // OS CORPOS DO SISTEMA entram no índice no Atlas e no voo livre (item
  // 129), e a copy pergunta ao ÍNDICE em vez de perguntar à fase: quem
  // conta o alcance é quem o tem na mão.
  const corpos = indice.entradas.length - indice.nomeadas.length;
  // O VERBO É DA LINHA ESCOLHIDA, não só da fase: no voo livre uma
  // estrela "voa até lá" e um corpo "abre o Atlas nele".
  const escolhida = resultados[escolhido]?.entrada;
  const oQueOEnterFaz = t(
    verbo === 'enquadrar' ? 'busca.verboEnquadra'
    : escolhida?.tipo === 'corpo' ? 'busca.verboAtlas'
    : 'busca.verboVoa'
  );
  const alcance = corpos > 0
    ? t('busca.alcanceComCorpos', { quantas, corpos })
    : t('busca.alcance', { quantas });
  // O EXEMPLO DE CORPO É O ÚNICO TERMO TRADUZIDO da lista: "terra" vira
  // "earth", e a busca casa os dois (item 129/F5, tabelas bilíngues).
  // Os outros quatro são NOMES e designações de catálogo — sirius, hd
  // 48915 —, e nome próprio não muda de língua.
  const exemplos = (corpos > 0 ? [t('busca.exemploCorpo'), ...EXEMPLOS] : EXEMPLOS)
    .join(' · ');
  const aviso = vazio
    ? t('busca.vazio', { alcance, exemplos: EXEMPLOS.join(' · ') })
    : resultados.length > 0
      ? t('busca.contagem', {
          n: resultados.length,
          palavra: t(resultados.length === 1 ? 'busca.resultado' : 'busca.resultados'),
          verbo: oQueOEnterFaz,
        })
      : t('busca.dica', { exemplos });

  return (
    <div
      className="hud-cartao hud-dialogo atlas-busca"
      aria-label={t('busca.aria')}
      {...dialogo}
      onClick={() => {
        // MESMA REGRA do painel de Ajustes e da gaveta de Camadas: clicar
        // em qualquer lugar do diálogo desfixa a dica presa — o "?" que a
        // fixou já parou o próprio clique (`stopPropagation`).
        if (dicaPresa) limparDica();
      }}
      onKeyDownCapture={(evento) => {
        // ESC COM DICA PRESA desfixa e não fecha — o mesmo Esc de sempre
        // (fechar a paleta) só chega depois, na bolha, se não houver dica
        // presa. Sem isto o `busca-smoke`/`julgarDialogo` perderiam o Esc
        // que fecha de fato quando a dica nunca foi aberta.
        if (evento.key === 'Escape' && dicaPresa) {
          evento.stopPropagation();
          limparDica();
        }
      }}
    >
      {/* A CAIXA VEM PRIMEIRO NO DOM, de propósito — mesmo o cabeçalho
          aparecendo ACIMA dela na tela (`.atlas-busca-topo` tem
          `order: -1`, só visual). `useDialogFocus` foca o PRIMEIRO
          focável do DOM ao abrir, e aqui isso não é detalhe: é o campo
          que precisa nascer com o foco para a digitação valer no
          instante em que a paleta abre — mover a caixa para depois do
          "?" e do "✕" no markup roubaria esse foco para o botão de
          ajuda, e "/" pararia de cair no campo. */}
      <div className="atlas-busca-campo-linha">
        <span className="atlas-busca-lupa" aria-hidden="true">⌕</span>
        <input
          type="text"
          className="atlas-busca-campo"
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setAtivo(0);
          }}
          onKeyDown={aoTeclar}
          placeholder={t(
            corpos > 0 ? 'busca.campoCorposEEstrelas' : 'busca.campoEstrelas'
          )}
          aria-label={t('busca.campoAria')}
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
      </div>

      <div className="atlas-busca-topo">
        <span>{t('busca.titulo')}</span>
        <Ajuda
          id="busca"
          rotulo={t('busca.titulo')}
          texto={t('busca.ajuda', { exemplos })}
          presa={dicaPresa === 'busca'}
          onAlternar={() => alternarDica('busca')}
        />
        <button
          type="button"
          className="atlas-busca-fechar hud-fechar"
          onClick={onFechar}
          aria-label={t('busca.fechar')}
        >
          ✕
        </button>
      </div>

      <ul
        ref={listaRef}
        className="atlas-busca-lista"
        id="atlas-busca-lista"
        role="listbox"
        aria-label={t('busca.lista')}
      >
        {resultados.map((r, i) => {
          const tipo = tipoDaEntrada(r.entrada);
          return (
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
              <span className="atlas-busca-nome-linha">
                <span className="atlas-busca-nome">{nomeDaEntrada(r.entrada)}</span>
                {tipo && <span className="atlas-busca-tipo">{tipo}</span>}
              </span>
              <span className="atlas-busca-nota">{notaDaEntrada(r.entrada)}</span>
            </li>
          );
        })}
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
  useIdioma();
  return (
    <button
      className="hud-btn small"
      onClick={onAlternar}
      aria-label={t('busca.botaoAria')}
      // o atalho declarado onde o leitor de tela o anuncia; o texto do
      // botão NÃO cresce — a barra tem orçamento de quebra por largura
      // (LARGURA_DA_QUEBRA_PX) medido com este comprimento
      aria-keyshortcuts="/ Control+K"
      title={t('busca.botaoDica')}
      {...gatilhoDoDialogo('busca', aberta)}
    >
      {t('busca.botao')}
    </button>
  );
}
