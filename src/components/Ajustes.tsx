// ============================================================
// Painel de ajustes — o que é GOSTO vira controle, não constante.
//
// O QUE ELE É DESDE 22/08 (item 61): quinze controles de RENDERIZAÇÃO e
// de sessão — curva de tom, exposição, qualidade, tamanho do texto, o
// convite e o link. As CAMADAS saíram daqui. Palavras do dono: *"atlas -
// camadas e ajustes concorrem. vc nao acha que varios elementos que hj
// estao em ajustes na verdade deveriam ser camadas?"* — e o fato que a
// queixa media: 17 dos 32 controles deste painel ERAM as camadas, que
// tinham ao mesmo tempo uma gaveta própria com seis delas. Duas portas
// para a mesma tabela. A porta agora é a gaveta (`GavetaDeCamadas`), nos
// dois modos, e este painel ficou com o que é dele.
//
// REDESENHO (05/09) — veredito do dono: *"muito complexo, muitas
// explicações em letra pequena, pouco claro o que é a opção que está
// sendo alterada"*. Três mudanças:
//  1. LINHA, não parágrafo — cada controle é `.ajustes-item`: rótulo à
//     esquerda, controle à direita. O `<h3>` de seção só sobrevive onde
//     agrupa MAIS de uma linha (a gaveta Avançado); nos demais o próprio
//     rótulo da linha já diz o que ela é, e repetir num título acima
//     seria a mesma complexidade que o dono apontou.
//  2. AS NOTAS VIRARAM DICA — o texto miúdo que explicava cada opção só
//     aparece sob um "?": no hover/foco (CSS) ou fixado por clique
//     (estado `dicaPresa`, só um por vez).
//  3. GRUPOS DE BOTÃO VIRARAM SEGMENTADO — mesma semântica
//     (`role="group"`, `aria-pressed`), moldura só. Nos cinco controles
//     da gaveta Avançado, o segmento que bate com o valor que o PRESET
//     resolve ganha `.efetivo` — visível SÓ quando "Preset" é a escolha
//     ativa, para o visitante ver o que a máquina está desenhando sem
//     abrir mão de "Preset" para descobrir.
//
// AO VIVO: tom, exposição e tamanho do texto — o tick lê a cada quadro,
// então a troca é imediata.
//
// A QUALIDADE também troca ao vivo desde 2026-08-20 (Ajustes C): a
// metade assada dela — população da galáxia, tier do Sol, alvo de
// textura dos corpos — nasce num mundo paralelo (worker + bake fatiado)
// e entra por troca de ponteiro num quadro só. NADA no painel recarrega.
//
// A URL continua sendo a fonte de verdade: quem escreve nela é o App, e o
// painel só reflete e edita. Assim qualquer configuração vira link, e a
// captura headless (?t=&shot=2) enxerga exatamente o que a tela mostra —
// que é o que mantém scripts/visual/rodada.mjs honesto.
//
// DESDE A F2 DA ONDA 5 o painel não guarda tom nem exposição: esse
// estado subiu para o App. Não foi arrumação — o selo declara desvio de
// brilho, e com o estado aqui dentro o selo dizendo "voltei ao real"
// deixava o slider mostrando o valor antigo. Um estado, um dono.
// ============================================================
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useDialogFocus } from '../lib/dialogFocus';
import { IDIOMAS, definirIdioma, t } from '../lib/idioma';
import type { ChaveDeTexto } from '../lib/idioma';
import { useIdioma } from '../hooks/useIdioma';
import { DEGRAUS_DA_UI, rotuloDaEscala } from '../lib/uiScale';
import {
  QUALIDADES,
  gasVolumetricoEmTexto,
  nivelDaNebulosaEmTexto,
  particulasDaGalaxiaEmTexto,
  rotuloDaEscalaDeResolucao,
  rotuloDaQualidade,
} from '../three/atlasConfig';
import { PRESETS, ESCALAS_DE_RESOLUCAO } from '../three/core/engine';
import type {
  EscolhaDeQualidade,
  EstadoDaQualidade,
  GasVolumetrico,
  NivelDaNebulosa,
  ParticulasDaGalaxia,
  ToneMapMode,
} from '../three/core/engine';
import { AMOSTRAS_POR_TIER } from '../three/core/post';

/**
 * As quatro curvas. O NOME é marca (ACES, AgX) e não se traduz; a NOTA
 * é frase, e sai do dicionário na língua de agora (item 130).
 */
const TONS: { id: ToneMapMode; nome: string; nota: ChaveDeTexto }[] = [
  { id: 'aces', nome: 'ACES', nota: 'ajustes.tom.aces' },
  { id: 'agx', nome: 'AgX', nota: 'ajustes.tom.agx' },
  { id: 'neutral', nome: 'Neutral', nota: 'ajustes.tom.neutral' },
  { id: 'linear', nome: 'Linear', nota: 'ajustes.tom.linear' },
];

/**
 * OS QUATRO ESTADOS DA SUAVIZAÇÃO DE BORDAS (item 145) — o primeiro
 * controle da gaveta AVANÇADO. `null` é "do preset": a ausência de
 * escolha, e o padrão. Os números são as amostras do alvo, e o rótulo
 * deles é o próprio número (2×, 4×) — marca de hardware, não frase, e
 * por isso não passa pelo dicionário.
 *
 * O nome sai por FUNÇÃO e não por texto assado: `t` lê a língua viva, e
 * uma tabela de constantes nasceria na língua do primeiro import.
 */
const AMOSTRAS: { valor: number | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  { valor: 0, nome: () => t('ajustes.msaaDesligada') },
  { valor: 2, nome: () => '2×' },
  { valor: 4, nome: () => '4×' },
];

/**
 * OS QUATRO ESTADOS DA NEBULOSA e os quatro da ESCALA DE RESOLUÇÃO
 * (item 145) — o segundo e o terceiro controles da gaveta. Mesmo molde
 * do MSAA: `null` é "do preset", e os valores são as CHAVES que vão à
 * URL e ao selo. Os níveis da nebulosa não têm números aqui de
 * propósito: quem guarda passos e escala é a tabela única do engine
 * (`NEBULOSA_POR_NIVEL`), a mesma que os presets consultam.
 */
const NEBULOSAS: { valor: NivelDaNebulosa | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...(['baixa', 'media', 'alta'] as const).map((n) => ({
    valor: n,
    nome: () => nivelDaNebulosaEmTexto(n),
  })),
];

const ESCALAS: { valor: number | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...ESCALAS_DE_RESOLUCAO.map((f) => ({
    valor: f as number,
    nome: () => rotuloDaEscalaDeResolucao(f),
  })),
];

/**
 * OS QUATRO ESTADOS DO GÁS VOLUMÉTRICO (item 145b) — o quarto controle
 * da gaveta, no mesmo molde da nebulosa: `null` é "do preset", e os
 * valores são as chaves que vão à URL (`?gas=`) e ao selo.
 */
const GASES: { valor: GasVolumetrico | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...(['antigo', 'fino', 'macio'] as const).map((g) => ({
    valor: g,
    nome: () => gasVolumetricoEmTexto(g),
  })),
];

/**
 * OS QUATRO ESTADOS DAS PARTÍCULAS DA GALÁXIA (item 149) — o quinto
 * controle da gaveta, no mesmo molde do gás: `null` é "do preset", e os
 * valores são as chaves que vão à URL (`?particulas=`) e ao selo.
 */
const PARTICULAS: { valor: ParticulasDaGalaxia | null; nome: () => string }[] = [
  { valor: null, nome: () => t('ajustes.preset') },
  ...(['todas', 'metade', 'quarto'] as const).map((p) => ({
    valor: p,
    nome: () => particulasDaGalaxiaEmTexto(p),
  })),
];

/** Um segmento do `.ajustes-seg`. `efetivo` é o sublinhado dourado que
 *  mostra o que o PRESET resolve quando "Preset" é a escolha ativa. */
interface Segmento<T> {
  valor: T;
  nome: string;
  lang?: string;
  efetivo?: boolean;
}

/**
 * O SEGMENTADO — moldura única para toda fileira de botões do painel
 * (idioma, tom, qualidade e os cinco da gaveta). Mesma semântica de
 * antes (`role="group"`, `aria-pressed`); o que muda é que os botões
 * ficam JUNTOS, com borda e preenchimento partilhados, em vez de uma
 * fileira de botões soltos — o molde de um menu de jogo, não de um
 * formulário.
 */
function Segmentado<T>({
  aria,
  valor,
  opcoes,
  onEscolher,
}: {
  aria: string;
  valor: T;
  opcoes: Segmento<T>[];
  onEscolher: (v: T) => void;
}) {
  return (
    <div className="ajustes-seg" role="group" aria-label={aria}>
      {opcoes.map((o) => (
        <button
          type="button"
          key={String(o.valor)}
          lang={o.lang}
          className={
            (valor === o.valor ? 'on' : '') + (o.efetivo ? ' efetivo' : '')
          }
          aria-pressed={valor === o.valor}
          onClick={() => onEscolher(o.valor)}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

/**
 * UMA LINHA DO PAINEL — rótulo à esquerda (com o "?" de ajuda quando há
 * dica), controle à direita. É o átomo do redesenho: o que era um
 * `<h3>` mais um `<p className="ajustes-nota">` mais a fileira de
 * botões vira UM elemento, e a explicação só aparece quando pedida.
 *
 * A DICA mostra no hover/foco do "?" (CSS, `:hover`/`:focus-within` em
 * `.ajustes-ajuda-caixa`) e FIXA no clique — só uma por vez, e é por
 * isso que o estado mora no painel, não na linha: fixar a de baixo tem
 * de apagar a de cima.
 */
function LinhaDeAjuste({
  id,
  rotulo,
  largo,
  dica,
  dicaPresa,
  onAlternarDica,
  children,
}: {
  id: string;
  rotulo: string;
  /** o controle ocupa a largura toda, abaixo do rótulo (a qualidade) */
  largo?: boolean;
  dica?: ReactNode;
  dicaPresa: string | null;
  onAlternarDica: (id: string) => void;
  children: ReactNode;
}) {
  const presa = dicaPresa === id;
  return (
    <div className={'ajustes-item' + (largo ? ' ajustes-item--largo' : '')}>
      <span className="ajustes-rotulo-caixa">
        <span className="ajustes-rotulo">{rotulo}</span>
        {dica != null && (
          <span className="ajustes-ajuda-caixa">
            <button
              type="button"
              className="ajustes-ajuda"
              aria-label={t('ajustes.ajuda', { rotulo })}
              aria-expanded={presa}
              aria-controls={`ajustes-dica-${id}`}
              onClick={(evento) => {
                // o clique NÃO pode borbulhar até o "clique fora fecha"
                // do painel (ver `onClick` do diálogo), senão a mesma
                // interação que fixa a dica a desfixaria no mesmo gesto
                evento.stopPropagation();
                onAlternarDica(id);
              }}
            >
              ?
            </button>
            <span
              id={`ajustes-dica-${id}`}
              role="tooltip"
              className={'ajustes-dica' + (presa ? ' presa' : '')}
            >
              {dica}
            </span>
          </span>
        )}
      </span>
      <div className="ajustes-controle">{children}</div>
    </div>
  );
}

export function Ajustes({
  aberto,
  onFechar,
  qualidade,
  onQualidade,
  onAmostras,
  onNebulosa,
  onEscala,
  onGas,
  onParticulas,
  tom,
  onTom,
  exposicao,
  onExposicao,
  escalaUi,
  onEscalaUi,
  rotulos3d,
  onRotulos3d,
  urlParaCopiar,
  onReverConvite,
}: {
  aberto: boolean;
  onFechar: () => void;
  /** o estado inteiro (escolha, tier vivo, medição) — Ajustes D */
  qualidade: EstadoDaQualidade;
  onQualidade: (q: EscolhaDeQualidade) => void;
  /** a suavização de bordas escolhida à mão (item 145); `null` = do preset */
  onAmostras: (amostras: number | null) => void;
  /** o nível da nebulosa escolhido à mão (item 145); `null` = do preset */
  onNebulosa: (nivel: NivelDaNebulosa | null) => void;
  /** a escala de resolução escolhida à mão (item 145); `null` = do preset */
  onEscala: (fator: number | null) => void;
  /** o gás volumétrico escolhido à mão (item 145b); `null` = do preset */
  onGas: (variante: GasVolumetrico | null) => void;
  /** a fração de partículas da galáxia escolhida à mão (item 149); `null` = do preset */
  onParticulas: (nivel: ParticulasDaGalaxia | null) => void;
  tom: ToneMapMode;
  onTom: (t: ToneMapMode) => void;
  exposicao: number;
  onExposicao: (v: number) => void;
  /** fator do tamanho do texto do HUD (`?ui=`) — 1 é o de sempre */
  escalaUi: number;
  onEscalaUi: (v: number) => void;
  /** a BETA dos rótulos 3D (item 109) — só muda o desenho dos nomes */
  rotulos3d: boolean;
  onRotulos3d: (v: boolean) => void;
  /** a URL de agora COM o instante da viagem (App.urlComMomento) */
  urlParaCopiar: () => string;
  /**
   * Reabre o convite dos três gestos (F5). Ausente fora do voo livre —
   * uma seção que reabrisse, no meio do filme, um convite que ensina a
   * voar seria um botão que não faz nada.
   */
  onReverConvite?: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [dicaPresa, setDicaPresa] = useState<string | null>(null);
  const idioma = useIdioma();

  const alternarDica = (id: string) =>
    setDicaPresa((atual) => (atual === id ? null : id));

  // O painel NÃO aplica ?tone=/?exp= na montagem: efeito de filho roda antes
  // do efeito do pai, então o Director ainda não existe aqui. Quem aplica é o
  // App, junto de ?q= e ?pos=, depois do init.
  //
  // O Esc que ficava num listener de `window` aqui virou parte do módulo
  // único (D7): o mesmo hook que prende o foco, devolve ao gatilho e
  // declara `aria-modal` — as três coisas que este painel não tinha.
  const dialogo = useDialogFocus('ajustes', aberto, onFechar);

  // O PRESET VIVO — o que MSAA/nebulosa/gás/partículas resolvem quando o
  // visitante não escolheu nada na gaveta. `qualidade.tier` é o tier
  // QUE ESTÁ RODANDO (em Auto ele muda sem clique), então o "efetivo" que
  // a linha mostra é sempre o do quadro de agora, nunca o de um tier que
  // só existe no seletor.
  const presetVivo = PRESETS[qualidade.tier];
  const amostrasEfetivas = AMOSTRAS_POR_TIER[qualidade.tier];

  if (!aberto) return null;

  return (
    <div
      className="hud-cartao hud-dialogo ajustes"
      aria-label={t('ajustes.aria')}
      {...dialogo}
      onClick={() => {
        // CLIQUE EM QUALQUER LUGAR DO PAINEL desfixa a dica presa — o "?"
        // que a fixou já parou o próprio clique (`stopPropagation`), então
        // só chega aqui quem clicou fora dela.
        if (dicaPresa) setDicaPresa(null);
      }}
      onKeyDownCapture={(evento) => {
        // ESC COM DICA PRESA desfixa e NÃO fecha o diálogo — mas só
        // quando há dica presa: sem isso o Esc de sempre (fechar) some,
        // e o juiz de a11y cobra exatamente esse Esc. A CAPTURA é o que
        // garante rodar ANTES do listener de fechar do `useDialogFocus`
        // (que está na fase de bolha, no mesmo nó): parar a propagação
        // aqui impede o evento de sequer chegar lá.
        if (evento.key === 'Escape' && dicaPresa) {
          evento.stopPropagation();
          setDicaPresa(null);
        }
      }}
    >
      <div className="ajustes-topo">
        <span>{t('ajustes.titulo')}</span>
        <button type="button" onClick={onFechar} aria-label={t('ajustes.fechar')}>
          ✕
        </button>
      </div>

      {/* O SELETOR DE IDIOMA (item 130, F1). Mora AQUI e não na barra
          nem na URL: a barra é o lugar do que se usa a toda hora, e a
          URL desta casa é espelho da vista, não painel — knob de URL
          foi recusado pelo dono. Troca a língua AO VIVO, sem recarregar.
          O nome de cada língua vem NA PRÓPRIA LÍNGUA ("Português",
          "English"): quem não lê a língua de agora precisa reconhecer a
          dele na lista, e "Portuguese" não ajuda quem procura o
          português. */}
      <LinhaDeAjuste
        id="idioma"
        rotulo={t('ajustes.idioma')}
        dica={t('ajustes.idiomaNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.idioma')}
          valor={idioma}
          opcoes={IDIOMAS.map((lingua) => ({
            valor: lingua.id,
            nome: lingua.nome,
            lang: lingua.id,
          }))}
          onEscolher={definirIdioma}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="tom"
        rotulo={t('ajustes.tom')}
        dica={
          <>
            <p>{t('ajustes.tomNota')}</p>
            <ul className="ajustes-dica-lista">
              {TONS.map((curva) => (
                <li key={curva.id}>
                  <strong>{curva.nome}</strong> — {t(curva.nota)}
                </li>
              ))}
            </ul>
          </>
        }
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.tom')}
          valor={tom}
          opcoes={TONS.map((curva) => ({ valor: curva.id, nome: curva.nome }))}
          onEscolher={onTom}
        />
      </LinhaDeAjuste>

      {/* EXPOSIÇÃO não tem "?": nunca teve nota própria (a frase que
          existia era só o valor, não uma explicação), e o redesenho não
          inventa texto novo — o valor mora ao lado do controle. */}
      <LinhaDeAjuste
        id="exposicao"
        rotulo={t('ajustes.exposicao')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <input
          type="range"
          min="0.4"
          max="2.2"
          step="0.02"
          value={exposicao}
          aria-label={t('ajustes.exposicao')}
          onChange={(e) => onExposicao(Number(e.target.value))}
        />
        <span className="ajustes-valor">{exposicao.toFixed(2)}</span>
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="qualidade"
        largo
        rotulo={t('ajustes.qualidade')}
        dica={t('ajustes.qualidadeNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.qualidade')}
          valor={qualidade.escolha}
          opcoes={QUALIDADES.map((q) => ({ valor: q.id, nome: q.nome }))}
          onEscolher={onQualidade}
        />
      </LinhaDeAjuste>
      {/* A MEDIÇÃO, DITA (Ajustes D). A frase é a mesma do título do
          seletor da barra — uma função só (`rotuloDaQualidade`), senão
          os dois hospedeiros contariam a mesma coisa de dois jeitos.
          Ela é `aria-live` porque muda SOZINHA: quem está com o painel
          aberto quando o quadro engasga tem de ouvir a sugestão sem
          precisar reabrir nada. */}
      {/* CLASSE MANTIDA (`ajustes-medida`): `scripts/visual/atlas-smoke.mjs`
          lê este seletor para tirar a leitura de q/s da captura — trocar o
          nome quebraria um consumidor fora deste arquivo, calado. */}
      <p className="ajustes-medida" role="status" aria-live="polite">
        {rotuloDaQualidade(qualidade)}
      </p>

      {/* A GAVETA AVANÇADO (item 145) — os presets na frente, os
          controles individuais atrás. Ela mora COLADA na seção da
          qualidade, e não no fim do painel, por causa da régua: o
          número de quadros/s que o visitante compara é o da linha logo
          acima, e um controle a três rolagens dela mediria memória em
          vez de desempenho. É o ÚNICO `<h3>` que sobrou no corpo do
          painel: agrupa CINCO linhas, e é aí que um título continua
          sendo economia, não repetição. */}
      <h3 className="ajustes-titulo-secao">{t('ajustes.avancado')}</h3>

      <LinhaDeAjuste
        id="msaa"
        rotulo={t('ajustes.msaa')}
        dica={t('ajustes.msaaNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.msaa')}
          valor={qualidade.amostras}
          opcoes={AMOSTRAS.map((a) => ({
            valor: a.valor,
            nome: a.nome(),
            efetivo:
              qualidade.amostras === null &&
              a.valor !== null &&
              a.valor === amostrasEfetivas,
          }))}
          onEscolher={onAmostras}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="nebulosa"
        rotulo={t('ajustes.nebulosaControle')}
        dica={t('ajustes.nebulosaNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.nebulosaControle')}
          valor={qualidade.nebulosa}
          opcoes={NEBULOSAS.map((n) => ({
            valor: n.valor,
            nome: n.nome(),
            efetivo:
              qualidade.nebulosa === null &&
              n.valor !== null &&
              n.valor === presetVivo.nebulosa,
          }))}
          onEscolher={onNebulosa}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="gas"
        rotulo={t('ajustes.gasControle')}
        dica={t('ajustes.gasNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.gasControle')}
          valor={qualidade.gas}
          opcoes={GASES.map((g) => ({
            valor: g.valor,
            nome: g.nome(),
            efetivo:
              qualidade.gas === null && g.valor !== null && g.valor === presetVivo.gas,
          }))}
          onEscolher={onGas}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="particulas"
        rotulo={t('ajustes.particulasControle')}
        dica={t('ajustes.particulasNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.particulasControle')}
          valor={qualidade.particulas}
          opcoes={PARTICULAS.map((p) => ({
            valor: p.valor,
            nome: p.nome(),
            efetivo:
              qualidade.particulas === null &&
              p.valor !== null &&
              p.valor === presetVivo.particulas,
          }))}
          onEscolher={onParticulas}
        />
      </LinhaDeAjuste>

      {/* ESCALA DE RESOLUÇÃO não ganha `.efetivo`: o teto do preset é
          `min(dpr do monitor, pixelRatio do preset)` — depende do
          MONITOR, não é uma fração fixa entre as três da lista, e
          fingir uma marcaria o segmento errado em metade das telas. */}
      <LinhaDeAjuste
        id="escala"
        rotulo={t('ajustes.escalaDeResolucao')}
        dica={t('ajustes.escalaDeResolucaoNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.escalaDeResolucao')}
          valor={qualidade.escala}
          opcoes={ESCALAS.map((e) => ({ valor: e.valor, nome: e.nome() }))}
          onEscolher={onEscala}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="texto"
        rotulo={t('ajustes.texto', { degrau: rotuloDaEscala(escalaUi) })}
        dica={t('ajustes.textoNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.texto', { degrau: rotuloDaEscala(escalaUi) })}
          valor={escalaUi}
          opcoes={DEGRAUS_DA_UI.map((f) => ({ valor: f, nome: rotuloDaEscala(f) }))}
          onEscolher={onEscalaUi}
        />
      </LinhaDeAjuste>

      <LinhaDeAjuste
        id="rotulos3d"
        rotulo={t('ajustes.rotulos3d')}
        dica={t('ajustes.rotulos3dNota')}
        dicaPresa={dicaPresa}
        onAlternarDica={alternarDica}
      >
        <Segmentado
          aria={t('ajustes.rotulos3d')}
          valor={rotulos3d}
          opcoes={[
            { valor: false, nome: t('ajustes.desligados') },
            { valor: true, nome: t('ajustes.ligados') },
          ]}
          onEscolher={onRotulos3d}
        />
      </LinhaDeAjuste>

      {onReverConvite && (
        <LinhaDeAjuste
          id="convite"
          rotulo={t('ajustes.convite')}
          dica={t('ajustes.conviteNota')}
          dicaPresa={dicaPresa}
          onAlternarDica={alternarDica}
        >
          <button type="button" className="ajustes-copiar" onClick={onReverConvite}>
            {t('ajustes.reverConvite')}
          </button>
        </LinhaDeAjuste>
      )}

      <div className="ajustes-item ajustes-item-acao">
        <button
          type="button"
          className="ajustes-copiar"
          onClick={() => {
            void navigator.clipboard.writeText(urlParaCopiar()).then(() => {
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            });
          }}
        >
          {t(copiado ? 'ajustes.copiado' : 'ajustes.copiarLink')}
        </button>
      </div>
    </div>
  );
}
