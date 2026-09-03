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
import { useEffect, useRef, useState } from 'react';
import { useDialogFocus, gatilhoDoDialogo } from '../lib/dialogFocus';
import { CAMADAS_POR_FAMILIA, familiaEmTexto } from '../three/atlasConfig';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { estadoDoSelo, legendaDaProcedencia } from '../three/selo';
import type { EstadoDaVista } from '../three/selo';
import type { EstadoDoTempo, SentidoDoTempo } from '../three/tempoDoAtlas';

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
 * grupo; na tela é o par de números ao lado do título.
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
export function GavetaDeCamadas({
  aberta,
  onFechar,
  escondidas,
  onCamada,
}: {
  aberta: boolean;
  onFechar: () => void;
  escondidas: ReadonlySet<string>;
  onCamada: (flag: string, ligar: boolean) => void;
}) {
  const dialogo = useDialogFocus('camadas', aberta, onFechar);
  useIdioma();
  if (!aberta) return null;
  return (
    <div
      className="hud-cartao hud-dialogo atlas-gaveta"
      aria-label={t('atlas.camadasAria')}
      {...dialogo}
    >
      <div className="atlas-gaveta-topo">
        <span>{t('atlas.camadas')}</span>
        <button type="button" onClick={onFechar} aria-label={t('atlas.fecharCamadas')}>
          ✕
        </button>
      </div>
      {CAMADAS_POR_FAMILIA.map(({ familia, camadas }) => {
        const ligadas = camadas.filter((c) => !escondidas.has(c.flag)).length;
        return (
          <div
            key={familia}
            className="atlas-gaveta-familia"
            role="group"
            aria-label={t('atlas.familiaConta', {
              familia: familiaEmTexto(familia),
              ligadas,
              total: camadas.length,
            })}
          >
            <h3 className="atlas-gaveta-titulo">
              <span>{familiaEmTexto(familia)}</span>
              {/* a contagem já foi dita no `aria-label` do grupo, e ouvi-la
                  duas vezes a cada caixa seria ruído */}
              <span className="atlas-gaveta-conta" aria-hidden="true">
                {ligadas}/{camadas.length}
              </span>
            </h3>
            {camadas.map((c) => {
              const ligada = !escondidas.has(c.flag);
              return (
                <label key={c.flag} className="atlas-gaveta-linha">
                  <input
                    type="checkbox"
                    checked={ligada}
                    onChange={() => onCamada(c.flag, !ligada)}
                  />
                  {/* o ícone é ornamento do rótulo que vem logo ao lado: quem
                      ouve a tela já recebe o nome, e ouvir "asterisco" antes
                      dele seria ruído. A coluna fica mesmo sem glifo — é ela
                      que alinha os nomes da família uns com os outros. */}
                  <span className="atlas-gaveta-icone" aria-hidden="true">
                    {c.icone ?? ''}
                  </span>
                  <span>{c.nome}</span>
                </label>
              );
            })}
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
  onEscalaReal: () => void;
  onBrilhoReal: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
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
      {aberto && (
        <div id="atlas-selo-detalhe" className="atlas-selo-detalhe hud-cartao">
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
            {legendaDaProcedencia(cartografiaMedida, cartografiaDesligada)}
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
        <span className="atlas-selo-bolinha" aria-hidden="true" />
        <span>{t(escalaReal ? 'selo.escalaReal' : 'selo.foraDeEscala')}</span>
        <span className="atlas-selo-meio" aria-hidden="true">
          ·
        </span>
        <span>{t(brilhoReal ? 'selo.brilhoReal' : 'selo.brilhoAssistido')}</span>
        <span className="atlas-selo-seta" aria-hidden="true">
          {aberto ? '▾' : '▸'}
        </span>
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
export function Bussola({ acesa, onEndireitar }: {
  acesa: boolean;
  onEndireitar: () => void;
}) {
  useIdioma();
  return (
    <button
      type="button"
      className={`atlas-bussola${acesa ? ' acesa' : ''}`}
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
      <span className="atlas-bussola-agulha" aria-hidden="true">
        ⌃
      </span>
    </button>
  );
}

/**
 * A MÁQUINA DO TEMPO (F4/D2). Uma linha de leitura — o instante do céu
 * em pt-BR — e seis controles: o sentido em três botões, a velocidade
 * num que cicla a escada, o AO VIVO e a volta à época do retrato.
 *
 * O QUE ELA NÃO É: o slider de capítulos do filme. Aquele é o tempo da
 * VIAGEM e não entra no Atlas (D6); este é o tempo do CÉU, e os dois
 * andam em réguas que não se encontram — um mede minutos de narrativa,
 * o outro, séculos de efeméride.
 *
 * ALTURA FIXA, pela mesma razão do selo: o retângulo útil do
 * enquadramento (`atlasRig.ts`) desconta esta faixa, e um bloco que
 * cresce quando aparece um aviso moveria a câmera. Por isso a linha do
 * aviso está SEMPRE montada — vazia quando não há o que avisar — e é
 * ela, e não uma que aparece e some, que carrega o `aria-live`: região
 * viva que nasce junto com a mensagem costuma não ser anunciada.
 *
 * A velocidade CICLA num botão só, no precedente do `1×/2×/4×` do
 * filme: o rótulo diz sempre em que degrau se está, e oito botões de
 * taxa seriam um painel, não um HUD.
 */
export function BarraDoTempo({
  tempo,
  onSentido,
  onDegrau,
  onAoVivo,
  onEpoca,
}: {
  tempo: EstadoDoTempo;
  onSentido: (sentido: SentidoDoTempo) => void;
  onDegrau: () => void;
  onAoVivo: () => void;
  onEpoca: () => void;
}) {
  useIdioma();
  const { data, taxa, sentido, aoVivo, naEpoca, aviso } = tempo;
  const parado = sentido === 0 && !aoVivo;
  return (
    <div className="atlas-tempo">
      <div className="atlas-tempo-linha">
        <span className="atlas-tempo-olho">{t('atlas.instanteDoCeu')}</span>
        <span className="atlas-tempo-data">{data}</span>
      </div>
      <div className="atlas-tempo-botoes" role="group" aria-label={t('atlas.maquinaDoTempo')}>
        <button
          type="button"
          className="hud-btn small"
          aria-pressed={sentido === -1}
          aria-label={t('atlas.voltarNoTempo')}
          onClick={() => onSentido(sentido === -1 ? 0 : -1)}
        >
          ⏴
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-label={t('atlas.pararOTempo')}
          disabled={parado}
          onClick={() => onSentido(0)}
        >
          ⏸
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-pressed={sentido === 1}
          aria-label={t('atlas.avancarNoTempo')}
          onClick={() => onSentido(sentido === 1 ? 0 : 1)}
        >
          ⏵
        </button>
        <button
          type="button"
          className="hud-btn small atlas-tempo-taxa"
          aria-label={t('atlas.taxaAria', { taxa })}
          onClick={onDegrau}
        >
          {taxa}
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-pressed={aoVivo}
          aria-label={t('atlas.aoVivoAria')}
          onClick={onAoVivo}
        >
          {t('atlas.aoVivo')}
        </button>
        <button
          type="button"
          className="hud-btn small"
          aria-label={t('atlas.epocaAria')}
          disabled={naEpoca && parado}
          onClick={onEpoca}
        >
          {t('atlas.epoca')}
        </button>
      </div>
      <p className="atlas-tempo-aviso" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>
  );
}

/**
 * A MÁQUINA DO TEMPO DENTRO DE UMA GAVETA (item 62, 23/08) — a resposta
 * do dono aos mockups, em duas palavras: *"3) vira alça"*.
 *
 * É a MESMA `BarraDoTempo` de sempre, e isso é o ponto: no telefone ela
 * sai do rodapé permanente (a fatia 9 esconde a de LÁ, nomeando o
 * rodapé) e passa a ser desenhada aqui dentro, atrás da alça ⏱ Tempo.
 * Nenhum controle novo, nenhum segundo estado, nenhuma segunda régua —
 * e na mesa nada disto existe: a barra continua no rodapé e
 * `TEMPO_FRACAO` continua governando a base declarada.
 *
 * Por que uma gaveta e não a barra flutuando: os seis controles do tempo
 * ocupam duas linhas de altura permanente num aparelho estreito, e
 * altura de rodapé é DISTÂNCIA DE CÂMERA (`retanguloUtilDoAtlas`). Atrás
 * de uma alça eles custam uma linha de 44 px quando ninguém os está
 * usando.
 */
export function GavetaDoTempo({
  aberta,
  onFechar,
  tempo,
  onSentido,
  onDegrau,
  onAoVivo,
  onEpoca,
}: {
  aberta: boolean;
  onFechar: () => void;
  tempo: EstadoDoTempo;
  onSentido: (sentido: SentidoDoTempo) => void;
  onDegrau: () => void;
  onAoVivo: () => void;
  onEpoca: () => void;
}) {
  const dialogo = useDialogFocus('tempo', aberta, onFechar);
  useIdioma();
  if (!aberta) return null;
  return (
    <div
      className="hud-cartao hud-dialogo atlas-gaveta"
      aria-label={t('atlas.maquinaDoTempo')}
      {...dialogo}
    >
      <div className="atlas-gaveta-topo">
        <span>{t('atlas.tempo')}</span>
        <button type="button" onClick={onFechar} aria-label={t('atlas.fecharTempo')}>
          ✕
        </button>
      </div>
      <BarraDoTempo
        tempo={tempo}
        onSentido={onSentido}
        onDegrau={onDegrau}
        onAoVivo={onAoVivo}
        onEpoca={onEpoca}
      />
    </div>
  );
}

/** A alça ⏱ Tempo — só existe no telefone, e só na fase que a hospeda. */
export function BotaoDoTempo({
  aberta,
  onAlternar,
}: {
  aberta: boolean;
  onAlternar: () => void;
}) {
  useIdioma();
  return (
    <button
      type="button"
      className="hud-btn small"
      onClick={onAlternar}
      aria-label={t('atlas.maquinaDoTempo')}
      {...gatilhoDoDialogo('tempo', aberta)}
    >
      {t('atlas.tempoBotao')}
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
      {t('atlas.camadasBotao')}
    </button>
  );
}
