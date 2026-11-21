// ============================================================
// O HUD DO MODO ATLAS — as peças que só existem na fase 'atlas'.
//
// Moram fora do `Hud.tsx` porque aquele é o HUD do FILME (título,
// legenda, barra de capítulos) e a fronteira entre os dois é decisão da
// onda, não arrumação: o ProgressBar de lá, por exemplo, é o slider de
// capítulos do filme e NÃO atravessa para cá (D6) — dentro do Atlas ele
// daria scrub do filme.
//
// Todas as peças daqui são montadas como filhas DIRETAS de `.hud-root`
// no App. Não é detalhe de estilo: o `?shot=2` esconde o HUD com
// `.bare-mode > *:not(.scene-canvas)`, que só alcança filhos diretos —
// uma peça portalizada para o `body` (ou aninhada numa outra) apareceria
// nas 18 vistas oficiais e o filme perderia pixel.
// ============================================================
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { EstadoDaBussola } from '../three/cinematic/atlasRig';
import { useDialogFocus, gatilhoDoDialogo } from '../lib/dialogFocus';
import { CAMADAS_POR_FAMILIA, familiaEmTexto } from '../three/atlasConfig';
import type { Camada, FamiliaDeCamada } from '../three/atlasConfig';
import { idiomaAtual, t } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { useDicaPresa } from '../hooks/useDicaPresa';
import { usePresenca } from '../hooks/usePresenca';
import { useRealce } from '../hooks/useRealce';
import { Ajuda } from './Ajuda';
import { CabecalhoDoPainel } from './CabecalhoDoPainel';
import { Icone } from './Icone';
import { estadoDoSelo, legendaDaProcedencia } from '../three/selo';
import type { EstadoDaPoeira, EstadoDaVista } from '../three/selo';
import type { EstadoDoTempo } from '../three/tempoDoAtlas';
import {
  DEGRAUS_DE_TEMPO,
  formatarEtapa,
  instanteCivil,
  numeroDoIdioma,
  regimeDoMostrador,
  taxaDoDegrau,
} from '../three/tempoDoAtlas';

/**
 * A GAVETA DE CAMADAS — a ÚNICA porta das camadas desde 22/08 (item 61).
 *
 * A QUEIXA DO DONO, palavra por palavra: *"atlas - camadas e ajustes
 * concorrem. vc nao acha que varios elementos que hj estao em ajustes na
 * verdade deveriam ser camadas?"*. E o fato que ela media, em 22/08: as
 * 17 camadas de então eram 17 dos 32 controles do painel de Ajustes E
 * seis linhas desta gaveta — duas superfícies desenhando da MESMA
 * tabela, uma com 17 e outra com 6. Agora a tabela tem UM leitor: esta
 * gaveta mostra TODAS (19 desde o item 82), e a seção "Camadas" saiu do
 * painel. O número não se digita aqui — quem o conta é a tabela.
 *
 * EM TRÊS FAMÍLIAS, COM CONTAGEM, e não numa fileira só: uma fila de
 * caixas é um inventário, três grupos com "quantas estão
 * ligadas" são um mapa. O agrupamento é campo da tabela (`familia`),
 * derivado em `CAMADAS_POR_FAMILIA` — nunca uma segunda lista aqui.
 *
 * A CONTAGEM É O RESUMO DO GRUPO, e é o que se lê sem abrir nada: "3 de
 * 4" diz que alguma coisa do sistema solar está desligada sem obrigar a
 * varrer as caixas. Para quem ouve a tela ela vai no `aria-label` do
 * cabeçalho que abre o grupo; na tela é o par de números ao lado do título.
 *
 * ELA EXISTE NOS DOIS MODOS — e, por consequência, em toda fase que tem
 * barra de controles: filme, voo livre e Atlas. É a MESMA peça nas três
 * (o botão "⧉ Camadas" é o mesmo), o estado é o mesmo (o dono é o App) e
 * a URL espelha as mesmas `?no…`. Um segundo painel de camadas do lado
 * do filme seria exatamente a concorrência que esta obra desfaz.
 *
 * É um diálogo de verdade — nasce no `dialogFocus` como todo diálogo da
 * casa (D7), e por isso o juiz de a11y a julga sem uma linha a mais.
 */

/**
 * A ORDEM DE EXIBIÇÃO da família "Galáxia" nesta gaveta — cotidiano
 * antes de técnico (brilho, névoa, poeira antes de cartografia, forjas,
 * CO, lâminas, extinção, campo envolvente), o mestre sempre primeiro.
 * `CAMADAS_POR_FAMILIA` continua sendo a ÚNICA fonte — Director e selo
 * derivam dela — esta lista só reordena o que a GAVETA mostra, nunca o
 * conteúdo. Uma camada da família que não estiver aqui aparece logo
 * depois do mestre, nunca some.
 */
const CAMADA_GALAXIA_MESTRE = 'nogal';
const ORDEM_GALAXIA_DEPOIS_DO_MESTRE: readonly string[] = [
  'noglow',
  'nonebula',
  'nodust',
  'nocart',
  'noforge',
  'noco',
  'nodisc',
  'nogdust',
  'nowrap',
];

function camadasParaExibir(camadas: readonly Camada[]): readonly Camada[] {
  // A família é reconhecida pela sua camada-mestre, não pelo nome que
  // aparece na tela: o juiz `idioma.semSobra` proíbe literal acentuado
  // fora das tabelas de idioma, e o nome da família É um desses literais.
  if (!camadas.some((c) => c.flag === CAMADA_GALAXIA_MESTRE)) return camadas;
  const posicao = (flag: string) => {
    if (flag === CAMADA_GALAXIA_MESTRE) return 0;
    const i = ORDEM_GALAXIA_DEPOIS_DO_MESTRE.indexOf(flag);
    return i === -1 ? 1 : i + 2;
  };
  return [...camadas].sort((a, b) => posicao(a.flag) - posicao(b.flag));
}

export function GavetaDeCamadas({
  aberta,
  ativa,
  onFechar,
  escondidas,
  onCamada,
  celular = false,
}: {
  aberta: boolean;
  /** o FECHAMENTO LÓGICO (`gaveta === 'camadas'`), para o foco — distinto
   *  de `aberta` (presença): na saída, `aberta` ainda vale durante a
   *  animação, mas `ativa` já virou `false` no mesmo commit da intenção
   *  (E2, PLANO-MOTION-UI.md §12.5 C1.2) */
  ativa: boolean;
  onFechar: () => void;
  escondidas: ReadonlySet<string>;
  onCamada: (flag: string, ligar: boolean) => void;
  /** alça de arrasto no cabeçalho (`CabecalhoDoPainel`) — só na folha do
   *  celular (Lote 2a, piloto do cabeçalho único, PLAN-UI.md §3.2) */
  celular?: boolean;
}) {
  const dialogo = useDialogFocus('camadas', ativa, onFechar);
  const [familiaAberta, abrirFamilia] = useState<FamiliaDeCamada | null>('Estrelas');
  useIdioma();
  // A DICA PRESA (06/09) — o mesmo padrão do painel de Ajustes, com o
  // mesmo hook: fixar uma "?" apaga a de cima, clique fora do diálogo
  // desfixa, e Esc desfixa ANTES de fechar a gaveta (mesma doutrina do
  // `onKeyDownCapture` de `Ajustes.tsx` — a captura corre antes do Esc
  // de fechar que `useDialogFocus` já prendeu na bolha).
  const { presa: dicaPresa, alternar: alternarDica, limpar: limparDica, aoTeclarEsc } = useDicaPresa();
  if (!aberta) return null;
  return (
    <div
      className="hud-cartao hud-dialogo atlas-gaveta atlas-camadas"
      aria-label={t('atlas.camadasAria')}
      {...dialogo}
      onClick={() => {
        if (dicaPresa) limparDica();
      }}
      onKeyDownCapture={aoTeclarEsc}
    >
      <CabecalhoDoPainel
        titulo={t('atlas.camadas')}
        onFechar={onFechar}
        rotuloFechar={t('atlas.fecharCamadas')}
        celular={celular}
      />
      {CAMADAS_POR_FAMILIA.map(({ familia, camadas, previa }, i) => {
        const ligadas = camadas.filter((c) => !escondidas.has(c.flag)).length;
        const expandida = familiaAberta === familia;
        const id = `atlas-camadas-familia-${i}`;
        const nome = familiaEmTexto(familia);
        return (
          <div
            key={familia}
            className="atlas-gaveta-familia"
            role="group"
            aria-label={nome}
          >
            <h3 className="atlas-gaveta-titulo">
              <button
                type="button"
                className="atlas-camadas-grupo"
                aria-expanded={expandida}
                aria-controls={id}
                aria-label={t('atlas.familiaConta', { familia: nome, ligadas, total: camadas.length })}
                onClick={() => abrirFamilia(expandida ? null : familia)}
              >
                <img className="atlas-camadas-previa" src={`${import.meta.env.BASE_URL}previas/${previa}.webp`} alt="" />
                <span className="atlas-camadas-resumo">
                  <span>{nome}</span>
                  <span className="atlas-camadas-estado" aria-hidden="true">
                    <span className="atlas-gaveta-conta">{ligadas}/{camadas.length}</span> {t('atlas.camadasAtivas')}
                  </span>
                </span>
                <Icone nome={expandida ? 'chevronBaixo' : 'chevronDireita'} tamanho={15} />
              </button>
            </h3>
            <div id={id} hidden={!expandida}>
              {camadasParaExibir(camadas).map((c) => {
                const ligada = !escondidas.has(c.flag);
                return (
                  <label key={c.flag} className="atlas-gaveta-linha">
                    <span className="atlas-gaveta-rotulo-caixa">
                      <span className="atlas-gaveta-nome">{c.nome}</span>
                      <Ajuda
                        id={c.flag}
                        rotulo={c.nome}
                        texto={c.nota}
                        presa={dicaPresa === c.flag}
                        onAlternar={() => alternarDica(c.flag)}
                      />
                    </span>
                    <input
                      type="checkbox"
                      className="hud-interruptor"
                      checked={ligada}
                      onChange={() => onCamada(c.flag, !ligada)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * O SELO DE HONESTIDADE (D1), DOBRADO EM UMA LINHA — item 61, 22/08.
 *
 * A QUEIXA DO DONO, palavra por palavra: *"o selo de honestidade é
 * complexo e nao funciona direito, no proejto atlas ele era muito mais
 * simples e menos invasivo, porque virou isso aqui?"*. E o fato que ela
 * media: o selo daqui NÃO FECHAVA. Quatro blocos sempre abertos (a tese,
 * a linha ESCALA, a linha BRILHO com a lista de desvios colada por "·" e
 * o rodapé de procedência) ocupavam 3,2% da tela de mesa e 10,1% de um
 * celular — permanentes, sobre a cena, sem ninguém ter pedido.
 *
 * O QUE MUDOU É A APRESENTAÇÃO, E SÓ ELA. A LEI do selo não se toca: as
 * frases, o `REGISTRO` de caminhos e os dois eixos são os mesmos, e
 * `selo.ts` continua sendo o único lugar que decide o que o selo DIZ.
 * Aqui só se decide o que a tela mostra de uma vez.
 *
 * FECHADO é UMA LINHA, no molde do doador: ● ESCALA REAL · BRILHO
 * ASSISTIDO ▸. A bolinha é a cor do PIOR EIXO (âmbar se qualquer um
 * desvia, verde só quando os dois estão em real) — o resumo agregado que
 * deixa o visitante saber, sem ler, se há algo a saber.
 *
 * ABERTO é o conteúdo de sempre, organizado: a tese, a linha ESCALA, a
 * linha BRILHO com os desvios ativos, OS CULPADOS (quem está inflado e
 * quanto — o campo que `estadoDoSelo` devolve desde 4e8bedb e que a tela
 * nunca mostrou: era promessa cobrada só pelo teste) e o rodapé de
 * procedência. Cada linha continua sendo o PRÓPRIO controle: clicar em
 * ESCALA enquadra o sistema e clicar em BRILHO desfaz o que é desfazível
 * — e desde 25/08 a linha BRILHO é uma PORTA DE DUAS VIAS: quando não
 * sobra mais nada DESFAZÍVEL a desfazer, o mesmo clique devolve a luz
 * assistida (decisão 3 do dono, item 91; o desvio indesfazível fica fora
 * da conta — item 103). As metades são complementares, sempre há ação,
 * e por isso a linha nunca é desabilitada.
 *
 * A GAVETA É `position: absolute` (fatia 4 do HUD): ela cresce PARA CIMA
 * sem mover a caixa fechada. Não é estilo — é o que mantém a área do HUD
 * permanente igual aberta e fechada, e o retângulo útil do enquadramento
 * (`retanguloDoAtlas.ts`) desconta área permanente, não painel que o
 * visitante abriu por um instante. Um selo que empurrasse ao abrir moveria
 * a câmera no clique.
 *
 * O ESTADO ABERTO/FECHADO NÃO VAI PARA A URL NEM PARA O STORAGE: é
 * chrome, não domínio. Link copiado com o selo aberto reproduziria uma
 * decisão de leitura de outra pessoa, e a URL desta casa é espelho da
 * VISTA.
 */
export function Selo({
  vista,
  cartografiaMedida,
  cartografiaDesligada,
  poeira,
  onEscalaReal,
  onBrilhoReal,
}: {
  vista: EstadoDaVista;
  /**
   * Os mapas da galáxia chegaram? A legenda da procedência mentia
   * enquanto isto era constante: com o manifesto bloqueado a cena vira
   * procedural em silêncio e o rodapé seguia dizendo "medido".
   */
  cartografiaMedida: boolean;
  /** …e quando não chegaram, foi porque o visitante pediu (`?cart=off`)? */
  cartografiaDesligada: boolean;
  /**
   * A procedência real da poeira medida do Gaia perto de casa (E2/E3/E4)
   * — publicada pelo Director (`Director.estadoDaPoeira`). Sem valor, a
   * legenda fica a de antes da E2.
   */
  poeira?: EstadoDaPoeira;
  onEscalaReal: () => void;
  onBrilhoReal: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  // A ENTRADA/SAÍDA DA GAVETA (PLAN-MOTION-UI.md §5) — `usePresenca`
  // direto, sem `Sanfona`: o movimento daqui é deslocamento + escala, não
  // a grade `0fr→1fr` que a Sanfona desenha para as OUTRAS duas.
  const {
    montada: detalheMontado,
    abrindo: detalheAbrindo,
    saindo: detalheSaindo,
    ref: detalheRef,
  } = usePresenca<HTMLDivElement>(aberto);
  useIdioma();
  const { escala, brilho, desvios, culpados, exposicao } = estadoDoSelo(vista);
  const lista = desvios.map((d) => d.rotulo).join(' · ');
  const daParaVoltar = desvios.some((d) => d.volta !== 'nenhuma');
  /**
   * A SEGUNDA VIA da linha BRILHO: com a luz já em `real` e nada mais a
   * desfazer, o clique devolve a assistência em vez de não fazer nada.
   * Arma pelo QUE RESTA A DESFAZER — a mesma guarda do oráculo puro
   * `aoClicarEmBrilho`. É o que transforma o selo de porta de mão única
   * em interruptor; `useEspelhoDaUrl.voltarAoBrilhoReal` executa os dois
   * sentidos.
   *
   * ELA ARMAVA PELO VEREDITO até o item 103 (`desvios.length === 0`), e
   * era o que trancava a porta: um desvio de `volta: 'nenhuma'` — o tier
   * abaixo de cinema, a dose do arranque — nunca sai da lista, então o
   * veredito nunca esvaziava. Depois do primeiro clique não havia mais
   * nada a desfazer NEM segunda via, e a linha se DESABILITAVA com a luz
   * presa em `real`. Como as duas metades são complementares, a linha
   * nunca fica sem ação: ou sobra o que desfazer, ou se devolve a
   * assistência — e por isso ela não é mais desabilitada.
   */
  const podeReassistir = !daParaVoltar;
  const escalaReal = escala === 'real';
  const brilhoReal = brilho === 'real';
  /**
   * O QUE A LINHA BRILHO CONTA, numa string só — a Q14 do dono (item 91).
   *
   * A DECLARAÇÃO DA CHAPA NÃO PODE DEPENDER DO VEREDITO, e este era o
   * furo da primeira versão desta linha: em `?luz=real` com o tier abaixo
   * de cinema o eixo lê ASSISTIDO (a amostragem é desvio indesfazível),
   * e um texto que só declarasse a exposição no ramo `brilhoReal` calaria
   * os +3 passos exatamente onde o item 103 já mostrou que o app vive —
   * o estado difícil. A chapa é FATO da vista: se ela está aberta, diz-se,
   * tenha ou não outra coisa a declarar junto.
   *
   * A ORDEM é a da leitura: primeiro a chapa (o que mudou na foto),
   * depois o que restou ajustado.
   *
   * A FRASE DE RESERVA É GUARDA DE TIPO, não um ramo vivo, e fica dito
   * para ninguém procurá-la na tela: BRILHO REAL exige lista de desvios
   * VAZIA, o que implica `luz === 'real'` (a `assistida` é sempre desvio)
   * e `exposicaoManual === false` (a mão é sempre desvio) — e nesse
   * estado `declaracaoDaExposicao` nunca devolve `null`. Desde a Q14, o
   * selo que diz BRILHO REAL SEMPRE tem uma chapa a declarar.
   */
  const oQueSeVe =
    [exposicao, brilhoReal ? null : lista].filter(Boolean).join(' · ')
    || t('atlas.semAjuste');
  /** o PIOR EIXO decide a bolinha do resumo: um desvio já tinge os dois */
  const algumDesvia = !escalaReal || !brilhoReal;

  /**
   * O REALCE DO RESUMO FECHADO (reaudito C3e) — acende só quando o
   * VISITANTE muda o que o resumo mostra, nunca quando o tier cai
   * sozinho (auto-quality, D1) ou a dose do arranque do filme muda
   * (fora do filme ela é sempre 1, mas o Atlas não confia nisso à toa):
   * as duas são `volta: 'nenhuma'` no registro — "não é gesto do
   * visitante" já é a lei escrita em `selo.ts`, aqui só se lê.
   *
   * A CHAVE ignora esses desvios "sem gesto" só para decidir SE acende —
   * o texto exibido (`brilhoReal`, acima) continua o veredito completo,
   * porque o conteúdo tem de seguir vivo mesmo com o realce quieto.
   * ESCALA entra direto: não tem `volta` (não é um desvio da lista), sai
   * da distância da câmera, sempre fruto de navegação ou de um alvo
   * escolhido — nunca do relógio ou da medição de desempenho.
   */
  const desviosDeGesto = desvios.filter((d) => d.volta !== 'nenhuma');
  const brilhoAcionavelPeloVisitante = desviosDeGesto.length === 0;
  const vezesQueMudouPeloVisitante = useRealce(`${escalaReal}-${brilhoAcionavelPeloVisitante}`);

  /**
   * AS DUAS SAÍDAS que não são o clique na própria linha: Esc e clique
   * fora. Ambas em CAPTURA, e a razão é a ordem de quem reivindica o Esc
   * dentro do Atlas (`useAtalhos.ts`): DIÁLOGO ABERTO COME O Esc
   * PRIMEIRO — por isso a guarda `[data-dialogo]`, a mesma do atalho —,
   * depois este selo, e só o Esc que ninguém reivindicou sobe a escada.
   * Sem a captura, o `subirDegrau()` da janela levaria a câmera junto com
   * o fechamento, que são duas coisas num gesto só.
   *
   * O clique fora NÃO cancela o evento: quem clica na cena está girando a
   * câmera, e fechar o selo não pode custar o arrasto.
   */
  useEffect(() => {
    if (!aberto) return;
    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-dialogo]')) return;
      e.preventDefault();
      setAberto(false);
    };
    const onFora = (e: Event) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener('keydown', onTecla, true);
    window.addEventListener('pointerdown', onFora, true);
    return () => {
      window.removeEventListener('keydown', onTecla, true);
      window.removeEventListener('pointerdown', onFora, true);
    };
  }, [aberto]);

  return (
    <div
      className="atlas-selo"
      ref={caixa}
      role="group"
      aria-label={t('atlas.seloAria')}
    >
      {detalheMontado && (
        <div
          id="atlas-selo-detalhe"
          ref={detalheRef}
          className={
            'atlas-selo-detalhe hud-cartao' +
            (detalheAbrindo ? ' abrindo' : '') +
            (detalheSaindo ? ' saindo' : '')
          }
          // A SAÍDA JÁ NÃO RECEBE TOQUE, FOCO NEM LEITOR DE TELA — o
          // mesmo contrato do `[inert]` das gavetas (`useGavetas.ts`).
          inert={detalheSaindo}
        >
          <p className="atlas-selo-tese">{t('selo.tese')}</p>

          <button
            type="button"
            className={`atlas-selo-linha ${escalaReal ? 'real' : 'desvio'}`}
            onClick={onEscalaReal}
            disabled={escalaReal}
            aria-label={
              escalaReal
                ? t('atlas.escalaRealAria', { estado: t('selo.escalaReal') })
                : t('atlas.foraDeEscalaAria', { estado: t('selo.foraDeEscala') })
            }
          >
            <span className="atlas-selo-eixo">{t('atlas.eixoEscala')}</span>
            <strong>{t(escalaReal ? 'selo.escalaReal' : 'selo.foraDeEscala')}</strong>
            <em>{t(escalaReal ? 'atlas.escalaRealNota' : 'atlas.escalaDesvioNota')}</em>
          </button>

          {/* OS CULPADOS, e eles só saem quando há acusação: `estadoDoSelo`
              devolve a lista vazia com a escala em real. Um selo que
              acusasse numa vista honesta seria o erro simétrico ao de calar
              numa vista mentirosa. Ficam SOB a linha ESCALA porque é dela
              que a acusação sai (a dívida de tamanho do cadastro). */}
          {culpados.length > 0 && (
            <ul className="atlas-selo-culpados">
              {culpados.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          {/* A PORTA DE DUAS VIAS (decisão 3 do dono, 25/08). Esta linha
              tinha só IDA: em BRILHO REAL ficava desabilitada, e a única
              volta era editar `?luz=` na URL e recarregar. Agora o mesmo
              clique faz a próxima coisa sensata — desfaz enquanto houver o
              que desfazer, e devolve a luz assistida quando não houver.
              Por isso a linha deixou de ser desabilitada em `real`: ali
              existe ação, e desabilitar passou a ser a mentira. E desde o
              item 103 ela NÃO ADORMECE MAIS: o "estado sem saída" que a
              desabilitava era o próprio defeito — com o tier abaixo de
              cinema, o primeiro clique deixava a luz em `real` e a linha
              morta, sem volta nenhuma. As duas metades são
              complementares, então sempre há ação. */}
          <button
            type="button"
            className={`atlas-selo-linha ${brilhoReal ? 'real' : 'desvio'}`}
            onClick={onBrilhoReal}
            aria-label={
              brilhoReal
                ? t('atlas.brilhoRealAria', {
                    estado: t('selo.brilhoReal'),
                    exposicao: exposicao ?? t('atlas.brilhoSemAjuste'),
                  })
                : t('atlas.brilhoDesvioAria', {
                    estado: t('selo.brilhoAssistido'),
                    exposicao: exposicao ? ` ${exposicao}` : '',
                    lista,
                    volta: t(daParaVoltar ? 'atlas.voltarAoReal' : 'atlas.voltarAAssistida'),
                  })
            }
          >
            <span className="atlas-selo-eixo">{t('atlas.eixoBrilho')}</span>
            <strong>{t(brilhoReal ? 'selo.brilhoReal' : 'selo.brilhoAssistido')}</strong>
            {/* A COPY DA VOLTA NOMEIA O QUE RESTOU, e é ela que responde
                ao medo que armava a guarda antiga: oferecer a assistência
                numa linha que ainda diz ASSISTIDO só engana se o texto
                calar o motivo. Com o tier abaixo de cinema ele lê
                "amostragem abaixo de cinema — clique: voltar à luz
                assistida": o que sobrou, dito, e o que o clique faz.

                E EM BRILHO REAL ELA DECLARA A CHAPA (Q14 do dono, item
                91): com `?luz=real` o quadro abre +3 passos de exposição,
                e um selo que dissesse "sem ajuste" ali estaria calando o
                que a tela mais mostra. Quem decide a frase é `selo.ts`
                (`declaracaoDaExposicao`), como decide todo o resto — aqui
                só se escolhe onde ela aparece: dentro do `oQueSeVe`, que é
                o mesmo texto nos dois ramos do clique. */}
            <em>
              {podeReassistir
                ? t('atlas.cliqueAssistida', { oQueSeVe })
                : t('atlas.cliqueReal', { oQueSeVe })}
            </em>
          </button>

          <p className="atlas-selo-legenda">
            {legendaDaProcedencia(cartografiaMedida, cartografiaDesligada, poeira)}
          </p>
        </div>
      )}

      {/* A LINHA FECHADA, e ela é a última no DOM de propósito: a gaveta
          sobe por cima da cena e esta linha fica no pé da tela, onde o
          selo sempre morou (no telefone já não há tarja ali). */}
      <button
        type="button"
        className={`atlas-selo-resumo ${algumDesvia ? 'desvio' : 'real'}`}
        aria-expanded={aberto}
        aria-controls="atlas-selo-detalhe"
        title={t('selo.tese')}
        onClick={() => setAberto((v) => !v)}
      >
        <span className="atlas-selo-resumo-texto">
          <span>{t(escalaReal ? 'selo.escalaReal' : 'selo.foraDeEscala')}</span>
          <span className="atlas-selo-meio" aria-hidden="true">
            ·
          </span>
          <span>{t(brilhoReal ? 'selo.brilhoReal' : 'selo.brilhoAssistido')}</span>
        </span>
        <span className="atlas-selo-seta" aria-hidden="true">
          <Icone nome={aberto ? 'chevronBaixo' : 'chevronDireita'} tamanho={12} />
        </span>
        {vezesQueMudouPeloVisitante > 0 && (
          <span
            className="realce-anel"
            aria-hidden="true"
            key={vezesQueMudouPeloVisitante}
          />
        )}
      </button>
    </div>
  );
}

/**
 * A BÚSSOLA — o botão de ZERAR A ORIENTAÇÃO (item 102, 26/08).
 *
 * ELE É SUGESTÃO DELE, aceita na mesma frase em que pediu o giro livre:
 * *"podemos colocar um botao de zerar orientacao, assim como o google
 * maps tem um botao de norte"*. E a régua que ele deu é a lei da peça: o
 * botão de norte do Maps aparece quando o mapa está girado, some quando
 * está no norte, e endireita SEM levar o mapa a outro lugar.
 *
 * SÓ APARECE QUANDO HÁ O QUE CONSERTAR, e é isso que o distingue de um
 * controle: quem nunca torceu o horizonte nunca o vê, e o HUD não ganha
 * um botão permanente para uma situação que a maioria das sessões não
 * alcança. Quem decide é o rig, com histerese (`DESVIO_QUE_ACENDE_GRAUS`
 * / `DESVIO_QUE_APAGA_GRAUS`) — sem ela o botão piscaria em volta do
 * limiar a cada quadro do arrasto.
 *
 * FORA DO FLUXO, e não é preguiça de layout: o rodapé do Atlas é
 * ALTURA DE CÂMERA (o retângulo útil desconta o HUD, e é por isso que a
 * dica dos gestos apaga por OPACIDADE com a caixa no lugar). Uma peça
 * que entra e sai do fluxo mudaria o enquadramento no meio da sessão —
 * exatamente o pulo que a casa evita em três lugares diferentes. Presa
 * na borda ESQUERDA, na altura do meio, ela não desconta nada: não cai
 * nem na faixa de cima nem na de baixo que o juiz de a11y mede.
 *
 * ESQUERDA, E O PREÇO DE DESCOBRIR ISSO FOI OLHAR A TELA: ela nasceu na
 * direita, onde o alto é a barra de controles e o pé é o selo, e a
 * faixa do meio parecia livre. Não é — a FICHA DO OBJETO abre ali, e
 * como ela é diálogo (z 46) contra os z 40 da bússola, a bússola
 * acendia POR BAIXO dela. E no pior caso possível: quem acabou de focar
 * um corpo tem a ficha aberta, e é justamente ele quem vai querer
 * endireitar o que girou.
 *
 * FILHA DIRETA de `.hud-root`, como todo overlay da casa — é o que faz
 * o `?shot=2` apagá-la junto com o resto do HUD (a regra do
 * `.bare-mode` só alcança filhos diretos), e é o que a mantém fora das
 * 18 vistas oficiais do filme.
 *
 * O ÍCONE É A AGULHA, não a rosa inteira: a 2,2 rem uma rosa dos ventos
 * vira borrão, e o que a peça promete é «isto volta a ficar de pé». O
 * `aria-label` diz a frase inteira para quem ouve a tela, no mesmo
 * padrão dos outros controles do Atlas.
 */
export function Bussola({ estado, onEndireitar }: {
  estado: EstadoDaBussola;
  onEndireitar: () => void;
}) {
  useIdioma();
  // ACESA nos dois estados vivos (a11y, juízes e o fade leem `.acesa`);
  // ENDIREITANDO por cima só enquanto a câmera gira — é o rig quem liga
  // e desliga (`estadoDaBussola`), e por isso a luz âmbar nunca promete
  // um horizonte de pé antes da hora (U25/C3e, CSS 04).
  const acesa = estado !== 'apagada';
  return (
    <button
      type="button"
      className={`atlas-bussola${acesa ? ' acesa' : ''}${estado === 'endireitando' ? ' endireitando' : ''}`}
      onClick={onEndireitar}
      // ela existe no DOM sempre (a transição de opacidade precisa dos
      // dois estados), mas para o teclado e para o leitor de tela ela só
      // existe quando está acesa — um botão invisível na ordem de
      // tabulação é uma armadilha, e `inert` diz isso numa palavra
      inert={!acesa}
      aria-hidden={!acesa}
      tabIndex={acesa ? 0 : -1}
      aria-label={t('atlas.endireitar')}
      title={t('atlas.endireitar')}
    >
      {/* O ÍCONE (Lote 4, item 3): `<Icone nome="bussola">` no lugar do
          glifo `⌃` — mesmo comportamento, mesmo `aria-label`, só o
          desenho troca (a régua de `Icone.tsx`, §4 do plano). */}
      <Icone nome="bussola" tamanho={18} />
    </button>
  );
}

// ============================================================
// O RELÓGIO DO ATLAS (aprovado pelo dono em 20/11, a partir do protótipo
// de demonstração do Codex). Uma leitura — o ▶/⏸ dentro da
// coroa, o estado e o instante — e, aberto, o painel da velocidade: a
// régua (um `input range` de verdade), Recuar/Avançar, "Voltar ao
// presente" e "Retrato de 2026". O estado chega por prop (o `onTempo` do
// Director, guardado no App); toda a semântica dos gestos mora na máquina
// do tempo (`maquinaDoTempo.ts`), não aqui.
// ============================================================

/**
 * O QUE O RELÓGIO E A ALÇA ESCREVEM, lido do estado publicado — a mesma
 * conta para os dois, e o regime é o mesmo de `mesmoMostrador`.
 */
function leituraDoRelogio(tempo: EstadoDoTempo) {
  const { aoVivo, sentido, aviso } = tempo;
  const regime = regimeDoMostrador(tempo);
  const civil = instanteCivil(tempo.jd);
  const iso = civil.toISOString();
  // dois algarismos no "20 nov" do pt-BR; o inglês da casa escreve "Nov 5"
  const dia =
    idiomaAtual() === 'en' ? String(civil.getUTCDate()) : String(civil.getUTCDate()).padStart(2, '0');
  const mes = t(`tempo.mes.${civil.getUTCMonth()}` as ChaveDeTexto).slice(0, 3);
  const dataCurta = t('relogio.dataCurta', { dia, mes, ano: civil.getUTCFullYear() });
  const estado =
    aviso === t('tempo.semEfemeride')
      ? t('relogio.retrato')
      : aviso === t('tempo.buscando')
        ? t('relogio.carregando')
        : aviso
          ? t('relogio.limite')
          : aoVivo
            ? t('relogio.aoVivo')
            : sentido === 0
              ? t('relogio.pausado')
              : sentido < 0
                ? t('relogio.recuando')
                : t('relogio.avancando');
  const tipo = aviso ? 'aviso' : aoVivo ? 'vivo' : sentido === 0 ? 'pausa' : 'viagem';
  const instanteNaAlca =
    regime === 'data' ? t('relogio.diaCurto', { dia, mes }) : iso.slice(11, regime === 'minutos' ? 16 : 19);
  return { regime, civil, iso, dataCurta, estado, tipo, instanteNaAlca };
}

/** os gestos do relógio — cada um é um método do Director */
export interface AcoesDoRelogio {
  onTocar: () => void;
  onDegrau: (degrau: number) => void;
  onSentido: (sentido: -1 | 1) => void;
  onPresente: () => void;
  onEpoca: () => void;
}

export function Relogio({
  tempo,
  celular = false,
  acoes,
}: {
  tempo: EstadoDoTempo;
  /** dentro da folha do telefone: o painel fica sempre aberto */
  celular?: boolean;
  acoes: AcoesDoRelogio;
}) {
  useIdioma();
  const [aberto, setAberto] = useState(false);
  const detalhe = useRef<HTMLButtonElement>(null);
  const tocar = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLElement>(null);
  const idDaRegua = useId();
  const { aoVivo, sentido, degrau, aviso } = tempo;
  const { regime, civil, iso, dataCurta, estado, tipo } = leituraDoRelogio(tempo);
  const marcha = aoVivo || sentido !== 0;
  const nivel = aoVivo ? 0 : degrau;
  const veloz = regime !== 'segundos';
  const dias = regime === 'data';
  const ultimo = DEGRAUS_DE_TEMPO - 1;
  const hora = iso.slice(11, 16);
  const angulo = (civil.getUTCSeconds() * Math.PI) / 30;

  /**
   * AS DUAS SAÍDAS DO PAINEL NA MESA — Esc e clique fora —, no molde do
   * `Selo` acima: captura em `window`, diálogo aberto come o Esc primeiro
   * (a guarda `[data-dialogo]`), e o `preventDefault` é o que impede o Esc
   * da escada (`useAtalhos`) de subir um degrau junto. O foco volta ao
   * botão que abriu o painel.
   */
  useEffect(() => {
    if (!aberto || celular) return;
    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-dialogo]')) return;
      e.preventDefault();
      setAberto(false);
      detalhe.current?.focus();
    };
    const onFora = (e: Event) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    window.addEventListener('keydown', onTecla, true);
    window.addEventListener('pointerdown', onFora, true);
    return () => {
      window.removeEventListener('keydown', onTecla, true);
      window.removeEventListener('pointerdown', onFora, true);
    };
  }, [aberto, celular]);

  /** "Voltar ao presente" some quando o ao vivo liga: o foco passa antes ao ▶/⏸ */
  const agora = () => {
    tocar.current?.focus({ preventScroll: true });
    acoes.onPresente();
  };
  const rotuloPlay = t(marcha ? 'relogio.pausar' : 'relogio.retomar');
  const painelVisivel = aberto || celular;
  const voltarAoPresente = (
    <button type="button" className="relogio-agora" onClick={agora}>
      <Icone nome="retomar" tamanho={14} />
      {t('relogio.presente')}
    </button>
  );
  return (
    <section
      ref={caixa}
      className="relogio"
      data-tipo={tipo}
      data-detalhes={aberto || !aoVivo}
      aria-label={t('relogio.aria')}
    >
      <div className="relogio-leitura">
        <button
          type="button"
          className="relogio-play"
          ref={tocar}
          title={rotuloPlay}
          aria-label={rotuloPlay}
          onClick={acoes.onTocar}
        >
          <svg className="relogio-coroa" viewBox="0 0 48 48" aria-hidden="true">
            <circle className="relogio-trilho" cx="24" cy="24" r="20" />
            {Array.from({ length: 12 }, (_, i) => (
              <path
                key={i}
                d={i % 3 === 0 ? 'M24 2v4' : 'M24 3v2'}
                transform={`rotate(${i * 30} 24 24)`}
              />
            ))}
            {nivel === 0 && (
              <circle
                className="relogio-segundeiro"
                cx={24 + 20 * Math.sin(angulo)}
                cy={24 - 20 * Math.cos(angulo)}
                r="2.4"
              />
            )}
          </svg>
          <Icone nome={marcha ? 'pausa' : 'play'} tamanho={16} />
        </button>
        <div className="relogio-mostrador">
          <div className="relogio-meta">
            <strong role="status" className="relogio-estado">
              <i aria-hidden="true" />
              {estado}
            </strong>
            <span className="relogio-data">{dias ? `${hora} UTC` : dataCurta}</span>
          </div>
          <div className="relogio-hora">
            <time dateTime={iso} className={dias ? 'relogio-dia' : undefined}>
              {dias ? dataCurta : hora}
              {!veloz && <small>{iso.slice(16, 19)}</small>}
            </time>
            {!dias && <abbr title={t('relogio.utc')}>UTC</abbr>}
            {sentido !== 0 && (
              <span className="relogio-taxa-curta">
                {nivel === 0 ? '1×' : `${formatarEtapa(nivel)}/s`}
              </span>
            )}
          </div>
        </div>
        <div className="relogio-acoes">
          {!celular && (
            <button
              type="button"
              className="relogio-abrir"
              ref={detalhe}
              onClick={() => setAberto(!aberto)}
              aria-expanded={aberto}
              title={t('relogio.ajustar')}
              aria-label={t('relogio.ajustar')}
            >
              <Icone nome="chevronCima" tamanho={16} />
            </button>
          )}
        </div>
      </div>
      {aviso && (
        <p className="relogio-aviso" role="status">
          {aviso}
        </p>
      )}
      <div className="relogio-extras">
        <div
          className="relogio-dobra"
          data-aberta={painelVisivel}
          inert={!painelVisivel}
          aria-hidden={!painelVisivel}
        >
          <div className="relogio-recorte">
            <div className="relogio-painel">
              <div className="relogio-titulo">
                <label htmlFor={idDaRegua}>{t('relogio.velocidade')}</label>
                <span>{numeroDoIdioma(taxaDoDegrau(nivel))}×</span>
              </div>
              <p className="relogio-equivalencia">
                <b>{formatarEtapa(nivel, true)}</b> {t('relogio.porSegundo')}
              </p>
              <div
                className="relogio-escala"
                style={{ '--posicao': `${(100 * nivel) / ultimo}%` } as CSSProperties}
              >
                <div className="relogio-marcas" aria-hidden="true">
                  {Array.from({ length: DEGRAUS_DE_TEMPO }, (_, i) => (
                    <i key={i} data-ativa={i <= nivel} />
                  ))}
                </div>
                <div className="relogio-curso" aria-hidden="true">
                  <i />
                </div>
                <input
                  id={idDaRegua}
                  type="range"
                  min="0"
                  max={ultimo}
                  step="1"
                  value={nivel}
                  aria-valuetext={t('relogio.reguaValor', { taxa: formatarEtapa(nivel, true) })}
                  onChange={(e) => acoes.onDegrau(Number(e.target.value))}
                />
              </div>
              <div className="relogio-extremos" aria-hidden="true">
                <span>{formatarEtapa(0)}</span>
                <span>{formatarEtapa(ultimo)}</span>
              </div>
              <div className="relogio-sentido">
                <button
                  type="button"
                  aria-pressed={!aoVivo && sentido === -1}
                  onClick={() => acoes.onSentido(-1)}
                >
                  <Icone nome="setaEsquerda" tamanho={16} /> {t('relogio.recuar')}
                </button>
                <button
                  type="button"
                  aria-pressed={!aoVivo && sentido === 1}
                  onClick={() => acoes.onSentido(1)}
                >
                  {t('relogio.avancar')} <Icone nome="setaEsquerda" tamanho={16} />
                </button>
              </div>
              <div className="relogio-referencias">
                {painelVisivel && !aoVivo && voltarAoPresente}
                <button type="button" className="relogio-epoca" onClick={acoes.onEpoca}>
                  <Icone nome="relogio" tamanho={15} />
                  {t('relogio.retrato2026')}
                </button>
              </div>
            </div>
          </div>
        </div>
        {!aoVivo && !painelVisivel && voltarAoPresente}
      </div>
    </section>
  );
}

/**
 * A MÁQUINA DO TEMPO DENTRO DE UMA GAVETA (item 62, 23/08) — a resposta
 * do dono aos mockups, em duas palavras: *"3) vira alça"*.
 *
 * É o MESMO `Relogio` do rodapé da mesa, e isso é o ponto: no telefone
 * ele sai do rodapé permanente (a fatia 9 esconde o de LÁ, nomeando o
 * rodapé) e passa a ser desenhado aqui dentro, atrás da alça ⏱ Tempo,
 * com o painel da velocidade sempre aberto. Nenhum segundo estado: a
 * máquina do tempo é a mesma, e o último sentido mora nela.
 *
 * Por que uma gaveta e não o relógio flutuando: altura de rodapé é
 * DISTÂNCIA DE CÂMERA (`retanguloUtilDoAtlas`), e num aparelho estreito
 * o painel aberto custaria meia tela. Atrás da alça ele custa uma linha
 * de 44 px quando ninguém o está usando.
 *
 * SEM "?" desde o relógio de 20/11: a folha aprovada pelo dono não tem dica.
 */
export function GavetaDoTempo({
  aberta,
  ativa,
  onFechar,
  tempo,
  acoes,
  celular = false,
}: {
  aberta: boolean;
  /** o FECHAMENTO LÓGICO (`gaveta === 'tempo'`), para o foco — ver o
   *  mesmo prop em `GavetaDeCamadas` (E2, PLANO-MOTION-UI.md §12.5 C1.2) */
  ativa: boolean;
  onFechar: () => void;
  tempo: EstadoDoTempo;
  acoes: AcoesDoRelogio;
  /** alça de arrasto no cabeçalho (`CabecalhoDoPainel`) — só na folha do celular */
  celular?: boolean;
}) {
  const dialogo = useDialogFocus('tempo', ativa, onFechar);
  useIdioma();
  if (!aberta) return null;
  return (
    <div
      className="hud-cartao hud-dialogo atlas-gaveta"
      aria-label={t('atlas.maquinaDoTempo')}
      {...dialogo}
    >
      <CabecalhoDoPainel
        titulo={t('atlas.tempo')}
        onFechar={onFechar}
        rotuloFechar={t('atlas.fecharTempo')}
        celular={celular}
      />
      <Relogio tempo={tempo} acoes={acoes} celular />
    </div>
  );
}

/**
 * A alça ⏱ Tempo — só existe no telefone, e só na fase que a hospeda.
 * Desde o relógio novo (20/11) ela diz o estado e o instante, pela mesma
 * leitura do relógio (`leituraDoRelogio`).
 */
export function BotaoDoTempo({
  aberta,
  onAlternar,
  tempo,
}: {
  aberta: boolean;
  onAlternar: () => void;
  tempo: EstadoDoTempo;
}) {
  useIdioma();
  const { estado, tipo, instanteNaAlca } = leituraDoRelogio(tempo);
  return (
    <button
      type="button"
      className="hud-btn small alca-tempo"
      data-tipo={tipo}
      onClick={onAlternar}
      aria-label={t('relogio.alca', { estado })}
      title={t('relogio.alcaTitulo', { estado, instante: instanteNaAlca })}
      {...gatilhoDoDialogo('tempo', aberta)}
    >
      <Icone nome="relogio" tamanho={16} />
      <span className="alca-tempo-estado">{estado}</span>
      <span className="alca-tempo-instante">{instanteNaAlca}</span>
    </button>
  );
}

/**
 * O botão que abre a gaveta, na barra de controles — e ele está na barra
 * dos DOIS modos desde o item 61 (`HUD_POR_FASE`): mesma peça, mesma
 * gaveta, mesmo estado. Mora neste arquivo por herança do modo em que
 * nasceu; o que ele abre não é mais só do Atlas.
 */
export function BotaoDaGaveta({
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
      aria-label={t('atlas.camadasAria')}
      {...gatilhoDoDialogo('camadas', aberta)}
    >
      <Icone nome="camadas" tamanho={16} />
      <span>{t('atlas.camadasBotao')}</span>
    </button>
  );
}
