// ============================================================
// A BARRA DE CONTROLES × A FILEIRA DE ALÇAS — onde as portas do HUD
// nascem, decidido UMA vez.
//
// AS DUAS SÃO O MESMO ASSUNTO, e é por isso que moram juntas: o Atlas em
// telefone (item 62) tira as portas da barra e as põe numa fileira no pé,
// com as MESMAS peças e o mesmo `data-abre-dialogo`. Desenhar as duas
// cópias e esconder uma daria dois gatilhos com o mesmo nome no
// documento, que é o que o contrato do `dialogFocus` proíbe e o que o
// juiz de a11y varre — então a escolha é de TypeScript, e é `alcas`.
//
// MORAVA NO `App.tsx` (§11 do AGENTS: um arquivo, um assunto), onde a
// guarda `&& !alcas` estava escrita quatro vezes no meio do JSX e a
// decisão não tinha nome. A semântica é a mesma, linha a linha: o que
// mudou de lugar não mudou de conteúdo.
// ============================================================
import { QUALIDADES, rotuloDaQualidade } from '../three/atlasConfig';
import type { EscolhaDeQualidade } from '../three/core/engine';
import type { EstadoDaQualidade } from '../three/director';
import type { HudDaFase } from '../three/fases';
import type { EstadoDoTempo } from '../three/tempoDoAtlas';
import type { Gaveta } from '../hooks/useGavetas';
import { gatilhoDoDialogo } from '../lib/dialogFocus';
import { t } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { BotaoDaGaveta, BotaoDoTempo } from './HudDoAtlas';
import { BotaoDaBusca } from './PaletaDeBusca';
import { BotaoDaFicha } from './FichaDoObjeto';

export interface BarraOuAlcasProps {
  /** as peças que a FASE hospeda */
  hud: HudDaFase;
  /**
   * O ATLAS EM TELEFONE: as portas descem para a fileira do pé. A largura
   * é `LARGURA_DO_CELULAR_PX`, lida por `matchMedia` (`useCelular`); a
   * fase é o Atlas porque no filme e no voo livre a barra já respondeu à
   * mesma pergunta de outro jeito ("somem sozinhos", item 61).
   */
  alcas: boolean;
  /** o esmaecimento do chrome do filme (item 61) — classe, não estado */
  chromeSumido: string;
  gaveta: Gaveta | null;
  alternarGaveta: (qual: Gaveta) => void;
  /** há alvo em foco? sem ele não há ficha para abrir */
  ofereceFicha: boolean;
  /**
   * HÁ FILME GUARDADO ATRÁS DO PORTAL? (item 61, 23/08) É o que decide
   * se o Atlas oferece "↩ Voltar ao filme". Sem filme atrás o botão
   * devolvia a TELA DE TÍTULO — o Atlas confessando ser o modo
   * secundário —, e quem entrou pela porta da abertura via uma saída que
   * não voltava para lugar nenhum.
   */
  temFilmeGuardado: boolean;
  foco: string | null;
  tempo: EstadoDoTempo | null;
  inJourney: boolean;
  paused: boolean;
  rate: number;
  quality: EstadoDaQualidade;
  play: () => void;
  entrarNoAtlas: () => void;
  partirDoAtlas: () => void;
  togglePause: () => void;
  ciclarVelocidade: () => void;
  revealGalaxy: () => void;
  freeRoam: () => void;
  changeQuality: (escolha: EscolhaDeQualidade) => void;
}

export function BarraOuAlcas({
  hud,
  alcas,
  chromeSumido,
  gaveta,
  alternarGaveta,
  ofereceFicha,
  temFilmeGuardado,
  foco,
  tempo,
  inJourney,
  paused,
  rate,
  quality,
  play,
  entrarNoAtlas,
  partirDoAtlas,
  togglePause,
  ciclarVelocidade,
  revealGalaxy,
  freeRoam,
  changeQuality,
}: BarraOuAlcasProps) {
  useIdioma();
  /**
   * O ⚙ AJUSTES é o único gatilho que não tem componente próprio, e ele
   * nasce aqui para caber nos DOIS lugares sem ser escrito duas vezes: na
   * barra (mesa, filme e voo livre) ou na fileira de alças (Atlas em
   * telefone).
   */
  const botaoDeAjustes = (
    <button
      className="hud-btn small"
      onClick={() => alternarGaveta('ajustes')}
      aria-label={t('barra.ajustesAria')}
      {...gatilhoDoDialogo('ajustes', gaveta === 'ajustes')}
    >
      {t('barra.ajustes')}
    </button>
  );

  /**
   * AS PORTAS COMPARTILHADAS, escritas UMA vez. A busca, as camadas, a
   * ficha e o ⚙ Ajustes são as MESMAS peças nos dois arranjos — antes as
   * três primeiras estavam escritas duas vezes, e a guarda `!alcas`
   * repetida quatro vezes no meio do JSX era o que segurava a promessa de
   * "num lugar só". Agora quem escolhe o lugar é a estrutura: ou elas
   * entram na barra, ou entram na fileira.
   *
   * A ⏱ TEMPO é a única que não tem os dois lugares: na mesa a máquina do
   * tempo é permanente no rodapé, e só no telefone ela vira alça.
   */
  const portaDaBusca = hud.busca && (
    <BotaoDaBusca
      aberta={gaveta === 'busca'}
      onAlternar={() => alternarGaveta('busca')}
    />
  );
  const portaDasCamadas = hud.gaveta && (
    <BotaoDaGaveta
      aberta={gaveta === 'camadas'}
      onAlternar={() => alternarGaveta('camadas')}
    />
  );
  const portaDaFicha = ofereceFicha && foco && (
    <BotaoDaFicha
      aberta={gaveta === 'ficha'}
      nome={foco}
      onAlternar={() => alternarGaveta('ficha')}
    />
  );

  return (
    <>
  {/* A BARRA — e é ELA que some sozinha no filme correndo (item 61):
      `hud-sumido` esmaece por opacidade e desliga o ponteiro dela e
      dos filhos, sem tirar a caixa do fluxo. A altura desta barra é
      o `--barra-fim` que o efeito acima MEDE e o retângulo que os
      rótulos contornam; tirá-la do fluxo daria um pulo na geometria
      do HUD no meio da viagem. */}
  {hud.controles && (
    <div className={`controls-bar${chromeSumido}`}>
      {hud.botaoReviver && (
        <button className="hud-btn small" onClick={play}>
          {t('barra.reviver')}
        </button>
      )}
      {/* O PORTAL. Só no pausar-e-olhar: é o único momento do filme
          em que o visitante já parou por conta própria e a pergunta
          "onde é isso?" tem lugar (D3). */}
      {inJourney && paused && (
        <button className="hud-btn small" onClick={entrarNoAtlas}>
          {t('barra.entrarNoAtlas')}
        </button>
      )}
      {/* AS PORTAS ESTÃO AQUI OU NA FILEIRA DE ALÇAS, nunca nas duas
          (item 62): elas carregam o `data-abre-dialogo`, e duas cópias
          seriam dois gatilhos com o mesmo nome no documento. O rótulo da
          ficha carrega o nome do alvo — é ele que devolve à barra o que a
          antiga linha "em quadro" dizia no alto.
          SÃO DOIS PONTOS DE ENTRADA e não um porque a ORDEM da barra é
          desenho: o ⚙ Ajustes é a ÚLTIMA peça dela (abaixo, depois do
          seletor de qualidade) e a QUARTA da fileira. Juntar os dois
          pontos moveria o ⚙ na mesa, que ninguém pediu. */}
      {!alcas && (
        <>
          {portaDaBusca}
          {portaDasCamadas}
          {portaDaFicha}
        </>
      )}
      {/* AS DUAS FERRAMENTAS DO ATLAS (item 61, 23/08). Palavras do
          dono: *"a viagem na verdade para mim é só uma ferramenta do
          modo atlas"*. Elas ficam na BARRA e não na fileira de alças do
          telefone, e a escolha é de significado: a fileira é feita de
          PORTAS — cada alça sobe uma folha e volta a fechar —, e estas
          duas TROCAM DE MODO. Pôr uma troca de modo entre gavetas seria
          prometer que ela também "abre e fecha". No telefone elas
          entram na mesma BARRA de cima que já hospeda a saída, que é
          exatamente o lugar onde as trocas de modo moram. (Era "tarja"
          até 24/08, quando ela saiu do telefone; a barra ficou.) */}
      {hud.saidasDoAtlas && (
        <>
          <button
            className="hud-btn small"
            onClick={play}
            aria-label={t('barra.verOFilmeAria')}
          >
            {t('barra.verOFilme')}
          </button>
          <button
            className="hud-btn small"
            onClick={freeRoam}
            aria-label={t('barra.explorarAria')}
          >
            {t('barra.explorarAtlas')}
          </button>
        </>
      )}
      {/* ...e a SAÍDA só existe quando há para onde voltar */}
      {hud.botaoPartir && temFilmeGuardado && (
        <button className="hud-btn small" onClick={partirDoAtlas}>
          {t('barra.voltarAoFilme')}
        </button>
      )}
      {hud.botoesDaViagem && (
        <>
          <button
            className="hud-btn small"
            onClick={togglePause}
            aria-label={t(paused ? 'barra.retomarAria' : 'barra.pausarAria')}
          >
            {t(paused ? 'barra.retomar' : 'barra.pausar')}
          </button>
          <button
            className="hud-btn small"
            onClick={ciclarVelocidade}
            aria-label={t('barra.velocidadeAria')}
            title={t('barra.velocidadeDica')}
          >
            {rate}×
          </button>
          <button className="hud-btn small reveal-btn" onClick={revealGalaxy}>
            {t('barra.verAGalaxia')}
          </button>
          {/* "EXPLORAR", e não "Explorar livremente" (item 61, decisão do
              dono em 23/08). É a segunda vez que ele corta a mesma
              palavra: na abertura ela saiu em 22/08 — *"sugiro tirar a
              palavra livremente"* —, e aqui ela era a sobra da mesma
              frase, no botão mais largo da barra do filme. Com o corte a
              barra fala como o resto da casa: a porta da abertura, a
              ferramenta do Atlas (↗ Explorar) e esta dizem o MESMO nome
              para o MESMO destino. */}
          <button className="hud-btn small" onClick={freeRoam}>
            {t('barra.explorar')}
          </button>
        </>
      )}
      {/* O SELETOR DE QUALIDADE — quatro estados desde os Ajustes D
          (o Auto é o quarto). Os rótulos saem da tabela única
          (`QUALIDADES`, atlasConfig), NUNCA digitados aqui: o painel
          oferece a mesma lista e as duas discordariam no primeiro
          estado novo.

          O RÓTULO DO AUTO NÃO CARREGA O TIER VIVO, e é orçamento de
          largura, não descuido: um `<select>` nativo se dimensiona
          pela opção MAIS LARGA, então "⟳ Auto · performance" alargaria
          a barra de controles em toda tela — inclusive nas estreitas
          que o juiz de a11y mede com o texto em 140%. O tier em que o
          Auto pousou é dito onde há espaço para dizê-lo: no `title`
          (abaixo) e na nota do painel.

          O `aria-label` FICA PARADO enquanto o `title` anda: nome
          acessível que muda a cada janela de medida desorienta quem
          ouve a tela — o que muda é ESTADO, e estado se anuncia pela
          região `aria-live` do painel, não renomeando o controle. */}
      <select
        className="hud-btn small"
        aria-label={t('barra.qualidadeAria')}
        title={rotuloDaQualidade(quality)}
        value={quality.escolha}
        onChange={(e) => changeQuality(e.target.value as EscolhaDeQualidade)}
      >
        {QUALIDADES.map((q) => (
          <option key={q.id} value={q.id}>
            {q.simbolo} {q.nome}
          </option>
        ))}
      </select>
      {!alcas && botaoDeAjustes}
    </div>
  )}

  {/* A FILEIRA DE ALÇAS (item 62) — filha DIRETA de .hud-root, como
      todo overlay da casa: é a regra do `.bare-mode`
      (`> *:not(.scene-canvas)`) que a apaga no `?shot=2`, e ela só
      alcança filhos diretos.
      A ORDEM é a do mockup: buscar, camadas, tempo, ajustes — e a
      ficha como QUINTA, só com seleção. Uma linha que nunca quebra
      (fatia 9): quebrar em duas mudaria a base declarada e moveria a
      câmera no meio da sessão. */}
  {alcas && (
    <div className="atlas-alcas" role="group" aria-label={t('barra.alcasAria')}>
      {portaDaBusca}
      {portaDasCamadas}
      {hud.tempo && tempo && (
        <BotaoDoTempo
          aberta={gaveta === 'tempo'}
          onAlternar={() => alternarGaveta('tempo')}
        />
      )}
      {botaoDeAjustes}
      {portaDaFicha}
    </div>
  )}
    </>
  );
}
